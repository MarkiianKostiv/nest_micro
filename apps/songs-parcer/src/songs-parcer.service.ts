import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { embed } from 'ai';
import { getLyrics } from 'genius-lyrics-api';
import { openai } from '@ai-sdk/openai';
import { normalizeLyrics } from '../../music/src/utils/normalizeLyrics';
import {
  VectordbService,
  PineconeRecord,
} from '@app/common/vectordb/vectordb.service';

@Injectable()
export class SongsParcerService implements OnModuleInit {
  private readonly logger = new Logger(SongsParcerService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    private readonly vectordbService: VectordbService,
  ) {}

  onModuleInit() {
    this.logger.log('Songs parser starting on module init');
    void this.startParsing();
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchChartTracks(limit = 50) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.configService.get('DEEZER_API_BASE_URL')}/chart/0/tracks?limit=${limit}`,
        ),
      );
      return data?.data || [];
    } catch (err) {
      this.logger.error('Failed to fetch chart tracks from Deezer', err);
      return [];
    }
  }

  private async vectorizeText(text: string) {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    return embedding;
  }

  async startParsing() {
    const indexName =
      this.configService.get<string>('PINECONE_INDEX') || 'songs';
    const delayMs =
      Number(this.configService.get<number>('SONGS_PARSER_DELAY_MS')) || 1000;
    const limit =
      Number(this.configService.get<number>('SONGS_PARSER_LIMIT')) || 50;

    const tracks = await this.fetchChartTracks(limit);
    if (!tracks || tracks.length === 0) {
      this.logger.warn('No tracks found to parse');
      return;
    }

    this.logger.log(
      `Found ${tracks.length} tracks, processing with ${delayMs}ms delay`,
    );

    for (const track of tracks) {
      try {
        const title = track.title;
        const artist = track.artist?.name;

        const lyrics = await getLyrics({
          apiKey: this.configService.get('GENIUS_API_KEY'),
          title,
          artist,
          optimizeQuery: true,
        });

        if (!lyrics) {
          this.logger.warn(`Skipping ${title} by ${artist} - lyrics not found`);
          await this.delay(delayMs);
          continue;
        }

        const normalized = normalizeLyrics(lyrics);
        const embedding = await this.vectorizeText(normalized);
        const vectorLength = embedding.length;

        await this.vectordbService.ensureIndex(indexName, vectorLength);

        const record: PineconeRecord = {
          id: `song:${track.id}`,
          values: embedding,
          metadata: {
            deezer_id: track.id,
            title,
            artist,
            lyrics_snippet: normalized?.slice(0, 100),
          },
        };

        await this.vectordbService.upsertVectors(indexName, [record]);
        this.logger.log(`Upserted song ${title} by ${artist} -> ${record.id}`);
      } catch (err) {
        this.logger.error('Error processing track', err);
      }

      await this.delay(delayMs);
    }

    this.logger.log('Songs parsing finished');
  }
}
