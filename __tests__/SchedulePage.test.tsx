import { jest } from '@jest/globals';
import { renderAsync, screen, userEvent } from '@testing-library/react-native';
import { ScheduleStack } from '@app/Schedule';

import { TestWrapper } from '@utils/TestUtils';
import { createMockFetch } from '../__mocks__/MockNetworkResponses';

describe('SchedulePage', () => {
  // Keep the fixture small so SectionList renders both weekly shows initially,
  // regardless of where Tuesday falls in the rolling schedule.
  const scheduleXml = `
    <wmbr_schedule season_start="Mon, 22 Sep 2025 14:00:00 GMT" daystart="240">
      <show id="8998">
        <name>If 6 Was 9</name>
        <day>2</day>
        <day_str>Tuesday</day_str>
        <time>240</time>
        <time_str>4:00a</time_str>
        <length>180</length>
        <alternates>0</alternates>
      </show>
      <show id="9007">
        <name>Post-tentious</name>
        <day>2</day>
        <day_str>Tuesday</day_str>
        <time>1260</time>
        <time_str>9:00p</time_str>
        <length>60</length>
        <alternates>0</alternates>
        <description>post music for post people.</description>
      </show>
    </wmbr_schedule>`;

  beforeEach(() => {
    jest.mocked(fetch).mockImplementation(createMockFetch({ scheduleXml }));
  });

  afterEach(() => {
    jest.mocked(fetch).mockImplementation(createMockFetch());
  });

  test('displays shows after loading', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // The rolling seven-day schedule includes these weekly Tuesday shows.
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
