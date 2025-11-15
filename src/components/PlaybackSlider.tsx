import { useMemo } from 'react';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { ViewStyle, StyleProp } from 'react-native';
import { COLORS, CORE_COLORS } from '../utils/Colors';

import Slider from '@react-native-community/slider';

export default function PlaybackSlider({
  styles,
}: {
  styles?: StyleProp<ViewStyle>;
}) {
  const progressHook = useProgress();

  const progress = useMemo(
    () => progressHook || { position: 0, duration: 0 },
    [progressHook],
  );

  const handleSlidingComplete = (value: number) => {
    TrackPlayer.seekTo(value * (progress?.duration || 0));
  };

  const handleValueChange = (value: number) => {
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
      onValueChange={handleValueChange}
      tapToSeek={true}
      value={progress.position / progress.duration || 0}
    />
  );
}
