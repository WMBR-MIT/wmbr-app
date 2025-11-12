import React from 'react';
import { renderAsync, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScheduleStack } from '../pages/SchedulePage';
import { mockScheduleShows } from '../__mocks__/MockScheduleData';
import { mockScheduleResponse } from '../__mocks__/MockScheduleData';

const mockScheduleService = {
  fetchSchedule: jest.fn().mockResolvedValue(mockScheduleResponse),
  groupShowsByDay: jest.requireActual('../services/ScheduleService').ScheduleService.prototype.groupShowsByDay,
  formatTime: jest.fn((time: string) => time),
};

jest.mock('../services/ScheduleService', () => ({
  ScheduleService: {
    getInstance: jest.fn(() => mockScheduleService),
  },
}));

//
// // Mock react-native-svg
jest.mock('react-native-svg', () => ({
  SvgXml: 'SvgXml',
}));
//
// // Mock utils
jest.mock('../utils/Debug', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));
//
// // Mock Alert separately
// const mockAlert = jest.fn();
//
// // Use beforeEach to set up the Alert mock
// let mockAlertRef: any;
// beforeAll(() => {
//   mockAlertRef = require('react-native').Alert;
//   require('react-native').Alert = {
//     alert: mockAlert,
//   };
// });
//
// afterAll(() => {
//   require('react-native').Alert = mockAlertRef;
// });


const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    frame: { x: 0, y: 0, width: 375, height: 667 },
    }}
  >
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </SafeAreaProvider>
);

describe('SchedulePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders schedule page and shows loading initially', async () => {
    await renderAsync(<ScheduleStack />, { wrapper: Wrapper });

    // Check that basic UI elements are present
    expect(await screen.findByPlaceholderText('Search shows, hosts, or keywords...')).toBeTruthy();
    expect(await screen.findByText('Loading schedule...')).toBeTruthy();
    
    // Verify that fetchSchedule is called
    // expect(mockScheduleService.fetchSchedule).toHaveBeenCalledTimes(1);
  });

  test('displays shows after loading', async () => {
    // jest.useRealTimers();

    await renderAsync(<ScheduleStack />, { wrapper: Wrapper });

    // Wait for the async content to appear using findByText
    await waitFor(async () => {
      expect(await screen.findByText('Morning Jazz')).toBeTruthy();
    });
  });
});
