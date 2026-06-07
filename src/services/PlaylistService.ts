import { PlaylistResponse, PlaylistSong } from '@customTypes/Playlist';
import { debugLog } from '@utils/Debug';
import { getDateYMD } from '@utils/DateTime';
import { parseString } from 'react-native-xml2js';

// A single entry from Track Blaster's pl_recent_shows.php
interface RecentShow {
  id: string;
  programName: string;
  showStart: string; // e.g. "2026-06-06 18:00:00"
}

export class PlaylistService {
  private static instance: PlaylistService;
  private playlistCache = new Map<string, PlaylistResponse>();
  // Recent shows list is cached for the lifetime of the service instance,
  // since it covers ~2 weeks and doesn't change mid-session.
  private recentShowsCache: RecentShow[] | null = null;

  private readonly RECENT_SHOWS_URL =
    'https://track-blaster.com/wmbr/pl_recent_shows.php';
  private readonly PLAYLIST_DOWNLOAD_URL =
    'https://track-blaster.com/wmbr/pl_download.php';

  static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  // Fetches and parses the recent shows XML from Track Blaster.
  // Results are cached since the list is stable within a session.
  private async fetchRecentShows(): Promise<RecentShow[]> {
    if (this.recentShowsCache) {
      return Promise.resolve(this.recentShowsCache);
    }

    return fetch(this.RECENT_SHOWS_URL)
      .then(response => response.text())
      .then(
        xmlText =>
          new Promise<RecentShow[]>((resolve, reject) => {
            parseString(xmlText, { explicitArray: false }, (err, result) => {
              if (err) {
                reject(new Error(`XML parsing error: ${err.message}`));
                return;
              }

              const showsData = result?.showlist?.show;
              if (!showsData) {
                resolve([]);
                return;
              }

              // xml2js gives a plain object (not array) when there's only one element
              const showsArray = Array.isArray(showsData)
                ? showsData
                : [showsData];

              this.recentShowsCache = showsArray.map((show: any) => ({
                id: show.$.id,
                programName: show.program_name,
                showStart: show.show_start,
              }));

              debugLog(
                `Fetched ${this.recentShowsCache.length} recent shows from Track Blaster`,
              );
              resolve(this.recentShowsCache);
            });
          }),
      );
  }

  async fetchPlaylist(showName: string, date: Date): Promise<PlaylistResponse> {
    const dateStr = getDateYMD(date);
    const cacheKey = `${showName}-${dateStr}`;

    if (this.playlistCache.has(cacheKey)) {
      return this.playlistCache.get(cacheKey)!;
    }

    // Find this show instance in the recent shows list by matching program name and date
    const recentShows = await this.fetchRecentShows();
    debugLog(`fetchPlaylist: looking for "${showName}" on ${dateStr}`);
    debugLog(
      `fetchPlaylist: recent shows list (${recentShows.length} total):`,
      recentShows.slice(0, 5).map(s => `"${s.programName}" @ ${s.showStart}`),
    );

    const match = recentShows.find(
      show =>
        show.programName.toLowerCase() === showName.toLowerCase() &&
        show.showStart.startsWith(dateStr),
    );

    if (!match) {
      // Log nearby shows with the same name to help diagnose date mismatches
      const sameName = recentShows.filter(
        show => show.programName.toLowerCase() === showName.toLowerCase(),
      );
      debugLog(
        `fetchPlaylist: no match found. Shows with name "${showName}":`,
        sameName.map(s => s.showStart),
      );
      throw new Error(`No playlist found for "${showName}" on ${dateStr}`);
    }

    debugLog(
      `fetchPlaylist: matched "${showName}" on ${dateStr} → id=${match.id}`,
    );

    const response = await fetch(
      `${this.PLAYLIST_DOWNLOAD_URL}?id=${match.id}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist CSV: ${response.status}`);
    }

    const csvText = await response.text();
    // Log the first 3 raw CSV rows so we can verify structure and column names
    debugLog(
      `fetchPlaylist: CSV preview (first 3 rows):`,
      csvText.split('\n').slice(0, 3),
    );
    const songs = this.parsePlaylistCsv(csvText, date);

    const result: PlaylistResponse = {
      show_name: showName,
      date: dateStr,
      playlist_id: match.id,
      songs,
    };

    this.playlistCache.set(cacheKey, result);
    return result;
  }

  // Parses the tab-separated playlist CSV returned by pl_download.php.
  // Row 0: show metadata column headers (DJ Name, Date, ...)
  // Row 1: show metadata values (DJ name, air date, ...)
  // Row 2: song column headers (Hidden, Break, Time, Artist, ...)
  // Row 3+: songs
  private parsePlaylistCsv(csvText: string, date: Date): PlaylistSong[] {
    const rows = csvText.split('\n').filter(row => row.trim().length > 0);

    if (rows.length < 4) {
      return [];
    }

    // Derive column indices from the header row so we're not sensitive to ordering
    const headers = rows[2].split('\t');
    const timeIdx = headers.indexOf('Time');
    const artistIdx = headers.indexOf('Artist');
    const songIdx = headers.indexOf('Song');
    const albumIdx = headers.indexOf('Album');
    debugLog(
      `parsePlaylistCsv: column indices — Time=${timeIdx} Artist=${artistIdx} Song=${songIdx} Album=${albumIdx}`,
    );

    // Date portion in YYYY/MM/DD format, for building full timestamps
    const datePart = getDateYMD(date).replace(/-/g, '/');

    const songs: PlaylistSong[] = [];

    for (let i = 3; i < rows.length; i++) {
      const cols = rows[i].split('\t');

      const artist = cols[artistIdx]?.trim();
      const song = cols[songIdx]?.trim();
      const rawTime = cols[timeIdx]?.trim();

      // Skip rows missing artist, song, or time (e.g. hidden break entries)
      if (!artist || !song || !rawTime) {
        continue;
      }

      // Build a timestamp in the format parsePlaylistTimestamp expects: "YYYY/MM/DD HH:MM:SS"
      const time = `${datePart} ${rawTime}:00`;

      songs.push({
        time,
        artist,
        song,
        album: cols[albumIdx]?.trim() || '',
      });
    }

    debugLog(`parsePlaylistCsv: parsed ${songs.length} songs`);
    return songs;
  }

  clearCache(): void {
    this.playlistCache.clear();
    this.recentShowsCache = null;
  }
}
