import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  useRoute,
  RouteProp,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { debugError } from '@utils/Debug';
import { Show, Archive } from '@customTtypes/RecentlyPlayed';
import { WmbrRouteName } from '@customTypes/Navigation';
import { ArchiveService } from '@services/ArchiveService';
import {
  useProgress,
  usePlaybackState,
  State,
} from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { ShowImage } from '@components/ShowImage';
import {
  formatDate,
  getDurationFromSize,
  formatShowTime,
  secondsToTime,
} from '@utils/DateTime';
import { COLORS } from '@utils/Colors';
import {
  generateDarkGradientColors,
  generateGradientColors,
} from '@utils/GradientColors';
import PlaybackSlider from '@components/PlaybackSlider';

// Route params for ShowDetailsPage
export type ShowDetailsPageRouteParams = {
  show: Show;
};

export default function ShowDetailsPage() {
  const navigation =
    useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  const route =
    useRoute<RouteProp<Record<string, ShowDetailsPageRouteParams>, string>>();
  const show: Show = route.params!.show;

  const headerHeight = useHeaderHeight();

  const [currentlyPlayingArchive, setCurrentlyPlayingArchive] =
    useState<any>(null);

  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);

  // TrackPlayer hooks - must always be called unconditionally
  const progressHook = useProgress();
  const progress = useMemo(
    () => progressHook || { position: 0, duration: 0 },
    [progressHook],
  );
  const playbackState = usePlaybackState();

  // Service instance
  const archiveService = ArchiveService.getInstance();

  useEffect(() => {
    // Subscribe to archive service to track currently playing archive
    const unsubscribe = archiveService.subscribe(state => {
      if (state.isPlayingArchive && state.currentArchive) {
        setCurrentlyPlayingArchive(state.currentArchive);
      } else {
        setCurrentlyPlayingArchive(null);
      }
    });

    return unsubscribe;
  }, [archiveService]);

  // Since we're now conditionally rendered, show will always exist
  const [gradientStart] = useMemo(
    () => generateGradientColors(show.name),
    [show.name],
  );
  const [darkGradientStart, darkGradientEnd] = useMemo(
    () => generateDarkGradientColors(show.name),
    [show.name],
  );

  const archives = useMemo(() => show.archives || [], [show.archives]);

  const sortedArchives = useMemo(() => {
    const arr = (archives || []).slice();
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return arr;
  }, [archives]);

  const handlePauseResume = async () => {
    try {
      if (playbackState?.state === State.Playing) {
        await TrackPlayer.pause();
      } else if (playbackState?.state === State.Paused) {
        await TrackPlayer.play();
      }
    } catch (error) {
      debugError('Error toggling playback:', error);
    }
  };

  const handleArchiveRowPress = useCallback(
    (archive: Archive) => {
      navigation.navigate('ArchivedShowView', {
        show,
        archive,
      });
    },
    [navigation, show],
  );

  const handlePlayButtonPress = (
    archive: Archive,
    isCurrentlyPlaying: boolean,
  ) => {
    if (isCurrentlyPlaying) {
      // If this show is currently playing, handle pause/resume
      handlePauseResume();
    } else {
      // If not currently playing, navigate to the archive page
      handleArchiveRowPress(archive);
    }
  };

  // Update current progress to playback position, as long as user is not
  // currently sliding
  useEffect(() => {
    !isSliding && setCurrentPosition(progress.position);
  }, [isSliding, progress.position]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={gradientStart} />

      <LinearGradient
        colors={[darkGradientStart, darkGradientEnd, '#000000']}
        locations={[0, 0.3, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={[styles.safeArea, { paddingTop: headerHeight }]}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <ShowImage showName={show.name} />

            {/* Show Info */}
            <View style={styles.infoSection}>
              <Text style={styles.showTitle}>{show.name}</Text>
              <Text style={styles.showSchedule}>{formatShowTime(show)}</Text>
              {show.hosts && (
                <Text style={styles.showHosts}>Hosted by {show.hosts}</Text>
              )}
              <Text style={styles.archiveCount}>
                {archives.length} archived episode
                {archives.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Archives List */}
            <View style={styles.archivesSection}>
              <Text style={styles.sectionTitle}>Archives</Text>
              {sortedArchives.length > 0 ? (
                sortedArchives.map((archive, index) => {
                  const isCurrentlyPlaying =
                    currentlyPlayingArchive &&
                    currentlyPlayingArchive.url === archive.url;

                  return (
                    <TouchableOpacity
                      key={archive.url || index}
                      style={[
                        styles.archiveItem,
                        isCurrentlyPlaying && styles.archiveItemPlaying,
                      ]}
                      onPress={() => handleArchiveRowPress(archive)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.archiveDetails}>
                        <View style={styles.archiveInfoContainer}>
                          <View style={styles.archiveInfo}>
                            <Text
                              style={[
                                styles.archiveDate,
                                isCurrentlyPlaying && styles.archiveDatePlaying,
                              ]}
                            >
                              {formatDate(archive.date)}
                            </Text>
                            <Text
                              style={[
                                styles.archiveSize,
                                isCurrentlyPlaying && styles.archiveSizePlaying,
                              ]}
                            >
                              {isCurrentlyPlaying
                                ? `${secondsToTime(currentPosition)} / ${secondsToTime(progress.duration)}`
                                : getDurationFromSize(archive.size)}
                            </Text>
                          </View>
                        </View>

                        {/* Play/pause button - clickable for both play and pause */}
                        <TouchableOpacity
                          onPress={e => {
                            e.stopPropagation();
                            handlePlayButtonPress(archive, isCurrentlyPlaying);
                          }}
                          style={styles.playIconContainer}
                          activeOpacity={0.7}
                        >
                          <Icon
                            name={
                              isCurrentlyPlaying &&
                              playbackState?.state === State.Playing
                                ? 'pause-circle'
                                : 'play-circle'
                            }
                            size={28}
                            color={'#FFFFFF'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Progress bar */}
                      {isCurrentlyPlaying && (
                        <PlaybackSlider
                          styles={styles.slider}
                          onValueChange={setCurrentPosition}
                          onSlidingStart={() => setIsSliding(true)}
                          onSlidingComplete={value => {
                            TrackPlayer.seekTo(
                              value * (progress?.duration || 0),
                            );
                            setIsSliding(false);
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noArchives}>
                  <Text style={styles.noArchivesText}>
                    No archived episodes available
                  </Text>
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
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  showTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  showSchedule: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    marginBottom: 4,
  },
  showHosts: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 16,
    marginBottom: 8,
  },
  archiveCount: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    fontWeight: '500',
  },
  archivesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  archiveItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  archiveDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  archiveItemPlaying: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  archiveInfoContainer: {
    flex: 1,
  },
  archiveInfo: {
    flex: 1,
  },
  archiveDate: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: '500',
  },
  archiveDatePlaying: {
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '600',
  },
  archiveSize: {
    color: COLORS.TEXT.SECONDARY,
    fontVariant: ['tabular-nums'],
    fontSize: 14,
    marginTop: 2,
  },
  archiveSizePlaying: {
    color: COLORS.TEXT.SECONDARY,
  },
  playIconContainer: {
    padding: 8,
    marginRight: -8,
  },
  noArchives: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noArchivesText: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 16,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 100,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
