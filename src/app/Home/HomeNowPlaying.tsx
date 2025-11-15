import React, { useEffect, useState, useRef, useCallback } from 'react';
import { State, usePlaybackState } from 'react-native-track-player';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { ShowInfo } from '@services/MetadataService';
import { COLORS } from '@utils/Colors';

export default function HomeNowPlaying({ showInfo }: { showInfo?: ShowInfo }) {
  const { currentSong, currentArtist } = showInfo || {};

  const [previousSong, setPreviousSong] = useState<string>('');

  const playbackState = usePlaybackState();

  const isPlaying = playbackState?.state === State.Playing;

  const songChangeScale = useRef(new Animated.Value(1)).current;
  const songChangeRotate = useRef(new Animated.Value(0)).current;
  const songChangeOpacity = useRef(new Animated.Value(1)).current;

  const songRotation = songChangeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const startSongChangeAnimation = useCallback(() => {
    // Reset animation values
    songChangeScale.setValue(1);
    songChangeRotate.setValue(0);
    songChangeOpacity.setValue(1);

    // Create a fun bouncy scale + rotate + opacity animation
    Animated.sequence([
      // Phase 1: Bounce up with rotation and opacity flash
      Animated.parallel([
        Animated.timing(songChangeScale, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeRotate, {
          toValue: 0.25, // 90 degrees
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeOpacity, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Bounce down slightly with opacity return
      Animated.parallel([
        Animated.timing(songChangeScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeRotate, {
          toValue: -0.1, // -36 degrees
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Phase 3: Settle to normal with slight overshoot
      Animated.parallel([
        Animated.timing(songChangeScale, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeRotate, {
          toValue: 0.05, // 18 degrees
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: Return to normal
      Animated.parallel([
        Animated.timing(songChangeScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(songChangeRotate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [songChangeOpacity, songChangeRotate, songChangeScale]);

  // Trigger animation when song changes
  useEffect(() => {
    if (currentSong && currentArtist) {
      const newSongKey = `${currentArtist}-${currentSong}`;
      if (previousSong && previousSong !== newSongKey) {
        // Song changed! Trigger fun animation
        startSongChangeAnimation();
      }

      setPreviousSong(newSongKey);
    }
  }, [currentSong, currentArtist, previousSong, startSongChangeAnimation]);

  return (
    <>
      <Text style={styles.liveText}>● LIVE</Text>

      {currentSong && currentArtist && (
        <View style={styles.nowPlayingContainer}>
          <Text
            style={[
              styles.nowPlayingLabel,
              isPlaying && styles.nowPlayingLabelActive,
            ]}
          >
            Now playing:
          </Text>
          <Animated.Text
            style={[
              styles.currentSongText,
              isPlaying && styles.currentSongTextActive,
              {
                transform: [
                  { scale: songChangeScale },
                  { rotate: songRotation },
                ],
                opacity: songChangeOpacity,
              },
            ]}
          >
            {currentArtist}: {currentSong}
          </Animated.Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  liveText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '500',
    marginBottom: 8,
  },
  nowPlayingContainer: { alignItems: 'center', marginTop: 4 },
  nowPlayingLabel: {
    fontSize: 10,
    color: COLORS.TEXT.META,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nowPlayingLabelActive: { color: '#BBBBBB' },
  currentSongText: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  currentSongTextActive: { color: COLORS.TEXT.ACTIVE },
});
