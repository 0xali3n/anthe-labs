import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  HttpException,
  Logger,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Create a new feedback entry
   * POST /api/feedback
   *
   * Security: Requires JWT authentication
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard)
  async create(
    @Request() req: any,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpException(
        { success: false, error: 'User ID is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.feedbackService.create(userId, createFeedbackDto);
    } catch (error: any) {
      this.logger.error(`POST /api/feedback error: ${error.message}`);
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all feedback entries for the authenticated user
   * GET /api/feedback
   *
   * Security: Requires JWT authentication
   * Returns: Empty array if no feedbacks (valid initial state)
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAllByUser(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpException(
        { success: false, error: 'User ID is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.feedbackService.findAllByUser(userId);
    } catch (error: any) {
      this.logger.error(`GET /api/feedback error: ${error.message}`);
      throw new HttpException(
        { success: false, error: error.message || 'Internal server error' },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
