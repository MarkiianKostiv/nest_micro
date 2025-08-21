import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from '@app/common/logger/logger.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/common/auth/constants/services';
import { HttpModule } from '@nestjs/axios';
import { SystemPromptsModule } from '@app/common/system-prompts/system-prompts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        TCP_MUSIC_PORT: Joi.string().required(),
        PINECONE_API_KEY: Joi.string().required(),
        GENIUS_API_KEY: Joi.string().required(),
        OPENAI_API_KEY: Joi.string().required(),
        MUSIC_PORT: Joi.string().required(),
        DEEZER_API_BASE_URL: Joi.string().uri().required(),
      }),
    }),
    LoggerModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: '0.0.0.0',
            port: configService.get('TCP_MUSIC_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    HttpModule,
    SystemPromptsModule,
  ],
  controllers: [MusicController],
  providers: [MusicService],
})
export class MusicModule {}
