import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  // Generate a unique random username like "user_3267"
  private async generateUniqueUsername(): Promise<string> {
    let username: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate random number between 1000 and 999999
      const randomNum = Math.floor(Math.random() * (999999 - 1000 + 1)) + 1000;
      username = `user_${randomNum}`;

      // Check if username already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!existingUser) {
        isUnique = true;
      } else {
        attempts++;
      }
    }

    if (!isUnique) {
      // Fallback: use timestamp if we can't find a unique random number
      const timestamp = Date.now();
      username = `user_${timestamp}`;
    }

    return username!;
  }

  // Upsert user (create or update) - automatically creates wallet if needed
  async upsert(createUserDto: CreateUserDto) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id: createUserDto.id },
      });

      const updateData: any = {
        email: createUserDto.email,
        full_name: createUserDto.full_name,
        google_id: createUserDto.google_id,
        last_login: new Date(),
      };

      // For existing users: generate username if they don't have one yet
      if (existingUser && (!existingUser.username || existingUser.username.trim() === '')) {
        if (!createUserDto.username || createUserDto.username.trim() === '') {
          updateData.username = await this.generateUniqueUsername();
          console.log(`✅ Generated username for existing user ${createUserDto.id}: ${updateData.username}`);
        }
      }

      // Only update avatar_url if it's a new user OR if avatar_url is not set
      // This preserves user's selected avatar
      if (!existingUser || !existingUser.avatar_url) {
        updateData.avatar_url = createUserDto.avatar_url;
        // For new users, set selected_avatar_url to Google photo and source to 'google'
        if (!existingUser) {
          updateData.selected_avatar_url = createUserDto.avatar_url;
          updateData.avatar_source = 'google';
        }
      }

      // Don't overwrite selected_avatar_url or avatar_source on update
      // These are only set when user explicitly chooses an avatar

      const createData: any = {
        ...createUserDto,
        selected_avatar_url: createUserDto.avatar_url, // Set to Google photo initially
        avatar_source: 'google', // Default to Google photo
        last_login: new Date(),
      };

      // For new users: generate username if empty or not provided
      if (!existingUser) {
        if (!createUserDto.username || createUserDto.username.trim() === '') {
          createData.username = await this.generateUniqueUsername();
          console.log(`✅ Generated username for new user ${createUserDto.id}: ${createData.username}`);
        }
      }

      let user;
      try {
        user = await this.prisma.user.upsert({
          where: { id: createUserDto.id },
          update: updateData,
          create: createData,
        });
      } catch (upsertError: any) {
        // Handle unique constraint violation (email) - can happen with concurrent requests
        if (upsertError.code === 'P2002' && upsertError.meta?.target?.includes('email')) {
          console.log(`⚠️ Unique constraint on email detected, fetching existing user instead...`);
          // User was created by another concurrent request, fetch it instead
          user = await this.prisma.user.findUnique({
            where: { id: createUserDto.id },
          });
          
          if (!user) {
            // If still not found, try to find by email as fallback
            user = await this.prisma.user.findUnique({
              where: { email: createUserDto.email },
            });
          }
          
          if (user) {
            // Update last_login for the existing user
            user = await this.prisma.user.update({
              where: { id: user.id },
              data: { last_login: new Date() },
            });
            console.log(`✅ Retrieved existing user ${user.id} after unique constraint error`);
          } else {
            throw new Error('Failed to create or retrieve user after unique constraint error');
          }
        } else {
          // Re-throw other errors
          throw upsertError;
        }
      }

      // Automatically check and create wallet if it doesn't exist
      // This happens in backend, no frontend API call needed
      let walletAddress: string | null = null;
      try {
        const walletResult = await this.walletsService.createOrGetWallet(user.id);
        walletAddress = walletResult.address;
        console.log(`✅ Wallet ready for user ${user.id}: ${walletAddress}`);
      } catch (walletError: any) {
        // Don't fail user creation if wallet creation fails
        console.error(`⚠️ Wallet creation failed for user ${user.id}:`, walletError.message);
        console.error(`⚠️ Wallet error details:`, walletError);
      }

      // Return user with wallet address (always include field, even if null)
      // Sanitize output - only return safe fields (no private keys or sensitive data)
      const response = {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          selected_avatar_url: user.selected_avatar_url,
          avatar_source: user.avatar_source,
          google_id: user.google_id,
          display_name: user.display_name,
          username: user.username,
          bio: user.bio,
          twitter_username: user.twitter_username,
          twitter_connected: user.twitter_connected,
          twitter_user_id: user.twitter_user_id,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: user.last_login,
          wallet_address: walletAddress, // Include wallet address in response
        },
      };

      console.log(`📤 Returning user response for ${user.id}, wallet_address: ${walletAddress ? 'present' : 'null'}`);
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get current user by ID (from JWT token)
  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get wallet address
      let walletAddress: string | null = null;
      try {
        walletAddress = await this.walletsService.getWalletAddress(userId);
      } catch (walletError: any) {
        console.error(`⚠️ Failed to get wallet for user ${userId}:`, walletError.message);
      }

      // Sanitize output - only return safe fields (no private keys or sensitive data)
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          selected_avatar_url: user.selected_avatar_url,
          avatar_source: user.avatar_source,
          google_id: user.google_id,
          display_name: user.display_name,
          username: user.username,
          bio: user.bio,
          twitter_username: user.twitter_username,
          twitter_connected: user.twitter_connected,
          twitter_user_id: user.twitter_user_id,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: user.last_login,
          wallet_address: walletAddress,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update current user (name, username, bio)
  async update(userId: string, updateUserDto: UpdateUserDto) {
    try {
      // Check if username is being updated and if it's already taken
      if (updateUserDto.username) {
        const existingUser = await this.prisma.user.findFirst({
          where: {
            username: updateUserDto.username,
            id: { not: userId }, // Exclude current user
          },
        });

        if (existingUser) {
          throw new ConflictException('Username is already taken');
        }
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserDto,
      });

      // Get wallet address
      let walletAddress: string | null = null;
      try {
        walletAddress = await this.walletsService.getWalletAddress(userId);
      } catch (walletError: any) {
        console.error(`⚠️ Failed to get wallet for user ${userId}:`, walletError.message);
      }

      // Sanitize output - only return safe fields (no private keys or sensitive data)
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          selected_avatar_url: user.selected_avatar_url,
          avatar_source: user.avatar_source,
          google_id: user.google_id,
          display_name: user.display_name,
          username: user.username,
          bio: user.bio,
          twitter_username: user.twitter_username,
          twitter_connected: user.twitter_connected,
          twitter_user_id: user.twitter_user_id,
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_login: user.last_login,
          wallet_address: walletAddress,
        },
      };
    } catch (error: any) {
      // Re-throw ConflictException so NestJS can handle it as HTTP 409
      if (error instanceof ConflictException) {
        throw error;
      }
      // For other errors, return error response format (frontend checks response.success)
      return { success: false, error: error.message || 'Failed to update user' };
    }
  }

  // Get user by username (public endpoint)
  async getByUsername(username: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get wallet address
      let walletAddress: string | null = null;
      try {
        walletAddress = await this.walletsService.getWalletAddress(user.id);
      } catch (walletError: any) {
        console.error(`⚠️ Failed to get wallet for user ${user.id}:`, walletError.message);
      }

      // Sanitize output - only return safe public fields
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email, // Public profile can show email
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          selected_avatar_url: user.selected_avatar_url,
          avatar_source: user.avatar_source,
          display_name: user.display_name,
          username: user.username,
          bio: user.bio,
          twitter_username: user.twitter_username,
          twitter_connected: user.twitter_connected,
          created_at: user.created_at,
          updated_at: user.updated_at,
          wallet_address: walletAddress,
          // Don't return: google_id, twitter_user_id, last_login (private)
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get all usernames (for autocomplete/search) - public endpoint
  async getAllUsernames() {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          username: { not: null },
        },
        select: {
          username: true,
          display_name: true,
          full_name: true,
          selected_avatar_url: true,
          avatar_url: true,
          twitter_connected: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        users: users.map((u) => ({
          username: u.username!,
          displayName: u.display_name || u.full_name || u.username!,
          avatarUrl: u.selected_avatar_url || u.avatar_url || null,
          twitterConnected: u.twitter_connected || false,
        })),
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
