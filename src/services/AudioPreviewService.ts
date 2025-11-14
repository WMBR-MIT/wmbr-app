import TrackPlayer, { Track, State, Event } from 'react-native-track-player';
import { debugError } from '../utils/Debug';

export interface PreviewState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  progress: number; // 0 to 1
  url: string | null;
}

type PreviewCallback = (state: PreviewState) => void;

export class AudioPreviewService {
  private static instance: AudioPreviewService;
  private callbacks: Set<PreviewCallback> = new Set();
  private progressInterval: NodeJS.Timeout | null = null;
  private isPreviewMode = false;
  private originalTrack: Track | null = null;
  private currentState: PreviewState = {
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  };

  static getInstance(): AudioPreviewService {
    if (!AudioPreviewService.instance) {
      AudioPreviewService.instance = new AudioPreviewService();
    }
    return AudioPreviewService.instance;
  }

  constructor() {
    this.setupEventListeners();
  }

  subscribe(callback: PreviewCallback): () => void {
    this.callbacks.add(callback);

    // Immediately call with current state
    callback(this.currentState);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  private setupEventListeners(): void {
    TrackPlayer.addEventListener(Event.PlaybackState, data => {
      if (this.isPreviewMode) {
        this.updatePlaybackState(data.state);
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, data => {
      if (this.isPreviewMode) {
        const progress = data.duration > 0 ? data.position / data.duration : 0;

        this.currentState = {
          ...this.currentState,
          currentTime: data.position,
          duration: data.duration,
          progress: progress,
        };
        this.notifyCallbacks();
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (this.isPreviewMode) {
        this.stop();
      }
    });
  }

  private updatePlaybackState(state: State): void {
    const isPlaying = state === State.Playing;
    this.currentState = {
      ...this.currentState,
      isPlaying,
    };
    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.currentState));
  }

  private startProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.progressInterval = setInterval(async () => {
      if (this.isPreviewMode) {
        try {
          const position = await TrackPlayer.getPosition();
          const duration = await TrackPlayer.getDuration();
          const progress = duration > 0 ? position / duration : 0;

          this.currentState = {
            ...this.currentState,
            currentTime: position,
            duration: duration,
            progress: progress,
          };

          this.notifyCallbacks();
        } catch (error) {
          debugError('Error getting progress:', error);
        }
      }
    }, 100); // Update every 100ms
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async playPreview(url: string): Promise<void> {
    try {
      // Save current track if we're switching to preview mode
      if (!this.isPreviewMode) {
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          this.originalTrack = queue[0];
        }
      }

      // Set preview mode
      this.isPreviewMode = true;

      // Create preview track
      const previewTrack: Track = {
        id: 'preview',
        url: url,
        title: 'Preview',
        artist: 'Apple Music Preview',
      };

      // Reset the queue with just the preview track
      await TrackPlayer.reset();
      await TrackPlayer.add(previewTrack);

      // Update state
      this.currentState = {
        isPlaying: false, // Will be updated by event listener
        duration: 0,
        currentTime: 0,
        progress: 0,
        url,
      };

      this.notifyCallbacks();

      // Start playing
      await TrackPlayer.play();

      // Start manual progress tracking
      this.startProgressTracking();
    } catch (error) {
      debugError('Error playing preview:', error);
      this.isPreviewMode = false;
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.isPreviewMode && this.currentState.isPlaying) {
      await TrackPlayer.stop();
      this.stopProgressTracking();
    }
  }

  async resume(): Promise<void> {
    if (this.isPreviewMode && !this.currentState.isPlaying) {
      await TrackPlayer.play();
      this.startProgressTracking();
    }
  }

  async stop(): Promise<void> {
    if (this.isPreviewMode) {
      this.stopProgressTracking();
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // Restore original track if we had one
      if (this.originalTrack) {
        await TrackPlayer.add(this.originalTrack);
        this.originalTrack = null;
      }

      this.isPreviewMode = false;

      this.currentState = {
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        progress: 0,
        url: null,
      };

      this.notifyCallbacks();
    }
  }

  getCurrentState(): PreviewState {
    return this.currentState;
  }

  isPlaying(url?: string): boolean {
    if (url) {
      return this.currentState.isPlaying && this.currentState.url === url;
    }
    return this.currentState.isPlaying;
  }
}
