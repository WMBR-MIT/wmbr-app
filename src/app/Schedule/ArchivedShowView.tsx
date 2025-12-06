import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { debugError } from '@utils/Debug';
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  State,
} from 'react-native-track-player';
import { Show, Archive } from '@customTypes/RecentlyPlayed';
import { PlaylistResponse, PlaylistSong } from '@customTypes/Playlist';
import { PlaylistService } from '@services/PlaylistService';
import { ArchiveService } from '@services/ArchiveService';
import { secondsToTime, formatTime } from '@utils/DateTime';
import { COLORS } from '@utils/Colors';
import { SKIP_INTERVAL } from '@utils/TrackPlayerUtils';
import {
  generateDarkGradientColors,
  generateGradientColors,
} from '@utils/GradientColors';
import { ShowImage } from '@components/ShowImage';
import PlaybackSlider from '@components/PlaybackSlider';

interface ArchivedShowViewProps {
  show: Show;
  archive: Archive;
}

export default function ArchivedShowView() {
  const route =
    useRoute<RouteProp<Record<string, ArchivedShowViewProps>, string>>();
  const { show, archive } = route.params;

  const headerHeight = useHeaderHeight();

  const progress = useProgress();
  const playbackState = usePlaybackState();

  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchivePlaying, setIsArchivePlaying] = useState(false);

  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);

  const playlistService = PlaylistService.getInstance();
  const archiveService = ArchiveService.getInstance();

  const fetchPlaylist = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const playlistData = await playlistService.fetchPlaylist(
        show.name,
        new Date(archive.date),
      );
      setPlaylist(playlistData);
    } catch (err) {
      debugError('Error fetching playlist:', err);
      setError('Failed to load playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [archive.date, playlistService, show.name]);

  useEffect(() => {
    const fp = async () => {
      setLoading(true);
      setError(null);

      try {
        const playlistData = await playlistService.fetchPlaylist(
          show.name,
          new Date(archive.date),
        );
        setPlaylist(playlistData);
      } catch (err) {
        debugError('Error fetching playlist:', err);
        setError('Failed to load playlist. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fp();
  }, [archive.date, playlistService, show.name]);

  useEffect(() => {
    // Subscribe to archive service state changes
    const unsubscribe = archiveService.subscribe(state => {
      const isCurrentArchivePlaying =
        state.isPlayingArchive && state.currentArchive?.url === archive.url;
      setIsArchivePlaying(isCurrentArchivePlaying);
    });

    return unsubscribe;
  }, [archive.url, archiveService]);

  // Update current progress to playback position, as long as user is not
  // currently sliding
  useEffect(() => {
    !isSliding && setCurrentPosition(progress.position);
  }, [isSliding, progress.position]);

  const [gradientStart] = generateGradientColors(show.name);
  const [darkGradientStart, darkGradientEnd] = generateDarkGradientColors(
    show.name,
  );

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

  const handleSkipBackward = async () => {
    const newPosition = Math.max(progress.position - SKIP_INTERVAL, 0);
    await TrackPlayer.seekTo(newPosition);
  };

  const handleSkipForward = async () => {
    const newPosition = Math.min(
      progress.position + SKIP_INTERVAL,
      progress.duration,
    );
    await TrackPlayer.seekTo(newPosition);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={gradientStart} />

      <LinearGradient
        colors={[darkGradientStart, darkGradientEnd, '#000000']}
        locations={[0, 0.3, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={[styles.safeArea, { paddingTop: headerHeight }]}>
          <ScrollView style={styles.scrollView}>
            <ShowImage showName={show.name} archiveDate={archive.date} />

            {/* Playback Controls */}
            <View style={styles.playSection}>
              {isArchivePlaying && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipBackward}
                  activeOpacity={0.7}
                  accessibilityLabel={`Skip backward ${SKIP_INTERVAL} seconds`}
                >
                  <Icon
                    name="refresh-outline"
                    size={28}
                    color={COLORS.TEXT.PRIMARY}
                    style={styles.skipBackIcon}
                  />
                  <Text style={styles.skipText} aria-hidden={true}>
                    {SKIP_INTERVAL}
                  </Text>
                </TouchableOpacity>
              )}
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
              {isArchivePlaying && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkipForward}
                  activeOpacity={0.7}
                  accessibilityLabel={`Skip forward ${SKIP_INTERVAL} seconds`}
                >
                  <Icon
                    name="refresh-outline"
                    size={28}
                    color={COLORS.TEXT.PRIMARY}
                    style={styles.skipForwardIcon}
                  />
                  <Text style={styles.skipText} aria-hidden={true}>
                    {SKIP_INTERVAL}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Progress Bar - Only show when this archive is playing */}
            {isArchivePlaying && progress.duration > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressContainer}>
                  <PlaybackSlider
                    style={styles.slider}
                    onValueChange={setCurrentPosition}
                    onSlidingStart={() => setIsSliding(true)}
                    onSlidingComplete={async value => {
                      try {
                        TrackPlayer.seekTo(value * (progress?.duration || 0));
                      } catch (e) {
                        debugError('Error seeking to position:', e);
                      }
                      setIsSliding(false);
                    }}
                  />

                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                      {secondsToTime(currentPosition)}
                    </Text>
                    <Text style={styles.timeText}>
                      {secondsToTime(progress.duration)}
                    </Text>
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
                  <TouchableOpacity
                    onPress={fetchPlaylist}
                    style={styles.retryButton}
                  >
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
                    <Text style={styles.songTime}>{formatTime(song.time)}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  playSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 24,
  },
  playButton: {
    padding: 8,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  skipBackIcon: {
    transform: [{ scaleX: -1 }],
  },
  skipForwardIcon: {
    transform: [{ scaleX: 1 }],
  },
  skipText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 0,
  },
  playlistSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    color: COLORS.TEXT.PRIMARY,
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
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  songArtist: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    marginBottom: 2,
  },
  songAlbum: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 12,
  },
  songTime: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.TEXT.TERTIARY,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: COLORS.TEXT.ERROR,
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
    color: COLORS.TEXT.TERTIARY,
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
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
