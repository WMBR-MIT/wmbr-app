# Phase 2: Migrate ScheduleService

## Why Second?

`ScheduleService` is slightly more complex than Playlist:
- Fetches and parses XML
- Has helper methods (groupShowsByDay, findPreviousShow)
- No stateful subscriptions (just data fetching)
- Widely used across the app

## Current Implementation

```typescript
export class ScheduleService {
  private static instance: ScheduleService;
  private readonly scheduleUrl = 'https://wmbr.org/cgi-bin/xmlsched';

  static getInstance(): ScheduleService { ... }
  
  async fetchSchedule(): Promise<ScheduleResponse> { ... }
  private parseShows(xmlResult: any): ScheduleShow[] { ... }
  groupShowsByDay(shows: ScheduleShow[]): { [key: string]: ScheduleShow[] } { ... }
  formatTime(timeStr: string): string { ... }
  async findPreviousShow(currentShowName: string): Promise<...> { ... }
}
```

## New Implementation

### Step 2.1: Create API utility

Create `utils/api/schedule.ts`:

```typescript
import { parseString } from 'react-native-xml2js';
import { ScheduleShow, ScheduleResponse } from '../../types/Schedule';
import { debugLog, debugError } from '../Debug';

const SCHEDULE_URL = 'https://wmbr.org/cgi-bin/xmlsched';

export async function fetchSchedule(): Promise<ScheduleResponse> {
  try {
    const response = await fetch(SCHEDULE_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const xmlText = await response.text();
    const shows = await parseScheduleXML(xmlText);
    
    return { shows };
  } catch (error) {
    debugError('Error fetching schedule:', error);
    throw error;
  }
}

async function parseScheduleXML(xmlText: string): Promise<ScheduleShow[]> {
  return new Promise((resolve, reject) => {
    parseString(xmlText, (err, result) => {
      if (err) {
        reject(new Error(`XML parsing error: ${err.message}`));
        return;
      }
      
      try {
        const shows = parseShows(result);
        debugLog('Parsed shows:', shows.length);
        resolve(shows);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function parseShows(xmlResult: any): ScheduleShow[] {
  // Extract parsing logic from current service
  if (!xmlResult?.wmbr_schedule?.show) {
    return [];
  }

  const showsArray = Array.isArray(xmlResult.wmbr_schedule.show) 
    ? xmlResult.wmbr_schedule.show 
    : [xmlResult.wmbr_schedule.show];

  return showsArray.map((show: any) => ({
    id: show.$.id || '',
    name: show.name?.[0] || '',
    day: parseInt(show.day?.[0] || '0', 10),
    day_str: show.day_str?.[0] || '',
    time: show.time?.[0] || '',
    time_str: show.time_str?.[0] || '',
    length: parseInt(show.length?.[0] || '0', 10),
    alternates: parseInt(show.alternates?.[0] || '0', 10),
    hosts: show.hosts?.[0] || '',
    multihosts: parseInt(show.multihosts?.[0] || '0', 10),
    producers: show.producers?.[0] || '',
    url: show.url?.[0] || '',
    email: show.email?.[0] || '',
    description: show.description?.[0] || '',
  }));
}
```

### Step 2.2: Create transformation utilities

Create `utils/schedule.ts`:

```typescript
import { ScheduleShow } from '../types/Schedule';

/**
 * Groups shows by day of the week.
 * Handles weekday shows (day=7) by duplicating them for Mon-Fri.
 */
export function groupShowsByDay(shows: ScheduleShow[]): { [key: string]: ScheduleShow[] } {
  const grouped: { [key: string]: ScheduleShow[] } = {};
  
  shows.forEach(show => {
    if (show.day === 7) {
      // Weekday show (Monday-Friday)
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      weekdays.forEach(day => {
        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(show);
      });
    } else {
      // Regular show for specific day
      const day = show.day_str || 'Unknown';
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(show);
    }
  });

  // Sort shows within each day by time
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => {
      const timeA = parseInt(a.time, 10);
      const timeB = parseInt(b.time, 10);
      return timeA - timeB;
    });
  });

  return grouped;
}

/**
 * Determines if an alternating show is active for the given date.
 */
export function isAlternatingShowActive(show: ScheduleShow, targetDate: Date): boolean {
  if (show.alternates === 0) {
    return true; // Non-alternating show is always active
  }
  
  const referenceDate = new Date('2024-09-01T00:00:00-04:00');
  const targetDateEastern = new Date(targetDate.toLocaleString("en-US", {timeZone: "America/New_York"}));
  
  const daysDiff = Math.floor((targetDateEastern.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeksSince = Math.floor(daysDiff / 7);
  
  return weeksSince % 2 === 0;
}

/**
 * Finds the previous show in the schedule based on current show name.
 */
export async function findPreviousShow(
  currentShowName: string,
  scheduleShows: ScheduleShow[]
): Promise<{show: ScheduleShow, date: string} | null> {
  // Extract all the findPreviousShow logic from current service
  // This becomes a pure function that takes shows as input
  // (implementation omitted for brevity - copy from current service)
}
```

