import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from 'react-native-track-player';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { COLORS, CORE_COLORS } from '@utils/Colors';

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

  const safeSliderValue = useMemo(
    () => (progress.duration > 0 ? progress.position / progress.duration : 0),
    [progress.position, progress.duration],
  );

  const [sliderValue, setSliderValue] = useState(safeSliderValue);
  const isSliding = useRef(false);

  useEffect(() => {
    !isSliding.current && setSliderValue(safeSliderValue);
  }, [safeSliderValue]);

  return (
    <Slider
      style={style}
      accessibilityLabel="Playback position"
      minimumValue={0}
      maximumValue={1}
      onSlidingStart={value => {
        isSliding.current = true;
        onSlidingStart?.(value);
      }}
      onSlidingComplete={value => {
        setSliderValue(value);
        onSlidingComplete?.(value);
        isSliding.current = false;
      }}
      thumbTintColor={
        Platform.OS === 'android' ? CORE_COLORS.WMBR_GREEN : undefined
      }
      minimumTrackTintColor={CORE_COLORS.WMBR_GREEN}
      maximumTrackTintColor={COLORS.TEXT.PRIMARY}
      onValueChange={value => onValueChange?.(value * (progress.duration || 0))}
      tapToSeek={true}
      value={sliderValue}
    />
  );
}
