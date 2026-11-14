# Contributing to the WMBR App

This document contains the most important patterns and practices we follow.

## General Guidelines

- Aliases have been set up for imports; rather than importing from relative
    paths (`../../../utils/Colors`), use the alias defined in `tsconfig.json`.
- Use color tokens from `src/utils/Colors.ts`. Do not hard-code hex values. If a needed token is missing, discuss with the team before adding a new one.

## Code style & linting

- Install the ESLint and EditorConfig extensions/plugins in your IDE/editor.
- Fix lint failures locally with `npx eslint . --fix` and run the test suite before opening a PR.

## Testing

### Quick Testing Rules

- Check existing test files for common patterns.
- Use `userEvent` for interactions, and prefer `await screen.findBy*()` for async/network-driven elements.
- Query preference: getByRole → getByLabelText → getByText → getByTestId.

### Mocks

- Don't mock anything in `src/services` (ScheduleService, RecentlyPlayedService, TrackPlayerService, etc.). These services should run in tests to exercise parsing and business logic.
- Certain global mocks are defined in `jest.setup.ts`.
- To add deterministic network responses for playlists/schedules, add entries to `__mocks__/MockNetworkResponses.ts` and update the fetch mock in `jest.setup.ts`.
- Use helpers in `src/utils/TestUtils.ts` (e.g. `generateScheduleXml`, `generatePlaylistResponse`) to produce realistic mock data.

### Running tests

- For local development run the whole suite: `npm test`.
- To watch all files while making changes, use: `npm test -- --watchAll` or `npm
    test -- --watch Component` to focus on a specific component.

## Committing and PRs

- In commit messages and PR titles, try to adhere to [Conventional
    Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages.
    Examples: 
  - `fix: correct show title parsing in ScheduleService`
  - `feat: add dark mode support to About screen`
  - `chore: update dependencies and fix lint issues`
  - `docs: improve CONTRIBUTING.md with testing guidelines`
