import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { debugError } from '../../utils/Debug';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
} from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import PlayButton from './PlayButton';
import SplashScreen from './SplashScreen';
import MetadataService, {
  ShowInfo,
  Song,
} from '../../services/MetadataService';
import { RecentlyPlayedService } from '../../services/RecentlyPlayedService';
import {
  ArchiveService,
  ArchivePlaybackState,
} from '../../services/ArchiveService';
import { AudioPreviewService } from '../../services/AudioPreviewService';
import { getWMBRLogoSVG } from '../../utils/WMBRLogo';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { WmbrRouteName } from '../../types/Navigation';
import { DEFAULT_NAME } from '../../types/Playlist';
import { COLORS, CORE_COLORS } from '../../utils/Colors';
import { formatArchiveDate } from '../../utils/DateTime';

import HomeNowPlaying from './HomeNowPlaying';

const streamUrl = 'https://wmbr.org:8002/hi';

export default function HomeScreen() {
  const playbackState = usePlaybackState();
  const insets = useSafeAreaInsets();
  const [currentShow, setCurrentShow] = useState(DEFAULT_NAME);
  const [, setSongHistory] = useState<Song[]>([]);
  const [hosts, setHosts] = useState<string | undefined>();
  const [showDescription, setShowDescription] = useState<string | undefined>();
  const [showSplash, setShowSplash] = useState(true);
  const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
  const [showInfo, setShowInfo] = useState<ShowInfo>();
  const [archiveState, setArchiveState] = useState<ArchivePlaybackState>({
    isPlayingArchive: false,
    currentArchive: null,
    currentShow: null,
    liveStreamUrl: streamUrl,
  });

  const isPlaying = playbackState?.state === State.Playing;

  const navigation =
    useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  useEffect(() => {
    setupPlayer();

    const metadataService = MetadataService.getInstance();

    const unsubscribeMetadata = metadataService.subscribe((data: ShowInfo) => {
      setShowInfo(data);
      setCurrentShow(data.showTitle);
      setHosts(data.hosts);
      setShowDescription(data.description);

      try {
        RecentlyPlayedService.getInstance().setCurrentShow(data.showTitle);
      } catch (e) {
        debugError('current show update failed:', e);
      }
    });

    const unsubscribeSongs = metadataService.subscribeSongHistory(
      (songs: Song[]) => {
        setSongHistory(songs);
      },
    );

    metadataService.startPolling(15000);

    // Subscribe to archive service
    const unsubscribeArchive =
      ArchiveService.getInstance().subscribe(setArchiveState);

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
            title: DEFAULT_NAME,
            artist: currentShow || 'Live Radio',
          });
        }
      } catch (error) {
        debugError('Error updating track metadata:', error);
      }
    };

    updateLiveTrackMetadata();
  }, [currentShow, archiveState.isPlayingArchive, isPlayerInitialized]);

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
        title: DEFAULT_NAME,
        artist: 'Live Radio',
        artwork: require('../../../assets/cover.png'),
      });

      setIsPlayerInitialized(true);
    } catch (error) {
      debugError('Error setting up player:', error);
    }
  };

  const togglePlayback = useCallback(async () => {
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
              title: DEFAULT_NAME,
              artist: currentShow || 'Live Radio',
              artwork: require('../../../assets/cover.png'),
            });
          }
        }
        await TrackPlayer.play();
      }
    } catch (error) {
      debugError('Error toggling playback:', error);
    }
  }, [currentShow, isPlayerInitialized, isPlaying]);

  const handleSplashEnd = () => setShowSplash(false);
  const handleSwitchToLive = useCallback(async () => {
    try {
      await ArchiveService.getInstance().switchToLive(currentShow);
    } catch (e) {
      debugError('Error switching to live:', e);
    }
  }, [currentShow]);

  const bottomSpacerStyle = useMemo(
    () => ({ height: Math.max(insets.bottom + 56, 56) }),
    [insets.bottom],
  );

  const handleOpenShowDetails = useCallback(() => {
    const show = archiveState.currentShow;
    if (!show) return;

    // Navigate to Schedule tab with complete stack state
    navigation.navigate('Schedule' as WmbrRouteName, {
      // Specify the complete stack path
      state: {
        routes: [
          { name: 'ScheduleMain' },
          { name: 'ShowDetails', params: { show } },
          {
            name: 'ArchivedShowView',
            params: { show, archive: archiveState.currentArchive },
          },
        ],
      },
    });
  }, [archiveState.currentShow, archiveState.currentArchive, navigation]);

  if (showSplash) return <SplashScreen onAnimationEnd={handleSplashEnd} />;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          isPlaying ? CORE_COLORS.WMBR_GREEN : COLORS.BACKGROUND.PRIMARY
        }
        translucent={false}
      />
      <LinearGradient
        colors={
          isPlaying
            ? [CORE_COLORS.WMBR_GREEN, '#006B31', CORE_COLORS.WMBR_GREEN]
            : ['#000000', '#1a1a1a', '#000000']
        }
        style={styles.fullScreenGradient}
      >
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <SvgXml
                xml={getWMBRLogoSVG(
                  isPlaying ? '#000000' : CORE_COLORS.WMBR_GREEN,
                )}
                width={80}
                height={17}
              />
            </View>
            <View style={styles.showInfo}>
              {archiveState.isPlayingArchive ? (
                <TouchableOpacity
                  onPress={handleOpenShowDetails}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.showTitle, styles.clickableTitle]}>
                    {archiveState.currentShow?.name || 'Archive'}
                  </Text>
                  <Text
                    style={[
                      styles.archiveInfo,
                      isPlaying && styles.archiveInfoActive,
                    ]}
                  >
                    Archive from{' '}
                    {archiveState.currentArchive?.date
                      ? formatArchiveDate(archiveState.currentArchive.date)
                      : ''}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.showTitle}>{currentShow}</Text>
                  {hosts && (
                    <Text
                      style={[styles.hosts, isPlaying && styles.hostsActive]}
                    >
                      with {hosts}
                    </Text>
                  )}
                </>
              )}
            </View>
            <PlayButton onPress={togglePlayback} />
            <View style={styles.bottomInfo}>
              {!archiveState.isPlayingArchive && showDescription && (
                <Text
                  style={[
                    styles.showDescription,
                    isPlaying && styles.showDescriptionActive,
                  ]}
                  numberOfLines={3}
                >
                  {showDescription}
                </Text>
              )}
              {archiveState.isPlayingArchive ? (
                <TouchableOpacity
                  style={[
                    styles.liveButton,
                    isPlaying && styles.liveButtonActive,
                  ]}
                  onPress={handleSwitchToLive}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.liveButtonText,
                      isPlaying && styles.liveButtonTextActive,
                    ]}
                  >
                    ← Switch to LIVE
                  </Text>
                </TouchableOpacity>
              ) : (
                <HomeNowPlaying showInfo={showInfo} />
              )}
            </View>
            <View style={bottomSpacerStyle} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND.PRIMARY },
  fullScreenGradient: { flex: 1 },
  safeContainer: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: { alignItems: 'center', marginTop: 10, marginBottom: 5 },
  showInfo: { alignItems: 'center', marginTop: 20 },
  showTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  clickableTitle: { textDecorationLine: 'underline' },
  archiveInfo: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  archiveInfoActive: { color: COLORS.TEXT.ACTIVE },
  hosts: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  hostsActive: { color: COLORS.TEXT.ACTIVE },
  bottomInfo: { alignItems: 'center', paddingHorizontal: 20, marginTop: 20 },
  showDescription: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  showDescriptionActive: { color: '#D0D0D0' },
  streamingText: {
    color: CORE_COLORS.WMBR_GREEN,
    fontSize: 14,
    fontWeight: '500',
  },
  streamingTextActive: { color: COLORS.TEXT.PRIMARY },
  bottomSpace: { height: 100 },
  liveButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  liveButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#FFFFFF',
  },
  liveButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  liveButtonTextActive: { color: '#FFFFFF' },
});
