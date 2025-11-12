import React from 'react';
import { renderAsync, screen, waitFor, userEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ScheduleStack } from '../pages/SchedulePage';
import { mockScheduleResponse } from '../__mocks__/MockScheduleData';
import { mockShowWithArchives } from '../__mocks__/MockShowData';

// Mock only the methods we need, use actual implementation for others
const mockScheduleService = {
  fetchSchedule: jest.fn().mockResolvedValue(mockScheduleResponse),
  groupShowsByDay: jest.requireActual('../services/ScheduleService').ScheduleService.prototype.groupShowsByDay,
  formatTime: jest.requireActual('../services/ScheduleService').ScheduleService.prototype.formatTime,
};

// Mock RecentlyPlayedService to provide archive data for show navigation
const mockRecentlyPlayedService = {
  fetchShowsCacheOnly: jest.fn().mockResolvedValue(undefined),
  getShowByName: jest.fn().mockImplementation((showName) => {
    return showName === 'Post-tentious' ? mockShowWithArchives : null;
  })
};

jest.mock('../services/RecentlyPlayedService', () => ({
  RecentlyPlayedService: {
    getInstance: jest.fn(() => mockRecentlyPlayedService)
  }
}));

jest.mock('../services/ScheduleService', () => ({
  ScheduleService: {
    getInstance: jest.fn(() => mockScheduleService),
  },
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    {children}
  </NavigationContainer>
);

describe('SchedulePage', () => {
  test('displays shows after loading', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: Wrapper });

    // Wait for the async content to appear using findByText
    await waitFor(async () => {
      expect(await screen.findByText('Morning Jazz')).toBeTruthy();
    });
  });

  test('navigates to ShowDetails when tapping a show with archives', async () => {
    const user = userEvent.setup();
    await renderAsync(<ScheduleStack />, { wrapper: Wrapper });

    // Wait for the schedule to load
    await waitFor(async () => {
      expect(await screen.findByText('Post-tentious')).toBeTruthy();
    });

    // Tap on the Post-tentious show
    const showButton = screen.getByText('Post-tentious');
    await user.press(showButton);

    // Wait for navigation to ShowDetails page and verify unique ShowDetails content
    await waitFor(async () => {
      // Look for content that's unique to the ShowDetails page
      expect(await screen.findByText('Archives')).toBeTruthy();
      expect(await screen.findByText('88.1 FM')).toBeTruthy();
      expect(await screen.findByText(/archived episode/)).toBeTruthy();
    }, { timeout: 3000 });

    // Verify that the services were called correctly
    expect(mockRecentlyPlayedService.fetchShowsCacheOnly).toHaveBeenCalled();
    expect(mockRecentlyPlayedService.getShowByName).toHaveBeenCalledWith('Post-tentious');
  });
});
