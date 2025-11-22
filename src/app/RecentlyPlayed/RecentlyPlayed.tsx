import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import { debugError } from '@utils/Debug';
import {
  AudioPreviewService,
  PreviewState,
} from '@services/AudioPreviewService';
import { ProcessedSong } from '@customTypes/RecentlyPlayed';
import { ScheduleService } from '@services/ScheduleService';
import { RecentlyPlayedService } from '@services/RecentlyPlayedService';
import CircularProgress from './CircularProgress';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { getDateYMD, parsePlaylistTimestamp } from '@utils/DateTime';
import { WmbrRouteName } from '@customTypes/Navigation';
import { DEFAULT_NAME } from '@customTypes/Playlist';
import { COLORS, CORE_COLORS } from '@utils/Colors';

interface RecentlyPlayedProps {
  refreshKey?: number;
}

interface ShowPlaylist {
  showName: string;
  songs: ProcessedSong[];
}

export default function RecentlyPlayed({
  refreshKey,
}: RecentlyPlayedProps = {}) {
  const navigation =
    useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  const recentlyPlayedService = RecentlyPlayedService.getInstance();
  const [currentShow, setCurrentShow] = useState<string | undefined>(undefined);

  const [showPlaylists, setShowPlaylists] = useState<ShowPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReachedEndOfDay, setHasReachedEndOfDay] = useState(false); // Track if we've reached end of shows
  const [previewState, setPreviewState] = useState<PreviewState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    progress: 0,
    url: null,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const audioPreviewService = AudioPreviewService.getInstance();
  const [shouldAutoLoadPrevious, setShouldAutoLoadPrevious] = useState(false); // Trigger auto-load of previous show
  // Prevent concurrent fetches
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    // Force dark mode for light-colored refresh control spinner
    Appearance.setColorScheme('dark');

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

  // subscribes to RecentlyPlayedService subscriber
  useEffect(() => {
    const unsubscribe = recentlyPlayedService.subscribeToCurrentShow(show => {
      setCurrentShow(show ?? undefined);
    });
    return unsubscribe;
  }, [recentlyPlayedService]);

  const fetchShowPlaylist = useCallback(
    async (showName: string, date: Date): Promise<ProcessedSong[]> => {
      const dateStr = getDateYMD(date);
      const encodedShowName = encodeURIComponent(showName);
      const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${dateStr}`;

      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        // If it's a 404, return empty list instead of throwing error
        if (response.status === 404) {
          return [];
        }

        throw new Error(`Failed to fetch playlist: ${response.status}`);
      }

      const playlistData = await response.json();

      // If the response has an "error" key, return empty list
      if (playlistData.error) {
        return [];
      }

      if (playlistData.songs && playlistData.songs.length > 0) {
        // Convert playlist songs to ProcessedSong format
        const processedSongs: ProcessedSong[] = playlistData.songs.map(
          (song: any) => ({
            title: song.song.trim(),
            artist: song.artist.trim(),
            album: song.album?.trim() || undefined,
            released: undefined,
            appleStreamLink: '', // Not provided in new API
            playedAt: parsePlaylistTimestamp(song.time),
            showName: showName,
            showId: `${showName}-${date}`,
          }),
        );

        // Sort by most recent first
        processedSongs.sort(
          (a, b) => b.playedAt.getTime() - a.playedAt.getTime(),
        );
        return processedSongs;
      }

      return [];
    },
    [],
  );

  const fetchCurrentShowPlaylist = useCallback(
    async (isRefresh = false) => {
      if (!currentShow || currentShow === DEFAULT_NAME) return;

      // Prevent concurrent fetches (debounce)
      if (fetchInFlightRef.current) return;

      fetchInFlightRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
        setShowPlaylists([]);
        setHasReachedEndOfDay(false);
        setShouldAutoLoadPrevious(false); // Reset flag on refresh
      } else {
        setLoading(true);
      }
      setError(null);

      let shouldTriggerAutoLoad = false;

      try {
        const songs = await fetchShowPlaylist(currentShow, new Date());
        setShowPlaylists([{ showName: currentShow, songs }]);

        // If current show has no songs, mark for auto-load of previous show
        if (songs.length === 0) {
          shouldTriggerAutoLoad = true;
        }
      } catch (err) {
        setError(`Failed to load playlist for ${currentShow}`);
        debugError('Error fetching current show playlist:', err);
        setShowPlaylists([]);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }

        // Trigger auto-load after loading state is cleared
        if (shouldTriggerAutoLoad) {
          setShouldAutoLoadPrevious(true);
        }

        fetchInFlightRef.current = false;
      }
    },
    [currentShow, fetchShowPlaylist],
  );

  const loadPreviousShow = useCallback(async () => {
    // Determine which show to find the previous show for
    const lastLoadedShow =
      showPlaylists.length > 0
        ? showPlaylists[showPlaylists.length - 1].showName
        : currentShow;

    if (
      !lastLoadedShow ||
      !currentShow ||
      currentShow === DEFAULT_NAME ||
      loadingMore ||
      hasReachedEndOfDay
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      const scheduleService = ScheduleService.getInstance();
      const previousShow =
        await scheduleService.findPreviousShow(lastLoadedShow);

      if (!previousShow) {
        setHasReachedEndOfDay(true);
        return;
      }

      // Check if we've already loaded this specific previous show to prevent duplicates
      const alreadyLoaded = showPlaylists.some(
        playlist => playlist.showName === previousShow.show.name,
      );
      if (alreadyLoaded) {
        return;
      }

      try {
        const songs = await fetchShowPlaylist(
          previousShow.show.name,
          new Date(previousShow.date),
        );

        setShowPlaylists(prev => [
          ...prev,
          {
            showName: previousShow.show.name,
            songs,
          },
        ]);
      } catch (playlistError) {
        // Handle 404 or other playlist fetch errors gracefully - still add the show with empty songs
        setShowPlaylists(prev => [
          ...prev,
          {
            showName: previousShow.show.name,
            songs: [],
          },
        ]);
      }
    } catch (err) {
      debugError('Error loading previous show:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    currentShow,
    showPlaylists,
    loadingMore,
    hasReachedEndOfDay,
    fetchShowPlaylist,
  ]);

  // Clear playlist data when current show changes
  useEffect(() => {
    setShowPlaylists([]);
    setHasReachedEndOfDay(false);
    setShouldAutoLoadPrevious(false);
    setError(null);
  }, [currentShow]);

  useEffect(() => {
    if (currentShow && currentShow !== DEFAULT_NAME) {
      fetchCurrentShowPlaylist();
    }
  }, [currentShow, fetchCurrentShowPlaylist]);

  useEffect(() => {
    if (typeof refreshKey === 'number') {
      fetchCurrentShowPlaylist(true);
    }
  }, [refreshKey, fetchCurrentShowPlaylist]);

  // Auto-load previous show when current show has no songs
  useEffect(() => {
    if (
      shouldAutoLoadPrevious &&
      showPlaylists.length === 1 &&
      showPlaylists[0].songs.length === 0 &&
      !loading &&
      !loadingMore &&
      !hasReachedEndOfDay
    ) {
      setShouldAutoLoadPrevious(false); // Reset flag before loading
      loadPreviousShow();
    }
  }, [
    shouldAutoLoadPrevious,
    showPlaylists,
    loading,
    loadingMore,
    hasReachedEndOfDay,
    loadPreviousShow,
  ]);

  const handleRefresh = () => {
    setHasReachedEndOfDay(false);
    setLoadingMore(false);
    fetchCurrentShowPlaylist(true);
  };

  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 50;

      const distanceFromBottom =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);
      const isNearBottom = distanceFromBottom <= paddingToBottom;
      const canScroll = contentSize.height > layoutMeasurement.height;

      // If content is shorter than the view, or user is near bottom, try to load more
      if (
        (isNearBottom && canScroll) ||
        (!canScroll && showPlaylists.length === 1)
      ) {
        loadPreviousShow();
      }
    },
    [loadPreviousShow, showPlaylists.length],
  );

  const handlePlayPreview = useCallback(
    async (song: ProcessedSong) => {
      if (!song.appleStreamLink) {
        Alert.alert(
          'Preview Unavailable',
          'No preview available for this song',
        );
        return;
      }

      try {
        // If this song is already playing, pause it
        if (
          previewState.isPlaying &&
          previewState.url === song.appleStreamLink
        ) {
          await audioPreviewService.pause();
        }
        // If this song is paused, resume it
        else if (
          !previewState.isPlaying &&
          previewState.url === song.appleStreamLink
        ) {
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
    },
    [audioPreviewService, previewState.isPlaying, previewState.url],
  );

  const renderSong = useCallback(
    (song: ProcessedSong, key: string) => {
      // Validate song data
      if (!song.title || !song.artist) {
        return null;
      }

      return (
        <View
          key={`${key}-${song.title}-${song.artist}-${song.playedAt.getTime()}`}
          style={styles.songItem}
        >
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
                    hour12: true,
                  })
                : 'Time unknown'}
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
                  {previewState.isPlaying &&
                  previewState.url === song.appleStreamLink ? (
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
    },
    [
      handlePlayPreview,
      previewState.isPlaying,
      previewState.progress,
      previewState.url,
    ],
  );

  const renderShowGroup = useCallback(
    (showPlaylist: ShowPlaylist, showIndex: number) => {
      return (
        <View key={`show-${showIndex}`} style={styles.showGroup}>
          <View style={styles.showHeader}>
            <Text style={styles.showHeaderTitle}>{showPlaylist.showName}</Text>
            <Text style={styles.showHeaderSubtitle}>
              {showPlaylist.songs.length > 0
                ? `${showPlaylist.songs.length} song${showPlaylist.songs.length !== 1 ? 's' : ''}`
                : 'No playlist available'}
            </Text>
          </View>
          {showPlaylist.songs.length > 0 ? (
            showPlaylist.songs
              .map((song, songIndex) =>
                renderSong(song, `${showIndex}-${songIndex}`),
              )
              .filter(Boolean)
          ) : (
            <View style={styles.emptyShowContainer}>
              <Text style={styles.emptyShowText}>
                No playlist found for this show
              </Text>
            </View>
          )}
        </View>
      );
    },
    [renderSong],
  );

  const renderPlaylistContent = useCallback(() => {
    if (!showPlaylists || showPlaylists.length === 0) {
      return [];
    }

    const content = [];

    if (showPlaylists.length === 1) {
      // Single show: render without header (current show only)
      content.push(
        <View key="current-show">
          {showPlaylists[0].songs
            .map((song, songIndex) => renderSong(song, `current-${songIndex}`))
            .filter(Boolean)}
        </View>,
      );
    } else {
      // Multiple shows: render all with headers for clarity
      content.push(
        <View key="all-shows">
          {showPlaylists.map((showPlaylist, index) =>
            renderShowGroup(showPlaylist, index),
          )}
        </View>,
      );
    }

    // Add loading indicator if loading more
    if (loadingMore) {
      content.push(
        <View key="loading-more" style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.loadingMoreText}>Loading previous show...</Text>
        </View>,
      );
    }

    // Add end-of-day message if we've reached the end
    if (hasReachedEndOfDay && !loadingMore) {
      content.push(
        <View key="end-of-day" style={styles.endOfDayContainer}>
          <Text style={styles.endOfDayText}>No more shows for today</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Schedule')}
            style={styles.scheduleButton}
          >
            <Text style={styles.scheduleButtonText}>View Full Schedule</Text>
          </TouchableOpacity>
        </View>,
      );
    }

    return content;
  }, [
    hasReachedEndOfDay,
    loadingMore,
    navigation,
    renderShowGroup,
    renderSong,
    showPlaylists,
  ]);

  const mainContent = (() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading playlist...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentShow || currentShow === DEFAULT_NAME) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No playlists found</Text>
        </View>
      );
    }

    if (
      showPlaylists.length > 0 &&
      (showPlaylists[0].songs.length > 0 || showPlaylists.length > 1)
    ) {
      return <>{renderPlaylistContent()}</>;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No playlist found for {currentShow}
        </Text>
      </View>
    );
  })();

  return (
    <>
      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
            colors={[CORE_COLORS.WMBR_GREEN, '#FFFFFF']}
            progressBackgroundColor="#000000"
            titleColor="#FFFFFF"
            title=""
          />
        }
      >
        {/* Current Show Header - only show when there's a single show with songs */}
        {currentShow &&
          currentShow !== DEFAULT_NAME &&
          showPlaylists.length === 1 &&
          showPlaylists[0].songs.length > 0 && (
            <View style={styles.currentShowHeader}>
              <Text style={styles.currentShowTitle}>{currentShow}</Text>
              <Text style={styles.currentShowSubtitle}>Now Playing</Text>
            </View>
          )}
        {mainContent}
        {/* Bottom padding for gesture area */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
  },
  showGroup: {
    marginBottom: 20,
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
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
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
    backgroundColor: COLORS.BUTTON.ACCENT.BACKGROUND,
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
    color: COLORS.BUTTON.ACCENT.TEXT,
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
    color: COLORS.TEXT.TERTIARY,
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
    color: COLORS.TEXT.ERROR,
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.BUTTON.ACCENT.BACKGROUND,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.BUTTON.ACCENT.TEXT,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 16,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
  currentShowHeader: {
    backgroundColor: COLORS.BACKGROUND.ELEVATED,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  currentShowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CORE_COLORS.WMBR_GREEN,
    marginBottom: 4,
  },
  currentShowSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  showHeader: {
    backgroundColor: COLORS.BACKGROUND.ELEVATED,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 0,
  },
  showHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: CORE_COLORS.WMBR_GREEN,
    marginBottom: 2,
  },
  showHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT.TERTIARY,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 14,
    marginTop: 8,
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
  endOfDayContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  endOfDayText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  scheduleButton: {
    backgroundColor: COLORS.BUTTON.ACCENT.BACKGROUND,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: COLORS.BUTTON.ACCENT.SHADOW,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scheduleButtonText: {
    color: COLORS.BUTTON.ACCENT.TEXT,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
