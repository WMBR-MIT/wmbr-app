# Testing Guidelines for Modern Architecture

## Philosophy

The new architecture makes testing **dramatically simpler**:
- **Pure functions** can be tested in isolation
- **Hooks** can be tested with renderHook
- **Context** can be tested by wrapping in providers
- **No more singleton mocking hell**

## What to Test (and How)

### 1. Pure Utility Functions

These are the easiest to test - no mocking needed!

```typescript
// __tests__/utils/schedule.test.ts
import { groupShowsByDay, isAlternatingShowActive } from '../../utils/schedule';

describe('groupShowsByDay', () => {
  it('groups shows by day_str', () => {
    const shows = [
      { day: 1, day_str: 'Monday', name: 'Show A' },
      { day: 1, day_str: 'Monday', name: 'Show B' },
    ];

    const grouped = groupShowsByDay(shows);
    
    expect(grouped['Monday']).toHaveLength(2);
    expect(grouped['Monday'][0].name).toBe('Show A');
  });

  it('duplicates weekday shows across Mon-Fri', () => {
    const shows = [
      { day: 7, day_str: 'Weekdays', name: 'Morning Show' }
    ];

    const grouped = groupShowsByDay(shows);
    
    expect(grouped['Monday']).toBeDefined();
    expect(grouped['Friday']).toBeDefined();
    expect(grouped['Monday'][0]).toBe(grouped['Friday'][0]);
  });

  it('sorts shows by time within each day', () => {
    const shows = [
      { day: 1, day_str: 'Monday', name: 'Late', time: '1200' },
      { day: 1, day_str: 'Monday', name: 'Early', time: '600' },
    ];

    const grouped = groupShowsByDay(shows);
    
    expect(grouped['Monday'][0].name).toBe('Early');
    expect(grouped['Monday'][1].name).toBe('Late');
  });
});

describe('isAlternatingShowActive', () => {
  it('returns true for non-alternating shows', () => {
    const show = { alternates: 0, name: 'Weekly Show' };
    expect(isAlternatingShowActive(show, new Date())).toBe(true);
  });

  it('calculates alternating schedule correctly', () => {
    const show = { alternates: 1, name: 'Biweekly Show' };
    const date = new Date('2024-09-01'); // Reference date
    
    expect(isAlternatingShowActive(show, date)).toBe(true);
  });
});
```

### 2. API Utility Functions

Mock fetch, test the function:

```typescript
// __tests__/utils/api/schedule.test.ts
import { fetchSchedule } from '../../../utils/api/schedule';

describe('fetchSchedule', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches and parses schedule XML', async () => {
    const mockXml = `
      <wmbr_schedule>
        <show id="123">
          <name>Test Show</name>
          <day>1</day>
          <day_str>Monday</day_str>
          <time>600</time>
          <time_str>10:00 AM - 12:00 PM</time_str>
        </show>
      </wmbr_schedule>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockXml,
    });

    const result = await fetchSchedule();

    expect(result.shows).toHaveLength(1);
    expect(result.shows[0].name).toBe('Test Show');
    expect(result.shows[0].day).toBe(1);
  });

  it('throws error on HTTP failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchSchedule()).rejects.toThrow('HTTP error! status: 500');
  });

  it('handles XML parsing errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => 'invalid xml',
    });

    await expect(fetchSchedule()).rejects.toThrow();
  });
});
```

### 3. Custom Hooks

Use `@testing-library/react-native`'s `renderHook`:

```typescript
// __tests__/hooks/useSchedule.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSchedule } from '../../hooks/useSchedule';
import * as scheduleAPI from '../../utils/api/schedule';

// Mock the API module
jest.mock('../../utils/api/schedule');

