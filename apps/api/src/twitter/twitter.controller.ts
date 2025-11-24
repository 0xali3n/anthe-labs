import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Req,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import { TwitterService } from './twitter.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  /**
   * Initiate Twitter OAuth connection
   * GET /api/twitter/connect
   * Returns the OAuth URL that the frontend should redirect to
   */
  @Get('connect')
  @UseGuards(AuthGuard)
  async connect(@Request() req: any, @Res() res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const { url, state } =
        this.twitterService.generateAuthUrl(userId);

      // CodeVerifier is now stored in memory (not cookie)
      // Return the OAuth URL as JSON (frontend will redirect)
      return res.json({
        success: true,
        authUrl: url,
      });
    } catch (error: any) {
      console.error('Twitter connect error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || 'Failed to initiate Twitter connection',
      });
    }
  }

  /**
   * Handle Twitter OAuth callback
   * GET /api/twitter/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: ExpressRequest,
    @Res() res: Response,
  ) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';

      if (error) {
        return res.redirect(
          `${frontendUrl}/twitter-callback?error=${encodeURIComponent(error)}`,
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${frontendUrl}/twitter-callback?error=${encodeURIComponent('Missing authorization code')}`,
        );
      }

      // Get codeVerifier from in-memory store using state
      const stored = this.twitterService.getCodeVerifier(state);
      if (!stored) {
        return res.redirect(
          `${frontendUrl}/twitter-callback?error=${encodeURIComponent('Session expired. Please try again.')}`,
        );
      }

      const { codeVerifier, userId } = stored;

      // Exchange code for access token
      const { accessToken } = await this.twitterService.exchangeCodeForToken(
        code,
        codeVerifier,
      );

      // Get Twitter user info
      const twitterUser = await this.twitterService.getTwitterUser(accessToken);

      // Connect Twitter to user account
      await this.twitterService.connectTwitter(
        userId,
        twitterUser.id,
        twitterUser.username,
      );

      // Redirect to callback page (which will close popup and notify parent)
      res.redirect(
        `${frontendUrl}/twitter-callback?twitter_connected=true&username=${twitterUser.username}`,
      );
    } catch (error: any) {
      console.error('Twitter callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
      res.redirect(
        `${frontendUrl}/twitter-callback?error=${encodeURIComponent(error.message || 'Failed to connect Twitter')}`,
      );
    }
  }

  /**
   * Disconnect Twitter account
   * POST /api/twitter/disconnect
   */
  @Post('disconnect')
  @UseGuards(AuthGuard)
  async disconnect(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      await this.twitterService.disconnectTwitter(userId);

      return {
        success: true,
        message: 'Twitter account disconnected',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to disconnect Twitter',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

