import TrackPlayer, { Track } from 'react-native-track-player';
import { Show, Archive } from '../types/RecentlyPlayed';
import { debugLog, debugError } from '../utils/debug';

export interface ArchivePlaybackState {
  isPlayingArchive: boolean;
  currentArchive: Archive | null;
  currentShow: Show | null;
  liveStreamUrl: string;
}

type ArchiveStateCallback = (state: ArchivePlaybackState) => void;

export class ArchiveService {
  private static instance: ArchiveService;
  private callbacks: Set<ArchiveStateCallback> = new Set();
  private currentState: ArchivePlaybackState = {
    isPlayingArchive: false,
    currentArchive: null,
    currentShow: null,
    liveStreamUrl: 'https://wmbr.org:8002/hi',
  };

  static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  subscribe(callback: ArchiveStateCallback): () => void {
    this.callbacks.add(callback);
    
    // Immediately call with current state
    callback(this.currentState);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.currentState));
  }

  async playArchive(archive: Archive, show: Show): Promise<void> {
    try {
      debugLog('Playing archive:', archive.url);
      
      // Stop current playback
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // Create archive track
      const archiveTrack: Track = {
        id: 'archive',
        url: archive.url,
        title: `${show.name} - Archive`,
        artist: `WMBR 88.1 FM - ${archive.date}`,
        artwork: require('../assets/cover.png'),
      };

      // Add and play archive
      await TrackPlayer.add(archiveTrack);
      await TrackPlayer.play();

      // Update state
      this.currentState = {
        ...this.currentState,
        isPlayingArchive: true,
        currentArchive: archive,
        currentShow: show,
      };
      
      this.notifyCallbacks();
    } catch (error) {
      debugError('Error playing archive:', error);
      throw error;
    }
  }

  async switchToLive(currentShowTitle?: string): Promise<void> {
    try {
      debugLog('Switching to live stream');
      
      // Stop current playback
      await TrackPlayer.stop();
      await TrackPlayer.reset();

      // Create live stream track
      const liveTrack: Track = {
        id: 'wmbr-stream',
        url: this.currentState.liveStreamUrl,
        title: 'WMBR 88.1 FM',
        artist: currentShowTitle || 'Live Radio',
        artwork: require('../assets/cover.png'),
      };

      // Add and play live stream
      await TrackPlayer.add(liveTrack);
      await TrackPlayer.play();

      // Update state
      this.currentState = {
        ...this.currentState,
        isPlayingArchive: false,
        currentArchive: null,
        currentShow: null,
      };
      
      this.notifyCallbacks();
    } catch (error) {
      debugError('Error switching to live:', error);
      throw error;
    }
  }

  getCurrentState(): ArchivePlaybackState {
    return this.currentState;
  }

  isPlayingArchive(): boolean {
    return this.currentState.isPlayingArchive;
  }

  getCurrentShow(): Show | null {
    return this.currentState.currentShow;
  }

  getCurrentArchive(): Archive | null {
    return this.currentState.currentArchive;
  }
}
