import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { debugError } from '../utils/Debug';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AudioPreviewService, PreviewState } from '../services/AudioPreviewService';
import { ProcessedSong } from '../types/RecentlyPlayed';
import CircularProgress from './CircularProgress';

const { height: screenHeight } = Dimensions.get('window');
const DRAWER_HEIGHT = screenHeight * 0.8;
const HEADER_HEIGHT = 60;
const HANDLE_HEIGHT = 20;
const PEEK_HEIGHT = 100; // How much of the drawer shows when collapsed

interface RecentlyPlayedDrawerProps {
  isVisible: boolean;
  onClose?: () => void;
  currentShow?: string;
}

export default function RecentlyPlayedDrawer({ currentShow }: RecentlyPlayedDrawerProps) {
  const [playlist, setPlaylist] = useState<ProcessedSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  });
  
  // Animation values - start in peeking position
  const translateY = useSharedValue(DRAWER_HEIGHT - PEEK_HEIGHT);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const audioPreviewService = AudioPreviewService.getInstance();

  useEffect(() => {
    // Force light content for refresh control
    Appearance.setColorScheme('light');
    
    return () => {
      // Stop any playing preview when component unmounts
      audioPreviewService.stop();
      // Reset appearance
      Appearance.setColorScheme(null);
    };
  }, [audioPreviewService]);

  useEffect(() => {
    // Subscribe to preview state changes
    const unsubscribe = audioPreviewService.subscribe(setPreviewState);
    return unsubscribe;
  }, [audioPreviewService]);

  const parsePlaylistTimestamp = (timeStr: string): Date => {
    try {
      // Format: YYYY/MM/DD HH:MM:SS
      const [datePart, timePart] = timeStr.split(' ');
      
      if (!datePart || !timePart) {
        return new Date();
      }
      
      const [year, month, day] = datePart.split('/').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      
      return new Date(year, month - 1, day, hour, minute, second);
    } catch (parseError) {
      return new Date();
    }
  };

  const fetchCurrentShowPlaylist = useCallback(async (isRefresh = false) => {
    if (!currentShow || currentShow === 'WMBR 88.1 FM') {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      // Fetch playlist using the new API endpoint
      const encodedShowName = encodeURIComponent(currentShow);
      const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${dateStr}`;
      
      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }
      
      const playlistData = await response.json();
      
      if (playlistData.songs && playlistData.songs.length > 0) {
        // Convert playlist songs to ProcessedSong format
        const processedSongs: ProcessedSong[] = playlistData.songs.map((song: any) => ({
          title: song.song.trim(),
          artist: song.artist.trim(),
          album: song.album?.trim() || undefined,
          released: undefined,
          appleStreamLink: '', // Not provided in new API
          playedAt: parsePlaylistTimestamp(song.time),
          showName: currentShow,
          showId: 'current-show'
        }));
        
        // Sort by most recent first
        processedSongs.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());
        setPlaylist(processedSongs);
      } else {
        setPlaylist([]);
      }
    } catch (err) {
      setError(`Failed to load playlist for ${currentShow}`);
      debugError('Error fetching current show playlist:', err);
      setPlaylist([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentShow]);

  // Load playlist data when drawer becomes visible and we have a current show
  useEffect(() => {
    if (isDrawerOpen && currentShow && currentShow !== 'WMBR 88.1 FM') {
      fetchCurrentShowPlaylist();
    }
  }, [isDrawerOpen, currentShow, fetchCurrentShowPlaylist]);


  const handleRefresh = () => {
    fetchCurrentShowPlaylist(true);
  };

  // Handle drawer opening/closing
  const handleDrawerInteraction = (isOpening: boolean) => {
    setIsDrawerOpen(isOpening);
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
    } catch (previewError) {
      debugError('Error handling preview playback:', previewError);
      Alert.alert('Error', 'Failed to play preview');
    }
  };

  const startPosition = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Store the initial position when gesture starts
      startPosition.value = translateY.value;
    })
    .onUpdate((event) => {
      // Calculate new position based on initial position + translation
      const newY = startPosition.value + event.translationY;
      translateY.value = Math.max(0, Math.min(DRAWER_HEIGHT - PEEK_HEIGHT, newY));
    })
    .onEnd((event) => {
      const currentPosition = translateY.value;
      const isExpanded = currentPosition < (DRAWER_HEIGHT - PEEK_HEIGHT) / 2;
      
      if (event.translationY > 0 && event.velocityY > 300) {
        // Swiping down fast - collapse
        translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT);
        runOnJS(handleDrawerInteraction)(false);
      } else if (event.translationY < 0 && event.velocityY < -300) {
        // Swiping up fast - expand
        translateY.value = withSpring(0);
        runOnJS(handleDrawerInteraction)(true);
      } else {
        // Snap to nearest position based on current position
        if (isExpanded) {
          translateY.value = withSpring(0); // Fully expanded
          runOnJS(handleDrawerInteraction)(true);
        } else {
          translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT); // Peeking
          runOnJS(handleDrawerInteraction)(false);
        }
      }
    });

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, DRAWER_HEIGHT - PEEK_HEIGHT],
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

  const renderPlaylistContent = () => {
    if (!playlist || playlist.length === 0) {
      return [];
    }

    return playlist.map((song, index) => {
      const renderedSong = renderSong(song, index);
      if (renderedSong) {
        return (
          <View key={`song-${index}`}>
            {renderedSong}
          </View>
        );
      }
      return null;
    }).filter(Boolean);
  };

  // Drawer is always visible, just in different positions

  return (
    <>
      {/* Background overlay - only show when expanded */}
      <Animated.View 
        style={[styles.overlay, backgroundAnimatedStyle]}
        pointerEvents="none"
      />
      
      {/* Drawer */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
          {/* Handle */}
          <View style={styles.handle} />
          
          {/* Header */}
          <View style={styles.peekHeader}>
            <Text style={styles.peekHeaderTitle}>Recently Played</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>↻</Text>
              </TouchableOpacity>
              <Text style={styles.dragHint}>▲</Text>
            </View>
          </View>
          
          {/* Content */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.scrollView, { backgroundColor: '#1a1a1a' }]}
            showsVerticalScrollIndicator={false}
            bounces={true}
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
            {/* Current Show Header */}
            {currentShow && currentShow !== 'WMBR 88.1 FM' && (
              <View style={styles.currentShowHeader}>
                <Text style={styles.currentShowTitle}>{currentShow}</Text>
                <Text style={styles.currentShowSubtitle}>Now Playing</Text>
              </View>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading playlist...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : !currentShow || currentShow === 'WMBR 88.1 FM' ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Pull up when a show is playing to see the playlist</Text>
              </View>
            ) : playlist.length > 0 ? (
              <>
                {renderPlaylistContent()}
              </>
            ) : isDrawerOpen ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No playlist found for {currentShow}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Pull up to load playlist</Text>
              </View>
            )}
            
            {/* Bottom padding for gesture area */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </GestureDetector>

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
  peekHeader: {
    height: PEEK_HEIGHT - HANDLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  peekHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#00843D',
  },
  dragHint: {
    fontSize: 16,
    color: '#888',
    fontWeight: 'bold',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songCount: {
    fontSize: 12,
    color: '#888',
  },
  chevron: {
    fontSize: 16,
    color: '#888',
    fontWeight: 'bold',
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
  currentShowHeader: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  currentShowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00843D',
    marginBottom: 4,
  },
  currentShowSubtitle: {
    fontSize: 14,
    color: '#888',
  },
});
