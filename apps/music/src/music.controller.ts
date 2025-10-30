import { Body, Controller, Post } from '@nestjs/common';
import { MusicService } from './music.service';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';

@Controller()
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Post()
  async find(@Body() query: FindSongOrAuthorDto) {
    return await this.musicService.findSongOrAuthor(query);
  }
}
