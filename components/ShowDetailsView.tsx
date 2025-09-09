import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Show, Archive } from '../types/RecentlyPlayed';
import { ArchiveService } from '../services/ArchiveService';
import { useProgress, usePlaybackState, State } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ArchivedShowView from './ArchivedShowView';
import { getWMBRLogoSVG } from '../utils/WMBRLogo';
import { generateDarkGradientColors, generateGradientColors } from '../utils/colors';

const { width, height } = Dimensions.get('window');
const ALBUM_SIZE = width * 0.6;
const CIRCLE_DIAMETER = 16;

interface ShowDetailsViewProps {
  show: Show;
  isVisible: boolean;
  onClose: () => void;
}

export default function ShowDetailsView({ show, isVisible, onClose }: ShowDetailsViewProps) {
  // Always call hooks at the top level, never conditionally
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const circleScale = useSharedValue(1);
  const dragX = useSharedValue(0);
  
  // State hooks
  const [currentlyPlayingArchive, setCurrentlyPlayingArchive] = useState<any>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [progressBarX, setProgressBarX] = useState(0);
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [archivedShowViewVisible, setArchivedShowViewVisible] = useState(false);
  
  // Ref for measuring progress bar position
  const progressBarRef = useRef<View>(null);
  
  // TrackPlayer hooks - must always be called unconditionally
  const progress = useProgress() || { position: 0, duration: 0 };
  const playbackState = usePlaybackState();
  
  // Service instance
  const archiveService = ArchiveService.getInstance();

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
    } else {
      translateY.value = withSpring(height);
      opacity.value = withSpring(0);
    }
  }, [isVisible]);

  useEffect(() => {
    // Subscribe to archive service to track currently playing archive
    const unsubscribe = archiveService.subscribe((state) => {
      if (state.isPlayingArchive && state.currentArchive) {
        setCurrentlyPlayingArchive(state.currentArchive);
      } else {
        setCurrentlyPlayingArchive(null);
      }
    });

    return unsubscribe;
  }, []);

  // Update drag position when progress changes
  useEffect(() => {
    if (!isScrubbing && progress && progress.duration > 0 && progressBarWidth > 0) {
      const maxMovement = progressBarWidth - CIRCLE_DIAMETER; // Account for circle size
      const progressPercentage = progress.position / progress.duration;
      dragX.value = (progressPercentage * maxMovement) + 32;
    }
  }, [progress.position, progress.duration, isScrubbing, progressBarWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const circlePositionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value - CIRCLE_DIAMETER / 2 }],
  }));

  // Since we're now conditionally rendered, show will always exist
  const [gradientStart, gradientEnd] = generateGradientColors(show.name);
  const [darkGradientStart, darkGradientEnd] = generateDarkGradientColors(show.name);
  const archives = show.archives || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getDurationFromSize = (
    sizeInBytesString: string,
    bitrateKbps = 128
  ): string => {
    const sizeInBytes = parseInt(sizeInBytesString, 10);
    if (isNaN(sizeInBytes) || sizeInBytes <= 0) return 'Unknown';
  
    // Convert bitrate to bits per second
    const bitrateBps = bitrateKbps * 1000;
  
    // Duration in seconds = (bytes * 8) / bitrate in bits per second
    const durationSeconds = Math.floor((sizeInBytes * 8) / bitrateBps);
  
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
  
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  const formatShowTime = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = show.day === 7 ? 'Weekdays' : dayNames[show.day];
    // Only add 's' if it's not already plural (weekdays)
    const plural = show.day === 7 ? dayName : `${dayName}s`;
    return `${plural} at ${show.time_str}`;
  };

  const handlePlayArchive = async (archive: any, index: number) => {
    try {
      await archiveService.playArchive(archive, show);
      // Don't close the view or show popup - keep user on same screen
    } catch (error) {
      console.error('Error playing archive:', error);
      Alert.alert('Error', 'Failed to play archive. Please try again.');
    }
  };

  const handlePauseResume = async () => {
    try {
      if (playbackState?.state === State.Playing) {
        await TrackPlayer.pause();
      } else if (playbackState?.state === State.Paused) {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const handleArchiveRowPress = (archive: Archive) => {
    setSelectedArchive(archive);
    setArchivedShowViewVisible(true);
  };

  const handlePlayButtonPress = (archive: Archive, isCurrentlyPlaying: boolean) => {
    if (isCurrentlyPlaying) {
      // If this show is currently playing, handle pause/resume
      handlePauseResume();
    } else {
      // If not currently playing, navigate to the archive page
      handleArchiveRowPress(archive);
    }
  };

  const handleCloseArchivedShowView = () => {
    setArchivedShowViewVisible(false);
    setSelectedArchive(null);
  };

  const handleProgressPress = async (event: any) => {
    if (!currentlyPlayingArchive || progress.duration === 0 || progressBarWidth <= 0 || progressBarX <= 0) return;
    
    const { pageX } = event.nativeEvent;
    const relativeX = pageX - progressBarX;
    const percentage = Math.max(0, Math.min(1, relativeX / progressBarWidth));
    const seekPosition = percentage * progress.duration;
    
    try {
      await TrackPlayer.seekTo(seekPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const handleSeekTo = async (seekPosition: number) => {
    try {
      await TrackPlayer.seekTo(seekPosition);
      console.log('Seeked to:', seekPosition);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      circleScale.value = withSpring(1.5);
      runOnJS(setIsScrubbing)(true);
    })
    .onUpdate((event) => {
      if (progressBarWidth <= 0 || progressBarX <= 0) return; // Wait for layout to be measured
      
      const relativeX = event.absoluteX - progressBarX;
      const newX = Math.max(0, Math.min(progressBarWidth, relativeX));
      
      dragX.value = newX + 32;
      
      const percentage = newX / progressBarWidth;
      const previewSeconds = percentage * (progress?.duration || 0);
      runOnJS(setPreviewTime)(previewSeconds);
    })
    .onEnd(() => {
      circleScale.value = withSpring(1);
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
              <View style={styles.headerSpacer} />
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
                      <Text style={styles.albumFrequency}>88.1 FM</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Show Info */}
            <View style={styles.infoSection}>
              <Text style={styles.showTitle}>{show.name}</Text>
              <Text style={styles.showSchedule}>{formatShowTime()}</Text>
              {show.hosts && (
                <Text style={styles.showHosts}>Hosted by {show.hosts}</Text>
              )}
              <Text style={styles.archiveCount}>
                {archives.length} archived episode{archives.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Archives List */}
            <View style={styles.archivesSection}>
              <Text style={styles.sectionTitle}>Archives</Text>
              {archives.length > 0 ? (
                archives
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((archive, index) => {
                    const isCurrentlyPlaying = currentlyPlayingArchive && 
                      currentlyPlayingArchive.url === archive.url;
                    const progressPercentage = isCurrentlyPlaying && progress.duration > 0 
                      ? (progress.position / progress.duration) : 0;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.archiveItem,
                          isCurrentlyPlaying && styles.archiveItemPlaying
                        ]}
                        onPress={() => handleArchiveRowPress(archive)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.archiveInfoContainer}>
                          <View style={styles.archiveInfo}>
                            <Text style={[
                              styles.archiveDate,
                              isCurrentlyPlaying && styles.archiveDatePlaying
                            ]}>
                              {formatDate(archive.date)}
                            </Text>
                            <Text style={[
                              styles.archiveSize,
                              isCurrentlyPlaying && styles.archiveSizePlaying
                            ]}>
                              {isCurrentlyPlaying 
                                ? `${formatTime(progress.position)} / ${formatTime(progress.duration)}`
                                : getDurationFromSize(archive.size)
                              }
                            </Text>
                          </View>
                        </View>
                        
                        {/* Play/pause button - clickable for both play and pause */}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePlayButtonPress(archive, isCurrentlyPlaying);
                          }}
                          style={styles.playIconContainer}
                          activeOpacity={0.7}
                        >
                          <Icon 
                            name={isCurrentlyPlaying && playbackState?.state === State.Playing ? 'pause-circle' : 'play-circle'} 
                            size={28}
                            color={'#FFFFFF'} 
                          />
                        </TouchableOpacity>
                        
                        {/* Progress bar */}
                        {isCurrentlyPlaying && (
                          <View style={styles.progressContainer} pointerEvents="box-none">
                            <TouchableOpacity 
                              ref={progressBarRef}
                              style={styles.progressBackground}
                              onPress={handleProgressPress}
                              activeOpacity={1}
                              onLayout={() => {
                                progressBarRef.current?.measure((x, y, width, height, pageX) => {
                                  setProgressBarWidth(width);
                                  setProgressBarX(pageX);
                                });
                              }}
                            >
                              <View 
                                style={[
                                  styles.progressBar,
                                  { width: `${progressPercentage * 100}%` }
                                ]} 
                              />
                            </TouchableOpacity>
                            
                            {/* Draggable progress circle */}
                            <GestureDetector gesture={dragGesture}>
                              <Animated.View 
                                style={[
                                  styles.progressCircleContainer,
                                  circlePositionStyle
                                ]}
                              >
                                <Animated.View 
                                  style={[styles.progressCircle, circleAnimatedStyle]}
                                />
                              </Animated.View>
                            </GestureDetector>
                            
                            {/* Preview time display when scrubbing */}
                            {isScrubbing && (
                              <Animated.View style={[styles.previewTime, circlePositionStyle]}>
                                <Text style={styles.previewTimeText}>
                                  {formatTime(previewTime)}
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
                  <Text style={styles.noArchivesText}>No archived episodes available</Text>
                </View>
              )}
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Archived Show Detail View */}
      {archivedShowViewVisible && selectedArchive && (
        <ArchivedShowView
          show={show}
          archive={selectedArchive}
          isVisible={archivedShowViewVisible}
          onClose={handleCloseArchivedShowView}
        />
      )}
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
    zIndex: 1000,
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
  headerSpacer: {
    width: 40,
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
  albumFrequency: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'left',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  showTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  showSchedule: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 4,
  },
  showHosts: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 8,
  },
  archiveCount: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  archivesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  archiveDatePlaying: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  archiveSize: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 2,
  },
  archiveSizePlaying: {
    color: '#CCCCCC',
  },
  playIconContainer: {
    padding: 8,
    marginRight: -8,
  },
  playIconDisabled: {
    opacity: 0.6,
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  noArchives: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noArchivesText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 100,
  },
});