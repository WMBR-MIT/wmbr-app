import { Platform, StyleProp, ViewStyle } from 'react-native';
import { COLORS, CORE_COLORS } from '@utils/Colors';

import Slider from '@react-native-community/slider';

export interface PlaybackSliderProps {
  progressSeconds: number;
  durationSeconds: number;
  style?: StyleProp<ViewStyle>;
  // Returns value in seconds
  onValueChange?: (value: number) => void;
  // Returns value in percentage (0 to 1)
  onSlidingComplete?: (value: number) => void;
  // Returns value in percentage (0 to 1)
  onSlidingStart?: (value: number) => void;
}

export default function PlaybackSlider({
  progressSeconds,
  durationSeconds,
  style,
  onValueChange,
  onSlidingComplete,
  onSlidingStart,
}: PlaybackSliderProps) {
  return (
    <Slider
      style={style}
      accessibilityLabel="Playback position"
      minimumValue={0}
      maximumValue={1}
      onSlidingStart={onSlidingStart}
      onSlidingComplete={onSlidingComplete}
      thumbTintColor={
        Platform.OS === 'android' ? CORE_COLORS.WMBR_GREEN : undefined
      }
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.TEXT.PRIMARY}
      onValueChange={value => onValueChange?.(value * (durationSeconds || 0))}
      tapToSeek={true}
      value={durationSeconds > 0 ? progressSeconds / durationSeconds : 0}
    />
  );
}
