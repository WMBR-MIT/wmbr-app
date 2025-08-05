import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Appearance,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { RecentlyPlayedService } from '../services/RecentlyPlayedService';
import { AudioPreviewService, PreviewState } from '../services/AudioPreviewService';
import { ShowGroup, ProcessedSong } from '../types/RecentlyPlayed';
import CircularProgress from './CircularProgress';

const { height: screenHeight } = Dimensions.get('window');
const DRAWER_HEIGHT = screenHeight * 0.7;
const HEADER_HEIGHT = 60;
const HANDLE_HEIGHT = 20;

interface RecentlyPlayedDrawerProps {
  isVisible: boolean;
  onClose?: () => void;
}

export default function RecentlyPlayedDrawer({ isVisible, onClose }: RecentlyPlayedDrawerProps) {
  const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  });
  
  // Animation values
  const translateY = useSharedValue(DRAWER_HEIGHT);
  const opacity = useSharedValue(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recentlyPlayedService = RecentlyPlayedService.getInstance();
  const audioPreviewService = AudioPreviewService.getInstance();

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
      fetchRecentlyPlayed();
      // Force light content for refresh control
      Appearance.setColorScheme('light');
    } else {
      translateY.value = withSpring(DRAWER_HEIGHT);
      opacity.value = withSpring(0);
      // Stop any playing preview when drawer closes
      audioPreviewService.stop();
      // Reset appearance
      Appearance.setColorScheme(null);
    }
  }, [isVisible]);

  useEffect(() => {
    // Subscribe to preview state changes
    const unsubscribe = audioPreviewService.subscribe(setPreviewState);
    return unsubscribe;
  }, []);

  const fetchRecentlyPlayed = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const groups = await recentlyPlayedService.fetchRecentlyPlayed(isRefresh);
      setShowGroups(groups);
    } catch (err) {
      setError('Failed to load recently played songs');
      console.error('Error fetching recently played:', err);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchRecentlyPlayed(true);
  };

  const handlePlayPreview = async (song: ProcessedSong) => {
    if (!song.appleStreamLink) {
      Alert.alert('Preview Unavailable', 'No preview available for this song');
      return;
    }

    try {
      // If this song is already playing, pause it
      if (previewState.isPlaying && previewState.url === song.appleStreamLink) {
        await audioPreviewService.pause();
      }
      // If this song is paused, resume it
      else if (!previewState.isPlaying && previewState.url === song.appleStreamLink) {
        await audioPreviewService.resume();
      }
      // Otherwise start playing this song
      else {
        await audioPreviewService.playPreview(song.appleStreamLink);
      }
    } catch (error) {
      console.error('Error handling preview playback:', error);
      Alert.alert('Error', 'Failed to play preview');
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      const newY = context.startY + event.translationY;
      translateY.value = Math.max(0, Math.min(DRAWER_HEIGHT, newY));
    },
    onEnd: (event) => {
      const shouldClose = event.translationY > 100 || event.velocityY > 500;
      
      if (shouldClose) {
        translateY.value = withSpring(DRAWER_HEIGHT);
        opacity.value = withSpring(0);
        if (onClose) {
          runOnJS(onClose)();
        }
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    },
  });

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, DRAWER_HEIGHT],
      [0.5, 0],
      Extrapolate.CLAMP
    ),
  }));

  const renderSong = (song: ProcessedSong, index: number) => {
    // Validate song data
    if (!song.title || !song.artist) {
      return null;
    }

    return (
      <View key={`${song.title}-${song.artist}-${index}-${song.playedAt.getTime()}`} style={styles.songItem}>
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {song.title || 'Unknown Title'}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist || 'Unknown Artist'}
          </Text>
          {song.album && (
            <Text style={styles.songAlbum} numberOfLines={1}>
              {song.album} {song.released && `(${song.released})`}
            </Text>
          )}
          <Text style={styles.playedTime}>
            {song.playedAt instanceof Date && !isNaN(song.playedAt.getTime()) 
              ? song.playedAt.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : 'Time unknown'
            }
          </Text>
        </View>
        
        {song.appleStreamLink && (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePlayPreview(song)}
            activeOpacity={0.7}
          >
            <View style={styles.previewButtonContent}>
              {/* Circular progress indicator */}
              {previewState.url === song.appleStreamLink && (
                <View style={styles.progressContainer}>
                  <CircularProgress
                    progress={previewState.progress}
                    size={40}
                    strokeWidth={3}
                    color="#FFFFFF"
                    backgroundColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>
              )}
              
              {/* Play/Pause icon */}
              <View style={styles.iconContainer}>
                {previewState.isPlaying && previewState.url === song.appleStreamLink ? (
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseLine} />
                    <View style={styles.pauseLine} />
                  </View>
                ) : (
                  <Text style={styles.previewButtonText}>♪</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStickyContent = () => {
    const content: React.ReactNode[] = [];
    const stickyIndices: number[] = [];
    
    showGroups.forEach((group, groupIndex) => {
      const validSongs = group.songs.filter(song => song.title && song.artist);
      
      if (validSongs.length === 0) return;
      
      // Add sticky header
      stickyIndices.push(content.length);
      content.push(
        <View key={`header-${groupIndex}`} style={styles.stickyHeader}>
          <Text style={styles.showTitle}>{group.showName}</Text>
          <Text style={styles.songCount}>{validSongs.length} songs</Text>
        </View>
      );
      
      // Add songs
      validSongs.forEach((song, songIndex) => {
        const renderedSong = renderSong(song, songIndex);
        if (renderedSong) {
          content.push(
            <View key={`song-${groupIndex}-${songIndex}`}>
              {renderedSong}
            </View>
          );
        }
      });
    });
    
    return { content, stickyIndices };
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Background overlay */}
      <TouchableOpacity
        style={[styles.overlay, backgroundAnimatedStyle]}
        onPress={onClose}
        activeOpacity={1}
      />
      
      {/* Drawer */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Recently Played</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>↻</Text>
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.scrollView, { backgroundColor: '#1a1a1a' }]}
            showsVerticalScrollIndicator={false}
            bounces={true}
            stickyHeaderIndices={showGroups.length > 0 ? renderStickyContent().stickyIndices : []}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#00843D"
                colors={['#00843D', '#FFFFFF']}
                progressBackgroundColor="#000000"
                titleColor="#FFFFFF"
                title=""
              />
            }
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading recently played...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : showGroups.length > 0 ? (
              renderStickyContent().content
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recently played songs found</Text>
              </View>
            )}
            
            {/* Bottom padding for gesture area */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 998,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 999,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#00843D',
  },
  scrollView: {
    flex: 1,
  },
  showGroup: {
    marginBottom: 20,
  },
  stickyHeader: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  showTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00843D',
    flex: 1,
  },
  songCount: {
    fontSize: 12,
    color: '#888',
  },
  songItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  playedTime: {
    fontSize: 11,
    color: '#666',
  },
  previewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00843D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewButtonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pauseLine: {
    width: 2,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FF4444',
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#00843D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});