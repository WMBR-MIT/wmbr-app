import { getDateYMD, parsePlaylistTimestamp } from '@utils/DateTime';
import { ProcessedSong } from '@customTypes/RecentlyPlayed';

export const fetchShowPlaylist = async (
  showName: string,
  date: Date,
): Promise<ProcessedSong[]> => {
  const dateStr = getDateYMD(date);
  const encodedShowName = encodeURIComponent(showName);
  const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${dateStr}`;

  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    // If it's a 404, return empty list instead of throwing error
    if (response.status === 404) {
      return [];
    }

    throw new Error(`Failed to fetch playlist: ${response.status}`);
  }

  const playlistData = await response.json();

  // If the response has an "error" key, return empty list
  if (playlistData.error) {
    return [];
  }

  if (playlistData.songs && playlistData.songs.length > 0) {
    // Convert playlist songs to ProcessedSong format
    const processedSongs: ProcessedSong[] = playlistData.songs.map(
      (song: any) => ({
        title: song.song.trim(),
        artist: song.artist.trim(),
        album: song.album?.trim() || undefined,
        released: undefined,
        appleStreamLink: '', // Not provided in new API
        playedAt: parsePlaylistTimestamp(song.time),
        showName: showName,
        showId: `${showName}-${date}`,
      }),
    );

    // Sort by most recent first
    processedSongs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
    return processedSongs;
  }

  return [];
};
