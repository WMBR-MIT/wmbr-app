import TrackPlayer, { Track } from 'react-native-track-player';
import he from 'he';
import { Show, Archive } from '@customTypes/RecentlyPlayed';
import { debugLog, debugError } from '@utils/Debug';
import { DEFAULT_NAME } from '@customTypes/Playlist';
import { getUserAgent } from '@utils/UserAgent';
import {
  getShowImage,
  SHOW_IMAGE_MAX_RETRIES,
  SHOW_IMAGE_RETRY_INTERVAL_MS,
} from '@utils/ShowImages';

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

      const showDate = new Date(archive.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/New_York',
      });

      const hosts = he.decode(show.hosts || '');

      const titleWithHosts = show
        ? `${show.name}${hosts ? ` with ${hosts}` : ''}`
        : DEFAULT_NAME;

      // Create archive track.
      //
      // We set an explicit `duration` (show length is in minutes) so iOS has a
      // known duration the instant the track becomes active. Without it, iOS
      // treats the item as indeterminate until AVPlayer parses the duration off
      // the network, and on a fast cold start it renders the lock-screen
      // controls before that happens — showing play/pause/stop but hiding the
      // skip-interval buttons and scrubber for the rest of the session. RNTP
      // corrects this value once the real duration is known.
      //
      // The track starts with the generic WMBR cover so playback doesn't wait on
      // the server. The show's own artwork is applied below once it's found.
      const archiveTrack: Track = {
        id: `${show.name}-${archive.date}`,
        url: archive.url,
        title: `${titleWithHosts}: ${showDate}`,
        artist: DEFAULT_NAME,
        artwork: require('@assets/cover.png'),
        userAgent: getUserAgent(),
        ...(show.length > 0 && { duration: show.length * 60 }),
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

      // Not awaited: the artwork can arrive after playback has started.
      this.applyShowArtwork(archive, show);
    } catch (error) {
      debugError('Error playing archive:', error);
      throw error;
    }
  }

  // Whether the archive is still the track at index 0. Checks the player itself
  // rather than our own state, since other code (such as the audio preview) can
  // replace the queue without updating this service.
  private async isArchiveQueued(archive: Archive): Promise<boolean> {
    const [queuedTrack] = await TrackPlayer.getQueue();
    return queuedTrack?.url === archive.url;
  }

  // Looks up the show's own artwork and applies it to the archive track that
  // was started with the cover. A failed check (timeout, server error) is tried
  // again every minute, up to the same limit the screen uses. Stops early once
  // the remote image is applied, or when the archive is no longer playing,
  // since the track at index 0 would then be something else.
  private async applyShowArtwork(archive: Archive, show: Show): Promise<void> {
    try {
      for (let attempt = 0; attempt <= SHOW_IMAGE_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve =>
            setTimeout(resolve, SHOW_IMAGE_RETRY_INTERVAL_MS),
          );
        }

        if (!(await this.isArchiveQueued(archive))) {
          return;
        }

        const showArtwork = await getShowImage(show.name);

        // A show with no artwork of its own keeps the cover, so there's nothing
        // to apply yet. Its retries only read the cache.
        if (showArtwork && (await this.isArchiveQueued(archive))) {
          await TrackPlayer.updateMetadataForTrack(0, { artwork: showArtwork });
        }

        // A remote image is the best result, so later attempts aren't needed.
        if (typeof showArtwork === 'string') {
          return;
        }
      }
    } catch (error) {
      debugError('Error applying show artwork:', error);
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
        title: DEFAULT_NAME,
        artist: currentShowTitle || 'Live Radio',
        artwork: require('@assets/cover.png'),
        isLiveStream: true,
        userAgent: getUserAgent(),
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
