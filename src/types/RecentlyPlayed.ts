export interface RecentlyPlayedSong {
  Title: string;
  Artist: string;
  'Apple Stream Link': string;
  'Last Updated': string;
  Album?: string;
  Label?: string;
  Released?: string;
}

export interface Show {
  id: string;
  name: string;
  day: number;
  day_str: string;
  time: number;
  time_str: string;
  length: number;
  hosts: string;
  alternates: number;
  archives: Archive[];
}

export interface Archive {
  url: string;
  date: string;
  size: string;
}

export interface ProcessedSong {
  title: string;
  artist: string;
  album?: string;
  released?: string;
  appleStreamLink: string;
  playedAt: Date;
  showName: string;
  showId: string;
}

export interface ShowGroup {
  showName: string;
  songs: ProcessedSong[];
}
