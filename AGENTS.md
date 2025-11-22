# WMBR Mobile App - Quick Reference

React Native app for WMBR radio streaming (live + archives), schedules, and playlists.

## Project Structure

- **App Shell & Tabs**: `src/app/index.tsx` (Bottom tab navigator + custom bar)
- **Screens / Feature Modules** (grouped by domain under `src/app/`)
  - Home: `src/app/Home/*`
  - Schedule (stack navigator): `src/app/Schedule/index.tsx` (+ `ShowDetailsPage.tsx`, `ArchivedShowView.tsx`)
  - Recently Played: `src/app/RecentlyPlayed/*`
  - About: `src/app/About/*`
  - Custom Tab Bar: `src/app/_BottomMenuBar.tsx`
- **Services**: `src/services/*.ts` (`ScheduleService`, `RecentlyPlayedService`, `TrackPlayerService`)
- **Types**: `src/types/*.ts`
- **Utils**: `src/utils/*.ts` (e.g. `Debug.ts`, date helpers, colors, logo SVG)
- **Mocks**: `__mocks__/MockNetworkResponses.ts`
- **Tests**: `__tests__/*.test.tsx`

## Architecture

- **Navigation**: React Navigation bottom tabs (`@react-navigation/bottom-tabs`) with a custom tab bar component (`_BottomMenuBar.tsx`).
- **Nested Stack**: The Schedule feature exposes a native stack (`ScheduleStack`) declared in `src/app/Schedule/index.tsx` (previously referenced as `SchedulePage.tsx` – filename corrected).
- **Audio Playback**: `react-native-track-player@^4.1.1` service in `src/services/TrackPlayerService.ts` (remote event listeners only currently).
- **Data Retrieval**:
  - Schedule + Archives: XML endpoints parsed via `react-native-xml2js`.
  - Playlists: JSON endpoint (`alexandersimoes.com/get_playlist`).
- **State & Caching**: `RecentlyPlayedService` maintains in‑memory caches (songs + shows + season start) with a 5‑minute TTL; `ScheduleService` parses XML fresh per request but can be extended with its own cache later.
- **Alternating Show Logic**: Both services interpret `alternates` codes:
  - `0` weekly / weekdays
  - `1` & `2` alternate every other week (pair at same timeslot)
  - `5–8` one specific week in a 4‑week cycle (Week 1–4)
  - Weekday shows use `day=7` and are expanded across Monday–Friday.

## Best Practices

- Don't use any "bare" colors, either hex or `rgb()`. Instead, use values from
    the `COLORS` object in `src/utils/Colors.ts`, or `CORE_COLORS` if there
    doesn't seem to be a matching semantic color.

## Data Flow (High Level)

```
UI Screen -> Service Method -> fetch(XML/JSON) -> parse -> transform -> cache -> render
```

- Schedule screen: `ScheduleService.fetchSchedule()` → group by day → render list → drill into `ShowDetailsPage` (archives fetched through `RecentlyPlayedService.fetchShowsCacheOnly()` when show tapped).
- Recently Played screen: `RecentlyPlayedService.fetchRecentlyPlayed()` → fetch schedule + archives + each show playlist (today) → group songs by show.
