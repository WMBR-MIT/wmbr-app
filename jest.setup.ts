import { jest } from '@jest/globals'

/**
 * jest.useFakeTimers()
 * Prevent weird timing issues.
 * This needs to go before any imports.
 *
 * https://stackoverflow.com/questions/50793885/referenceerror-you-are-trying-to-import-a-file-after-the-jest-environment-has
 */
jest.useFakeTimers()

import { mockShowPosttentious } from './__mocks__/MockShowData';

jest.mock('react-native-gesture-handler', () =>
  jest.fn()
);

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
