import React, { useEffect, useState, useRef } from 'react';
import { debugError } from '../utils/Debug';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  SafeAreaView,
} from 'react-native';
import TrackPlayer, { Capability, State, usePlaybackState } from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import RecentlyPlayedDrawer from '../components/RecentlyPlayedDrawer';
import SplashScreen from '../components/SplashScreen';
import MetadataService, { ShowInfo, Song } from '../services/MetadataService';
import { ArchiveService, ArchivePlaybackState } from '../services/ArchiveService';
import { AudioPreviewService } from '../services/AudioPreviewService';
import { getWMBRLogoSVG } from '../utils/WMBRLogo';
import { useNavigation } from '@react-navigation/native';

const streamUrl = 'https://wmbr.org:8002/hi';
const WMBR_GREEN = '#00843D';

export default function HomeScreen() {
  const playbackState = usePlaybackState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShow, setCurrentShow] = useState('WMBR 88.1 FM');
  const [, setSongHistory] = useState<Song[]>([]);
  const [hosts, setHosts] = useState<string | undefined>();
  const [showDescription, setShowDescription] = useState<string | undefined>();
  const [currentSong, setCurrentSong] = useState<string | undefined>();
  const [currentArtist, setCurrentArtist] = useState<string | undefined>();
  const [showSplash, setShowSplash] = useState(true);
  const [previousSong, setPreviousSong] = useState<string>('');
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [archiveState, setArchiveState] = useState<ArchivePlaybackState>({
    isPlayingArchive: false,
    currentArchive: null,
    currentShow: null,
    liveStreamUrl: streamUrl,
  });
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const songChangeScale = useRef(new Animated.Value(1)).current;
  const songChangeRotate = useRef(new Animated.Value(0)).current;
  const songChangeOpacity = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation<any>();

  useEffect(() => {
    setupPlayer();

    const metadataService = MetadataService.getInstance();
    
    const unsubscribeMetadata = metadataService.subscribe((data: ShowInfo) => {
      setCurrentShow(data.showTitle);
      setHosts(data.hosts);
      setShowDescription(data.description);
      setCurrentSong(data.currentSong);
      setCurrentArtist(data.currentArtist);
    });

    const unsubscribeSongs = metadataService.subscribeSongHistory((songs: Song[]) => {
      setSongHistory(songs);
    });

    metadataService.startPolling(15000);
    
    // Subscribe to archive service
    const unsubscribeArchive = ArchiveService.getInstance().subscribe(setArchiveState);
    
    return () => {
      MetadataService.getInstance().stopPolling();
      unsubscribeMetadata();
      unsubscribeSongs();
      unsubscribeArchive();
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect for updating track metadata when show changes
  useEffect(() => {
    const updateLiveTrackMetadata = async () => {
      if (!isPlayerInitialized) {
        return; // Don't try to update metadata if player isn't initialized yet
      }

      try {
        // Only update if we're not playing an archive
        if (!archiveState.isPlayingArchive) {
          await TrackPlayer.updateMetadataForTrack(0, {
            title: 'WMBR 88.1 FM',
            artist: currentShow || 'Live Radio',
          });
        }
      } catch (error) {
        debugError('Error updating track metadata:', error);
      }
    };

    updateLiveTrackMetadata();
  }, [currentShow, archiveState.isPlayingArchive, isPlayerInitialized]);

  useEffect(() => {
    setIsPlaying(playbackState?.state === State.Playing);

    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    };
  
    const startRotateAnimation = () => {
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 10000, useNativeDriver: true })
      ).start();
    };
  
    const stopAnimations = () => {
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    };
    
    if (playbackState?.state === State.Playing) {
      startPulseAnimation();
      startRotateAnimation();
    } else {
      stopAnimations();
    }
  }, [playbackState, rotateAnim, pulseAnim]);

