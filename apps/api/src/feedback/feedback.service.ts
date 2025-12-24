import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new feedback entry
   * @param userId - User ID from authenticated JWT
   * @param createFeedbackDto - Feedback data (title, message)
   */
  async create(userId: string, createFeedbackDto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedback.create({
      data: {
        user_id: userId,
        title: createFeedbackDto.title,
        message: createFeedbackDto.message,
      },
      select: {
        id: true,
        title: true,
        message: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      success: true,
      feedback,
    };
  }

  /**
   * Get all feedback entries for the authenticated user
   * @param userId - User ID from authenticated JWT
   */
  async findAllByUser(userId: string) {
    // Simple: Just fetch feedbacks for this user
    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 100,
    });

    return {
      success: true,
      feedbacks: feedbacks || [],
      count: feedbacks.length,
    };
  }
}

