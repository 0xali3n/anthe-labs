import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AvatarsService {
  private supabaseAdmin: any;

  constructor() {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
    }

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for storage access');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✅ Avatars service initialized');
  }

  /**
   * List all avatar files from Supabase Storage bucket
   * @returns Array of avatar file names with public URLs
   */
  async listAvatars() {
    try {
      const bucketName = process.env.AVATARS_BUCKET_NAME || 'avatars';

      // List all files in the avatars bucket
      const { data, error } = await this.supabaseAdmin.storage
        .from(bucketName)
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.error('Error listing avatars:', error);
        throw new Error(`Failed to list avatars: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return { success: true, avatars: [] };
      }

      // Get public URLs for each avatar
      const avatars = data
        .filter((file) => {
          // Only include image files
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
          return imageExtensions.some((ext) =>
            file.name.toLowerCase().endsWith(ext),
          );
        })
        .map((file) => {
          const { data: urlData } = this.supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(file.name);

          return {
            name: file.name,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            updated_at: file.updated_at,
          };
        });

      return {
        success: true,
        avatars,
      };
    } catch (error: any) {
      console.error('Error in listAvatars:', error);
      return {
        success: false,
        error: error.message || 'Failed to list avatars',
        avatars: [],
      };
    }
  }
}

