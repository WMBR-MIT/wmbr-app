# Phase 3: Migrate RecentlyPlayedService

## Why Third?

`RecentlyPlayedService` is the most complex data-fetching service:
- Multiple API endpoints (playlists, archive XML)
- Complex data processing (grouping, deduplication, show matching)
- Has both data fetching AND state management (current show subscriptions)
- Used across multiple pages

We'll split this into:
1. **Data fetching** → hooks and utilities
2. **Current show state** → Context provider (like metadata/archive services)

## Current Implementation Analysis

```typescript
export class RecentlyPlayedService {
  // STATE - needs Context
  private currentShow: string | null = null;
  private currentShowSubscribers: Array<...> = [];
  
  // CACHE - can be module-level
  private songsCache: ProcessedSong[] = [];
  private showsCache: Show[] = [];
  private seasonStart: Date | null = null;
  private lastFetch: number = 0;
  
  // DATA FETCHING - becomes hooks
  async fetchRecentlyPlayed(forceRefresh = false): Promise<ShowGroup[]>
  async fetchShowsCacheOnly(forceRefresh = false): Promise<Show[]>
  async fetchPlaylistAsSongs(showName, date, signal?): Promise<ProcessedSong[]>
  
  // STATE MANAGEMENT - becomes Context
  setCurrentShow(show: string | null)
  getCurrentShow(): string | null
  subscribeToCurrentShow(callback): () => void
  
  // UTILITIES - become pure functions
  getShowByName(name: string): Show | undefined
  private parseShowsXML(xmlString: string): Promise<Show[]>
  private groupSongsByShow(songs: ProcessedSong[]): ShowGroup[]
  // ... many other private methods
}
```

## New Implementation

### Step 3.1: Create XML parsing utilities

Create `utils/api/archives.ts`:

