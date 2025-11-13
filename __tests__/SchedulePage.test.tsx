import { renderAsync, screen, userEvent } from '@testing-library/react-native';

import { ScheduleStack } from '../pages/SchedulePage';
import { TestWrapper } from '../utils/TestUtils';

describe('SchedulePage', () => {
  test('displays shows after loading', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // The real ScheduleService will call fetch() which is mocked
    // to return XML data, which the service will parse and display
    expect(await screen.findByText('Africa Kabisa')).toBeTruthy();
    expect(await screen.findByText('Post-tentious')).toBeTruthy();
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

    // With the new approach, we verify behavior (navigation happened)
    // rather than implementation details (which service methods were called)
    // The fact that we see the ShowDetails page content proves the services worked
  });
});
