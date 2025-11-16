import { jest } from '@jest/globals';
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
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      children || View,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children || View,
  };
});

/**
 * We have to mock react-native-track-player because Jest can't work with native
 * modules. This mock provides basic implementations of the Track Player API.
 */
jest.mock('react-native-track-player', () => {
  const Event = {
    PlaybackState: 'playback-state',
    PlaybackProgressUpdated: 'playback-progress',
    PlaybackQueueEnded: 'playback-queue-ended',
  } as const;

  const Capability = {
    Play: 'play',
    PlayFromId: 'play-from-id',
    PlayFromSearch: 'play-from-search',
    Pause: 'pause',
    Stop: 'stop',
    SeekTo: 'seek-to',
    Skip: 'skip',
    SkipToNext: 'skip-to-next',
    SkipToPrevious: 'skip-to-previous',
    JumpForward: 'jump-forward',
    JumpBackward: 'jump-backward',
    SetRating: 'set-rating',
    Like: 'like',
    Dislike: 'dislike',
    Bookmark: 'bookmark',
  } as const;

  const State = {
    Playing: 'PLAYING',
    Stopped: 'STOPPED',
    Paused: 'PAUSED',
  } as const;

  // internal mock state
  let playbackState: string = State.Stopped;
  let position = 0; // seconds
  let duration = 0; // seconds
  let initialized = false;
  let queue: any[] = [];

  const testApi = {
    resetAll: () => {
      playbackState = State.Stopped;
      position = 0;
      duration = 0;
      initialized = false;
      queue = [];
    },
    setPlaybackState: (s: string) => {
      playbackState = s;
    },
    setPosition: (sec: number) => {
      position = sec;
    },
    setDuration: (sec: number) => {
      duration = sec;
    },
    advance: (ms: number) => {
      position = Math.min(duration, position + ms / 1000);
    },
  };

  return {
    Event,
    State,
    Capability,
    useProgress: jest.fn(() => ({ position, duration })),
    usePlaybackState: jest.fn(() => ({ state: playbackState })),
    setupPlayer: jest.fn(() => {
      // mark the mock as initialized so getPlaybackState will resolve
      initialized = true;
      return Promise.resolve();
    }),
    updateOptions: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    getQueue: jest.fn(() => Promise.resolve(queue)),
    getPlaybackState: jest.fn(async () => {
      // emulate native behavior: reject if player hasn't been set up yet
      if (!initialized) {
        throw new Error('Player not initialized');
      }
      return Promise.resolve(playbackState);
    }),
    getPosition: jest.fn(async () => Promise.resolve(position)),
    getDuration: jest.fn(async () => Promise.resolve(duration)),
    play: jest.fn(async () => Promise.resolve()),
    pause: jest.fn(async () => Promise.resolve()),
    stop: jest.fn(async () => Promise.resolve()),
    reset: jest.fn(async () => Promise.resolve()),
    updateMetadataForTrack: jest.fn(() => Promise.resolve()),
    addEventListener: jest.fn(() => Promise.resolve()),
    // test-only API available to TestUtils via require('react-native-track-player').__testApi
    __testApi: testApi,
  };
});

// Silence debug logs
jest.mock('./src/utils/Debug.ts', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));

// Mock fetch at the network boundary instead of mocking services
// This allows real service code to run in tests
global.fetch = createMockFetch() as any;
