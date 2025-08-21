import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { embed, generateText } from 'ai';
import { getLyrics } from 'genius-lyrics-api';
import { openai } from '@ai-sdk/openai';
import { Song } from './interfaces/song.interface';
import { normalizeLyrics } from './utils/normalizeLyrics';
import { FindSongOrAuthorDto } from './dto/findSongOrAuthor.dto';
import { SystemPromptsService } from '@app/common/system-prompts/system-prompts.service';
import { AiFallbackResponse } from './interfaces/ai-fallback-response.interface';
import { parse } from 'path';
import { parseUserQuery } from './utils/parseUserQuery';

@Injectable()
export class MusicService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly systemPrompts: SystemPromptsService,
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

  private async validateQuery(
    query: FindSongOrAuthorDto,
  ): Promise<{ isQueryValid: boolean; message: string }> {
    try {
      const systemPrompt = this.systemPrompts.validateFindSongQueryPrompt();

      const messages = parseUserQuery({ query, systemPrompt });

      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        messages,
        temperature: 0,
      });

      try {
        const parsed = JSON.parse(text);
        return {
          isQueryValid: Boolean(parsed.isQueryValid),
          message:
            typeof parsed.message === 'string'
              ? parsed.message
              : 'I can help you find songs, please ask me about lyrics, artist, or title.',
        };
      } catch (e) {
        return {
          isQueryValid: false,
          message: 'Error processing your request. Please try again later.',
        };
      }
    } catch (err) {
      return {
        isQueryValid: false,
        message: 'Error processing your request. Please try again later.',
      };
    }
  }

  private async aiFallback(
    query: FindSongOrAuthorDto,
  ): Promise<AiFallbackResponse> {
    try {
      const systemPrompt = this.systemPrompts.notFoundAiFallbackPrompt();

      const messages = parseUserQuery({ query, systemPrompt });

      const response = await generateText({
        model: openai('gpt-4o-mini'),
        messages,
        temperature: 0,
      });

      const text = response.text.trim();

      try {
        const parsed = JSON.parse(text) as AiFallbackResponse;
        return parsed;
      } catch (err) {
        return {
          type: 'not_found',
          message: 'There was a problem parsing the AI response.',
        };
      }
    } catch (error) {
      return {
        type: 'not_found',
        message: 'There was a problem processing your request.',
      };
    }
  }

  async findSongOrAuthor(query: FindSongOrAuthorDto) {
    const { isQueryValid, message } = await this.validateQuery(query);

    if (!isQueryValid) {
      return {
        isQueryValid,
        message,
      };
    }

    const dbMatch = false;

    if (!dbMatch) {
      return await this.aiFallback(query);
    }

    // return {
    //   isQueryValid,
    //   message,
    // };
  }
}
