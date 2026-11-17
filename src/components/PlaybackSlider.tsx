import { useMemo } from 'react';
import { useProgress } from 'react-native-track-player';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { COLORS, CORE_COLORS } from '@utils/Colors';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  progress,
  style,
  onSlidingComplete,
}: {
  progress: ReturnType<typeof useProgress>;
  style?: StyleProp<ViewStyle>;
  // Returns value in percentage (0 to 1)
  onSlidingComplete?: (value: number) => void;
}) {
  const sliderValue = useMemo(() => {
    if (progress.duration > 0) {
      return progress.position / progress.duration;
    }

    return 0;
  }, [progress.position, progress.duration]);

  return (
    <Slider
      style={style}
      accessibilityLabel="Playback position"
      minimumValue={0}
      maximumValue={1}
      onSlidingComplete={onSlidingComplete}
      thumbTintColor={
        Platform.OS === 'android' ? CORE_COLORS.WMBR_GREEN : undefined
      }
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.TEXT.PRIMARY}
      tapToSeek={true}
      value={sliderValue}
    />
  );
}
