// Simple DTO - no validation for now
export class CreateUserDto {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  google_id?: string;
  display_name?: string;
  bio?: string;
  twitter_username?: string;
  twitter_connected?: boolean;
  twitter_user_id?: string;
  theme?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}
