interface BaseResponse {
  type: string;
}

export interface SongByLyricsResponse extends BaseResponse {
  type: 'song_by_lyrics';
  title: string;
  artist: string;
  lyrics: string;
}

export interface SongByTitleResponse extends BaseResponse {
  type: 'song_by_title';
  title: string;
  artist: string;
  lyrics: string;
}

export interface ArtistResponse extends BaseResponse {
  type: 'artist';
  artist: string;
  songs: string[];
}

export interface NotFoundResponse extends BaseResponse {
  type: 'not_found';
  message: string;
}

export type AiFallbackResponse =
  | SongByLyricsResponse
  | SongByTitleResponse
  | ArtistResponse
  | NotFoundResponse;
