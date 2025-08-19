import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/common/database/database.module';
import * as Joi from 'joi';
import { LoggerModule } from '@app/common/logger/logger.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/common/auth/constants/services';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        TCP_MUSIC_PORT: Joi.string().required(),
        PINECONE_API_KEY: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    // DatabaseModule.forFeature([
    //   {
    //     name: ReservationDocument.name,
    //     schema: ReservationSchema,
    //   },
    // ]),
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
  ],
  controllers: [MusicController],
  providers: [MusicService],
})
export class MusicModule {}