// Trigger animation when song changes
  useEffect(() => {
    const startSongChangeAnimation = () => {
      // Reset animation values
      songChangeScale.setValue(1);
      songChangeRotate.setValue(0);
      songChangeOpacity.setValue(1);
  
      // Create a fun bouncy scale + rotate + opacity animation
      Animated.sequence([
        // Phase 1: Bounce up with rotation and opacity flash
        Animated.parallel([
          Animated.timing(songChangeScale, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeRotate, {
            toValue: 0.25, // 90 degrees
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeOpacity, {
            toValue: 0.3,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // Phase 2: Bounce down slightly with opacity return
        Animated.parallel([
          Animated.timing(songChangeScale, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeRotate, {
            toValue: -0.1, // -36 degrees
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Phase 3: Settle to normal with slight overshoot
        Animated.parallel([
          Animated.timing(songChangeScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeRotate, {
            toValue: 0.05, // 18 degrees
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // Phase 4: Return to normal
        Animated.parallel([
          Animated.timing(songChangeScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(songChangeRotate, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    if (currentSong && currentArtist && !archiveState.isPlayingArchive) {
      const newSongKey = `${currentArtist}-${currentSong}`;
      if (previousSong && previousSong !== newSongKey) {
        // Song changed! Trigger fun animation
        startSongChangeAnimation();
      }
      setPreviousSong(newSongKey);
    }
  }, [currentSong, currentArtist, archiveState.isPlayingArchive, previousSong, songChangeOpacity, songChangeRotate, songChangeScale]);

  const setupPlayer = async () => {
    try {
      // If the player already exists, mark it initialized and skip setup
      try {
        await TrackPlayer.getPlaybackState();
        setIsPlayerInitialized(true);
        return;
      } catch (e) {
        // not initialized yet, proceed
      }

      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });

      await TrackPlayer.add({
        id: 'wmbr-stream',
        url: streamUrl,
        title: 'WMBR 88.1 FM',
        artist: 'Live Radio',
        artwork: require('../assets/cover.png'),
      });

      setIsPlayerInitialized(true);
    } catch (error) {
      debugError('Error setting up player:', error);
    }
  };

  const togglePlayback = async () => {
    if (!isPlayerInitialized) {
      debugError('Player not initialized yet, cannot toggle playback');
      return;
    }

    try {
      const audioPreviewService = AudioPreviewService.getInstance();
      const previewState = audioPreviewService.getCurrentState();
      
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        if (previewState.url !== null) {
          await audioPreviewService.stop();
          const queue = await TrackPlayer.getQueue();
          const hasLiveStream = queue.some(track => track.id === 'wmbr-stream');
          if (!hasLiveStream) {
            await TrackPlayer.add({
              id: 'wmbr-stream',
              url: streamUrl,
              title: 'WMBR 88.1 FM',
              artist: currentShow || 'Live Radio',
              artwork: require('../assets/cover.png'),
            });
          }
        }
        await TrackPlayer.play();
      }
    } catch (error) {
      debugError('Error toggling playback:', error);
    }
  };

  const songRotation = songChangeRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleSplashEnd = () => setShowSplash(false);
  const handleSwitchToLive = async () => { try { await ArchiveService.getInstance().switchToLive(currentShow); } catch (e) { debugError('Error switching to live:', e); } };

  const formatArchiveDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (showSplash) return <SplashScreen onAnimationEnd={handleSplashEnd} />;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={isPlaying ? '#00843D' : '#000000'} translucent={false} />
      <LinearGradient colors={isPlaying ? ['#00843D', '#006B31', '#00843D'] : ['#000000', '#1a1a1a', '#000000']} style={styles.fullScreenGradient}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <SvgXml xml={getWMBRLogoSVG(isPlaying ? "#000000" : "#00843D")} width={80} height={17} />
            </View>
            <View style={styles.showInfo}>
              {archiveState.isPlayingArchive ? (
                <TouchableOpacity onPress={() => navigation.push('ShowDetails', { show: archiveState.currentShow })} activeOpacity={0.7}>
                  <Text style={[styles.showTitle, styles.clickableTitle]}>
                    {archiveState.currentShow?.name || 'Archive'}
                  </Text>
                  <Text style={[styles.archiveInfo, isPlaying && styles.archiveInfoActive]}>
                    Archive from {archiveState.currentArchive?.date ? formatArchiveDate(archiveState.currentArchive.date) : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.showTitle}>{currentShow}</Text>
                  {hosts && <Text style={[styles.hosts, isPlaying && styles.hostsActive]}>with {hosts}</Text>}
                </>
              )}
            </View>
            <View style={styles.centerButton}>
              <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.middleRing}>
                  <TouchableOpacity style={[styles.playButton, isPlaying && styles.playButtonActive]} onPress={togglePlayback} activeOpacity={0.8}>
                    <View style={styles.buttonContent}>
                      <View style={styles.iconContainer}>
                        {isPlaying ? (
                          <View style={styles.pauseIcon}>
                            <View style={[styles.pauseBar, isPlaying && styles.pauseBarActive]} />
                            <View style={[styles.pauseBar, isPlaying && styles.pauseBarActive]} />
                          </View>
                        ) : (
                          <SvgXml xml={`
                              <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                                <polygon points="6,4 30,18 6,32" fill="#FFFFFF" />
                              </svg>
                            `} width={40} height={40} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
            <View style={styles.bottomInfo}>
              {!archiveState.isPlayingArchive && showDescription && (
                <Text style={[styles.showDescription, isPlaying && styles.showDescriptionActive]} numberOfLines={3}>{showDescription}</Text>
              )}
              {archiveState.isPlayingArchive ? (
                <TouchableOpacity style={[styles.liveButton, isPlaying && styles.liveButtonActive]} onPress={handleSwitchToLive} activeOpacity={0.7}>
                  <Text style={[styles.liveButtonText, isPlaying && styles.liveButtonTextActive]}>← Switch to LIVE</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.liveText}>● LIVE</Text>
                  {currentSong && currentArtist && (
                    <View style={styles.nowPlayingContainer}>
                      <Text style={[styles.nowPlayingLabel, isPlaying && styles.nowPlayingLabelActive]}>Now playing:</Text>
                      <Animated.Text style={[styles.currentSongText, isPlaying && styles.currentSongTextActive, { transform: [{ scale: songChangeScale }, { rotate: songRotation }], opacity: songChangeOpacity }]}>
                        {currentArtist}: {currentSong}
                      </Animated.Text>
                    </View>
                  )}
                </>
              )}
            </View>
            <View style={styles.bottomSpace} />
          </View>
        </SafeAreaView>
        <RecentlyPlayedDrawer currentShow={currentShow} />
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  fullScreenGradient: { flex: 1 },
  safeContainer: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60 },
  logoContainer: { alignItems: 'center', marginTop: 10, marginBottom: 5 },
  showInfo: { alignItems: 'center', marginTop: 20 },
  showTitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  clickableTitle: { textDecorationLine: 'underline' },
  archiveInfo: { fontSize: 14, color: '#CCCCCC', textAlign: 'center', marginBottom: 8 },
  archiveInfoActive: { color: '#E0E0E0' },
  hosts: { fontSize: 16, color: '#CCCCCC', textAlign: 'center', marginBottom: 8 },
  hostsActive: { color: '#E0E0E0' },
  bottomInfo: { alignItems: 'center', paddingHorizontal: 20, marginTop: 20 },
  showDescription: { fontSize: 12, color: '#CCCCCC', textAlign: 'center', marginBottom: 12, lineHeight: 16 },
  showDescriptionActive: { color: '#D0D0D0' },
  liveText: { fontSize: 14, color: '#FF4444', fontWeight: '500', marginBottom: 8 },
  nowPlayingContainer: { alignItems: 'center', marginTop: 4 },
  nowPlayingLabel: { fontSize: 10, color: '#999999', fontWeight: '500', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  nowPlayingLabelActive: { color: '#BBBBBB' },
  currentSongText: { fontSize: 12, color: '#CCCCCC', textAlign: 'center', fontStyle: 'italic' },
  currentSongTextActive: { color: '#E0E0E0' },
  centerButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outerRing: { width: 280, height: 280, borderRadius: 140, borderWidth: 2, borderColor: WMBR_GREEN, justifyContent: 'center', alignItems: 'center', opacity: 0.3 },
  middleRing: { width: 240, height: 240, borderRadius: 120, borderWidth: 3, borderColor: WMBR_GREEN, justifyContent: 'center', alignItems: 'center', opacity: 0.6 },
  playButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: WMBR_GREEN, justifyContent: 'center', alignItems: 'center', shadowColor: WMBR_GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  playButtonActive: { backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF' },
  buttonContent: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  iconContainer: { justifyContent: 'center', alignItems: 'center' },
  playIcon: { width: 0, height: 0, borderLeftWidth: 30, borderRightWidth: 0, borderTopWidth: 20, borderBottomWidth: 20, borderLeftColor: '#FFFFFF', borderTopColor: 'transparent', borderBottomColor: 'transparent', marginLeft: 8 },
  pauseIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseBar: { width: 8, height: 36, backgroundColor: '#FFFFFF', borderRadius: 2 },
  pauseBarActive: { backgroundColor: WMBR_GREEN },
  streamingText: { color: WMBR_GREEN, fontSize: 14, fontWeight: '500' },
  streamingTextActive: { color: '#FFFFFF' },
  bottomSpace: { height: 100 },
  liveButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(255, 68, 68, 0.2)', borderRadius: 20, borderWidth: 1, borderColor: '#FF4444' },
  liveButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderColor: '#FFFFFF' },
  liveButtonText: { color: '#FF4444', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  liveButtonTextActive: { color: '#FFFFFF' },
});
