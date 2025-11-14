import React, { useCallback, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { State, usePlaybackState } from 'react-native-track-player';
import { CORE_COLORS } from '../../utils/Colors';

interface PlayButtonProps {
  onPress: () => void;
  isPlayerInitialized: boolean;
}

export default function PlayButton({
  onPress,
  isPlayerInitialized: _isPlayerInitialized,
}: PlayButtonProps) {
  const playbackState = usePlaybackState();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const isPlaying = playbackState?.state === State.Playing;

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

  const startRotateAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotateAnim]);

  const stopAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim, rotateAnim]);

  useEffect(() => {
    if (playbackState?.state === State.Playing) {
      startPulseAnimation();
      startRotateAnimation();
    } else {
      stopAnimations();
    }
  }, [
    playbackState,
    rotateAnim,
    pulseAnim,
    startPulseAnimation,
    startRotateAnimation,
    stopAnimations,
  ]);

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
            aria-label={isPlaying ? 'Stop Button' : 'Play Button'}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                {isPlaying ? (
                  <View style={[styles.stopSquare]} />
                ) : (
                  <SvgXml
                    xml={`
                      <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="6,4 30,18 6,32" fill="#FFFFFF" />
                      </svg>
                    `}
                    width={40}
                    height={40}
                  />
                )}
              </View>
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
    borderRadius: 90,
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
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
  stopIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopSquare: {
    width: 36,
    height: 36,
    backgroundColor: CORE_COLORS.WMBR_GREEN,
    borderRadius: 2,
  },
});
