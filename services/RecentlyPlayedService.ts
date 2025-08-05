import { RecentlyPlayedSong, Show, Archive, ProcessedSong, ShowGroup } from '../types/RecentlyPlayed';
import { parseString } from 'react-native-xml2js';

export class RecentlyPlayedService {
  private static instance: RecentlyPlayedService;
  private songsCache: ProcessedSong[] = [];
  private showsCache: Show[] = [];
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): RecentlyPlayedService {
    if (!RecentlyPlayedService.instance) {
      RecentlyPlayedService.instance = new RecentlyPlayedService();
    }
    return RecentlyPlayedService.instance;
  }

  async fetchRecentlyPlayed(forceRefresh = false): Promise<ShowGroup[]> {
    const now = Date.now();
    
    // Use cache if recent and not forcing refresh
    if (!forceRefresh && now - this.lastFetch < this.CACHE_DURATION && this.songsCache.length > 0) {
      return this.groupSongsByShow(this.songsCache);
    }

    try {
      // Fetch both APIs in parallel
      const [songsResponse, showsResponse] = await Promise.all([
        fetch('https://wmbr.alexandersimoes.com/'),
        fetch('https://wmbr.org/cgi-bin/xmlarch')
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
                  if (archive.url && archive.date) {
                    archives.push({
                      url: archive.url,
                      date: archive.date,
                      size: archive.size || '0'
                    });
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
                archives
              });
            }
          });
          
          console.log('Parsed shows count:', shows.length);
          console.log('Sample shows:', shows.slice(0, 3).map(s => `${s.name} - Day ${s.day} at ${s.time_str} (${s.time} mins)`));
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
      
      // Check if this song is the same as the previous one
      if (i > 0) {
        const prevSong = processed[processed.length - 1];
        
        if (prevSong && 
            prevSong.title.toLowerCase() === currentSong.title.toLowerCase() && 
            prevSong.artist.toLowerCase() === currentSong.artist.toLowerCase()) {
          
          // Same song as previous - check if it's within a reasonable time window (10 minutes)
          const timeDiff = Math.abs(prevSong.playedAt.getTime() - currentSong.playedAt.getTime());
          if (timeDiff < 10 * 60 * 1000) { // 10 minutes
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
      
      // Create date object (month is 0-indexed)
      const date = new Date(year, month - 1, day, hour, minute, second);
      
      return date;
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      return new Date(); // Return current date as fallback
    }
  }

  private findShowForTimestamp(timestamp: Date): { name: string; id: string } {
    const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const minutesFromMidnight = timestamp.getHours() * 60 + timestamp.getMinutes();
    
    console.log('Finding show for:', timestamp.toString(), 'Day:', dayOfWeek, 'Minutes:', minutesFromMidnight);
    
    // Find shows for this day of the week AND previous day (for midnight crossover)
    const todayShows = this.showsCache.filter(show => {
      if (show.day === 7) {
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
      }
      return show.day === dayOfWeek;
    });
    
    const prevDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const yesterdayShows = this.showsCache.filter(show => {
      if (show.day === 7) {
        return prevDay >= 1 && prevDay <= 5; // Monday-Friday
      }
      return show.day === prevDay;
    });
    
    console.log('Shows for today:', todayShows.map(s => `${s.name} (${s.time_str})`));
    console.log('Shows for yesterday:', yesterdayShows.map(s => `${s.name} (${s.time_str})`));
    
    // Check for shows that cross midnight from yesterday
    const midnightCrossoverShows = yesterdayShows.filter(show => {
      const showStart = show.time;
      const showEnd = showStart + show.length;
      
      // Show crosses midnight if it ends after 1440 minutes (24 hours)
      if (showEnd > 1440) {
        const endMinutesToday = showEnd - 1440; // Minutes into today
        // Song is in this show if it's before the show ends today
        return minutesFromMidnight < endMinutesToday;
      }
      return false;
    });
    
    if (midnightCrossoverShows.length > 0) {
      // Sort by start time (most recent first)
      midnightCrossoverShows.sort((a, b) => b.time - a.time);
      console.log('Found midnight crossover show:', midnightCrossoverShows[0].name);
      return { name: midnightCrossoverShows[0].name, id: midnightCrossoverShows[0].id };
    }
    
    // Check for currently playing shows today
    const currentShows = todayShows.filter(show => {
      const showStart = show.time;
      const showEnd = showStart + show.length;
      
      // Handle shows that might cross midnight
      if (showEnd > 1440) {
        // Show crosses midnight, check if we're in the first part (today)
        return minutesFromMidnight >= showStart;
      } else {
        // Normal show within the day
        return minutesFromMidnight >= showStart && minutesFromMidnight < showEnd;
      }
    });
    
    if (currentShows.length > 0) {
      console.log('Found current show:', currentShows[0].name);
      return { name: currentShows[0].name, id: currentShows[0].id };
    }
    
    // Find the most recently started show today
    const recentShows = todayShows.filter(show => {
      return show.time <= minutesFromMidnight;
    });
    
    // Sort by start time (most recent first)
    recentShows.sort((a, b) => b.time - a.time);
    
    if (recentShows.length > 0) {
      console.log('Found recent show:', recentShows[0].name);
      return { name: recentShows[0].name, id: recentShows[0].id };
    }
    
    // Also check archives for better matching
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