### Step 2.3: Create custom hook

Create `hooks/useSchedule.ts`:

```typescript
import { useState, useEffect } from 'react';
import { ScheduleShow } from '../types/Schedule';
import { fetchSchedule } from '../utils/api/schedule';

// In-memory cache with timestamp
let scheduleCache: { shows: ScheduleShow[], timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSchedule(forceRefresh = false) {
  const [shows, setShows] = useState<ScheduleShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      // Check cache if not forcing refresh
      if (!forceRefresh && scheduleCache) {
        const now = Date.now();
        if (now - scheduleCache.timestamp < CACHE_DURATION) {
          setShows(scheduleCache.shows);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetchSchedule();
        
        if (!cancelled) {
          scheduleCache = {
            shows: response.shows,
            timestamp: Date.now()
          };
          setShows(response.shows);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [forceRefresh]);

  return { shows, loading, error };
}
```

### Step 2.4: Create optional helper hooks

Create `hooks/useScheduleByDay.ts`:

```typescript
import { useMemo } from 'react';
import { useSchedule } from './useSchedule';
import { groupShowsByDay } from '../utils/schedule';

export function useScheduleByDay(forceRefresh = false) {
  const { shows, loading, error } = useSchedule(forceRefresh);
  
  const groupedShows = useMemo(() => {
    return groupShowsByDay(shows);
  }, [shows]);

  return { groupedShows, loading, error };
}
```

### Step 2.5: Update components gradually

Priority order:
1. **SchedulePage** - Main schedule display
2. **RecentlyPlayed** components (may use findPreviousShow)
3. Any other components using schedule data

Before:
```typescript
const scheduleService = ScheduleService.getInstance();
const [schedule, setSchedule] = useState([]);

useEffect(() => {
  scheduleService.fetchSchedule()
    .then(data => {
      const grouped = scheduleService.groupShowsByDay(data.shows);
      setSchedule(grouped);
    });
}, []);
```

After:
```typescript
const { groupedShows, loading, error } = useScheduleByDay();

// groupedShows is already processed and ready to use
```

### Step 2.6: Handle special cases

For `findPreviousShow`, since it's used by RecentlyPlayedService (which we're migrating later), we have two options:

**Option A**: Keep it available as a utility function
```typescript
// In utils/schedule.ts - export as standalone function
export async function findPreviousShow(currentShowName: string): Promise<...> {
  // Fetch schedule internally if needed
  const { shows } = await fetchSchedule();
  // ... rest of logic
}
```

**Option B**: Create a specialized hook
```typescript
// hooks/usePreviousShow.ts
export function usePreviousShow(currentShowName: string | null) {
  const { shows } = useSchedule();
  const [previousShow, setPreviousShow] = useState(null);

  useEffect(() => {
    if (!currentShowName || !shows.length) return;
    
    findPreviousShow(currentShowName, shows)
      .then(setPreviousShow);
  }, [currentShowName, shows]);

  return previousShow;
}
```

Choose Option A for now to keep things simple.

### Step 2.7: Delete old service

Once all references removed:
```bash
rm services/ScheduleService.ts
```

## Testing Strategy

### Test API utilities
```typescript
// __tests__/utils/api/schedule.test.ts
describe('fetchSchedule', () => {
  it('parses XML correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<wmbr_schedule>...</wmbr_schedule>'
    });

    const result = await fetchSchedule();
    expect(result.shows).toBeInstanceOf(Array);
  });
});
```

### Test transformation utilities
```typescript
// __tests__/utils/schedule.test.ts
describe('groupShowsByDay', () => {
  it('groups regular shows by day_str', () => {
    const shows = [
      { day: 1, day_str: 'Monday', name: 'Show A', time: '600' },
      { day: 1, day_str: 'Monday', name: 'Show B', time: '900' },
    ];

    const grouped = groupShowsByDay(shows);
    expect(grouped['Monday']).toHaveLength(2);
  });

  it('duplicates weekday shows for Mon-Fri', () => {
    const shows = [
      { day: 7, day_str: 'Weekdays', name: 'Morning Show' }
    ];

    const grouped = groupShowsByDay(shows);
    expect(grouped['Monday']).toBeDefined();
    expect(grouped['Friday']).toBeDefined();
  });
});
```

### Test hooks
```typescript
// __tests__/hooks/useSchedule.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSchedule } from '../../hooks/useSchedule';

describe('useSchedule', () => {
  it('fetches and caches schedule', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<wmbr_schedule>...</wmbr_schedule>'
    });

    const { result } = renderHook(() => useSchedule());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shows).toBeDefined();
  });
});
```

## Benefits After Phase 2

- ✅ Pure utility functions easy to test in isolation
- ✅ Schedule transformations reusable across components
- ✅ Clear separation: API calls vs. data transformation vs. React state
- ✅ No more hidden singleton dependencies
- ✅ Two services migrated, team comfortable with pattern

## Estimated Effort

- Create API and transformation utilities: 1-2 hours
- Create hooks: 1 hour
- Find and update components: 2-3 hours
- Write tests: 2 hours
- **Total: ~6-8 hours**
