export interface DeezerTrack {
  id: number;
  title: string;
  link: string;
  preview: string;
  artist: {
    id: number;
    name: string;
    link: string;
  };
}
