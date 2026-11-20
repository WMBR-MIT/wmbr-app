import React, { useEffect, useState, useMemo, useCallback } from 'react';
import he from 'he';
import { debugError } from '@utils/Debug';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  AppState,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
} from 'react-native-track-player';
import Icon from '@components/Icon';
import { SKIP_INTERVAL, liveCapabilities } from '@utils/TrackPlayerUtils';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SvgXml } from 'react-native-svg';
import PlayButton from './PlayButton';
import SplashScreen from './SplashScreen';
import MetadataService, { ShowInfo, Song } from '@services/MetadataService';
import { RecentlyPlayedService } from '@services/RecentlyPlayedService';
import { ArchiveService, ArchivePlaybackState } from '@services/ArchiveService';
import { AudioPreviewService } from '@services/AudioPreviewService';
import { getWMBRLogoSVG } from '@utils/WMBRLogo';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { WmbrRouteName } from '@customTypes/Navigation';
import { DEFAULT_NAME } from '@customTypes/Playlist';
import { COLORS, CORE_COLORS } from '@utils/Colors';
import { formatArchiveDate } from '@utils/DateTime';
import { getUserAgent } from '@utils/UserAgent';

import HomeNowPlaying from './HomeNowPlaying';
import { ScheduleService } from '@services/ScheduleService';

const streamUrl = 'https://wmbr.org:8002/hi';

