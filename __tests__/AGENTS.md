# Testing Guidelines

## Recommended Test Patterns

```typescript
import { render, screen, userEvent } from '@testing-library/react-native';
import { ScheduleStack } from '../src/app/Schedule';
import { TestWrapper } from '../src/utils/TestUtils';
// TestWrapper includes SafeAreaProvider, NavigationContainer, and
// MetadataServiceWrapper. Only necessary for components that depend
// on those contexts.

describe('', () => {
  test('shows schedule and navigates to details', async () => {
    const user = userEvent.setup();
    render(<ScheduleStack />, { wrapper: TestWrapper });

    // Wait for a known show from mock schedule XML
    expect(await screen.findByText('Africa Kabisa')).toBeTruthy();

    // Navigate into details (archives fetch via RecentlyPlayedService)
    await user.press(screen.getByText('Africa Kabisa'));

    // Header/title or archive-related content appears
    expect(await screen.findByText(/Show Details|Archived Show/i)).toBeTruthy();
  });
});
```

Render stacks/containers for navigation-dependent components. Example: prefer `render(<ScheduleStack />)` over rendering an inner page that depends on `useNavigation` or header context.

## Async & Query Strategy

- Prefer `await screen.findBy*()` queries for async/network-driven elements; avoid manual `waitFor` for simple appearance checks.
- Use `userEvent` for interactions rather than `fireEvent`.
- Query preference: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last).

## Mocks

### Mock at boundaries, not internals

Mock: `fetch`, native modules, console, non-deterministic functions

### Avoid over-mocking

Do **not** mock:
- anything in the `/src/services` directory
  - `ArchiveService`
  - `AudioPreviewService`
  - `MetadataService`
  - `PlaylistService`
  - `RecentlyPlayedService`
  - `ScheduleService`
  - `TrackPlayerService`
- utilities
- constants
- pure transforms

**Why:** Preserves refactor resilience, exercises real parsing & transformation paths. Real services run: XML parsing (`react-native-xml2js`), playlist mapping → `ProcessedSong[]`, alternating logic.

### Jest setup & mocks

- `react-native-track-player` (mocked in `jest.setup.ts`)
- `react-native-gesture-handler` (mocked in `jest.setup.ts`)
- `src/utils/Debug.ts` silenced in tests
- Track player mock is minimal (hooks returning promises) — extend per test needs if more states are required.

Add new mocks only if they introduce true external nondeterminism.

### Playlist and schedule mocks

`global.fetch` via `__mocks__/MockNetworkResponses.ts` (network boundary)

```typescript
// jest.setup.ts
jest.spyOn(global, 'fetch').mockImplementation(createMockFetch());
```

To extend playlist mock, add seeded JSON responses in `__mocks__/MockNetworkResponses.ts` and return them from `createMockFetch()` by detecting the show name in the playlist URL (`show_name` or the show string).

You can generate new mock data with functions in `src/utils/TestUtils.ts`:
- `generateNowPlayingXml()`
- `generateScheduleXml()`
- `generatePlaylistResponse()`

Example (inside `__mocks__/MockNetworkResponses.ts`):
```ts
const mockPlaylistForNewShow: PlaylistResponse = {
  show_name: 'New Show',
  date: '2025-11-01',
  playlist_id: '99999',
  songs: [
    { time: '2025/11/01 21:00:00', artist: 'Artist', song: 'Title', album: 'Album' },
  ],
};

// In createMockFetch():
if (urlStr.includes('alexandersimoes.com/get_playlist')) {
  if (urlStr.includes('New%20Show') { // Show names are URL-encoded
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPlaylistForNewShow),
    } as Response);
  }
  // existing branches...
}
```

## Running Tests

Run tests from the repository root using npx (avoid npm argument forwarding). For machine-readable output (best for an LLM), run one test file and produce a JSON result. For example, to test `RecentlyPlayed.test.tsx`:

````bash
npx jest __tests__/RecentlyPlayed.test.tsx --runInBand --json --testLocationInResults
```

---
Resources:
- Testing Library: https://testing-library.com/docs/react-native-testing-library/intro/
- Jest: https://jestjs.io/docs/getting-started
