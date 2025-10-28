import { Body, Controller, Get, Post } from '@nestjs/common';
import { MusicService } from './music.service';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';

@Controller()
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get()
  async getSongs() {
    return await this.musicService.addVectorizedSongToIndex();
  }

  @Post()
  async find(@Body() query: FindSongOrAuthorDto) {
    return await this.musicService.findSongOrAuthor(query);
  }
}
