import { renderAsync, screen, userEvent } from '@testing-library/react-native';

import { ScheduleStack } from '../pages/SchedulePage';
import { mockScheduleService, mockRecentlyPlayedService, TestWrapper } from '../utils/TestUtils';

describe('SchedulePage', () => {
  test('displays shows after loading', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    expect(await screen.findByText('Africa Kabisa')).toBeTruthy();

    expect(mockScheduleService.fetchSchedule).toHaveBeenCalled();
  });

  test('navigates to ShowDetails when tapping a show with archives', async () => {
    const user = userEvent.setup();
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    expect(await screen.findByText('Post-tentious')).toBeTruthy();

    // Tap on the Post-tentious show
    const showButton = screen.getByText('Post-tentious');
    await user.press(showButton);

    // Look for content that's unique to the ShowDetails page
    expect(await screen.findByText('Archives')).toBeTruthy();
    expect(await screen.findByText('88.1 FM')).toBeTruthy();
    expect(await screen.findByText(/archived episode/)).toBeTruthy();

    // Verify that the services were called correctly
    expect(mockRecentlyPlayedService.fetchShowsCacheOnly).toHaveBeenCalled();
    expect(mockRecentlyPlayedService.getShowByName).toHaveBeenCalledWith('Post-tentious');
  });
});
