# Service Layer Modernization Plan

## Current State

The app uses a singleton pattern for all services:
- `ScheduleService` - Fetches and parses schedule XML
- `RecentlyPlayedService` - Fetches recently played songs, manages show archives, current show state
- `PlaylistService` - Fetches playlists for specific shows/dates
- `MetadataService` - Polls live stream metadata, manages subscriptions
- `ArchiveService` - Manages archive playback state
- `AudioPreviewService` - Manages preview playback state

## Problems with Current Architecture

1. **Hard to test** - Singleton instances persist across tests, need complex mocking
2. **Hidden dependencies** - `.getInstance()` calls scattered throughout components
3. **Not idiomatic React** - Doesn't use React patterns (Context, hooks)
4. **State management issues** - Manual subscription management instead of React state
5. **Over-engineered** - Singleton pattern unnecessary for simple data fetching

## Target Architecture

Replace singletons with:
- **Context Providers** for shared state (current show, archive playback, metadata polling)
- **Custom hooks** for data fetching (schedule, playlists, shows)
- **Pure utility functions** for parsing and data transformation

## Guiding Principles

1. **Keep it simple** - This app just fetches XML and displays it
2. **One piece at a time** - Introduce new patterns alongside old ones
3. **No breaking changes** - Old code keeps working during migration
4. **Easy to test** - Mock at clear boundaries (fetch calls, not singletons)
5. **Readable** - `useSchedule()` is clearer than `ScheduleService.getInstance().fetchSchedule()`

## Migration Strategy

We'll migrate in phases:
1. Start with simplest service (PlaylistService - just data fetching)
2. Move to ScheduleService (data fetching + transformations)
3. Handle RecentlyPlayedService (complex but mostly data fetching)
4. Tackle stateful services (MetadataService, ArchiveService, AudioPreviewService)
5. Clean up old singleton code once new patterns are adopted

Each phase follows the pattern:
1. Create new implementation alongside old
2. Update one component to use new pattern
3. Test thoroughly
4. Migrate remaining components
5. Delete old implementation
