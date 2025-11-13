# Phase 4: Migrate Stateful Services (Metadata, Archive, AudioPreview)

## Why Last?

These three services are different from the data-fetching services:
- They manage **playback state** (what's playing, progress, etc.)
- They use **subscriptions** to notify components of changes
- They interact with **TrackPlayer** (side effects)
- They're already using a subscription pattern similar to Context

Good news: Context is perfect for this use case!

## Three Services to Migrate

1. **MetadataService** - Polls live stream metadata, notifies listeners
2. **ArchiveService** - Manages archive playback state
3. **AudioPreviewService** - Manages preview playback state

## Phase 4A: Migrate MetadataService

### Current Implementation

```typescript
class MetadataService {
  private static instance: MetadataService;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: ((data: ShowInfo) => void)[] = [];
  private songHistoryListeners: ((songs: Song[]) => void)[] = [];

  subscribe(callback): () => void { ... }
  subscribeSongHistory(callback): () => void { ... }
  startPolling(intervalMs = 15000): void { ... }
  stopPolling(): void { ... }
  async fetchMetadata(): Promise<ShowInfo | null> { ... }
}
```

### New Implementation

Create `contexts/MetadataContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchMetadata, parseSongHistory } from '../utils/api/metadata';

export interface ShowInfo {
  showTitle: string;
  hosts?: string;
  description?: string;
  currentSong?: string;
  currentArtist?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  timestamp: string;
}

interface MetadataContextValue {
  showInfo: ShowInfo | null;
  songHistory: Song[];
  loading: boolean;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  isPolling: boolean;
}

const MetadataContext = createContext<MetadataContextValue | undefined>(undefined);

export function MetadataProvider({ children }: { children: React.ReactNode }) {
  const [showInfo, setShowInfo] = useState<ShowInfo | null>(null);
  const [songHistory, setSongHistory] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetch('https://wmbr.org/dynamic.xml', {
        method: 'GET',
        headers: { 'Accept': 'application/xml, text/xml' },
      });

      if (response.ok) {
        const xmlText = await response.text();
        const metadata = await fetchMetadata(xmlText);
        const songs = parseSongHistory(xmlText);
        
        setShowInfo(metadata);
        setSongHistory(songs);
      }
    } catch (error) {
      // Handle error - set fallback data
      setShowInfo({
        showTitle: 'WMBR 88.1 FM',
        hosts: undefined,
        description: undefined,
      });
    }
  }, []);

  const startPolling = useCallback((intervalMs = 15000) => {
    // Stop any existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Poll immediately
    poll();

    // Set up interval
    const interval = setInterval(poll, intervalMs);
    setPollInterval(interval);
  }, [poll, pollInterval]);

  const stopPolling = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  return (
    <MetadataContext.Provider
      value={{
        showInfo,
        songHistory,
        loading,
        startPolling,
        stopPolling,
        isPolling: pollInterval !== null,
      }}
    >
      {children}
    </MetadataContext.Provider>
  );
}

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata must be used within MetadataProvider');
  }
  return context;
}
```

### Extract parsing utilities

Create `utils/api/metadata.ts`:

```typescript
import { debugLog, debugError } from '../Debug';

export interface ShowInfo {
  showTitle: string;
  hosts?: string;
  description?: string;
  currentSong?: string;
  currentArtist?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  timestamp: string;
}

export async function fetchMetadata(xmlText: string): Promise<ShowInfo> {
  // Extract all the parsing logic from MetadataService.parseWMBRXML
  // This becomes a pure function
  try {
    const showMatch = xmlText.match(/<wmbr_show>(.*?)<\/wmbr_show>/s);
    if (!showMatch) {
      return getFallbackData();
    }

    const showContent = showMatch[1];
    const decodedContent = decodeHTMLEntities(showContent);
    
    // ... rest of parsing logic (extract from current service)
    
    return {
      showTitle: 'parsed title',
      // ... etc
    };
  } catch (error) {
    debugError('Error parsing metadata:', error);
    return getFallbackData();
  }
}

export function parseSongHistory(xmlText: string): Song[] {
  // Extract all the parsing logic from MetadataService.parseSongHistory
  try {
    const playsMatch = xmlText.match(/<wmbr_plays>(.*?)<\/wmbr_plays>/s);
    if (!playsMatch) {
      return [];
    }

    // ... rest of parsing logic
    
    return songs;
  } catch (error) {
    debugError('Error parsing song history:', error);
    return [];
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFallbackData(): ShowInfo {
  return {
    showTitle: 'WMBR 88.1 FM',
    hosts: undefined,
    description: undefined,
  };
}
```

### Update components

Before:
```typescript
const metadata = MetadataService.getInstance();

useEffect(() => {
  const unsubscribe = metadata.subscribe(setShowInfo);
  metadata.startPolling();
  
  return () => {
    unsubscribe();
    metadata.stopPolling();
  };
}, []);
```

After:
```typescript
const { showInfo, songHistory, startPolling, stopPolling } = useMetadata();

useEffect(() => {
  startPolling();
  return () => stopPolling();
}, [startPolling, stopPolling]);
```

## Phase 4B: Migrate ArchiveService

### New Implementation

Create `contexts/ArchiveContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import TrackPlayer, { Track } from 'react-native-track-player';
import { Show, Archive } from '../types/RecentlyPlayed';
import { debugLog, debugError } from '../utils/Debug';
import { DEFAULT_NAME } from '../types/Playlist';

export interface ArchivePlaybackState {
  isPlayingArchive: boolean;
  currentArchive: Archive | null;
  currentShow: Show | null;
  liveStreamUrl: string;
}

interface ArchiveContextValue extends ArchivePlaybackState {
  playArchive: (archive: Archive, show: Show) => Promise<void>;
  switchToLive: (currentShowTitle?: string) => Promise<void>;
}

const ArchiveContext = createContext<ArchiveContextValue | undefined>(undefined);

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ArchivePlaybackState>({
    isPlayingArchive: false,
    currentArchive: null,
    currentShow: null,
    liveStreamUrl: 'https://wmbr.org:8002/hi',
  });

  const playArchive = useCallback(async (archive: Archive, show: Show) => {
    try {
      debugLog('Playing archive:', archive.url);
      
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      const archiveTrack: Track = {
        id: 'archive',
        url: archive.url,
        title: `${show.name} - Archive`,
        artist: `${DEFAULT_NAME} - ${archive.date}`,
        artwork: require('../assets/cover.png'),
      };

      await TrackPlayer.add(archiveTrack);
      await TrackPlayer.play();

      setState(prev => ({
        ...prev,
        isPlayingArchive: true,
        currentArchive: archive,
        currentShow: show,
      }));
    } catch (error) {
      debugError('Error playing archive:', error);
      throw error;
    }
  }, []);

  const switchToLive = useCallback(async (currentShowTitle?: string) => {
    try {
      debugLog('Switching to live stream');
      
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      const liveTrack: Track = {
        id: 'wmbr-stream',
        url: state.liveStreamUrl,
        title: DEFAULT_NAME,
        artist: currentShowTitle || 'Live Radio',
        artwork: require('../assets/cover.png'),
      };

      await TrackPlayer.add(liveTrack);
      await TrackPlayer.play();

      setState(prev => ({
        ...prev,
        isPlayingArchive: false,
        currentArchive: null,
        currentShow: null,
      }));
    } catch (error) {
      debugError('Error switching to live:', error);
      throw error;
    }
  }, [state.liveStreamUrl]);

  return (
    <ArchiveContext.Provider
      value={{
        ...state,
        playArchive,
        switchToLive,
      }}
    >
      {children}
    </ArchiveContext.Provider>
  );
}

export function useArchive() {
  const context = useContext(ArchiveContext);
  if (!context) {
    throw new Error('useArchive must be used within ArchiveProvider');
  }
  return context;
}
```

### Update components

Before:
```typescript
const archive = ArchiveService.getInstance();

useEffect(() => {
  const unsubscribe = archive.subscribe(setState);
  return unsubscribe;
}, []);

const handlePlay = () => {
  archive.playArchive(selectedArchive, show);
};
```

After:
```typescript
const { isPlayingArchive, currentArchive, playArchive, switchToLive } = useArchive();

const handlePlay = () => {
  playArchive(selectedArchive, show);
};
```

## Phase 4C: Migrate AudioPreviewService

### New Implementation

Create `contexts/AudioPreviewContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TrackPlayer, { Track, State, Event } from 'react-native-track-player';
import { debugError } from '../utils/Debug';

export interface PreviewState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  progress: number;
  url: string | null;
}

interface AudioPreviewContextValue extends PreviewState {
  playPreview: (url: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  isPlayingUrl: (url?: string) => boolean;
}

const AudioPreviewContext = createContext<AudioPreviewContextValue | undefined>(undefined);

export function AudioPreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PreviewState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  });
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [originalTrack, setOriginalTrack] = useState<Track | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

  // Event listeners
  useEffect(() => {
    const playbackStateListener = TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
      if (isPreviewMode) {
        setState(prev => ({
          ...prev,
          isPlaying: data.state === State.Playing,
        }));
      }
    });

    const progressListener = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (data) => {
      if (isPreviewMode) {
        setState(prev => ({
          ...prev,
          currentTime: data.position,
          duration: data.duration,
          progress: data.duration > 0 ? data.position / data.duration : 0,
        }));
      }
    });

    const queueEndedListener = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (isPreviewMode) {
        stop();
      }
    });

    return () => {
      playbackStateListener.remove();
      progressListener.remove();
      queueEndedListener.remove();
    };
  }, [isPreviewMode]);

  // Progress tracking
  useEffect(() => {
    if (isPreviewMode && state.isPlaying) {
      const interval = setInterval(async () => {
        try {
          const position = await TrackPlayer.getPosition();
          const duration = await TrackPlayer.getDuration();
          
          setState(prev => ({
            ...prev,
            currentTime: position,
            duration: duration,
            progress: duration > 0 ? position / duration : 0,
          }));
        } catch (error) {
          debugError('Error getting progress:', error);
        }
      }, 100);

      setProgressInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (progressInterval) {
      clearInterval(progressInterval);
      setProgressInterval(null);
    }
  }, [isPreviewMode, state.isPlaying]);

  const playPreview = useCallback(async (url: string) => {
    try {
      // Save current track if switching to preview
      if (!isPreviewMode) {
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          setOriginalTrack(queue[0]);
        }
      }

      setIsPreviewMode(true);

      const previewTrack: Track = {
        id: 'preview',
        url: url,
        title: 'Preview',
        artist: 'Apple Music Preview',
      };

      await TrackPlayer.reset();
      await TrackPlayer.add(previewTrack);
      
      setState({
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        progress: 0,
        url,
      });
      
      await TrackPlayer.play();
    } catch (error) {
      debugError('Error playing preview:', error);
      setIsPreviewMode(false);
      throw error;
    }
  }, [isPreviewMode]);

  const pause = useCallback(async () => {
    if (isPreviewMode && state.isPlaying) {
      await TrackPlayer.pause();
    }
  }, [isPreviewMode, state.isPlaying]);

  const resume = useCallback(async () => {
    if (isPreviewMode && !state.isPlaying) {
      await TrackPlayer.play();
    }
  }, [isPreviewMode, state.isPlaying]);

  const stop = useCallback(async () => {
    if (isPreviewMode) {
      if (progressInterval) {
        clearInterval(progressInterval);
        setProgressInterval(null);
      }

      await TrackPlayer.stop();
      await TrackPlayer.reset();
      
      if (originalTrack) {
        await TrackPlayer.add(originalTrack);
        setOriginalTrack(null);
      }
      
      setIsPreviewMode(false);
      setState({
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        progress: 0,
        url: null,
      });
    }
  }, [isPreviewMode, progressInterval, originalTrack]);

  const isPlayingUrl = useCallback((url?: string) => {
    if (url) {
      return state.isPlaying && state.url === url;
    }
    return state.isPlaying;
  }, [state.isPlaying, state.url]);

  return (
    <AudioPreviewContext.Provider
      value={{
        ...state,
        playPreview,
        pause,
        resume,
        stop,
        isPlayingUrl,
      }}
    >
      {children}
    </AudioPreviewContext.Provider>
  );
}

export function useAudioPreview() {
  const context = useContext(AudioPreviewContext);
  if (!context) {
    throw new Error('useAudioPreview must be used within AudioPreviewProvider');
  }
  return context;
}
```

### Update components

Before:
```typescript
const preview = AudioPreviewService.getInstance();

useEffect(() => {
  const unsubscribe = preview.subscribe(setState);
  return unsubscribe;
}, []);

const handlePlay = () => {
  preview.playPreview(url);
};
```

After:
```typescript
const { isPlaying, progress, playPreview, stop } = useAudioPreview();

const handlePlay = () => {
  playPreview(url);
};
```

## Phase 4D: Add all providers to App.tsx

```typescript
import { MetadataProvider } from './contexts/MetadataContext';
import { ArchiveProvider } from './contexts/ArchiveContext';
import { AudioPreviewProvider } from './contexts/AudioPreviewContext';
import { CurrentShowProvider } from './contexts/CurrentShowContext';

function App() {
  return (
    <MetadataProvider>
      <ArchiveProvider>
        <AudioPreviewProvider>
          <CurrentShowProvider>
            {/* existing app structure */}
          </CurrentShowProvider>
        </AudioPreviewProvider>
      </ArchiveProvider>
    </MetadataProvider>
  );
}
```

## Phase 4E: Delete old services

Once all components migrated:
```bash
rm services/MetadataService.ts
rm services/ArchiveService.ts
rm services/AudioPreviewService.ts
```

## Testing Strategy

### Test Context providers

```typescript
describe('MetadataContext', () => {
  it('provides metadata state', () => {
    const { result } = renderHook(() => useMetadata(), {
      wrapper: MetadataProvider
    });
    
    expect(result.current.showInfo).toBeNull();
    
    act(() => {
      result.current.startPolling(100);
    });
    
    // Wait for poll and verify state updated
  });
});
```

### Test parsing utilities

```typescript
describe('fetchMetadata', () => {
  it('parses show title correctly', async () => {
    const xml = '<wmbr_show>&lt;b&gt;Test Show&lt;/b&gt;</wmbr_show>';
    const result = await fetchMetadata(xml);
    expect(result.showTitle).toBe('Test Show');
  });
});
```

## Benefits After Phase 4

- ✅ All singleton services removed
- ✅ Consistent Context pattern for all stateful logic
- ✅ No more manual subscription management
- ✅ Pure parsing functions easy to test
- ✅ React DevTools can inspect all provider state
- ✅ Components are simpler and more declarative

## Estimated Effort

- Create MetadataContext + utilities: 2 hours
- Create ArchiveContext: 1 hour
- Create AudioPreviewContext: 1.5 hours
- Update components using these services: 3-4 hours
- Write tests: 2-3 hours
- **Total: ~10-12 hours**
