import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
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
      const user = await this.prisma.user.upsert({
        where: { id: createUserDto.id },
        update: {
          ...createUserDto,
          last_login: new Date(),
        },
        create: {
          ...createUserDto,
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
}
