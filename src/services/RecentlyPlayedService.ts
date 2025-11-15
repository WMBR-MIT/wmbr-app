import { Show, Archive, ProcessedSong, ShowGroup } from '@customTypes/RecentlyPlayed';
import { ScheduleService } from './ScheduleService';
import { ScheduleShow } from '@customTypes/Schedule';
import { parseString } from 'react-native-xml2js';
import { debugLog, debugError } from '@utils/Debug';
import { getDateYMD, parsePlaylistTimestamp } from '@utils/DateTime';
import { PlaylistSong, PlaylistResponse } from '@customTypes/Playlist';

export class RecentlyPlayedService {
  private static instance: RecentlyPlayedService;
  private currentShow: string | null = null;
  private currentShowSubscribers: Array<(show: string | null) => void> = [];
  private songsCache: ProcessedSong[] = [];
  private showsCache: Show[] = [];
  private seasonStart: Date | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private showsLastFetch: number = 0;

  static getInstance(): RecentlyPlayedService {
    if (!RecentlyPlayedService.instance) {
      RecentlyPlayedService.instance = new RecentlyPlayedService();
    }
    return RecentlyPlayedService.instance;
  }

  setCurrentShow(show: string | null) {
    if (this.currentShow === show) return;
    this.currentShow = show;
    try {
      this.currentShowSubscribers.forEach(callback => {
        try {
          callback(this.currentShow);
        } catch (e) {}
      });
    } catch (e) {}
  }

  getCurrentShow(): string | null {
    return this.currentShow;
  }

  subscribeToCurrentShow(callback: (show: string | null) => void): () => void {
    this.currentShowSubscribers.push(callback);
    try {
      callback(this.currentShow);
    } catch (e) {}
    return () => {
      this.currentShowSubscribers = this.currentShowSubscribers.filter(
        c => c !== callback,
      );
    };
  }

  /**
   * Public helper to fetch a playlist for a show on a given date and return processed songs.
   * Accepts an optional AbortSignal to support cancellation from callers.
   */
  async fetchPlaylistAsSongs(
    showName: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<ProcessedSong[]> {
    try {
      const encodedShowName = encodeURIComponent(showName);
      const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${date}`;
      debugLog(`Fetching playlist (public) for "${showName}" on ${date}`);

      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
        signal,
      });
      if (!response.ok) {
        debugError(`Playlist fetch failed for ${showName}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (data.error) {
        return [];
      }

      const playlist: PlaylistResponse = data as PlaylistResponse;
      if (!playlist.songs || playlist.songs.length === 0) return [];

      // Map to ProcessedSong (we don't have scheduleShow here, so use showName-date as showId)
      const songs: ProcessedSong[] = playlist.songs.map(
        (song: PlaylistSong) => ({
          title: song.song?.trim() || '',
          artist: song.artist?.trim() || '',
          album: song.album?.trim() || undefined,
          released: undefined,
          appleStreamLink: '',
          playedAt: parsePlaylistTimestamp(song.time),
          showName: playlist.show_name,
          showId: `${playlist.show_name}-${playlist.date}`,
        }),
      );

      songs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
      return songs;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        debugLog('Playlist fetch aborted for', showName, date);
        return [];
      }
      debugError(`Error fetching playlist for ${showName}:`, err);
      return [];
    }
  }

  getShowsCache(): Show[] {
    return this.showsCache;
  }