describe('useSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches schedule on mount', async () => {
    const mockShows = [
      { id: '1', name: 'Show 1', day: 1 },
      { id: '2', name: 'Show 2', day: 2 },
    ];

    (scheduleAPI.fetchSchedule as jest.Mock).mockResolvedValue({
      shows: mockShows
    });

    const { result } = renderHook(() => useSchedule());

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.shows).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shows).toEqual(mockShows);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    const mockError = new Error('Network error');
    (scheduleAPI.fetchSchedule as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useSchedule());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.shows).toEqual([]);
  });

  it('uses cache on subsequent renders', async () => {
    const mockShows = [{ id: '1', name: 'Show 1' }];
    (scheduleAPI.fetchSchedule as jest.Mock).mockResolvedValue({
      shows: mockShows
    });

    // First render
    const { result, rerender } = renderHook(() => useSchedule());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(scheduleAPI.fetchSchedule).toHaveBeenCalledTimes(1);

    // Rerender - should use cache
    rerender();

    expect(scheduleAPI.fetchSchedule).toHaveBeenCalledTimes(1); // Still just once
    expect(result.current.shows).toEqual(mockShows);
  });

  it('bypasses cache when forceRefresh is true', async () => {
    const mockShows = [{ id: '1', name: 'Show 1' }];
    (scheduleAPI.fetchSchedule as jest.Mock).mockResolvedValue({
      shows: mockShows
    });

    // First render without force
    const { result, rerender } = renderHook(
      ({ forceRefresh }) => useSchedule(forceRefresh),
      { initialProps: { forceRefresh: false } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(scheduleAPI.fetchSchedule).toHaveBeenCalledTimes(1);

    // Rerender with force
    rerender({ forceRefresh: true });

    await waitFor(() => {
      expect(scheduleAPI.fetchSchedule).toHaveBeenCalledTimes(2);
    });
  });
});
```

### 4. Context Providers

Wrap in provider and test:

```typescript
// __tests__/contexts/CurrentShowContext.test.tsx
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CurrentShowProvider, useCurrentShow } from '../../contexts/CurrentShowContext';

describe('CurrentShowContext', () => {
  it('provides initial null state', () => {
    const { result } = renderHook(() => useCurrentShow(), {
      wrapper: CurrentShowProvider,
    });

    expect(result.current.currentShow).toBeNull();
  });

  it('updates current show', () => {
    const { result } = renderHook(() => useCurrentShow(), {
      wrapper: CurrentShowProvider,
    });

    act(() => {
      result.current.setCurrentShow('Test Show');
    });

    expect(result.current.currentShow).toBe('Test Show');
  });

  it('allows clearing current show', () => {
    const { result } = renderHook(() => useCurrentShow(), {
      wrapper: CurrentShowProvider,
    });

    act(() => {
      result.current.setCurrentShow('Test Show');
    });

    expect(result.current.currentShow).toBe('Test Show');

    act(() => {
      result.current.setCurrentShow(null);
    });

    expect(result.current.currentShow).toBeNull();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useCurrentShow());
    }).toThrow('useCurrentShow must be used within CurrentShowProvider');

    console.error = originalError;
  });
});
```

### 5. Complex Hooks with Multiple Dependencies

```typescript
// __tests__/hooks/useRecentlyPlayed.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useRecentlyPlayed } from '../../hooks/useRecentlyPlayed';
import * as scheduleHook from '../../hooks/useSchedule';
import * as archivesHook from '../../hooks/useShowArchives';
import * as recentlyPlayedAPI from '../../utils/api/recentlyPlayed';

jest.mock('../../hooks/useSchedule');
jest.mock('../../hooks/useShowArchives');
jest.mock('../../utils/api/recentlyPlayed');

