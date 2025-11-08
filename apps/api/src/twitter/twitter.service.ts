import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'node:crypto';

@Injectable()
export class TwitterService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;
  // In-memory store for code verifiers (keyed by state)
  // In production, use Redis or a proper session store
  private readonly codeVerifierStore = new Map<string, { codeVerifier: string; userId: string; expiresAt: number }>();

  constructor(private prisma: PrismaService) {
    this.clientId = process.env.TWITTER_CLIENT_ID || '';
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    this.baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.redirectUri = `${this.baseUrl}/api/twitter/callback`;

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ Twitter OAuth credentials not configured. Twitter connection will not work.');
    } else {
      console.log('✅ Twitter service initialized');
    }
  }

  /**
   * Generate PKCE code verifier and challenge for OAuth 2.0
   */
  private generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(userId: string): { url: string; state: string; codeVerifier: string } {
    if (!this.clientId) {
      throw new Error('Twitter OAuth not configured');
    }

    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');
    const fullState = `${state}:${userId}`;

    // Store codeVerifier in memory (expires in 10 minutes)
    const expiresAt = Date.now() + 600000; // 10 minutes
    this.codeVerifierStore.set(fullState, {
      codeVerifier,
      userId,
      expiresAt,
    });

    // Clean up expired entries
    this.cleanupExpiredEntries();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'tweet.read users.read offline.access',
      state: fullState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return {
      url: authUrl,
      state: fullState,
      codeVerifier,
    };
  }

  /**
   * Get code verifier from store by state
   */
  getCodeVerifier(state: string): { codeVerifier: string; userId: string } | null {
    const stored = this.codeVerifierStore.get(state);
    if (!stored) {
      return null;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.codeVerifierStore.delete(state);
      return null;
    }

    // Remove after use (one-time use)
    this.codeVerifierStore.delete(state);

    return {
      codeVerifier: stored.codeVerifier,
      userId: stored.userId,
    };
  }

  /**
   * Clean up expired entries from store
   */
  private cleanupExpiredEntries() {
    const now = Date.now();
    for (const [state, data] of this.codeVerifierStore.entries()) {
      if (now > data.expiresAt) {
        this.codeVerifierStore.delete(state);
      }
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter token exchange failed: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Get Twitter user info from access token
   */
  async getTwitterUser(accessToken: string): Promise<{
    id: string;
    username: string;
    name: string;
  }> {
    const response = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=username,name',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Twitter user: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.data.id,
      username: data.data.username,
      name: data.data.name,
    };
  }

  /**
   * Connect Twitter account to user
   */
  async connectTwitter(
    userId: string,
    twitterUserId: string,
    twitterUsername: string,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        twitter_user_id: twitterUserId,
        twitter_username: twitterUsername,
        twitter_connected: true,
      },
    });
  }

  /**
   * Disconnect Twitter account
   */
  async disconnectTwitter(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        twitter_user_id: null,
        twitter_username: null,
        twitter_connected: false,
      },
    });
  }
}

