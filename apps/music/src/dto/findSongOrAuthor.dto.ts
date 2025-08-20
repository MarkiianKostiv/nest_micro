import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class FindSongOrAuthorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300, { message: 'Query is too long. Max 300 characters allowed.' })
  query: string;
}
