import { jest } from '@jest/globals'

import { mockScheduleService, mockRecentlyPlayedService } from './utils/TestUtils';

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Gesture: {
      Pan: jest.fn().mockReturnValue({
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        runOnJS: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children || View,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children || View,
  };
});

jest.mock('react-native-track-player', () => ({
  usePlaybackState: jest.fn(() => Promise.resolve()),
  useProgress: jest.fn(() => Promise.resolve()),
  State: {
    Playing: jest.mock(''),
  }
}));

// Silence debug logs
jest.mock('./utils/Debug.ts', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));

// Mock ScheduleService
jest.mock('./services/ScheduleService', () => ({
  ScheduleService: {
    getInstance: jest.fn(() => mockScheduleService),
  },
}));

// Mock RecentlyPlayedService
jest.mock('./services/RecentlyPlayedService', () => ({
  RecentlyPlayedService: {
    getInstance: jest.fn(() => mockRecentlyPlayedService),
  },
}));
