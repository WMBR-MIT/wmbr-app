# Phase 1: Migrate PlaylistService

## Why Start Here?

`PlaylistService` is the simplest service:
- Just fetches data from an API
- Has basic in-memory caching
- No subscriptions or complex state
- Only used in a few places

## Current Implementation

```typescript
// services/PlaylistService.ts
export class PlaylistService {
  private static instance: PlaylistService;
  private cache = new Map<string, PlaylistResponse>();

  static getInstance(): PlaylistService { ... }
  
  async fetchPlaylist(showName: string, date: string): Promise<PlaylistResponse> {
    // Check cache, fetch from API, parse date, cache result
  }
}
```

## New Implementation

### Step 1.1: Create utility function for API call

Create `utils/api/playlist.ts`:

```typescript
export async function fetchPlaylist(
  showName: string, 
  date: string
): Promise<PlaylistResponse> {
  const formattedDate = formatDateForAPI(date);
  const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodeURIComponent(showName)}&date=${formattedDate}`;
  
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status}`);
  }
  
  return response.json();
}

function formatDateForAPI(dateString: string): string {
  // Date formatting logic (extract from current service)
}
```

### Step 1.2: Create custom hook with caching

Create `hooks/usePlaylist.ts`:

```typescript
import { useState, useEffect } from 'react';
import { fetchPlaylist } from '../utils/api/playlist';

// Simple in-memory cache outside the hook
const playlistCache = new Map<string, PlaylistResponse>();

export function usePlaylist(showName: string, date: string) {
  const [data, setData] = useState<PlaylistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cacheKey = `${showName}-${date}`;
    
    // Check cache first
    if (playlistCache.has(cacheKey)) {
      setData(playlistCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Fetch from API
    let cancelled = false;
    
    fetchPlaylist(showName, date)
      .then(result => {
        if (!cancelled) {
          playlistCache.set(cacheKey, result);
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showName, date]);

  return { data, loading, error };
}
```

### Step 1.3: Find components using PlaylistService

Search for usage:
```bash
grep -r "PlaylistService" pages/ components/
```

Expected locations:
- Maybe in ShowDetails page?
- Archive playback UI?

### Step 1.4: Update one component to use new hook

Before:
```typescript
import { PlaylistService } from '../services/PlaylistService';

function MyComponent() {
  const [playlist, setPlaylist] = useState(null);
  
  useEffect(() => {
    PlaylistService.getInstance()
      .fetchPlaylist(showName, date)
      .then(setPlaylist);
  }, [showName, date]);
  
  // ...
}
```

After:
```typescript
import { usePlaylist } from '../hooks/usePlaylist';

function MyComponent() {
  const { data: playlist, loading, error } = usePlaylist(showName, date);
  
  // ...
}
```

### Step 1.5: Test thoroughly

- Verify playlist loads correctly
- Check that caching works (no duplicate network calls)
- Test error states
- Ensure date formatting still works

### Step 1.6: Migrate remaining components

Repeat step 1.4 for all components using PlaylistService.

### Step 1.7: Delete old service

Once no components reference `PlaylistService`:
```bash
rm services/PlaylistService.ts
```

Update imports if needed.

## Testing Strategy

### Unit Tests

Test the utility function in isolation:
```typescript
// __tests__/utils/api/playlist.test.ts
describe('fetchPlaylist', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('fetches playlist with correct URL', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ songs: [] })
    });

    await fetchPlaylist('My Show', '2025-01-15');
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('My%20Show'),
      expect.any(Object)
    );
  });
});
```

### Integration Tests

Test the hook with a component:
```typescript
// __tests__/hooks/usePlaylist.test.ts
import { renderHook } from '@testing-library/react-native';
import { usePlaylist } from '../../hooks/usePlaylist';

describe('usePlaylist', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => usePlaylist('Show', '2025-01-15'));
    expect(result.current.loading).toBe(true);
  });
});
```

## Benefits After Phase 1

- ✅ Simpler to test (just mock fetch, not getInstance)
- ✅ Clearer component code (declarative hook usage)
- ✅ One service migrated, pattern established
- ✅ Team familiar with new patterns
- ✅ Old services still work (no breaking changes)

## Estimated Effort

- Create utilities and hook: 30 minutes
- Find and update components: 1-2 hours
- Write tests: 1 hour
- **Total: ~3 hours**
