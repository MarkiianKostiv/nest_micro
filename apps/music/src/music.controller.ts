import { Controller, Get, Post } from '@nestjs/common';
import { MusicService } from './music.service';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';

@Controller()
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get()
  async getSongs() {
    return await this.musicService.vectorizeSong();
  }

  // @Post()
  // async example() {
  //   return await this.musicService.vectorizeSong();
  // }

  @Post()
  async find(query: FindSongOrAuthorDto) {
    return await this.musicService.findSongOrAuthor(query);
  }
}
