import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Upsert user (create or update) - for real logged-in users
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
      return { success: true, user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
