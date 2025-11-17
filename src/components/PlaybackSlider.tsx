import TrackPlayer, { useProgress } from 'react-native-track-player';
import { ViewStyle, StyleProp } from 'react-native';
import { COLORS, CORE_COLORS } from '../utils/Colors';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  styles,
  onValueChange,
}: {
  styles?: StyleProp<ViewStyle>;
  onValueChange?: (value: number) => void;
}) {
  const progress = useProgress();

  const handleSlidingComplete = (value: number) => {
    TrackPlayer.seekTo(value * (progress?.duration || 0));
  };

  return (
    <Slider
      style={styles}
      minimumValue={0}
      maximumValue={1}
      onSlidingComplete={handleSlidingComplete}
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.BACKGROUND.SECONDARY}
      onValueChange={onValueChange}
      tapToSeek={true}
      value={progress.duration > 0 ? progress.position / progress.duration : 0}
    />
  );
}
