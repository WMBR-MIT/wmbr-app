import React, { useEffect, useState, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Appearance,
} from 'react-native';
import { debugError } from '../utils/Debug';
import { RecentlyPlayedService } from '../services/RecentlyPlayedService';
import { AudioPreviewService, PreviewState } from '../services/AudioPreviewService';
import { ProcessedSong } from '../types/RecentlyPlayed';
import CircularProgress from './CircularProgress';
import { useShowPlaylists } from './hooks/useShowPlaylists';

interface RecentlyPlayedProps {
  currentShow?: string;
  refreshKey?: number;
}
export default function RecentlyPlayed({ currentShow, refreshKey }: RecentlyPlayedProps = {}) {
  const navigation = useNavigation<any>();
  // use shared hook for playlist logic
  const {
    showGroups,
    showPlaylists,
    loading,
    refreshing,
    error,
    fetchRecentlyPlayed,
    fetchCurrentShowPlaylist,
    setHasReachedEndOfDay,
    setShouldAutoLoadPrevious,
  } = useShowPlaylists(currentShow);

  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  });
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recentlyPlayedService = RecentlyPlayedService.getInstance();
  const audioPreviewService = AudioPreviewService.getInstance();

  useEffect(() => {
    // On mount, load recently played and set appearance
    fetchRecentlyPlayed();
    Appearance.setColorScheme('light');

    return () => {
      audioPreviewService.stop();
      Appearance.setColorScheme(null);
    };
  }, [audioPreviewService, fetchRecentlyPlayed]);

  // When currentShow changes, try to load its playlist
  useEffect(() => {
    if (currentShow) {
      fetchCurrentShowPlaylist();
    }
  }, [currentShow, fetchCurrentShowPlaylist]);

  // Parent-requested refresh (drawer refresh button increments refreshKey)
  useEffect(() => {
    if (typeof refreshKey === 'number') {
      fetchRecentlyPlayed(true);
      if (currentShow) fetchCurrentShowPlaylist(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    // Subscribe to preview state changes
    const unsubscribe = audioPreviewService.subscribe(setPreviewState);
    return unsubscribe;
  }, [audioPreviewService]);

  // The component still uses fetchRecentlyPlayed & fetchCurrentShowPlaylist from hook below in UI actions

  const handleRefresh = () => {
    fetchRecentlyPlayed(true);
    setHasReachedEndOfDay(false);
    setShouldAutoLoadPrevious(false);
    fetchCurrentShowPlaylist(true);
  };

  const handleShowTitlePress = (showId: string) => {
    // Find the show details from the service's cache
    const showsCache = recentlyPlayedService.getShowsCache();
    const show = showsCache.find(s => s.id === showId);
    if (show) {
      navigation.push('ShowDetails', { show: show });
    }
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
      debugError('Error handling preview playback:', error);
      Alert.alert('Error', 'Failed to play preview');
    }
  };

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
    
    // If we have a currentShow and playlist data, render that instead
    if (currentShow && showPlaylists.length > 0) {
      // Single-show view
      if (showPlaylists.length === 1) {
        const curr = showPlaylists[0];
        if (curr.songs.length === 0) {
          return { content: [
            <View key="no-playlist" style={styles.emptyShowContainer}><Text style={styles.emptyShowText}>No playlist found for this show</Text></View>
          ], stickyIndices: [] };
        }

        const nodes: React.ReactNode[] = [];
        nodes.push(
          <View key="current-show">
            {curr.songs.map((song, i) => renderSong(song, i)).filter(Boolean)}
          </View>
        );

        return { content: nodes, stickyIndices: [] };
      }
      // Multiple playlists
      showPlaylists.forEach((showPlaylist, index) => {
        content.push(
          <View key={`show-${index}`}>
            <View style={styles.showHeader}>
              <Text style={styles.showHeaderTitle}>{showPlaylist.showName}</Text>
              <Text style={styles.showHeaderSubtitle}>{showPlaylist.songs.length > 0 ? `${showPlaylist.songs.length} song${showPlaylist.songs.length !== 1 ? 's' : ''}` : 'No playlist available'}</Text>
            </View>
            {showPlaylist.songs.map((song, si) => (
              <View key={`song-${index}-${si}`}>{renderSong(song, si)}</View>
            ))}
          </View>
        );
      });

      return { content, stickyIndices };
    }

    showGroups.forEach((group, groupIndex) => {
      const validSongs = group.songs.filter(song => song.title && song.artist);
      
      if (validSongs.length === 0) return;
      
      // Add sticky header
      stickyIndices.push(content.length);
      content.push(
        <TouchableOpacity 
          key={`header-${groupIndex}`} 
          style={styles.stickyHeader}
          onPress={() => handleShowTitlePress(validSongs[0].showId)}
          activeOpacity={0.7}
        >
          <Text style={styles.showTitle}>{group.showName}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.songCount}>{validSongs.length} songs</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
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

  return (
    <>
          {/* Content */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.scrollView, { backgroundColor: '#1a1a1a' }]}
            showsVerticalScrollIndicator={false}
            bounces={true}
            stickyHeaderIndices={((currentShow && showPlaylists.length > 0) || showGroups.length > 0) ? renderStickyContent().stickyIndices : []}
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
            {(loading && !refreshing) ? (
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
            ) : ((currentShow && showPlaylists.length > 0) || showGroups.length > 0) ? (
              renderStickyContent().content
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recently played songs found</Text>
              </View>
            )}
            
            {/* Bottom padding for gesture area */}
            <View style={styles.bottomPadding} />
          </ScrollView>
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
  emptyShowContainer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyShowText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  showHeader: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 0,
  },
  showHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00843D',
    marginBottom: 2,
  },
  showHeaderSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  bottomPadding: {
    height: 100,
  },
});