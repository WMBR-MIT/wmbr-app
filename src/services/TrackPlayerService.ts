import TrackPlayer, { Event } from 'react-native-track-player';

const TrackPlayerService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

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
