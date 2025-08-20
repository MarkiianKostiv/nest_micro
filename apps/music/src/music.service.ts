import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { embed } from 'ai';
import { getLyrics } from 'genius-lyrics-api';
import { openai } from '@ai-sdk/openai';
import { Song } from './interfaces/song.interface';
import { normalizeLyrics } from './utils/normalizeLyrics';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';

@Injectable()
export class MusicService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async getSongs(limit = 10): Promise<Song> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.configService.get('DEEZER_API_BASE_URL')}/chart/0/tracks?limit=${limit}`,
        ),
      );

      const track = data?.data?.[0];
      if (!track) throw new InternalServerErrorException('No track found');

      const lyrics = await getLyrics({
        apiKey: this.configService.get('GENIUS_API_KEY'),
        title: track.title,
        artist: track.artist.name,
        optimizeQuery: true,
      });

      return {
        deezer_id: track.id,
        title: track.title,
        artist: track.artist.name,
        lyrics: normalizeLyrics(lyrics),
      };
    } catch (error) {
      console.error('Error fetching song with lyrics:', error);
      throw new InternalServerErrorException(error as any);
    }
  }

  async vectorizeSong() {
    const songs = await this.getSongs();

    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: songs.lyrics,
      });

      return {
        song: songs,
        vectorLength: embedding.length,
        embedding,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  private async openAiFallback(query: FindSongOrAuthorDto) {}
  async findSongOrAuthor(query: FindSongOrAuthorDto) {
    const dbMatch = false;

    if (!dbMatch) {
      return await this.openAiFallback(query);
    }
  }
}
