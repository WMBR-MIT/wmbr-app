import { RecentlyPlayedSong, Show, Archive, ProcessedSong, ShowGroup } from '../types/RecentlyPlayed';
import { parseString } from 'react-native-xml2js';

export class RecentlyPlayedService {
  private static instance: RecentlyPlayedService;
  private songsCache: ProcessedSong[] = [];
  private showsCache: Show[] = [];
  private seasonStart: Date | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): RecentlyPlayedService {
    if (!RecentlyPlayedService.instance) {
      RecentlyPlayedService.instance = new RecentlyPlayedService();
    }
    return RecentlyPlayedService.instance;
  }

  getShowsCache(): Show[] {
    return this.showsCache;
  }

  async fetchRecentlyPlayed(forceRefresh = false): Promise<ShowGroup[]> {
    const now = Date.now();
    
    // Use cache if recent and not forcing refresh
    if (!forceRefresh && now - this.lastFetch < this.CACHE_DURATION && this.songsCache.length > 0) {
      return this.groupSongsByShow(this.songsCache);
    }

    try {
      // Fetch both APIs in parallel with cache-busting
      const timestamp = Date.now();
      const [songsResponse, showsResponse] = await Promise.all([
        fetch('https://wmbr.alexandersimoes.com/', {
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`https://wmbr.org/cgi-bin/xmlarch?t=${timestamp}`, {
          headers: { 'Cache-Control': 'no-cache' }
        })
      ]);

      const songsData: RecentlyPlayedSong[] = await songsResponse.json();
      const showsXml = await showsResponse.text();
      
      // Parse shows XML
      this.showsCache = await this.parseShowsXML(showsXml);
      console.log('Total shows loaded:', this.showsCache.length);
      
      // Process and deduplicate songs
      this.songsCache = this.processSongs(songsData);
      console.log('Total songs processed:', this.songsCache.length);
      
      this.lastFetch = now;
      
      return this.groupSongsByShow(this.songsCache);
    } catch (error) {
      console.error('Error fetching recently played data:', error);
      return [];
    }
  }

  private parseShowsXML(xmlString: string): Promise<Show[]> {
    return new Promise<Show[]>((resolve) => {
      parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) {
          console.error('Error parsing shows XML:', err);
          resolve([]);
          return;
        }

        try {
          console.log('XML parsing result keys:', Object.keys(result || {}));
          
          // Parse season start date if available
          if (result?.wmbr_archives?.$ && result.wmbr_archives.$.season_start) {
            this.seasonStart = new Date(result.wmbr_archives.$.season_start);
            console.log('Season start:', this.seasonStart);
          }
          
          const shows: Show[] = [];
          const showsData = result?.wmbr_archives?.show;
          
          if (!showsData) {
            console.log('No shows data found in XML result');
            console.log('Available keys in result:', Object.keys(result || {}));
            if (result?.wmbr_archives) {
              console.log('Available keys in wmbr_archives:', Object.keys(result.wmbr_archives));
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
                  if (archive.url && archive.date && !archive.url.includes('rebroadcast')) {
                    archives.push({
                      url: archive.url,
                      date: archive.date,
                      size: archive.size || '0'
                    });
                  } else {
                    console.log(`Skipping archive for ${showData.name}: url=${!!archive.url}, date=${!!archive.date}, rebroadcast=${archive.url?.includes('rebroadcast')}`);
                  }
                });
              }

              shows.push({
                id: showData.$.id,
                name: showData.name,
                day: parseInt(showData.day) || 0,
                day_str: showData.day_str || '',
                time: parseInt(showData.time) || 0,
                time_str: showData.time_str || '',
                length: parseInt(showData.length) || 0,
                hosts: showData.hosts || '',
                alternates: parseInt(showData.alternates) || 0,
                archives
              });
            }
          });
          
          resolve(shows);
        } catch (error) {
          console.error('Error processing parsed XML:', error);
          resolve([]);
        }
      });
    });
  }

  private processSongs(rawSongs: RecentlyPlayedSong[]): ProcessedSong[] {
    const processed: ProcessedSong[] = [];
    const now = new Date();
    
    // Process songs and filter out future songs
    const processedSongs: ProcessedSong[] = rawSongs
      .map((song, index) => {
        const playedAt = this.parseEDTTimestamp(song['Last Updated']);
        const showInfo = this.findShowForTimestamp(playedAt);
        
        return {
          title: song.Title.trim(),
          artist: song.Artist.trim(),
          album: song.Album?.trim(),
          released: song.Released?.trim(),
          appleStreamLink: song['Apple Stream Link'],
          playedAt,
          showName: showInfo.name,
          showId: showInfo.id
        };
      })
      .filter(song => {
        // Only include songs that were played before now
        return song.playedAt.getTime() <= now.getTime();
      });

    // Deduplicate consecutive songs (same title + artist)
    for (let i = 0; i < processedSongs.length; i++) {
      const currentSong = processedSongs[i];
      
      // Check if this song is the same as the previous one in the array
      if (i > 0) {
        const prevSong = processedSongs[i - 1];
        
        if (prevSong.title.toLowerCase() === currentSong.title.toLowerCase() && 
            prevSong.artist.toLowerCase() === currentSong.artist.toLowerCase()) {
          
          // Same song as previous - check if it's within a reasonable time window (10 minutes)
          const timeDiff = Math.abs(prevSong.playedAt.getTime() - currentSong.playedAt.getTime());
          if (timeDiff < 10 * 60 * 1000) { // 10 minutes
            console.log(`Skipping duplicate: "${currentSong.title}" by ${currentSong.artist}`);
            continue; // Skip this duplicate
          }
        }
      }

      processed.push(currentSong);
    }

    return processed;
  }

  private parseEDTTimestamp(timestamp: string): Date {
    try {
      // Handle "2025-08-03 19:47:31 EDT" format
      const isEDT = timestamp.includes(' EDT');
      const isEST = timestamp.includes(' EST');
      const cleanTimestamp = timestamp.replace(' EDT', '').replace(' EST', '');
      
      // Split into date and time parts
      const [datePart, timePart] = cleanTimestamp.split(' ');
      
      if (!datePart || !timePart) {
        console.error('Invalid timestamp format:', timestamp);
        return new Date();
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
        console.error('Invalid date components:', { year, month, day, hour, minute, second });
        return new Date();
      }
      
      // Create date object as if it's in EDT/EST timezone
      // EDT is UTC-4, EST is UTC-5
      const offsetHours = isEDT ? -4 : isEST ? -5 : -4; // Default to EDT
      
      // Create UTC date and adjust for timezone
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      const localDate = new Date(utcDate.getTime() - (offsetHours * 60 * 60 * 1000));
      
      return localDate;
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      return new Date(); // Return current date as fallback
    }
  }

  private findShowForTimestamp(timestamp: Date): { name: string; id: string } {
    const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const minutesFromMidnight = timestamp.getHours() * 60 + timestamp.getMinutes();
    
    console.log('Finding show for:', timestamp.toString(), 'Day:', dayOfWeek, 'Minutes:', minutesFromMidnight);
    
    // Find the currently playing show using the new alternating schedule logic
    const currentShow = this.getCurrentlyPlayingShow(timestamp);
    if (currentShow) {
      console.log('Found currently playing show:', currentShow.name);
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
      console.log('Found archive match:', archiveMatches[0].name);
      return { name: archiveMatches[0].name, id: archiveMatches[0].id };
    }
    
    console.log('No show found, using Unknown Show');
    return { name: 'Unknown Show', id: 'unknown' };
  }

  private getCurrentlyPlayingShow(targetTime: Date): Show | null {
    if (!this.seasonStart) {
      console.log('No season start date available, using fallback logic');
      return this.fallbackShowLogic(targetTime);
    }

    const dayOfWeek = targetTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const minutesFromMidnight = targetTime.getHours() * 60 + targetTime.getMinutes();
    
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
        isCurrentlyPlaying = minutesFromMidnight >= showStart || minutesFromMidnight < (showEnd - 1440);
      } else {
        // Normal show within the day
        isCurrentlyPlaying = minutesFromMidnight >= showStart && minutesFromMidnight < showEnd;
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
      const activeShow = this.getActiveShowForTimeSlot(shows, timeSlot, targetTime);
      if (activeShow) {
        return activeShow;
      }
    }
    
    return null;
  }

  private getActiveShowForTimeSlot(shows: Show[], timeSlot: number, targetTime: Date): Show | null {
    if (!this.seasonStart) return shows[0]; // Fallback to first show
    
    // Find the first matching weekday/time on or after the season start
    const firstSlotTime = this.findFirstSlotTime(timeSlot, targetTime.getDay());
    if (!firstSlotTime) return shows[0];
    
    // Calculate weeks since the first slot
    const weeksSince = Math.floor((targetTime.getTime() - firstSlotTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const cycleIndex = weeksSince % 4; // 0=week1, 1=week2, 2=week3, 3=week4
    
    console.log(`Time slot ${timeSlot}: weeksSince=${weeksSince}, cycleIndex=${cycleIndex}`);
    
    // Find the show that matches this cycle
    for (const show of shows) {
      const alternates = show.alternates;
      let shouldPlay = false;
      
      switch (alternates) {
        case 0: // Weekly show
          shouldPlay = true;
          break;
        case 1: // Weeks 1 & 3 (first of every 2 weeks)
          shouldPlay = (weeksSince % 2) === 0;
          break;
        case 2: // Weeks 2 & 4 (second of every 2 weeks)
          shouldPlay = (weeksSince % 2) === 1;
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
        console.log(`Selected show: ${show.name} (alternates=${alternates})`);
        return show;
      }
    }
    
    // If no show matches, return the first one as fallback
    return shows[0];
  }

  private findFirstSlotTime(timeSlot: number, targetDayOfWeek: number): Date | null {
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
    const minutesFromMidnight = targetTime.getHours() * 60 + targetTime.getMinutes();
    
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
        return minutesFromMidnight >= showStart || minutesFromMidnight < (showEnd - 1440);
      } else {
        return minutesFromMidnight >= showStart && minutesFromMidnight < showEnd;
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
    const showGroups: ShowGroup[] = Array.from(groups.entries()).map(([showId, songs]) => ({
      showName: songs[0].showName, // All songs in group have same show name
      songs: songs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
    }));

    // Sort groups by most recent song and ensure songs within each group are sorted
    const sortedGroups = showGroups.map(group => ({
      ...group,
      // Double-check that songs are sorted newest first within each group
      songs: group.songs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
    })).sort((a, b) => 
      // Sort groups by most recent song
      b.songs[0].playedAt.getTime() - a.songs[0].playedAt.getTime()
    );
    
    // Debug: log the first few songs from each group
    console.log('Final sorted groups:');
    sortedGroups.forEach((group, groupIndex) => {
      if (groupIndex < 2) { // First 2 groups
        console.log(`Group ${groupIndex + 1}: ${group.showName}`);
        group.songs.slice(0, 5).forEach((song, songIndex) => {
          console.log(`  Song ${songIndex + 1}: "${song.title}" at ${song.playedAt.toLocaleString()}`);
        });
      }
    });
    
    return sortedGroups;
  }
}