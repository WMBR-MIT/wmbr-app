import { useEffect, useState } from 'react';

export enum Event {
  PlaybackState = 'playback-state',
  PlaybackProgressUpdated = 'playback-progress',
  PlaybackQueueEnded = 'playback-queue-ended',
}

export enum Capability {
  Play = 'play',
  PlayFromId = 'play-from-id',
  PlayFromSearch = 'play-from-search',
  Pause = 'pause',
  Stop = 'stop',
  SeekTo = 'seek-to',
  Skip = 'skip',
  SkipToNext = 'skip-to-next',
  SkipToPrevious = 'skip-to-previous',
  JumpForward = 'jump-forward',
  JumpBackward = 'jump-backward',
  SetRating = 'set-rating',
  Like = 'like',
  Dislike = 'dislike',
  Bookmark = 'bookmark',
}

export enum State {
  Playing = 'PLAYING',
  Stopped = 'STOPPED',
  Paused = 'PAUSED',
}

// internal mock state
let playbackState: State = State.Stopped;
let position = 0; // seconds
let duration = 0; // seconds
let initialized = false;
let queue: any[] = [];

// listeners for the hook-based mocks
const progressListeners = new Set<
  (progress: { position: number; duration: number }) => void
>();

const playbackStateListeners = new Set<(state: State) => void>();

function notifyProgress() {
  const progress = { position, duration };
  progressListeners.forEach(fn => fn(progress));
}

function notifyPlaybackState() {
  playbackStateListeners.forEach(fn => fn(playbackState));
}

export const testApi = {
  resetAll: () => {
    playbackState = State.Stopped;
    position = 0;
    duration = 0;
    initialized = false;
    queue = [];
    // notify subscribers of reset
    notifyProgress();
    notifyPlaybackState();
  },
  setPlaybackState: (state: State) => {
    playbackState = state;
    notifyPlaybackState();
  },
  setPosition: (seconds: number) => {
    position = seconds;
    notifyProgress();
  },
  setDuration: (seconds: number) => {
    duration = seconds;
    notifyProgress();
  },
  advance: (ms: number) => {
    position = Math.min(duration, position + ms / 1000);
    notifyProgress();
  },
};

export const useProgress = () => {
  const [progress, setProgress] = useState({ position, duration });

  useEffect(() => {
    const fn = (newProgress: { position: number; duration: number }) =>
      setProgress(newProgress);

    progressListeners.add(fn);

    return () => {
      progressListeners.delete(fn);
    };
  }, []);

  return progress;
};

export const usePlaybackState = () => {
  const [state, setState] = useState<State>(playbackState);

  useEffect(() => {
    const fn = (newState: State) => setState(newState);

    playbackStateListeners.add(fn);

    return () => {
      playbackStateListeners.delete(fn);
    };
  }, []);

  return { state };
};

const TrackPlayer = {
  Event,
  State,
  Capability,
  useProgress,
  usePlaybackState,
  setupPlayer: jest.fn(() => {
    // mark the mock as initialized so getPlaybackState will resolve
    initialized = true;
    notifyPlaybackState();
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
  seekTo: jest.fn(async (sec: number) => {
    // clamp into [0, duration] and update internal position
    position = Math.max(0, Math.min(duration, sec));
    // notify listeners that position changed as a result of seeking
    notifyProgress();
    return Promise.resolve();
  }),
  play: jest.fn(async () => Promise.resolve()),
  pause: jest.fn(async () => Promise.resolve()),
  stop: jest.fn(async () => Promise.resolve()),
  reset: jest.fn(async () => Promise.resolve()),
  updateMetadataForTrack: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => Promise.resolve()),
};

export default TrackPlayer;
