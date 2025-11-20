export const Event = {
  PlaybackState: 'playback-state',
  PlaybackProgressUpdated: 'playback-progress',
  PlaybackQueueEnded: 'playback-queue-ended',
} as const;

export const Capability = {
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

export const State = {
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

const TrackPlayer = {
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

export const useProgress = TrackPlayer.useProgress;
export const usePlaybackState = TrackPlayer.usePlaybackState;

export default TrackPlayer;
