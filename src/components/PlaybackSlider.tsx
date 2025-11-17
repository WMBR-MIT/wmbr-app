import { useProgress } from 'react-native-track-player';
import { ViewStyle, StyleProp } from 'react-native';
import { COLORS, CORE_COLORS } from '../utils/Colors';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  styles,
  onValueChange,
  onSlidingComplete,
  onSlidingStart,
}: {
  styles?: StyleProp<ViewStyle>;
  // Returns value in seconds
  onValueChange?: (value: number) => void;
  // Returns value in percentage (0 to 1)
  onSlidingComplete?: (value: number) => void;
  // Returns value in percentage (0 to 1)
  onSlidingStart?: (value: number) => void;
}) {
  const progress = useProgress();

  return (
    <Slider
      style={styles}
      minimumValue={0}
      maximumValue={1}
      onSlidingStart={onSlidingStart}
      onSlidingComplete={onSlidingComplete}
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.BACKGROUND.SECONDARY}
      onValueChange={value =>
        onValueChange?.(value * (progress?.duration || 0))
      }
      tapToSeek={true}
      value={progress.duration > 0 ? progress.position / progress.duration : 0}
    />
  );
}