  async fetchRecentlyPlayed(forceRefresh = false): Promise<ShowGroup[]> {
    const now = Date.now();

    // Use cache if recent and not forcing refresh
    if (
      !forceRefresh &&
      now - this.lastFetch < this.CACHE_DURATION &&
      this.songsCache.length > 0
    ) {
      return this.groupSongsByShow(this.songsCache);
    }

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // Fetch schedule for today to get shows playing today
      const scheduleService = ScheduleService.getInstance();
      const scheduleResponse = await scheduleService.fetchSchedule();
      const todayShows = this.getShowsForToday(scheduleResponse.shows, today);

      debugLog(
        `Found ${todayShows.length} shows playing today:`,
        todayShows.map(s => s.name),
      );

      // Fetch archive shows for show matching
      const timestamp = Date.now();
      const showsResponse = await fetch(
        `https://wmbr.org/cgi-bin/xmlarch?t=${timestamp}`,
        {
          headers: { 'Cache-Control': 'no-cache' },
        },
      );
      const showsXml = await showsResponse.text();
      this.showsCache = await this.parseShowsXML(showsXml);

      // Fetch playlist data for each show playing today
      const allSongs: ProcessedSong[] = [];
      const playlistPromises = todayShows.map(show =>
        this.fetchPlaylistForShow(show.name, new Date(dateStr)),
      );

      const playlistResponses = await Promise.allSettled(playlistPromises);

      playlistResponses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value) {
          const songs = this.processPlaylistSongs(
            response.value,
            todayShows[index],
          );
          allSongs.push(...songs);
        } else {
          debugError(
            `Failed to fetch playlist for ${todayShows[index].name}:`,
            response.status === 'rejected' ? response.reason : 'No data',
          );
        }
      });

      // Sort all songs by played time (newest first) and deduplicate
      this.songsCache = this.deduplicateAndSortSongs(allSongs);
      debugLog('Total songs processed:', this.songsCache.length);

      this.lastFetch = now;

      return this.groupSongsByShow(this.songsCache);
    } catch (error) {
      debugError('Error fetching recently played data:', error);
      return [];
    }
  }

  /**
   * fetches XML only (archives metadata) for schedule page, where fetching
   * playlists for each show isn't immediately necessary.
   */
  async fetchShowsCacheOnly(forceRefresh = false): Promise<Show[]> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.showsCache.length > 0 &&
      now - this.showsLastFetch < this.CACHE_DURATION
    ) {
      return this.showsCache;
    }

    try {
      const timestamp = Date.now();
      const showsResponse = await fetch(
        `https://wmbr.org/cgi-bin/xmlarch?t=${timestamp}`,
        {
          headers: { 'Cache-Control': 'no-cache' },
        },
      );
      const showsXml = await showsResponse.text();
      this.showsCache = await this.parseShowsXML(showsXml);
      this.showsLastFetch = now;
      return this.showsCache;
    } catch (error) {
      debugError('Error fetching shows XML:', error);
      return [];
    }
  }

  /**
   * finds cached show by name, returns undefined if not found
   */
  getShowByName(name: string): Show | undefined {
    return this.showsCache.find(
      s => s.name.toLowerCase() === name.toLowerCase(),
    );
  }

  private parseShowsXML(xmlString: string): Promise<Show[]> {
    return new Promise<Show[]>(resolve => {
      parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) {
          debugError('Error parsing shows XML:', err);
          resolve([]);
          return;
        }

        try {
          debugLog('XML parsing result keys:', Object.keys(result || {}));

          // Parse season start date if available
          if (result?.wmbr_archives?.$ && result.wmbr_archives.$.season_start) {
            this.seasonStart = new Date(result.wmbr_archives.$.season_start);
            debugLog('Season start:', this.seasonStart);
          }

          const shows: Show[] = [];
          const showsData = result?.wmbr_archives?.show;

          if (!showsData) {
            debugLog('No shows data found in XML result');
            debugLog('Available keys in result:', Object.keys(result || {}));
            if (result?.wmbr_archives) {
              debugLog(
                'Available keys in wmbr_archives:',
                Object.keys(result.wmbr_archives),
              );
            }
            resolve([]);
            return;
          }

          // Handle both single show and array of shows
          const showArray = Array.isArray(showsData) ? showsData : [showsData];

          showArray.forEach((showData: any) => {
            if (showData.$ && showData.$.id && showData.name) {
              const archives: Archive[] = [];

              // Parse archives if they exist
              if (showData.archives && showData.archives.archive) {
                const archiveArray = Array.isArray(showData.archives.archive)
                  ? showData.archives.archive
                  : [showData.archives.archive];

                archiveArray.forEach((archive: any) => {
                  if (
                    archive.url &&
                    archive.date &&
                    !archive.url.includes('rebroadcast')
                  ) {
                    archives.push({
                      url: archive.url,
                      date: archive.date,
                      size: archive.size || '0',
                    });
                  } else {
                    debugLog(
                      `Skipping archive for ${showData.name}: url=${!!archive.url}, date=${!!archive.date}, rebroadcast=${archive.url?.includes('rebroadcast')}`,
                    );
                  }
                });
              }

              shows.push({
                id: showData.$.id,
                name: showData.name,
                day: parseInt(showData.day, 10) || 0,
                day_str: showData.day_str || '',
                time: parseInt(showData.time, 10) || 0,
                time_str: showData.time_str || '',
                length: parseInt(showData.length, 10) || 0,
                hosts: showData.hosts || '',
                alternates: parseInt(showData.alternates, 10) || 0,
                archives,
              });
            }
          });

          resolve(shows);
        } catch (error) {
          debugError('Error processing parsed XML:', error);
          resolve([]);
        }
      });
    });
  }

  private getShowsForToday(
    scheduleShows: ScheduleShow[],
    targetDate: Date,
  ): ScheduleShow[] {
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    return scheduleShows.filter(show => {
      if (show.day === 7) {
        // Weekday show (Monday-Friday)
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      }
      return show.day === dayOfWeek;
    });
  }

  private async fetchPlaylistForShow(
    showName: string,
    date: Date,
  ): Promise<PlaylistResponse | null> {
    try {
      const dateStr = getDateYMD(date);
      const encodedShowName = encodeURIComponent(showName);
      const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${dateStr}`;

      debugLog(`Fetching playlist for "${showName}" on ${dateStr}`);

      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        debugError(`Playlist fetch failed for ${showName}: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // If the response has an "error" key, treat as empty playlist
      if (data.error) {
        debugLog(
          `No playlist found for "${showName}" (${data.error}), treating as empty`,
        );
        return {
          show_name: showName,
          date: getDateYMD(date),
          playlist_id: '',
          songs: [],
        };
      }

      const playlistData = data as PlaylistResponse;
      debugLog(
        `Got ${playlistData.songs?.length || 0} songs for "${showName}"`,
      );

      return playlistData;
    } catch (err) {
      debugError(`Error fetching playlist for ${showName}:`, err);
      return null;
    }
  }

  private processPlaylistSongs(
    playlist: PlaylistResponse,
    scheduleShow: ScheduleShow,
  ): ProcessedSong[] {
    if (!playlist.songs || playlist.songs.length === 0) {
      return [];
    }

    return playlist.songs.map(song => {
      // Parse time in format: YYYY/MM/DD HH:MM:SS
      const playedAt = parsePlaylistTimestamp(song.time);

      return {
        title: song.song.trim(),
        artist: song.artist.trim(),
        album: song.album?.trim() || undefined,
        released: undefined, // Not provided in new API
        appleStreamLink: '', // Not provided in new API - could be fetched separately if needed
        playedAt,
        showName: playlist.show_name,
        showId: scheduleShow.id,
      };
    });
  }

  private deduplicateAndSortSongs(songs: ProcessedSong[]): ProcessedSong[] {
    const now = new Date();

    // Filter out future songs and sort by time (newest first)
    const validSongs = songs
      .filter(song => song.playedAt.getTime() <= now.getTime())
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());

    // Deduplicate consecutive songs (same title + artist within 10 minutes)
    const deduplicated: ProcessedSong[] = [];

    for (const currentSong of validSongs) {
      const isDuplicate = deduplicated.some(prevSong => {
        const isSameSong =
          prevSong.title.toLowerCase() === currentSong.title.toLowerCase() &&
          prevSong.artist.toLowerCase() === currentSong.artist.toLowerCase();

        if (isSameSong) {
          const timeDiff = Math.abs(
            prevSong.playedAt.getTime() - currentSong.playedAt.getTime(),
          );
          if (timeDiff < 10 * 60 * 1000) {
            // 10 minutes
            debugLog(
              `Skipping duplicate: "${currentSong.title}" by ${currentSong.artist}`,
            );
            return true;
          }
        }

        return false;
      });

      if (!isDuplicate) {
        deduplicated.push(currentSong);
      }
    }

    return deduplicated;
  }

  // Keep this method for backward compatibility with archive matching
  private parseEDTTimestamp(timestamp: string): Date {
    try {
      // Handle "2025-08-03 19:47:31 EDT" format
      const isEDT = timestamp.includes(' EDT');
      const isEST = timestamp.includes(' EST');
      const cleanTimestamp = timestamp.replace(' EDT', '').replace(' EST', '');

      // Split into date and time parts
      const [datePart, timePart] = cleanTimestamp.split(' ');

      if (!datePart || !timePart) {
        debugError('Invalid timestamp format:', timestamp);
        return new Date();
      }

      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);

      // Validate parsed values
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hour) ||
        isNaN(minute) ||
        isNaN(second)
      ) {
        debugError('Invalid date components:', {
          year,
          month,
          day,
          hour,
          minute,
          second,
        });
        return new Date();
      }

      // Create date object as if it's in EDT/EST timezone
      // EDT is UTC-4, EST is UTC-5
      const offsetHours = isEDT ? -4 : isEST ? -5 : -4; // Default to EDT

      // Create UTC date and adjust for timezone
      const utcDate = new Date(
        Date.UTC(year, month - 1, day, hour, minute, second),
      );
      const localDate = new Date(
        utcDate.getTime() - offsetHours * 60 * 60 * 1000,
      );

      return localDate;
    } catch (error) {
      debugError('Error parsing timestamp:', timestamp, error);
      return new Date(); // Return current date as fallback
    }
  }

  private findShowForTimestamp(timestamp: Date): { name: string; id: string } {
    const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const minutesFromMidnight =
      timestamp.getHours() * 60 + timestamp.getMinutes();

    debugLog(
      'Finding show for:',
      timestamp.toString(),
      'Day:',
      dayOfWeek,
      'Minutes:',
      minutesFromMidnight,
    );

    // Find the currently playing show using the new alternating schedule logic
    const currentShow = this.getCurrentlyPlayingShow(timestamp);
    if (currentShow) {
      debugLog('Found currently playing show:', currentShow.name);
      return { name: currentShow.name, id: currentShow.id };
    }

    // Fallback to archive matching for better accuracy
    const archiveMatches = this.showsCache.filter(show => {
      return show.archives.some(archive => {
        const archiveDate = new Date(archive.date);
        const timeDiff = Math.abs(archiveDate.getTime() - timestamp.getTime());
        return timeDiff < 4 * 60 * 60 * 1000; // Within 4 hours
      });
    });

    if (archiveMatches.length > 0) {
      debugLog('Found archive match:', archiveMatches[0].name);
      return { name: archiveMatches[0].name, id: archiveMatches[0].id };
    }

    debugLog('No show found, using Unknown Show');
    return { name: 'Unknown Show', id: 'unknown' };
  }

  private getCurrentlyPlayingShow(targetTime: Date): Show | null {
    if (!this.seasonStart) {
      debugLog('No season start date available, using fallback logic');
      return this.fallbackShowLogic(targetTime);
    }

    const dayOfWeek = targetTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const minutesFromMidnight =
      targetTime.getHours() * 60 + targetTime.getMinutes();

    // Find shows for this day of the week (including weekday shows)
    const candidateShows = this.showsCache.filter(show => {
      if (show.day === 7) {
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
      }
      return show.day === dayOfWeek;
    });

    // Group shows by time slot
    const showsByTime = new Map<number, Show[]>();
    candidateShows.forEach(show => {
      // Check if show is currently playing
      const showStart = show.time;
      const showEnd = showStart + show.length;

      let isCurrentlyPlaying = false;
      if (showEnd > 1440) {
        // Show crosses midnight
        isCurrentlyPlaying =
          minutesFromMidnight >= showStart ||
          minutesFromMidnight < showEnd - 1440;
      } else {
        // Normal show within the day
        isCurrentlyPlaying =
          minutesFromMidnight >= showStart && minutesFromMidnight < showEnd;
      }

      if (isCurrentlyPlaying) {
        if (!showsByTime.has(showStart)) {
          showsByTime.set(showStart, []);
        }
        showsByTime.get(showStart)!.push(show);
      }
    });

    // For each time slot with multiple shows, determine which one should be playing
    for (const [timeSlot, shows] of showsByTime) {
      if (shows.length === 1) {
        return shows[0]; // Only one show, must be it
      }

      // Multiple shows at this time slot, use alternates logic
      const activeShow = this.getActiveShowForTimeSlot(
        shows,
        timeSlot,
        targetTime,
      );
      if (activeShow) {
        return activeShow;
      }
    }

    return null;
  }

  private getActiveShowForTimeSlot(
    shows: Show[],
    timeSlot: number,
    targetTime: Date,
  ): Show | null {
    if (!this.seasonStart) return shows[0]; // Fallback to first show

    // Find the first matching weekday/time on or after the season start
    const firstSlotTime = this.findFirstSlotTime(timeSlot, targetTime.getDay());
    if (!firstSlotTime) return shows[0];

    // Calculate weeks since the first slot
    const weeksSince = Math.floor(
      (targetTime.getTime() - firstSlotTime.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
    const cycleIndex = weeksSince % 4; // 0=week1, 1=week2, 2=week3, 3=week4

    debugLog(
      `Time slot ${timeSlot}: weeksSince=${weeksSince}, cycleIndex=${cycleIndex}`,
    );

    // Find the show that matches this cycle
    for (const show of shows) {
      const alternates = show.alternates;
      let shouldPlay = false;

      switch (alternates) {
        case 0: // Weekly show
          shouldPlay = true;
          break;
        case 1: // Weeks 1 & 3 (first of every 2 weeks)
          shouldPlay = weeksSince % 2 === 0;
          break;
        case 2: // Weeks 2 & 4 (second of every 2 weeks)
          shouldPlay = weeksSince % 2 === 1;
          break;
        case 5: // Week 1 (first of every 4 weeks)
          shouldPlay = cycleIndex === 0;
          break;
        case 6: // Week 2 (second of every 4 weeks)
          shouldPlay = cycleIndex === 1;
          break;
        case 7: // Week 3 (third of every 4 weeks)
          shouldPlay = cycleIndex === 2;
          break;
        case 8: // Week 4 (fourth of every 4 weeks)
          shouldPlay = cycleIndex === 3;
          break;
      }

      if (shouldPlay) {
        debugLog(`Selected show: ${show.name} (alternates=${alternates})`);
        return show;
      }
    }

    // If no show matches, return the first one as fallback
    return shows[0];
  }

  private findFirstSlotTime(
    timeSlot: number,
    targetDayOfWeek: number,
  ): Date | null {
    if (!this.seasonStart) return null;

    const seasonStartTime = new Date(this.seasonStart);

    // Find the first occurrence of this day/time on or after season start
    let searchDate = new Date(seasonStartTime);

    // Move to the target day of week
    while (searchDate.getDay() !== targetDayOfWeek) {
      searchDate.setDate(searchDate.getDate() + 1);
    }

    // Set the time to the show time
    const hours = Math.floor(timeSlot / 60);
    const minutes = timeSlot % 60;
    searchDate.setHours(hours, minutes, 0, 0);

    // If this is before season start, move to next week
    if (searchDate < seasonStartTime) {
      searchDate.setDate(searchDate.getDate() + 7);
    }

    return searchDate;
  }

  private fallbackShowLogic(targetTime: Date): Show | null {
    const dayOfWeek = targetTime.getDay();
    const minutesFromMidnight =
      targetTime.getHours() * 60 + targetTime.getMinutes();

    // Simple fallback: find any show currently playing
    const candidateShows = this.showsCache.filter(show => {
      if (show.day === 7) {
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
      }
      return show.day === dayOfWeek;
    });

    const currentShows = candidateShows.filter(show => {
      const showStart = show.time;
      const showEnd = showStart + show.length;

      if (showEnd > 1440) {
        return (
          minutesFromMidnight >= showStart ||
          minutesFromMidnight < showEnd - 1440
        );
      } else {
        return (
          minutesFromMidnight >= showStart && minutesFromMidnight < showEnd
        );
      }
    });

    return currentShows.length > 0 ? currentShows[0] : null;
  }

  private groupSongsByShow(songs: ProcessedSong[]): ShowGroup[] {
    const groups = new Map<string, ProcessedSong[]>();

    songs.forEach(song => {
      // Use show ID as the unique key for grouping
      if (!groups.has(song.showId)) {
        groups.set(song.showId, []);
      }
      groups.get(song.showId)!.push(song);
    });

    // Convert to array and sort by most recent song in each group
    const showGroups: ShowGroup[] = Array.from(groups.entries()).map(
      ([, showSongs]) => ({
        showName: showSongs[0].showName, // All songs in group have same show name
        songs: showSongs.sort(
          (a, b) => b.playedAt.getTime() - a.playedAt.getTime(),
        ),
      }),
    );

    // Sort groups by most recent song and ensure songs within each group are sorted
    const sortedGroups = showGroups
      .map(group => ({
        ...group,
        // Double-check that songs are sorted newest first within each group
        songs: group.songs.sort(
          (a, b) => b.playedAt.getTime() - a.playedAt.getTime(),
        ),
      }))
      .sort(
        (a, b) =>
          // Sort groups by most recent song
          b.songs[0].playedAt.getTime() - a.songs[0].playedAt.getTime(),
      );

    // Debug: log the first few songs from each group
    debugLog('Final sorted groups:');
    sortedGroups.forEach((group, groupIndex) => {
      if (groupIndex < 2) {
        // First 2 groups
        debugLog(`Group ${groupIndex + 1}: ${group.showName}`);
        group.songs.slice(0, 5).forEach((song, songIndex) => {
          debugLog(
            `  Song ${songIndex + 1}: "${song.title}" at ${song.playedAt.toLocaleString()}`,
          );
        });
      }
    });

    return sortedGroups;
  }
}
