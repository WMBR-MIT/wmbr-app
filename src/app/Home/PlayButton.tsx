import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Icon from '@components/Icon';
import { State, usePlaybackState } from 'react-native-track-player';
import { CORE_COLORS } from '@utils/Colors';

interface PlayButtonProps {
  onPress: () => void;
  isPlayingArchive?: boolean;
}

export default function PlayButton({
  onPress,
  isPlayingArchive,
}: PlayButtonProps) {
  const playbackState = usePlaybackState();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const isPlaying = playbackState?.state === State.Playing;
  const isBuffering = playbackState?.state === State.Buffering;

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const startSpinAnimation = useCallback(() => {
    spinAnim.setValue(0);

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();
  }, [spinAnim]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    spinAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim, spinAnim]);

  /**
   * If we're playing, we either:
   * a. show a pause icon if we're playing an archive.
   * b. show a stop icon if we're playing the live stream.
   *
   * Otherwise, we show a play icon.
   */
  const playbackButtonLabel = useMemo(() => {
    if (isPlaying) {
      if (isPlayingArchive) {
        return 'Pause';
      } else {
        return 'Stop';
      }
    }

    if (isBuffering) {
      return 'Buffering';
    }

    return 'Play';
  }, [isBuffering, isPlaying, isPlayingArchive]);

  const playbackIcon = useMemo(
    () =>
      isPlaying ? (
        isPlayingArchive ? (
          <Icon
            name={{
              ios: 'pause.fill',
              android: 'pause',
            }}
            size={48}
            color={CORE_COLORS.WMBR_GREEN}
          />
        ) : (
          <Icon
            name={{
              ios: 'stop.fill',
              android: 'stop',
            }}
            size={48}
            color={CORE_COLORS.WMBR_GREEN}
          />
        )
      ) : (
        <Icon
          name={{
            ios: isBuffering ? 'progress.indicator' : 'play.fill',
            android: isBuffering ? 'progress-activity' : 'play-arrow',
          }}
          size={48}
          color={CORE_COLORS.WHITE}
          style={
            isBuffering ? { transform: [{ rotate: spinInterpolation }] } : {}
          }
        />
      ),
    [isBuffering, isPlaying, isPlayingArchive, spinInterpolation],
  );

  useEffect(() => {
    stopAnimations();

    switch (playbackState?.state) {
      case State.Playing:
        startPulseAnimation();
        break;
      case State.Buffering:
        startSpinAnimation();
        break;
      default:
        break;
    }
  }, [playbackState, startPulseAnimation, startSpinAnimation, stopAnimations]);

  return (
    <View style={styles.centerButton}>
      <Animated.View
        style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}
      >
        <View style={styles.middleRing}>
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={playbackButtonLabel}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>{playbackIcon}</View>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: CORE_COLORS.WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  middleRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: CORE_COLORS.WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  playButton: {
    width: 180,
    height: 180,
    // Weird hack to prevent octagon from appearing on Android
    borderRadius: Platform.select({ ios: 90, android: 89 }),
    backgroundColor: CORE_COLORS.WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: CORE_COLORS.WMBR_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  playButtonActive: {
    backgroundColor: CORE_COLORS.WHITE,
    shadowColor: CORE_COLORS.WHITE,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
