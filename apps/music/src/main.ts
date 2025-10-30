import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { MusicModule } from './music.module';

async function bootstrap() {
  const app = await NestFactory.create(MusicModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useLogger(app.get(Logger));
  app.enableCors();
  await app.listen(process.env.MUSIC_PORT ?? 8083, '0.0.0.0');
}
bootstrap();
