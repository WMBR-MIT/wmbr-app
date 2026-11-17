import { useProgress } from 'react-native-track-player';
import { secondsToTime } from '@utils/DateTime';

export const ShowDetailsTimestamp = () => {
  const progress = useProgress();

  return (
    <>
      {secondsToTime(progress.position)} / {secondsToTime(progress.duration)}
    </>
  );
};
