import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from '@app/common/logger/logger.module';
import { HttpModule } from '@nestjs/axios';
import { SystemPromptsModule } from '@app/common/system-prompts/system-prompts.module';
import { VectordbModule } from '@app/common/vectordb/vectordb.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        TCP_MUSIC_PORT: Joi.string().required(),
        PINECONE_API_KEY: Joi.string().required(),
        PINECONE_INDEX: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),
        MUSIC_PORT: Joi.string().required(),
      }),
    }),
    LoggerModule,
    HttpModule,
    SystemPromptsModule,
    VectordbModule.forRoot(),
  ],
  controllers: [MusicController],
  providers: [MusicService],
})
export class MusicModule {}
