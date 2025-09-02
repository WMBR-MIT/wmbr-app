export interface PlaylistSong {
  time: string;
  artist: string;
  song: string;
  album: string;
}

export interface PlaylistResponse {
  show_name: string;
  date: string;
  playlist_id: string;
  songs: PlaylistSong[];
}