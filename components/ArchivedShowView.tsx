import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';
import { Show, Archive } from '../types/RecentlyPlayed';
import { PlaylistResponse, PlaylistSong } from '../types/Playlist';
import { PlaylistService } from '../services/PlaylistService';
import { ArchiveService } from '../services/ArchiveService';
import { getWMBRLogoSVG } from '../utils/WMBRLogo';

const { width, height } = Dimensions.get('window');
const ALBUM_SIZE = width * 0.6;

interface ArchivedShowViewProps {
  show: Show;
  archive: Archive;
  isVisible: boolean;
  onClose: () => void;
}

// Generate consistent gradient colors based on show name
const generateGradientColors = (showName: string): [string, string] => {
  const colors = [
    ['#FF6B6B', '#4ECDC4'], // Red to Teal
    ['#45B7D1', '#96CEB4'], // Blue to Green
    ['#FECA57', '#FF9FF3'], // Yellow to Pink  
    ['#54A0FF', '#5F27CD'], // Light Blue to Purple
    ['#00D2D3', '#54A0FF'], // Cyan to Blue
    ['#FF9F43', '#FECA57'], // Orange to Yellow
    ['#5F27CD', '#00D2D3'], // Purple to Cyan
    ['#10AC84', '#1DD1A1'], // Green variants
    ['#F79F1F', '#EA2027'], // Orange to Red
    ['#006BA6', '#0496C7'], // Blue variants
    ['#E17055', '#74B9FF'], // Coral to Sky Blue
    ['#A29BFE', '#FD79A8'], // Lavender to Pink
    ['#FDCB6E', '#6C5CE7'], // Golden to Purple
    ['#55A3FF', '#FF7675'], // Azure to Red
    ['#00B894', '#FDCB6E'], // Mint to Gold
    ['#E84393', '#0984E3'], // Magenta to Blue
    ['#00CEC9', '#FF7675'], // Turquoise to Coral
    ['#A29BFE', '#55EFC4'], // Purple to Mint
    ['#FD79A8', '#FDCB6E'], // Pink to Yellow
    ['#74B9FF', '#81ECEC'], // Blue to Cyan
    ['#FF7675', '#00B894'], // Red to Green
    ['#6C5CE7', '#FFA502'], // Purple to Orange
    ['#00CEC9', '#E17055'], // Teal to Terracotta
    ['#FDCB6E', '#E84393'], // Gold to Pink
    ['#55EFC4', '#74B9FF'], // Mint to Blue
  ];
  
  // Use show name to consistently pick same colors
  let hash = 0;
  for (let i = 0; i < showName.length; i++) {
    const char = showName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Generate much darker versions of the colors for backgrounds
const generateDarkGradientColors = (showName: string): [string, string] => {
  const [originalStart, originalEnd] = generateGradientColors(showName);
  
  // Function to convert hex to RGB and darken significantly
  const darkenColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Darken to about 15% of original brightness
    const darkenedR = Math.floor(r * 0.15);
    const darkenedG = Math.floor(g * 0.15);
    const darkenedB = Math.floor(b * 0.15);
    
    return `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
  };
  
  return [darkenColor(originalStart), darkenColor(originalEnd)];
};


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

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
      fetchPlaylist();
    } else {
      translateY.value = withSpring(height);
      opacity.value = withSpring(0);
    }
  }, [isVisible]);

  useEffect(() => {
    // Subscribe to archive service state changes
    const unsubscribe = archiveService.subscribe((state) => {
      const isCurrentArchivePlaying = state.isPlayingArchive && 
        state.currentArchive?.url === archive.url;
      setIsArchivePlaying(isCurrentArchivePlaying);
    });

    return unsubscribe;
  }, [archive.url, archiveService]);

  const fetchPlaylist = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const playlistData = await playlistService.fetchPlaylist(show.name, archive.date);
      setPlaylist(playlistData);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError('Failed to load playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Calculate current progress percentage
  const getCurrentPercentage = () => {
    if (isDragging) {
      // During dragging, clamp the visual percentage but allow the user to keep dragging
      return Math.min(Math.max(dragPercentage, 0), 100);
    }
    if (progress.duration > 0) {
      return Math.min(Math.max((progress.position / progress.duration) * 100, 0), 100);
    }
    return 0;
  };

  const [gradientStart, gradientEnd] = generateGradientColors(show.name);
  const [darkGradientStart, darkGradientEnd] = generateDarkGradientColors(show.name);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
      console.error('Error seeking:', e);
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
      console.error('Error with play/pause:', e);
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
              <Text style={styles.headerTitle}>Archive</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Album Cover Section */}
            <View style={styles.albumSection}>
              <View style={[styles.albumCover, { backgroundColor: gradientStart }]}>
                <LinearGradient
                  colors={[gradientStart, gradientEnd, 'rgba(0,0,0,0.3)']}
                  locations={[0, 0.6, 1]}
                  style={styles.albumGradient}
                >
                  <View style={styles.albumContent}>
                    {/* Centered logo at top */}
                    <View style={styles.albumLogoContainer}>
                      <SvgXml xml={getWMBRLogoSVG('#FFFFFF')} width={60} height={13} />
                    </View>
                    
                    {/* Left-aligned content area */}
                    <View style={styles.albumTextContainer}>
                      <Text style={styles.albumShowName} numberOfLines={2}>
                        {show.name}
                      </Text>
                      <Text style={styles.albumArchiveLabel}>ARCHIVE</Text>
                      <Text style={styles.albumDate}>
                        {formatDate(archive.date)}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

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
                      {formatDuration(isDragging ? scrubPosition : progress.position)}
                    </Text>
                    <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
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
  albumSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  albumCover: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  albumGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 0,
  },
  albumContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  albumLogoContainer: {
    alignItems: 'center',
  },
  albumTextContainer: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'flex-end',
    paddingLeft: 20,
  },
  albumShowName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  albumArchiveLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  albumDate: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
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