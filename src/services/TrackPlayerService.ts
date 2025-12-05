import TrackPlayer, { Event } from 'react-native-track-player';

const TrackPlayerService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

  /**
   * Handle "Ducking" (e.g. when a phone call comes in, headphones are
   * disconnected, etc.)
   *
   * https://rntp.dev/docs/api/events#remoteduck
   */
  TrackPlayer.addEventListener(
    Event.RemoteDuck,
    async ({ paused, permanent }) => {
      const activeTrack = await TrackPlayer.getActiveTrack();

      if (!paused || permanent || activeTrack?.isLiveStream) {
        TrackPlayer.stop();
      } else {
        TrackPlayer.pause();
      }
    },
  );

  TrackPlayer.addEventListener(
    Event.RemoteJumpForward,
    async ({ interval }) => {
      const { position, duration } = await TrackPlayer.getProgress();
      const newPosition = Math.min(position + interval, duration);
      await TrackPlayer.seekTo(newPosition);
    },
  );

  TrackPlayer.addEventListener(
    Event.RemoteJumpBackward,
    async ({ interval }) => {
      const { position } = await TrackPlayer.getProgress();
      const newPosition = Math.max(position - interval, 0);
      await TrackPlayer.seekTo(newPosition);
    },
  );
};

export default TrackPlayerService;
