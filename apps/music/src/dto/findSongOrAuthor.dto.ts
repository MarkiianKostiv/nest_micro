import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300, { message: 'Query is too long. Max 300 characters allowed.' })
  query: string;

  @IsString()
  @IsIn(['current_message', 'prev_context_message'], {
    message: 'Type must be either current_message or prev_context_message',
  })
  type: 'current_message' | 'prev_context_message';
}

export class FindSongOrAuthorDto {
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 messages are allowed.' })
  @ValidateNested({ each: true })
  @Type(() => QueryMessageDto)
  messages: QueryMessageDto[];
}