```typescript
import { parseString } from 'react-native-xml2js';
import { Show, Archive } from '../../types/RecentlyPlayed';
import { debugLog, debugError } from '../Debug';

export async function fetchShowArchives(): Promise<{
  shows: Show[];
  seasonStart: Date | null;
}> {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      `https://wmbr.org/cgi-bin/xmlarch?t=${timestamp}`,
      { headers: { 'Cache-Control': 'no-cache' } }
    );
    
    if (!response.ok) {
      throw new Error(`Archive fetch failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    return parseShowsXML(xmlText);
  } catch (error) {
    debugError('Error fetching show archives:', error);
    throw error;
  }
}

function parseShowsXML(xmlString: string): Promise<{
  shows: Show[];
  seasonStart: Date | null;
}> {
  return new Promise((resolve) => {
    parseString(xmlString, { explicitArray: false }, (err, result) => {
      if (err) {
        debugError('Error parsing shows XML:', err);
        resolve({ shows: [], seasonStart: null });
        return;
      }

      try {
        // Parse season start
        let seasonStart: Date | null = null;
        if (result?.wmbr_archives?.$ && result.wmbr_archives.$.season_start) {
          seasonStart = new Date(result.wmbr_archives.$.season_start);
        }
        
        const shows: Show[] = [];
        const showsData = result?.wmbr_archives?.show;
        
        if (!showsData) {
          resolve({ shows: [], seasonStart });
          return;
        }

        const showArray = Array.isArray(showsData) ? showsData : [showsData];
        
        showArray.forEach((showData: any) => {
          if (showData.$ && showData.$.id && showData.name) {
            const archives: Archive[] = [];
            
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
              archives
            });
          }
        });
        
        resolve({ shows, seasonStart });
      } catch (error) {
        debugError('Error processing parsed XML:', error);
        resolve({ shows: [], seasonStart: null });
      }
    });
  });
}
```

### Step 3.2: Create playlist fetching utilities

Create `utils/api/recentlyPlayed.ts`:

```typescript
import { ProcessedSong, ShowGroup } from '../../types/RecentlyPlayed';
import { ScheduleShow } from '../../types/Schedule';
import { debugLog, debugError } from '../Debug';
import { parsePlaylistTimestamp } from '../DateTime';

interface PlaylistSong {
  time: string;
  artist: string;
  song: string;
  album?: string | null;
}

interface PlaylistResponse {
  show_name: string;
  date: string;
  playlist_id: string | number;
  songs: PlaylistSong[];
}

export async function fetchPlaylistForShow(
  showName: string,
  date: string,
  signal?: AbortSignal
): Promise<ProcessedSong[]> {
  try {
    const encodedShowName = encodeURIComponent(showName);
    const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${date}`;
    
    debugLog(`Fetching playlist for "${showName}" on ${date}`);
    
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' },
      signal
    });
    
    if (!response.ok) {
      debugError(`Playlist fetch failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.error) {
      return [];
    }
    
    const playlist: PlaylistResponse = data;
    if (!playlist.songs || playlist.songs.length === 0) {
      return [];
    }

    const songs: ProcessedSong[] = playlist.songs.map((song) => ({
      title: song.song?.trim() || '',
      artist: song.artist?.trim() || '',
      album: song.album?.trim() || undefined,
      released: undefined,
      appleStreamLink: '',
      playedAt: parsePlaylistTimestamp(song.time),
      showName: playlist.show_name,
      showId: `${playlist.show_name}-${playlist.date}`,
    }));

    songs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
    return songs;
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      debugLog('Playlist fetch aborted');
      return [];
    }
    debugError(`Error fetching playlist:`, err);
    return [];
  }
}
```

### Step 3.3: Create data processing utilities

Create `utils/recentlyPlayed.ts`:

```typescript
import { ProcessedSong, ShowGroup, Show } from '../types/RecentlyPlayed';
import { debugLog } from './Debug';

/**
 * Deduplicates songs by title+artist within 10 minutes
 */
export function deduplicateAndSortSongs(songs: ProcessedSong[]): ProcessedSong[] {
  const now = new Date();
  
  const validSongs = songs
    .filter(song => song.playedAt.getTime() <= now.getTime())
    .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
  
  const deduplicated: ProcessedSong[] = [];
  
  for (const currentSong of validSongs) {
    const isDuplicate = deduplicated.some(prevSong => {
      const isSameSong = 
        prevSong.title.toLowerCase() === currentSong.title.toLowerCase() && 
        prevSong.artist.toLowerCase() === currentSong.artist.toLowerCase();
      
      if (isSameSong) {
        const timeDiff = Math.abs(prevSong.playedAt.getTime() - currentSong.playedAt.getTime());
        if (timeDiff < 10 * 60 * 1000) {
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

/**
 * Groups songs by show
 */
export function groupSongsByShow(songs: ProcessedSong[]): ShowGroup[] {
  const groups = new Map<string, ProcessedSong[]>();
  
  songs.forEach(song => {
    if (!groups.has(song.showId)) {
      groups.set(song.showId, []);
    }
    groups.get(song.showId)!.push(song);
  });

  const showGroups: ShowGroup[] = Array.from(groups.entries()).map(([, showSongs]) => ({
    showName: showSongs[0].showName,
    songs: showSongs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
  }));

  return showGroups.sort((a, b) => 
    b.songs[0].playedAt.getTime() - a.songs[0].playedAt.getTime()
  );
}

/**
 * Finds show by name in cache
 */
export function findShowByName(shows: Show[], name: string): Show | undefined {
  return shows.find(s => s.name.toLowerCase() === name.toLowerCase());
}
```

### Step 3.4: Create hooks for data fetching

Create `hooks/useShowArchives.ts`:

```typescript
import { useState, useEffect } from 'react';
import { Show } from '../types/RecentlyPlayed';
import { fetchShowArchives } from '../utils/api/archives';

// Module-level cache
let archivesCache: {
  shows: Show[];
  seasonStart: Date | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useShowArchives(forceRefresh = false) {
  const [shows, setShows] = useState<Show[]>([]);
  const [seasonStart, setSeasonStart] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const now = Date.now();
      
      // Check cache
      if (!forceRefresh && archivesCache) {
        if (now - archivesCache.timestamp < CACHE_DURATION) {
          setShows(archivesCache.shows);
          setSeasonStart(archivesCache.seasonStart);
          setLoading(false);
          return;
        }
      }

      try {
        const result = await fetchShowArchives();
        
        if (!cancelled) {
          archivesCache = {
            shows: result.shows,
            seasonStart: result.seasonStart,
            timestamp: now
          };
          
          setShows(result.shows);
          setSeasonStart(result.seasonStart);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [forceRefresh]);

  return { shows, seasonStart, loading, error };
}
```

Create `hooks/useRecentlyPlayed.ts`:

```typescript
import { useState, useEffect } from 'react';
import { ShowGroup, ProcessedSong } from '../types/RecentlyPlayed';
import { useSchedule } from './useSchedule';
import { useShowArchives } from './useShowArchives';
import { fetchPlaylistForShow } from '../utils/api/recentlyPlayed';
import { deduplicateAndSortSongs, groupSongsByShow } from '../utils/recentlyPlayed';
import { debugLog } from '../utils/Debug';

export function useRecentlyPlayed(forceRefresh = false) {
  const [groups, setGroups] = useState<ShowGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { shows: scheduleShows, loading: scheduleLoading } = useSchedule();
  const { shows: archiveShows, loading: archivesLoading } = useShowArchives();

  useEffect(() => {
    if (scheduleLoading || archivesLoading) return;
    
    let cancelled = false;

    async function load() {
      try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Get shows playing today
        const dayOfWeek = today.getDay();
        const todayShows = scheduleShows.filter(show => {
          if (show.day === 7) {
            return dayOfWeek >= 1 && dayOfWeek <= 5;
          }
          return show.day === dayOfWeek;
        });
        
        debugLog(`Found ${todayShows.length} shows playing today`);
        
        // Fetch playlists for all shows
        const playlistPromises = todayShows.map(show => 
          fetchPlaylistForShow(show.name, dateStr)
        );
        
        const playlistResults = await Promise.allSettled(playlistPromises);
        
        const allSongs: ProcessedSong[] = [];
        playlistResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            allSongs.push(...result.value);
          }
        });
        
        if (!cancelled) {
          const deduplicated = deduplicateAndSortSongs(allSongs);
          const grouped = groupSongsByShow(deduplicated);
          setGroups(grouped);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [scheduleShows, archiveShows, scheduleLoading, archivesLoading, forceRefresh]);

  return { groups, loading, error };
}
```

### Step 3.5: Create Context for current show state

Create `contexts/CurrentShowContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

interface CurrentShowContextValue {
  currentShow: string | null;
  setCurrentShow: (show: string | null) => void;
}

const CurrentShowContext = createContext<CurrentShowContextValue | undefined>(undefined);

export function CurrentShowProvider({ children }: { children: React.ReactNode }) {
  const [currentShow, setCurrentShow] = useState<string | null>(null);

  const handleSetCurrentShow = useCallback((show: string | null) => {
    setCurrentShow(show);
  }, []);

  return (
    <CurrentShowContext.Provider value={{ currentShow, setCurrentShow: handleSetCurrentShow }}>
      {children}
    </CurrentShowContext.Provider>
  );
}

export function useCurrentShow() {
  const context = useContext(CurrentShowContext);
  if (!context) {
    throw new Error('useCurrentShow must be used within CurrentShowProvider');
  }
  return context;
}
```

### Step 3.6: Add provider to App.tsx

```typescript
import { CurrentShowProvider } from './contexts/CurrentShowContext';

function App() {
  return (
    <CurrentShowProvider>
      {/* existing app structure */}
    </CurrentShowProvider>
  );
}
```

### Step 3.7: Update components

Before:
```typescript
const service = RecentlyPlayedService.getInstance();

useEffect(() => {
  service.fetchRecentlyPlayed().then(setGroups);
  
  const unsubscribe = service.subscribeToCurrentShow(setCurrentShow);
  return unsubscribe;
}, []);
```

After:
```typescript
const { groups, loading, error } = useRecentlyPlayed();
const { currentShow, setCurrentShow } = useCurrentShow();
```

### Step 3.8: Delete old service

Once migration complete:
```bash
rm services/RecentlyPlayedService.ts
```

## Testing Strategy

Test utilities in isolation:
```typescript
describe('deduplicateAndSortSongs', () => {
  it('removes duplicates within 10 minutes', () => {
    const now = new Date();
    const songs = [
      { title: 'Song', artist: 'Artist', playedAt: now },
      { title: 'Song', artist: 'Artist', playedAt: new Date(now.getTime() - 5 * 60 * 1000) }
    ];
    
    const result = deduplicateAndSortSongs(songs);
    expect(result).toHaveLength(1);
  });
});
```

Test Context:
```typescript
describe('CurrentShowContext', () => {
  it('provides current show state', () => {
    const { result } = renderHook(() => useCurrentShow(), {
      wrapper: CurrentShowProvider
    });
    
    act(() => {
      result.current.setCurrentShow('Test Show');
    });
    
    expect(result.current.currentShow).toBe('Test Show');
  });
});
```

## Benefits After Phase 3

- ✅ Complex data processing split into testable utilities
- ✅ State management through React Context (no manual subscriptions)
- ✅ Hooks compose nicely (useRecentlyPlayed uses useSchedule and useShowArchives)
- ✅ All data-fetching services now migrated

## Estimated Effort

- Create API utilities: 2 hours
- Create processing utilities: 1 hour
- Create hooks: 2 hours
- Create Context: 1 hour
- Update components: 3-4 hours
- Write tests: 3 hours
- **Total: ~12-14 hours**
