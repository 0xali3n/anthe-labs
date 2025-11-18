import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TraderRegistrationsService {
  constructor(private prisma: PrismaService) {}

  // Get trader registration by user ID
  async findByUserId(userId: string) {
    const registration = await this.prisma.traderRegistration.findUnique({
      where: { user_id: userId },
    });

    if (!registration) {
      return {
        success: false,
        error: 'No trader registration found',
      };
    }

    return {
      success: true,
      data: {
        id: registration.id,
        userId: registration.user_id,
        address: registration.address,
        botName: registration.bot_name,
        status: registration.status,
        createdAt: registration.created_at,
        updatedAt: registration.updated_at,
      },
    };
  }

  // Register a new trader
  async register(userId: string, address: string, botName: string) {
    try {
      // Check if user already has a registration
      const existingRegistration =
        await this.prisma.traderRegistration.findUnique({
          where: { user_id: userId },
        });

      if (existingRegistration) {
        return {
          success: false,
          error:
            'You have already registered as a trader. Please wait for approval.',
        };
      }

      // Check if wallet address is already registered by another user
      const existingAddressRegistration =
        await this.prisma.traderRegistration.findFirst({
          where: { address },
        });

      if (existingAddressRegistration) {
        return {
          success: false,
          error: 'This wallet address is already registered by another user',
        };
      }

      // Create new trader registration with pending status
      const registration = await this.prisma.traderRegistration.create({
        data: {
          user_id: userId,
          address,
          bot_name: botName,
          status: 'pending',
        },
      });

      return {
        success: true,
        data: {
          id: registration.id,
          userId: registration.user_id,
          address: registration.address,
          botName: registration.bot_name,
          status: registration.status,
          createdAt: registration.created_at,
          updatedAt: registration.updated_at,
        },
      };
    } catch (error: any) {
      console.error('Error registering trader:', error);
      return {
        success: false,
        error: error.message || 'Failed to register trader',
      };
    }
  }
}

