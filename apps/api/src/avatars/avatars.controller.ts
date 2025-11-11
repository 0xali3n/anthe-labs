import { Controller, Get } from '@nestjs/common';
import { AvatarsService } from './avatars.service';

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly avatarsService: AvatarsService) {}

  /**
   * Get list of available avatars from Supabase Storage
   * GET /api/avatars
   *
   * Returns: Array of avatar objects with name and public URL
   */
  @Get()
  async getAvatars() {
    return this.avatarsService.listAvatars();
  }
}

