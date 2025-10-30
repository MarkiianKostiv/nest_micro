import { NestFactory } from '@nestjs/core';
import { SongsParcerModule } from './songs-parcer.module';

async function bootstrap() {
  const app = await NestFactory.create(SongsParcerModule);
  await app.listen(process.env.SONGS_PARSER_PORT ?? 8085);
}
bootstrap();
