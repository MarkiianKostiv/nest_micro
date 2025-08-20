import { Module } from '@nestjs/common';
import { SystemPromptsService } from './system-prompts.service';

@Module({
  providers: [SystemPromptsService],
  exports: [SystemPromptsService],
})
export class SystemPromptsModule {}
