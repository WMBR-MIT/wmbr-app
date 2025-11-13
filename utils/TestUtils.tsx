import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { mockScheduleResponse } from '../__mocks__/MockScheduleData';
import { mockShowWithArchives } from '../__mocks__/MockShowData';

// Get actual implementations for methods we don't want to mock
const actualScheduleService = jest.requireActual('../services/ScheduleService') as {
  ScheduleService: {
    prototype: {
      groupShowsByDay: Function;
      formatTime: Function;
    };
  };
};

// Mock ScheduleService instance
export const mockScheduleService = {
  fetchSchedule: jest.fn(() => Promise.resolve(mockScheduleResponse)),
  groupShowsByDay: actualScheduleService.ScheduleService.prototype.groupShowsByDay,
  formatTime: actualScheduleService.ScheduleService.prototype.formatTime,
};

// Mock RecentlyPlayedService instance
export const mockRecentlyPlayedService = {
  fetchShowsCacheOnly: jest.fn(() => Promise.resolve([])),
  getShowByName: jest.fn((showName: string) => 
    showName === 'Post-tentious' ? mockShowWithArchives : null
  ),
};

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    frame: { x: 0, y: 0, width: 0, height: 0 },
    }}
  >
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </SafeAreaProvider>
);
