import { jest } from '@jest/globals';
import { renderAsync, screen, userEvent } from '@testing-library/react-native';
import { ScheduleStack } from '@app/Schedule';

import { TestWrapper } from '@utils/TestUtils';
import { createMockFetch } from '../__mocks__/MockNetworkResponses';

describe('SchedulePage', () => {
  beforeAll(() => {
    // Freeze time so the schedule always starts on Tuesday, which keeps these
    // tests deterministic even though the UI now starts at "today".
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-11T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('displays shows after loading', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // With the date fixed to Tuesday, the first rendered section includes
    // Tuesday shows from the mock schedule.
    expect(screen.getByText('If 6 Was 9')).toBeTruthy();
    expect(screen.getByText(/Post-tentious.*/)).toBeTruthy();
  });

  test('navigates to ShowDetails when tapping a show with archives', async () => {
    const user = userEvent.setup();
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    expect(screen.getByText(/Post-tentious.*/)).toBeTruthy();

    // Tap on the Post-tentious show
    const showButton = screen.getByText(/Post-tentious.*/);
    await user.press(showButton);

    // Look for content that's unique to the ShowDetails page
    expect(screen.getByText('Archives')).toBeTruthy();
    expect(screen.getByText('88.1 FM')).toBeTruthy();
    expect(screen.getByText(/archived episode/)).toBeTruthy();
    expect(screen.getByText('post music for post people.')).toBeTruthy();
  });

  test('navigates to ArchivedShowView when tapping an archive in ShowDetails', async () => {
    const user = userEvent.setup();
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // Wait for schedule to load and tap on a show
    expect(screen.getByText(/Post-tentious.*/)).toBeTruthy();
    await user.press(screen.getByText(/Post-tentious.*/));

    // Wait for ShowDetails to load with archives
    expect(screen.getByText('Archives')).toBeTruthy();

    // The mock data has archives dated Nov 4 and Nov 11, 2025
    // Find and tap on the first archive (Nov 11 should be first due to sorting)
    const archiveDateRegex = /November 11, 2025/;
    expect(screen.getByText(archiveDateRegex)).toBeTruthy();
    await user.press(screen.getByText(archiveDateRegex));

    // Verify we're on the ArchivedShowView page by looking for playlist content
    // The mock playlist has songs: "Waiting Room" by Fugazi and "Breadcrumb Trail" by Slint
    expect(screen.getByText(/Waiting Room.*/)).toBeTruthy();
    expect(screen.getByText(/Fugazi.*/)).toBeTruthy();
  });
});

describe('SchedulePage rolling alternating weeks', () => {
  // A small synthetic schedule keeps the Monday section visible without
  // depending on SectionList rendering every row of the full schedule.
  const scheduleXml = `
    <wmbr_schedule season_start="Mon, 25 May 2026 14:00:00 GMT" daystart="240">
      <show id="monday-cycle-week-1">
        <name>Monday Cycle Week 1</name>
        <day>1</day>
        <time>1140</time>
        <time_str>7:00p</time_str>
        <alternates>1</alternates>
      </show>
      <show id="monday-cycle-week-2">
        <name>Monday Cycle Week 2</name>
        <day>1</day>
        <time>1140</time>
        <time_str>7:00p</time_str>
        <alternates>2</alternates>
      </show>
      <show id="sunday-cycle-week-1">
        <name>Sunday Cycle Week 1</name>
        <day>0</day>
        <time>780</time>
        <time_str>1:00p</time_str>
        <alternates>1</alternates>
      </show>
      <show id="sunday-cycle-week-2">
        <name>Sunday Cycle Week 2</name>
        <day>0</day>
        <time>780</time>
        <time_str>1:00p</time_str>
        <alternates>2</alternates>
      </show>
    </wmbr_schedule>`;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(fetch).mockImplementation(createMockFetch({ scheduleXml }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.mocked(fetch).mockImplementation(createMockFetch());
  });

  test.each([
    ['Friday', '2026-05-29T16:00:00Z'],
    ['Monday after the show has aired', '2026-06-02T03:00:00Z'],
  ])('uses the upcoming Monday date when viewed on %s', async (_, date) => {
    jest.setSystemTime(new Date(date));
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    expect(await screen.findByText('Monday Cycle Week 2')).toBeTruthy();
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.queryByText('Monday Cycle Week 1')).toBeNull();
  });

  test.each([
    ['Saturday just after midnight', '2026-10-24T04:33:00Z'],
    ['Sunday', '2026-10-25T14:00:00Z'],
  ])(
    'keeps Sunday in the preceding cycle when viewed on %s',
    async (_, date) => {
      // Reproduce the reported weekend with generic alternating shows.
      jest.mocked(fetch).mockImplementation(
        createMockFetch({
          scheduleXml: scheduleXml.replace(
            'Mon, 25 May 2026 14:00:00 GMT',
            'Mon, 05 Oct 2026 14:00:00 GMT',
          ),
        }),
      );
      jest.setSystemTime(new Date(date));
      await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

      expect(await screen.findByText('Sunday Cycle Week 1')).toBeTruthy();
      expect(screen.queryByText('Sunday Cycle Week 2')).toBeNull();
      expect(screen.getByText('Monday Cycle Week 2')).toBeTruthy();
      expect(screen.queryByText('Monday Cycle Week 1')).toBeNull();
    },
  );
});