export default function HomeScreen() {
  const [appState, setAppState] = useState(AppState.currentState);
  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();
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

  const scheduleService = ScheduleService.getInstance();

  const isPlaying = playbackState?.state === State.Playing;
  const isBuffering = playbackState?.state === State.Buffering;

  const navigation =
    useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  const bottomSpacerStyle = useMemo(
    () => ({ height: Math.max(insets.bottom + 56, 56) }),
    [insets.bottom],
  );

  const setupPlayer = useCallback(async () => {
    try {
      // If the player already exists, mark it initialized and skip setup
      try {
        await TrackPlayer.getPlaybackState();
        setIsPlayerInitialized(true);
        return;
      } catch {
        // not initialized yet, proceed
      }

      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });

      // Start with live capabilities, since this is the default stream
      await TrackPlayer.updateOptions({
        capabilities: liveCapabilities,
      });

      setIsPlayerInitialized(true);
    } catch (error) {
      debugError('Error setting up player:', error);
    }
  }, []);

  useEffect(() => {
    setupPlayer();

    const metadataService = MetadataService.getInstance();

    const unsubscribeMetadata = metadataService.subscribe((data: ShowInfo) => {
      setShowInfo(data);
      setCurrentShow(data.showTitle);
      setHosts(he.decode(data.hosts || ''));
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

    // Subscribe to archive service
    const unsubscribeArchive =
      ArchiveService.getInstance().subscribe(setArchiveState);

    return () => {
      unsubscribeMetadata();
      unsubscribeSongs();
      unsubscribeArchive();
    };
  }, [setupPlayer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  // Live playback changes refresh metadata even when foreground polling is already enabled.
  useEffect(() => {
    const isPlayingLive = isPlaying && activeTrack?.id === 'wmbr-stream';
    // Live metadata is useful offscreen only while listening to the live stream.
    const shouldPollMetadata = appState === 'active' || isPlayingLive;
    const metadataService = MetadataService.getInstance();
    if (shouldPollMetadata) {
      // Starting a polling session also fetches fresh metadata immediately.
      metadataService.startPolling();
    } else {
      metadataService.stopPolling();
    }

    return () => metadataService.stopPolling();
  }, [appState, isPlaying, activeTrack?.id]);

  const liveMetadata = useMemo(() => {
    if (showInfo?.currentSong && showInfo?.currentArtist) {
      const titleWithHosts = currentShow
        ? `${currentShow}${hosts ? ` with ${hosts}` : ''}`
        : DEFAULT_NAME;

      return {
        title: `${showInfo.currentArtist} - ${showInfo.currentSong}`,
        artist: `${titleWithHosts || 'Live Radio'} | ${DEFAULT_NAME}`,
        artwork: require('../../../assets/cover.png'),
      };
    }

    const titleWithHosts = currentShow
      ? `${currentShow}${hosts ? ` with ${hosts}` : ''}`
      : DEFAULT_NAME;

    return {
      title: titleWithHosts || DEFAULT_NAME,
      artist: currentShow ? DEFAULT_NAME : 'Live Radio',
      artwork: require('../../../assets/cover.png'),
    };
  }, [hosts, showInfo, currentShow]);

  // Separate useEffect for updating track metadata when show changes
  useEffect(() => {
    const updateLiveTrackMetadata = async () => {
      // Don't try to update metadata if player isn't initialized yet, or is in a state that isn't active
      const allowedStates = [State.Playing, State.Paused, State.Ready];
      if (
        !isPlayerInitialized ||
        !playbackState.state ||
        !allowedStates.includes(playbackState.state)
      ) {
        return;
      }

      try {
        // Only update if we're not playing an archive
        if (!archiveState.isPlayingArchive) {
          await TrackPlayer.updateMetadataForTrack(0, liveMetadata);
        }
      } catch (error) {
        debugError('Error updating track metadata:', error);
      }
    };

    updateLiveTrackMetadata();
  }, [
    liveMetadata,
    archiveState.isPlayingArchive,
    isPlayerInitialized,
    playbackState?.state,
  ]);

  const togglePlayback = useCallback(async () => {
    if (!isPlayerInitialized) {
      debugError('Player not initialized yet, cannot toggle playback');
      return;
    }

    try {
      // If we're buffering, just stop
      if (isBuffering) {
        await TrackPlayer.stop();
        return;
      }

      const audioPreviewService = AudioPreviewService.getInstance();
      const previewState = audioPreviewService.getCurrentState();

      if (isPlaying) {
        if (archiveState.isPlayingArchive) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.stop();
        }
      } else {
        if (previewState.url !== null) {
          await audioPreviewService.stop();
        }

        const queue = await TrackPlayer.getQueue();

        const hasLiveStream = queue.some(track => track.id === 'wmbr-stream');

        const liveTrack = {
          id: 'wmbr-stream',
          url: streamUrl,
          ...liveMetadata,
          isLiveStream: true,
          userAgent: getUserAgent(),
        };

        if (!hasLiveStream) {
          await TrackPlayer.add(liveTrack);
        }

        await TrackPlayer.play();
      }
    } catch (error) {
      debugError('Error toggling playback:', error);
    }
  }, [
    archiveState.isPlayingArchive,
    isBuffering,
    isPlayerInitialized,
    isPlaying,
    liveMetadata,
  ]);

  const handleSplashEnd = () => setShowSplash(false);

  const handleSwitchToLive = useCallback(async () => {
    try {
      await ArchiveService.getInstance().switchToLive(currentShow);
    } catch (e) {
      debugError('Error switching to live:', e);
    }
  }, [currentShow]);

  const handleSkipBackward = async () => {
    await TrackPlayer.seekBy(SKIP_INTERVAL * -1);
  };

  const handleSkipForward = async () => {
    await TrackPlayer.seekBy(SKIP_INTERVAL);
  };

  const handleOpenShowDetails = useCallback(async () => {
    const show = archiveState.currentShow;
    if (!show) return;

    const scheduleShow = await scheduleService.getShowById(show.id);

    // Navigate to Schedule tab with complete stack state
    navigation.navigate('Schedule' as WmbrRouteName, {
      // Specify the complete stack path
      state: {
        routes: [
          { name: 'ScheduleMain' },
          { name: 'ShowDetails', params: { show, scheduleShow } },
          {
            name: 'ArchivedShowView',
            params: { show, archive: archiveState.currentArchive },
          },
        ],
      },
    });
  }, [
    archiveState.currentShow,
    archiveState.currentArchive,
    scheduleService,
    navigation,
  ]);

  const colorScheme = useColorScheme();

  if (showSplash) return <SplashScreen onAnimationEnd={handleSplashEnd} />;

  const statusBarColor =
    colorScheme === 'dark' ? CORE_COLORS.BLACK : CORE_COLORS.WHITE;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar
        backgroundColor={isPlaying ? CORE_COLORS.WMBR_GREEN : statusBarColor}
        translucent={false}
      />
      <View style={styles.fullScreenGradient}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <SvgXml
                xml={getWMBRLogoSVG(CORE_COLORS.WMBR_GREEN)}
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
            <View style={styles.playbackControls}>
              {archiveState.isPlayingArchive && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={async () => await handleSkipBackward()}
                  activeOpacity={0.7}
                  accessibilityLabel={`Skip backward ${SKIP_INTERVAL} seconds`}
                >
                  <Icon
                    name={{
                      ios: '30.arrow.trianglehead.counterclockwise',
                      android: 'replay-30',
                    }}
                    size={28}
                    color={COLORS.TEXT.PRIMARY}
                  />
                </TouchableOpacity>
              )}
              <PlayButton
                onPress={togglePlayback}
                isPlayingArchive={archiveState.isPlayingArchive}
              />
              {archiveState.isPlayingArchive && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={async () => await handleSkipForward()}
                  activeOpacity={0.7}
                  accessibilityLabel={`Skip forward ${SKIP_INTERVAL} seconds`}
                >
                  <Icon
                    name={{
                      ios: '30.arrow.trianglehead.clockwise',
                      android: 'forward-30',
                    }}
                    size={28}
                    color={COLORS.TEXT.PRIMARY}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.bottomInfo}>
              {!archiveState.isPlayingArchive && showDescription && (
                <Text style={styles.showDescription} numberOfLines={3}>
                  {showDescription}
                </Text>
              )}
              {archiveState.isPlayingArchive ? (
                <TouchableOpacity
                  style={[
                    styles.liveButton,
                    isPlaying && styles.liveButtonPlaying,
                  ]}
                  onPress={handleSwitchToLive}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.liveButtonText,
                      isPlaying && styles.liveButtonTextPlaying,
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
      </View>
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
  archiveInfoActive: { color: COLORS.TEXT.SECONDARY },
  hosts: {
    fontSize: 16,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  hostsActive: { color: COLORS.TEXT.SECONDARY },
  bottomInfo: { alignItems: 'center', paddingHorizontal: 20, marginTop: 20 },
  showDescription: {
    fontSize: 12,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  liveButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.BUTTON.SWITCH.BACKGROUND,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BUTTON.SWITCH.BORDER,
  },
  liveButtonText: {
    color: COLORS.BUTTON.SWITCH.TEXT,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  liveButtonPlaying: {
    backgroundColor: COLORS.BUTTON.SWITCH_ACTIVE.BACKGROUND,
    borderColor: COLORS.BUTTON.SWITCH_ACTIVE.BORDER,
  },
  liveButtonTextPlaying: { color: COLORS.BUTTON.SWITCH_ACTIVE.TEXT },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
});
