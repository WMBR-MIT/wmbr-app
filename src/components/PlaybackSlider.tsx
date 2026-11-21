import { useCallback, useMemo } from 'react';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { Platform, StyleProp, ViewStyle, useColorScheme } from 'react-native';
import { CORE_COLORS } from '@utils/Colors';
import { debugError } from '@utils/Debug';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  style,
  onSlidingComplete,
}: {
  style?: StyleProp<ViewStyle>;
  // Returns value in percentage (0 to 1)
  onSlidingComplete?: (value: number) => void;
}) {
  const progress = useProgress();

  const sliderValue = useMemo(() => {
    if (progress.duration > 0) {
      return progress.position / progress.duration;
    }

    return 0;
  }, [progress.position, progress.duration]);

  const handleSlidingComplete = useCallback(
    async (value: number) => {
      try {
        await TrackPlayer.seekTo(value * (progress?.duration || 0));
      } catch (e) {
        debugError('Error seeking to position:', e);
      }
    },
    [progress.duration],
  );

  const colorScheme = useColorScheme();

  return (
    <Slider
      style={style}
      accessibilityLabel="Playback position"
      minimumValue={0}
      maximumValue={1}
      onSlidingComplete={value => {
        handleSlidingComplete(value);
        onSlidingComplete?.(value);
      }}
      thumbTintColor={
        Platform.OS === 'android' ? CORE_COLORS.WMBR_GREEN : undefined
      }
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={
        colorScheme === 'dark' ? CORE_COLORS.GRAY_600 : CORE_COLORS.GRAY_200
      }
      tapToSeek={true}
      value={sliderValue}
    />
  );
}
