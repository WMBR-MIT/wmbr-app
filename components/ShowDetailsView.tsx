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
  useAnimatedGestureHandler,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { Show } from '../types/RecentlyPlayed';
import { ArchiveService } from '../services/ArchiveService';
import { useProgress, usePlaybackState, State } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { PanGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const ALBUM_SIZE = width * 0.6;
const CIRCLE_DIAMETER = 16;

interface ShowDetailsViewProps {
  show: Show;
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

// WMBR Logo SVG
const getWMBRLogoSVG = (color: string = '#FFFFFF') => `
<svg viewBox="0 0 155.57 33.9" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>.b{fill:${color};}</style>
  </defs>
  <polygon class="b" points="22.7 18.9 31.2 33.7 44.1 5.8 42.4 5.8 36 19.6 28.3 5.3 19.9 19.8 12.8 5.8 0 5.8 14.2 33.9 22.7 18.9"/>
  <path class="b" d="M57.4,31.8V11.3s1.8-2.3,4.8-2.4c.9,0,2.1.4,2.5,1.4v21.5h11.8V11.6s2.3-2.1,4.6-2.3c1.6-.1,2.7,1,2.8,1.6v20.8h11.8V11.2c-.3-2.2-2.4-4.1-4.7-5-2.6-1-6.8-.7-9.2.3-2.7,1.1-5.8,3.1-5.8,3.1,0,0-1.8-2.5-4.4-3.3-2.6-.9-5.6-1-8.3-.2-2.7.9-5.9,2.9-5.9,2.9v-3.2h-11.9v26h11.9Z"/>
  <path class="b" d="M110.3,31.8v-2.5s1.8,1.8,4.7,2.6c3.5.9,9.3.1,12.8-4.1,3.9-4.7,4.2-12.1-.4-17.4-3.5-4.1-8.7-5.4-13.2-4.2-2.2.6-3.5,1.7-3.9,2.2V0h-11.8v31.8h11.8ZM113,8.4c2-1,3.2-.6,3.9-.2,1.1.7,1,1.6,1,1.6v18.2s.1.7-.8,1.5c-1.1,1-2.9.7-4.2-.2-1.8-1.2-2.6-2.4-2.6-2.4V10.8c.4-.5,1.4-1.8,2.7-2.4Z"/>
  <path class="b" d="M144.5,14s.6-2.5,3.8-4.7c2.4-1.6,3.8-1,4.1-.5.5,1.1,2.3,1.2,2.9.2.5-.8.3-2.1-.5-2.6-1.4-.9-3.9-1-6.7.9-2.8,2-3.5,2.9-3.5,2.9v-4.4h-11.6v26h11.5V14Z"/>
</svg>
`;

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

  const dragGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      circleScale.value = withSpring(1.5);
      runOnJS(setIsScrubbing)(true);
      context.startX = dragX.value;
    },
    onActive: (event, context) => {
      if (progressBarWidth <= 0 || progressBarX <= 0) return; // Wait for layout to be measured
      
      const relativeX = event.absoluteX - progressBarX;
      const newX = Math.max(0, Math.min(progressBarWidth, relativeX));
      
      dragX.value = newX + 32;
      
      const percentage = newX / progressBarWidth;
      const previewSeconds = percentage * (progress?.duration || 0);
      runOnJS(setPreviewTime)(previewSeconds);
    },
    onEnd: () => {
      circleScale.value = withSpring(1);
      runOnJS(setIsScrubbing)(false);
      
      if (progressBarWidth > 0) {
        const percentage = dragX.value / progressBarWidth;
        const seekPosition = percentage * (progress?.duration || 0);
        
        if (seekPosition > 0 && progress?.duration > 0) {
          runOnJS(handleSeekTo)(seekPosition);
        }
      }
    },
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <StatusBar barStyle="light-content" backgroundColor={gradientStart} />
      
      <LinearGradient
        colors={[gradientStart, gradientEnd, '#000000']}
        locations={[0, 0.4, 1]}
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
                  colors={[gradientStart, gradientEnd]}
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
                        onPress={!isCurrentlyPlaying ? () => handlePlayArchive(archive, index) : undefined}
                        activeOpacity={!isCurrentlyPlaying ? 0.7 : 1}
                        disabled={isCurrentlyPlaying}
                      >
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
                        
                        {/* Play/pause button - only functional when item is already playing */}
                        <TouchableOpacity
                          onPress={isCurrentlyPlaying ? handlePauseResume : undefined}
                          style={[
                            styles.playIconContainer,
                            !isCurrentlyPlaying && styles.playIconDisabled
                          ]}
                          activeOpacity={isCurrentlyPlaying ? 0.7 : 1}
                          disabled={!isCurrentlyPlaying}
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
                            <PanGestureHandler onGestureEvent={dragGestureHandler}>
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
                            </PanGestureHandler>
                            
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