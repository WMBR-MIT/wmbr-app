import { jest } from '@jest/globals'
import { createMockFetch } from './__mocks__/MockNetworkResponses';

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
jest.mock('./src/utils/Debug.ts', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));

// Mock fetch at the network boundary instead of mocking services
// This allows real service code to run in tests
global.fetch = createMockFetch() as any;
