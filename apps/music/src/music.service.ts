import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { DeezerTrack } from './interfaces/deezer-track.interface';
import { getLyrics } from 'genius-lyrics-api';

@Injectable()
export class MusicService {
  private pinecone: Pinecone;
  private indexName = 'songs';
  constructor(private readonly http: HttpService) {}

  private normalizeLyrics(raw: string): string {
    return raw
      .replace(/^\d+\s+Contributors.*?\n+/is, '')
      .replace(/Read More.*?\n+/gi, '')
      .replace(/\(.*?(French|Deutsch|Español|中文).*?\)/gi, '')
      .replace(/\[.*?가사\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getSongs(limit = 10) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`https://api.deezer.com/chart/0/tracks?limit=${limit}`),
      );

      const track = data?.data?.[0];
      if (!track) throw new InternalServerErrorException('No track found');

      const options = {
        apiKey: process.env.GENIUS_API_KEY || '',
        title: track.title,
        artist: track.artist.name,
        optimizeQuery: true,
      };

      const lyrics = await getLyrics(options);

      return {
        deezer_id: track.id,
        title: track.title,
        artist: track.artist.name,
        lyrics: this.normalizeLyrics(lyrics) || null,
      };
    } catch (error) {
      console.error('Error fetching song with lyrics:', error);
      throw new InternalServerErrorException(error);
    }
  }

  async vectorizeSong() {
    try {
      const track = await this.getSongs(1);

      const combinedText = `${track.title} by ${track.artist}\n\n${track.lyrics}`;

      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: combinedText,
      });

      console.log('🎵 Track metadata:', {
        id: track.deezer_id,
        title: track.title,
        artist: track.artist,
      });

      console.log('📐 Embedding vector:', embedding);

      return embedding;
    } catch (error) {
      console.error('Error vectorizing song:', error);
      throw new InternalServerErrorException(error);
    }
  }
}
