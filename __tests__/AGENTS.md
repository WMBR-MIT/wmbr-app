# Testing Guidelines

## General Guidelines

- Often, as you work to solve a failing test, you engineer approaches that
    become way too complex. Just as often, the solution is something much much
    simpler, like an async issue, or a misunderstanding of how the component
    works. When in doubt, step back and re-evaluate.
- Import things like screen, waitFor, act, etc. from
    `@testing-library/react-native` only, not from
    `react-native-testing-library`.

## Recommended Test Patterns

```typescript
import { render, screen, userEvent } from '@testing-library/react-native';
import { ScheduleStack } from '../src/app/Schedule';
import { TestWrapper } from '../src/utils/TestUtils';
// TestWrapper includes SafeAreaProvider and NavigationContainer. Only necessary
for components that depend on those contextswraps.

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
```

Render stacks/containers for navigation-dependent components. Example: prefer `render(<ScheduleStack />)` over rendering an inner page that depends on `useNavigation` or header context.

## Async & Query Strategy

- Prefer `await screen.findBy*()` queries for async/network-driven elements; avoid manual `waitFor` for simple appearance checks.
- Use `userEvent` for interactions rather than `fireEvent`.
- Query preference: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last).

## Mocks

### Mock at boundaries, not internals

- Mock: `fetch`, native modules, console, non-deterministic functions

### Avoid over-mocking

- Do **not** mock: Services (`ScheduleService`, `RecentlyPlayedService`), utilities, constants, pure transforms

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
global.fetch = createMockFetch(); // Provides XML + playlist mocks
```

To extend playlist mock, add seeded JSON responses in `__mocks__/MockNetworkResponses.ts` and return them from `createMockFetch()` by detecting the show name in the playlist URL (`show_name` or the show string).

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
  if (urlStr.includes('New+Show') || urlStr.includes('New-Show') || urlStr.includes('New Show')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPlaylistForNewShow),
    } as Response);
  }
  // existing branches...
}
```

---
Resources:
- Testing Library: https://testing-library.com/docs/react-native-testing-library/intro/
- Jest: https://jestjs.io/docs/getting-started
