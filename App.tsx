/**
 * WMBR Radio App - Shazam-inspired interface
 * @format
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import TrackPlayer, { 
  Capability, 
  State, 
  usePlaybackState,
  useProgress 
} from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import SongHistoryDrawer from './components/SongHistoryDrawer';
import SplashScreen from './components/SplashScreen';
import MetadataService, { ShowInfo, Song } from './services/MetadataService';

const { width, height } = Dimensions.get('window');
const streamUrl = 'https://wmbr.org:8002/hi';
const WMBR_GREEN = '#00843D';

const getWMBRLogoSVG = (isPlaying: boolean) => `
<svg viewBox="0 0 155.57 33.9" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>.b{fill:${isPlaying ? '#000000' : '#00843D'};}</style>
  </defs>
  <polygon class="b" points="22.7 18.9 31.2 33.7 44.1 5.8 42.4 5.8 36 19.6 28.3 5.3 19.9 19.8 12.8 5.8 0 5.8 14.2 33.9 22.7 18.9"/>
  <path class="b" d="M57.4,31.8V11.3s1.8-2.3,4.8-2.4c.9,0,2.1.4,2.5,1.4v21.5h11.8V11.6s2.3-2.1,4.6-2.3c1.6-.1,2.7,1,2.8,1.6v20.8h11.8V11.2c-.3-2.2-2.4-4.1-4.7-5-2.6-1-6.8-.7-9.2.3-2.7,1.1-5.8,3.1-5.8,3.1,0,0-1.8-2.5-4.4-3.3-2.6-.9-5.6-1-8.3-.2-2.7.9-5.9,2.9-5.9,2.9v-3.2h-11.9v26h11.9Z"/>
  <path class="b" d="M110.3,31.8v-2.5s1.8,1.8,4.7,2.6c3.5.9,9.3.1,12.8-4.1,3.9-4.7,4.2-12.1-.4-17.4-3.5-4.1-8.7-5.4-13.2-4.2-2.2.6-3.5,1.7-3.9,2.2V0h-11.8v31.8h11.8ZM113,8.4c2-1,3.2-.6,3.9-.2,1.1.7,1,1.6,1,1.6v18.2s.1.7-.8,1.5c-1.1,1-2.9.7-4.2-.2-1.8-1.2-2.6-2.4-2.6-2.4V10.8c.4-.5,1.4-1.8,2.7-2.4Z"/>
  <path class="b" d="M144.5,14s.6-2.5,3.8-4.7c2.4-1.6,3.8-1,4.1-.5.5,1.1,2.3,1.2,2.9.2.5-.8.3-2.1-.5-2.6-1.4-.9-3.9-1-6.7.9-2.8,2-3.5,2.9-3.5,2.9v-4.4h-11.6v26h11.5V14Z"/>
</svg>
`;

export default function App() {
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShow, setCurrentShow] = useState('WMBR 88.1 FM');
  const [songHistory, setSongHistory] = useState<Song[]>([]);
  const [hosts, setHosts] = useState<string | undefined>();
  const [showDescription, setShowDescription] = useState<string | undefined>();
  const [showSplash, setShowSplash] = useState(true);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupPlayer();
    setupMetadata();
    
    return () => {
      MetadataService.getInstance().stopPolling();
    };
  }, []);

  useEffect(() => {
    setIsPlaying(playbackState?.state === State.Playing);
    
    if (playbackState?.state === State.Playing) {
      startPulseAnimation();
      startRotateAnimation();
    } else {
      stopAnimations();
    }
  }, [playbackState]);

  const setupPlayer = async () => {
    try {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });

      await TrackPlayer.add({
        id: 'wmbr-stream',
        url: streamUrl,
        title: 'WMBR 88.1 FM',
        artist: 'Live Radio',
        artwork: require('./assets/cover.png'),
      });
    } catch (error) {
      console.error('Error setting up player:', error);
    }
  };

  const setupMetadata = () => {
    const metadataService = MetadataService.getInstance();
    
    const unsubscribeMetadata = metadataService.subscribe((data: ShowInfo) => {
      setCurrentShow(data.showTitle);
      setHosts(data.hosts);
      setShowDescription(data.description);
    });

    const unsubscribeSongs = metadataService.subscribeSongHistory((songs: Song[]) => {
      setSongHistory(songs);
    });

    metadataService.startPolling(30000);

    return () => {
      unsubscribeMetadata();
      unsubscribeSongs();
    };
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleSplashEnd = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onAnimationEnd={handleSplashEnd} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={isPlaying ? '#00843D' : '#000000'} 
        translucent={false}
      />
      
      <LinearGradient
        colors={isPlaying ? ['#00843D', '#006B31', '#00843D'] : ['#000000', '#1a1a1a', '#000000']}
        style={styles.fullScreenGradient}
      >
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.content}>
            
            <View style={styles.logoContainer}>
              <SvgXml xml={getWMBRLogoSVG(isPlaying)} width={80} height={17} />
            </View>
            
            <View style={styles.showInfo}>
              <Text style={styles.showTitle}>{currentShow}</Text>
              {hosts && (
                <Text style={[styles.hosts, isPlaying && styles.hostsActive]}>with {hosts}</Text>
              )}
            </View>

            <View style={styles.centerButton}>
              <Animated.View
                style={[
                  styles.outerRing,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <View style={styles.middleRing}>
                  <TouchableOpacity
                    style={[styles.playButton, isPlaying && styles.playButtonActive]}
                    onPress={togglePlayback}
                    activeOpacity={0.8}
                  >
                    <View style={styles.buttonContent}>
                      <View style={styles.iconContainer}>
                        {isPlaying ? (
                          <View style={styles.pauseIcon}>
                            <View style={[styles.pauseBar, isPlaying && styles.pauseBarActive]} />
                            <View style={[styles.pauseBar, isPlaying && styles.pauseBarActive]} />
                          </View>
                        ) : (
                          <View style={styles.playIcon} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>

            <View style={styles.bottomInfo}>
              {showDescription && (
                <Text style={[styles.showDescription, isPlaying && styles.showDescriptionActive]} numberOfLines={3}>
                  {showDescription}
                </Text>
              )}
              <Text style={styles.liveText}>● LIVE</Text>
            </View>

            <View style={styles.bottomSpace} />
          </View>
        </SafeAreaView>

        <SongHistoryDrawer songs={songHistory} isVisible={true} />
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenGradient: {
    flex: 1,
  },
  safeContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  showInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  showTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  hosts: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  hostsActive: {
    color: '#E0E0E0',
  },
  bottomInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  showDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  showDescriptionActive: {
    color: '#D0D0D0',
  },
  liveText: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '500',
    marginBottom: 8,
  },
  centerButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  middleRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  playButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: WMBR_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: WMBR_GREEN,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  playButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 30,
    borderRightWidth: 0,
    borderTopWidth: 20,
    borderBottomWidth: 20,
    borderLeftColor: '#FFFFFF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 8,
  },
  pauseIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBar: {
    width: 8,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  pauseBarActive: {
    backgroundColor: WMBR_GREEN,
  },
  streamingText: {
    color: WMBR_GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
  streamingTextActive: {
    color: '#FFFFFF',
  },
  bottomSpace: {
    height: 100,
  },
});
