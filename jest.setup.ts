import { jest } from '@jest/globals'

import { mockShowPosttentious } from './__mocks__/MockShowData';

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


// Mock fetch to prevent open handles
global.fetch = jest.fn((url: string) => {
  if (url === 'https://wmbr.org/dynamic.xml') {
    return Promise.resolve(new Response(mockShowPosttentious, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/xml',
      },
    }));
  }

  // Default mock for other URLs
  return Promise.resolve(new Response('mock response', {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
    },
  }));
}) as jest.MockedFunction<typeof fetch>;

// Silence debug logs
jest.mock('./utils/Debug.ts', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));
