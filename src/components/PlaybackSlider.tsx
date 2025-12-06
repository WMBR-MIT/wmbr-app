import { useProgress } from 'react-native-track-player';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { COLORS, CORE_COLORS } from '../utils/Colors';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  style,
  onValueChange,
  onSlidingComplete,
  onSlidingStart,
}: {
  style?: StyleProp<ViewStyle>;
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
      style={style}
      minimumValue={0}
      maximumValue={1}
      onSlidingStart={onSlidingStart}
      onSlidingComplete={onSlidingComplete}
      thumbTintColor={
        Platform.OS === 'android' ? CORE_COLORS.WMBR_GREEN : undefined
      }
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.TEXT.PRIMARY}
      onValueChange={value =>
        onValueChange?.(value * (progress?.duration || 0))
      }
      tapToSeek={true}
      value={progress.duration > 0 ? progress.position / progress.duration : 0}
    />
  );
}
