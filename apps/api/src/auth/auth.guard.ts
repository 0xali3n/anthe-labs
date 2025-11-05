import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase JWT Auth Guard
 *
 * Verifies Supabase JWT tokens from Authorization header
 * Extracts user ID from token and attaches to request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private supabaseAdmin: any;

  constructor() {
    // Initialize Supabase admin client for JWT verification
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
    }

    // Use service role key if available (for admin operations)
    // Otherwise use anon key (for JWT verification)
    const supabaseKey =
      supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
      );
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✅ Auth Guard initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    try {
      // Verify JWT token with Supabase
      const {
        data: { user },
        error,
      } = await this.supabaseAdmin.auth.getUser(token);

      if (error) {
        console.error('JWT verification error:', error.message);
        throw new UnauthorizedException(
          `Invalid or expired token: ${error.message}`,
        );
      }

      if (!user) {
        console.error('JWT verification failed: No user found in token');
        throw new UnauthorizedException('Invalid token - no user found');
      }

      // Attach user to request for use in controllers
      request.user = {
        id: user.id,
        email: user.email,
        ...user,
      };

      // Log user ID only (not email for security)
      console.log(`✅ JWT verified for user: ${user.id}`);
      return true;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('JWT verification error:', error.message);
      throw new UnauthorizedException(
        `Token verification failed: ${error.message}`,
      );
    }
  }
}
