// Minimal manual mock for react-native-track-player used in tests
const listeners: Record<string, Function[]> = {};

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackProgressUpdated: 'playback-progress-updated',
  PlaybackQueueEnded: 'playback-queue-ended',
};

export const State = {
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
};

const TrackPlayer = {
  addEventListener: (event: string, cb: Function) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
    return {
      remove: () => {
        listeners[event] = (listeners[event] || []).filter(fn => fn !== cb);
      },
    };
  },
  removeEventListener: (event: string, cb: Function) => {
    listeners[event] = (listeners[event] || []).filter(fn => fn !== cb);
  },
  // Basic control methods mocked as jest.fn so tests can inspect calls if needed
  setupPlayer: jest.fn(() => Promise.resolve()),
  add: jest.fn(() => Promise.resolve()),
  reset: jest.fn(() => Promise.resolve()),
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  getQueue: jest.fn(() => Promise.resolve([])),
  getPosition: jest.fn(() => Promise.resolve(0)),
  getDuration: jest.fn(() => Promise.resolve(0)),
  useProgress: jest.fn(() => ({ position: 0, duration: 0 })),
  usePlaybackState: jest.fn(() => State.Stopped),
};

// Also export hook helpers as named exports to match code that imports them
export const useProgress = TrackPlayer.useProgress;
export const usePlaybackState = TrackPlayer.usePlaybackState;

export default TrackPlayer;
