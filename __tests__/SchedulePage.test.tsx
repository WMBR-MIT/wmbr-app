import { jest } from '@jest/globals';
import { renderAsync, screen, userEvent } from '@testing-library/react-native';
import { ScheduleStack } from '@app/Schedule';

import { TestWrapper } from '@utils/TestUtils';
import { styles as scheduleStyles } from '@app/Schedule/SchedulePage';

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

  test('shows the next air date only for inactive alternating shows', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // November 16 is week 2 of the mock season: Sound and Fury (week 1)
    // skips this Sunday, while Radio with a View (week 2) airs as scheduled.
    expect(await screen.findByText('Sound and Fury')).toBeTruthy();
    expect(screen.getByText('Radio with a View')).toBeTruthy();
    expect(
      screen.getByText('Every Other Week · Next airs on Nov 23'),
    ).toBeTruthy();
    expect(screen.getByText('Every Other Week')).toBeTruthy();
    expect(screen.getAllByText(/Next airs on/)).toHaveLength(1);
  });

  test('applies inactiveShowLabel styling only to inactive show names and hosts', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: TestWrapper });

    // Check the named style's presence, not its values, so its appearance
    // can change without breaking this test.
    const inactiveShowName = await screen.findByText('Sound and Fury');
    expect(inactiveShowName.props.style).toContain(
      scheduleStyles.inactiveShowLabel,
    );
    expect(
      screen.getByText('with David "The Central Cogitator" Goodman').props
        .style,
    ).toContain(scheduleStyles.inactiveShowLabel);
    expect(screen.getByText('Radio with a View').props.style).not.toContain(
      scheduleStyles.inactiveShowLabel,
    );
    expect(screen.getByText('with Marc Stern').props.style).not.toContain(
      scheduleStyles.inactiveShowLabel,
    );
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
