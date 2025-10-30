import { Module } from '@nestjs/common';
import { SongsParcerService } from './songs-parcer.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { HttpModule } from '@nestjs/axios';
import { VectordbModule } from '@app/common/vectordb/vectordb.module';
import { LoggerModule } from '@app/common/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PINECONE_API_KEY: Joi.string().required(),
        PINECONE_INDEX: Joi.string().required(),
        GENIUS_API_KEY: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),
        DEEZER_API_BASE_URL: Joi.string().uri().required(),
        SONGS_PARCER_PORT: Joi.string().required(),
        SONGS_PARSER_DELAY_MS: Joi.number().optional(),
        SONGS_PARSER_LIMIT: Joi.number().optional(),
      }),
    }),
    LoggerModule,
    HttpModule,
    VectordbModule.forRoot(),
  ],
  controllers: [],
  providers: [SongsParcerService],
})
export class SongsParcerModule {}
