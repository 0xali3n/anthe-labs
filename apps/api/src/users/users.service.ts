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

      const user = await this.prisma.user.upsert({
        where: { id: createUserDto.id },
        update: updateData,
        create: {
          ...createUserDto,
          selected_avatar_url: createUserDto.avatar_url, // Set to Google photo initially
          avatar_source: 'google', // Default to Google photo
          last_login: new Date(),
        },
      });

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
      const response = {
        success: true,
        user: {
          ...user,
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

      return {
        success: true,
        user: {
          ...user,
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

      return {
        success: true,
        user: {
          ...user,
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
}
