import { Test, TestingModule } from '@nestjs/testing';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';

describe('MusicController', () => {
  let musicController: MusicController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MusicController],
      providers: [MusicService],
    }).compile();

    musicController = app.get<MusicController>(MusicController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(musicController.getHello()).toBe('Hello World!');
    });
  });
});
