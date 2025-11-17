import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
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
  Dimensions,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { debugLog, debugError } from '../../utils/Debug';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Show, Archive } from '../../types/RecentlyPlayed';
import { WmbrRouteName } from '../../types/Navigation';
import { ArchiveService } from '../../services/ArchiveService';
import {
  useProgress,
  usePlaybackState,
  State,
} from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ShowImage } from '../../components/ShowImage';
import {
  formatDate,
  getDurationFromSize,
  formatShowTime,
  secondsToTime,
} from '../../utils/DateTime';
import { COLORS } from '../../utils/Colors';
import {
  generateDarkGradientColors,
  generateGradientColors,
} from '../../utils/GradientColors';

const { width } = Dimensions.get('window');
const CIRCLE_DIAMETER = 16;

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

  // Always call hooks at the top level, never conditionally
  // Slide horizontally: start offscreen to the right (translateX = width)
  const translateX = useSharedValue(width);
  const opacity = useSharedValue(0);
  const circleScale = useSharedValue(1);
  const dragX = useSharedValue(0);

  // State hooks
  const [currentlyPlayingArchive, setCurrentlyPlayingArchive] =
    useState<any>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [progressBarX, setProgressBarX] = useState(0);

  // Ref for measuring progress bar position
  const progressBarRef = useRef<View>(null);

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

  // Update drag position when progress changes
  useEffect(() => {
    if (
      !isScrubbing &&
      progress &&
      progress.duration > 0 &&
      progressBarWidth > 0
    ) {
      const maxMovement = progressBarWidth - CIRCLE_DIAMETER; // Account for circle size
      const progressPercentage = progress.position / progress.duration;
      dragX.value = progressPercentage * maxMovement + 32;
    }
  }, [
    progress.position,
    progress.duration,
    isScrubbing,
    progressBarWidth,
    dragX,
    progress,
  ]);

  // Animate in on mount (slide from right → left) and animate out on unmount
  useEffect(() => {
    translateX.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });

    return () => {
      translateX.value = withTiming(width, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    };
  }, [translateX, opacity]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const circlePositionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value - CIRCLE_DIAMETER / 2 }],
  }));

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

  const handleProgressPress = async (event: any) => {
    if (
      !currentlyPlayingArchive ||
      progress.duration === 0 ||
      progressBarWidth <= 0 ||
      progressBarX <= 0
    )
      return;

    const { pageX } = event.nativeEvent;
    const relativeX = pageX - progressBarX;
    const percentage = Math.max(0, Math.min(1, relativeX / progressBarWidth));
    const seekPosition = percentage * progress.duration;

    try {
      await TrackPlayer.seekTo(seekPosition);
    } catch (error) {
      debugError('Error seeking:', error);
    }
  };

  const handleSeekTo = async (seekPosition: number) => {
    try {
      await TrackPlayer.seekTo(seekPosition);
      debugLog('Seeked to:', seekPosition);
    } catch (error) {
      debugError('Error seeking:', error);
    }
  };

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      circleScale.value = withTiming(1.5, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      });
      runOnJS(setIsScrubbing)(true);
    })
    .onUpdate(event => {
      if (progressBarWidth <= 0 || progressBarX <= 0) return; // Wait for layout to be measured

      const relativeX = event.absoluteX - progressBarX;
      const newX = Math.max(0, Math.min(progressBarWidth, relativeX));

      dragX.value = newX + 32;

      const percentage = newX / progressBarWidth;
      const previewSeconds = percentage * (progress?.duration || 0);
      runOnJS(setPreviewTime)(previewSeconds);
    })
    .onEnd(() => {
      circleScale.value = withTiming(1, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      });
      runOnJS(setIsScrubbing)(false);

      if (progressBarWidth > 0) {
        const percentage = dragX.value / progressBarWidth;
        const seekPosition = percentage * (progress?.duration || 0);

        if (seekPosition > 0 && progress?.duration > 0) {
          runOnJS(handleSeekTo)(seekPosition);
        }
      }
    });

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
                  const progressPercentage =
                    isCurrentlyPlaying && progress.duration > 0
                      ? progress.position / progress.duration
                      : 0;

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
                              ? `${secondsToTime(progress.position)} / ${secondsToTime(progress.duration)}`
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

                      {/* Progress bar */}
                      {isCurrentlyPlaying && (
                        <View
                          style={styles.progressContainer}
                          pointerEvents="box-none"
                        >
                          <TouchableOpacity
                            ref={progressBarRef}
                            style={styles.progressBackground}
                            onPress={handleProgressPress}
                            activeOpacity={1}
                            onLayout={() => {
                              progressBarRef.current?.measure(
                                (_x, _y, currentWidth, _height, pageX) => {
                                  setProgressBarWidth(currentWidth);
                                  setProgressBarX(pageX);
                                },
                              );
                            }}
                          >
                            <View
                              style={[
                                styles.progressBar,
                                { width: `${progressPercentage * 100}%` },
                              ]}
                            />
                          </TouchableOpacity>

                          {/* Draggable progress circle */}
                          <GestureDetector gesture={dragGesture}>
                            <Animated.View
                              style={[
                                styles.progressCircleContainer,
                                circlePositionStyle,
                              ]}
                            >
                              <Animated.View
                                style={[
                                  styles.progressCircle,
                                  circleAnimatedStyle,
                                ]}
                              />
                            </Animated.View>
                          </GestureDetector>

                          {/* Preview time display when scrubbing */}
                          {isScrubbing && (
                            <Animated.View
                              style={[styles.previewTime, circlePositionStyle]}
                            >
                              <Text style={styles.previewTimeText}>
                                {secondsToTime(previewTime)}
                              </Text>
                            </Animated.View>
                          )}
                        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
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
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressCircleContainer: {
    position: 'absolute',
    top: 2, // Center the circle in the 20px container
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    marginLeft: -CIRCLE_DIAMETER / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_DIAMETER / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewTime: {
    position: 'absolute',
    top: -27, // Adjusted for new circle position (was -35, now -27 since circle moved down 8px)
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: -20,
  },
  previewTimeText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 12,
    fontWeight: '500',
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
});
