import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { debugError } from '../utils/Debug';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';
import { Show, Archive } from '../types/RecentlyPlayed';
import { PlaylistResponse, PlaylistSong } from '../types/Playlist';
import { PlaylistService } from '../services/PlaylistService';
import { ArchiveService } from '../services/ArchiveService';
import { secondsToTime, formatTime } from '../utils/DateTime';
import { generateDarkGradientColors, generateGradientColors } from '../utils/GradientColors';
import { ShowImage } from './ShowImage';

const { height } = Dimensions.get('window');

interface ArchivedShowViewProps {
  show: Show;
  archive: Archive;
  isVisible: boolean;
  onClose: () => void;
}

export default function ArchivedShowView({ show, archive, isVisible, onClose }: ArchivedShowViewProps) {
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const progress = useProgress();
  const playbackState = usePlaybackState();
  
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchivePlaying, setIsArchivePlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [dragPercentage, setDragPercentage] = useState(0);
  
  // Shared values for gesture handling
  const progressBarWidth = useSharedValue(0);
  const dragPosition = useSharedValue(0);
  
  const playlistService = PlaylistService.getInstance();
  const archiveService = ArchiveService.getInstance();

  const fetchPlaylist = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const playlistData = await playlistService.fetchPlaylist(show.name, archive.date);
      setPlaylist(playlistData);
    } catch (err) {
      debugError('Error fetching playlist:', err);
      setError('Failed to load playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fp = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const playlistData = await playlistService.fetchPlaylist(show.name, archive.date);
        setPlaylist(playlistData);
      } catch (err) {
        debugError('Error fetching playlist:', err);
        setError('Failed to load playlist. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    if (isVisible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
      fp();
    } else {
      translateY.value = withSpring(height);
      opacity.value = withSpring(0);
    }
  }, [isVisible, opacity, translateY, archive.date, playlistService, show.name]);

  useEffect(() => {
    if (!isVisible) return;

    const onBackPress = () => {
      try {
        onClose();
      } catch (e) {
        debugError('Error during back handler onClose:', e);
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      sub.remove();
    };
  }, [isVisible, onClose]);

  useEffect(() => {
    // Subscribe to archive service state changes
    const unsubscribe = archiveService.subscribe((state) => {
      const isCurrentArchivePlaying = state.isPlayingArchive && 
        state.currentArchive?.url === archive.url;
      setIsArchivePlaying(isCurrentArchivePlaying);
    });

    return unsubscribe;
  }, [archive.url, archiveService]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Calculate current progress percentage
  const getCurrentPercentage = useCallback(() => {
    if (isDragging) {
      // During dragging, clamp the visual percentage but allow the user to keep dragging
      return Math.min(Math.max(dragPercentage, 0), 100);
    }
    if (progress.duration > 0) {
      return Math.min(Math.max((progress.position / progress.duration) * 100, 0), 100);
    }
    return 0;
  }, [dragPercentage, isDragging, progress.duration, progress.position]);

  const [gradientStart] = generateGradientColors(show.name);
  const [darkGradientStart, darkGradientEnd] = generateDarkGradientColors(show.name);

  const updateScrubPosition = (position: number, percentage: number) => {
    setScrubPosition(position);
    setDragPercentage(percentage);
  };

  const seekToPosition = async (position: number) => {
    try {
      // Clamp position to avoid seeking to exact beginning or end
      const clampedPosition = Math.max(0.1, Math.min(position, progress.duration - 0.1));
      await TrackPlayer.seekTo(clampedPosition);
    } catch (e) {
      debugError('Error seeking:', e);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      runOnJS(setIsDragging)(true);
      // Set initial drag position to the touch point - allow full range
      dragPosition.value = event.x;
    })
    .onUpdate((event) => {
      // Allow dragging to full range without clamping during drag
      dragPosition.value = event.x;
      
      if (progressBarWidth.value > 0) {
        // Clamp only for visual display and position calculation
        const clampedX = Math.max(0, Math.min(event.x, progressBarWidth.value));
        const percentage = (clampedX / progressBarWidth.value) * 100;
        const newPosition = (clampedX / progressBarWidth.value) * progress.duration;
        runOnJS(updateScrubPosition)(newPosition, percentage);
      }
    })
    .onEnd(() => {
      if (progressBarWidth.value > 0) {
        // Clamp the final position for seeking
        const clampedX = Math.max(0, Math.min(dragPosition.value, progressBarWidth.value));
        const percentage = clampedX / progressBarWidth.value;
        const newPosition = percentage * progress.duration;
        runOnJS(seekToPosition)(newPosition);
      }
      runOnJS(setIsDragging)(false);
    });

  const handlePlayPause = async () => {
    try {
      if (isArchivePlaying && playbackState?.state === State.Playing) {
        // Pause the current archive
        await TrackPlayer.pause();
      } else if (isArchivePlaying && playbackState?.state === State.Paused) {
        // Resume the current archive
        await TrackPlayer.play();
      } else {
        // Start playing this archive
        await archiveService.playArchive(archive, show);
        setIsArchivePlaying(true);
      }
      // Don't close the view - keep user on same screen
    } catch (e) {
      debugError('Error with play/pause:', e);
      Alert.alert('Error', 'Failed to play archive. Please try again.');
    }
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor={gradientStart} />
      
      <LinearGradient
        colors={[darkGradientStart, darkGradientEnd, '#000000']}
        locations={[0, 0.3, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
              <Text style={styles.headerTitle}>Show Details</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <ShowImage showName={show.name} archiveDate={archive.date} />

            {/* Play/Pause Button */}
            <View style={styles.playSection}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                activeOpacity={0.8}
              >
                {isArchivePlaying && playbackState?.state === State.Playing ? (
                  <Icon name="pause-circle" size={64} color="#FFFFFF" />
                ) : (
                  <Icon name="play-circle" size={64} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Progress Bar - Only show when this archive is playing */}
            {isArchivePlaying && progress.duration > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressContainer}>
                  <GestureDetector gesture={panGesture}>
                    <Animated.View style={styles.progressTouchArea}>
                      <View 
                        style={styles.progressBar}
                        onLayout={(event) => {
                          progressBarWidth.value = event.nativeEvent.layout.width;
                        }}
                      >
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${getCurrentPercentage()}%` }
                          ]} 
                        />
                        <View 
                          style={[
                            styles.progressDot, 
                            { left: `${getCurrentPercentage()}%` }
                          ]} 
                        />
                      </View>
                    </Animated.View>
                  </GestureDetector>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                      {secondsToTime(isDragging ? scrubPosition : progress.position)}
                    </Text>
                    <Text style={styles.timeText}>{secondsToTime(progress.duration)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Playlist Section */}
            <View style={styles.playlistSection}>
              <Text style={styles.sectionTitle}>Playlist</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Loading playlist...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={fetchPlaylist} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : playlist && playlist.songs ? (
                playlist.songs.map((song: PlaylistSong, index: number) => (
                  <View key={index} style={styles.songItem}>
                    <View style={styles.songInfo}>
                      <Text style={styles.songTitle} numberOfLines={1}>
                        {song.song}
                      </Text>
                      <Text style={styles.songArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                      {song.album && (
                        <Text style={styles.songAlbum} numberOfLines={1}>
                          {song.album}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.songTime}>
                      {formatTime(song.time)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No playlist available</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingTop:20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  playSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  playButton: {
    padding: 16,
  },
  playlistSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  songArtist: {
    color: '#CCCCCC',
    fontSize: 14,
    marginBottom: 2,
  },
  songAlbum: {
    color: '#888',
    fontSize: 12,
  },
  songTime: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF4444',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  bottomPadding: {
    height: 100,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
  },
  progressTouchArea: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    minWidth: 2,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
});
