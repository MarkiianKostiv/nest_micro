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
import {
  VectordbService,
  PineconeRecord,
} from '@app/common/vectordb/vectordb.service';
import { AiFallbackResponse } from './interfaces/ai-fallback-response.interface';
import { parseUserQuery } from './utils/parseUserQuery';

@Injectable()
export class MusicService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly systemPrompts: SystemPromptsService,
    private readonly vectordbService: VectordbService,
  ) {}

  private async getSongs(limit = 10): Promise<Song> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.configService.get('DEEZER_API_BASE_URL')}/chart/0/tracks?limit=${limit}`,
        ),
      );

      const track = data?.data?.[3];
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

  async addVectorizedSongToIndex() {
    const indexName =
      this.configService.get<string>('PINECONE_INDEX') || 'songs';

    const { song, vectorLength, embedding } = await this.vectorizeSong();

    await this.vectordbService.ensureIndex(indexName, vectorLength);

    const record: PineconeRecord = {
      id: `song:${song.deezer_id}`,
      values: embedding,
      metadata: {
        deezer_id: song.deezer_id,
        title: song.title,
        artist: song.artist,
      },
    };

    const resp = await this.vectordbService.upsertVectors(indexName, [record]);
    return resp;
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

      let text = response.text
        .trim()
        .replace(/^```(json)?/, '')
        .replace(/```$/, '')
        .replace(/\\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\n/g, ' ')
        .trim();

      if (!text.endsWith('}')) {
        if (!text.endsWith('"')) {
          text += '"';
        }
        text += '}';
      }

      try {
        const parsed = JSON.parse(text) as AiFallbackResponse;
        return parsed;
      } catch (err) {
        console.error('Error parsing AI response:', err);
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

  private async prepareQueryForDBSearch(query: FindSongOrAuthorDto) {
    const systemPrompt = this.systemPrompts.prepareQueryForDBSearch();
    const messages = parseUserQuery({ query, systemPrompt });

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      messages,
      temperature: 0,
    });

    const normalizedQuery = response.text.trim();

    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: normalizedQuery,
      });

      return {
        normalizedQuery,
        embedding,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to vectorize query: ' + error,
      );
    }
  }

  private async evaluateDBResults(normalizedQuery: string, matches: any[]) {
    const systemPrompt = this.systemPrompts.vectorDBEvaluationPrompt();

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Normalized search: "${normalizedQuery}" Vector matches: ${JSON.stringify(matches, null, 2)}`,
        },
      ],
    });

    try {
      const text = response.text.trim();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch {
      return {
        dbMatch: false,
        message: 'Parsing error in AI evaluation',
        matches: [],
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

    const { normalizedQuery, embedding } =
      await this.prepareQueryForDBSearch(query);

    const indexName =
      this.configService.get<string>('PINECONE_INDEX') || 'songs';
    const pineconeResults = await this.vectordbService.query(
      indexName,
      embedding,
      {
        topK: 5,
        includeMetadata: true,
      },
    );

    const aiEval = await this.evaluateDBResults(
      normalizedQuery,
      pineconeResults.matches,
    );

    if (!aiEval.dbMatch) {
      return await this.aiFallback(query);
    }

    return {
      fromDB: true,
      message: aiEval.message,
      matches: aiEval.matches,
    };
  }
}