describe('useRecentlyPlayed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (scheduleHook.useSchedule as jest.Mock).mockReturnValue({
      shows: [],
      loading: false,
      error: null,
    });
    
    (archivesHook.useShowArchives as jest.Mock).mockReturnValue({
      shows: [],
      seasonStart: null,
      loading: false,
      error: null,
    });
  });

  it('waits for dependencies to load', async () => {
    (scheduleHook.useSchedule as jest.Mock).mockReturnValue({
      shows: [],
      loading: true, // Still loading
      error: null,
    });

    const { result } = renderHook(() => useRecentlyPlayed());

    expect(result.current.loading).toBe(true);
    expect(recentlyPlayedAPI.fetchPlaylistForShow).not.toHaveBeenCalled();
  });

  it('fetches playlists when dependencies loaded', async () => {
    const mockScheduleShows = [
      { id: '1', name: 'Show 1', day: 1 },
    ];

    (scheduleHook.useSchedule as jest.Mock).mockReturnValue({
      shows: mockScheduleShows,
      loading: false,
      error: null,
    });

    (recentlyPlayedAPI.fetchPlaylistForShow as jest.Mock).mockResolvedValue([
      { title: 'Song 1', artist: 'Artist 1', playedAt: new Date() }
    ]);

    const { result } = renderHook(() => useRecentlyPlayed());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(recentlyPlayedAPI.fetchPlaylistForShow).toHaveBeenCalled();
    expect(result.current.groups.length).toBeGreaterThan(0);
  });
});
```

### 6. Components Using Context

```typescript
// __tests__/components/ShowSelector.test.tsx
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import ShowSelector from '../../components/ShowSelector';
import { CurrentShowProvider } from '../../contexts/CurrentShowContext';

describe('ShowSelector', () => {
  it('displays current show', () => {
    render(
      <CurrentShowProvider>
        <ShowSelector />
      </CurrentShowProvider>
    );

    expect(screen.getByText(/No show selected/i)).toBeTruthy();
  });

  it('updates when show is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <CurrentShowProvider>
        <ShowSelector />
      </CurrentShowProvider>
    );

    const button = screen.getByRole('button', { name: /select show/i });
    await user.press(button);

    // Test that show selection works
    // (implementation depends on your component)
  });
});
```

## Testing Anti-Patterns (What NOT to Do)

### ❌ Don't mock Context providers
```typescript
// BAD
jest.mock('../../contexts/CurrentShowContext', () => ({
  useCurrentShow: jest.fn(() => ({ currentShow: 'Mocked' }))
}));

// GOOD
const { result } = renderHook(() => useCurrentShow(), {
  wrapper: CurrentShowProvider
});
```

### ❌ Don't test implementation details
```typescript
// BAD - testing internal state
expect(component.state.loading).toBe(true);

// GOOD - testing observable behavior
expect(screen.getByText('Loading...')).toBeTruthy();
```

### ❌ Don't mock everything
```typescript
// BAD - mocking pure functions
jest.mock('../../utils/schedule', () => ({
  groupShowsByDay: jest.fn()
}));

// GOOD - use real implementation for pure functions
import { groupShowsByDay } from '../../utils/schedule';
const result = groupShowsByDay(testData);
```

## Test Organization

```
__tests__/
├── utils/
│   ├── schedule.test.ts          # Pure utility tests
│   ├── recentlyPlayed.test.ts    # Pure utility tests
│   └── api/
│       ├── schedule.test.ts      # API call tests
│       ├── archives.test.ts      # API call tests
│       └── metadata.test.ts      # Parsing tests
├── hooks/
│   ├── useSchedule.test.ts       # Hook tests
│   ├── useShowArchives.test.ts   # Hook tests
│   └── useRecentlyPlayed.test.ts # Complex hook tests
├── contexts/
│   ├── CurrentShowContext.test.tsx
│   ├── MetadataContext.test.tsx
│   └── ArchiveContext.test.tsx
└── components/
    ├── SchedulePage.test.tsx
    └── RecentlyPlayedPage.test.tsx
```

## Coverage Goals

- **Utilities**: Aim for 100% - they're pure and easy to test
- **API functions**: 90%+ - mock edge cases
- **Hooks**: 80%+ - focus on core logic paths
- **Context**: 80%+ - test state updates and subscriptions
- **Components**: 70%+ - test user interactions and integrations

## Benefits of New Testing Approach

1. **Fast** - No singleton setup/teardown
2. **Isolated** - Test one thing at a time
3. **Reliable** - No shared state between tests
4. **Readable** - Clear arrange-act-assert pattern
5. **Maintainable** - Easy to update when requirements change

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- schedule.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```
