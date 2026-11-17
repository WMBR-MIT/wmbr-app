import TrackPlayer, { State, useActiveTrack } from 'react-native-track-player';
import { AppState, AppStateStatus } from 'react-native';

import {
  act,
  renderAsync,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '../src/app/Home';
import { ArchiveService } from '../src/services/ArchiveService';
import { TestWrapper, getTrackPlayerTestApi } from '../src/utils/TestUtils';
import { SKIP_INTERVAL } from '../src/utils/TrackPlayerUtils';
import { mockShow } from '../__mocks__/MockShows';

const { setPlaybackState } = getTrackPlayerTestApi();

// Mock the local SplashScreen so Home renders its UI immediately
jest.mock('../src/app/Home/SplashScreen', () => (props: any) => {
  // Call onAnimationEnd asynchronously to avoid setState during render warnings.
  // Wrap it in act so the resulting Home state update is expected by React.
  const testingLibrary = require('@testing-library/react-native');
  setTimeout(() => testingLibrary.act(() => props.onAnimationEnd?.()), 0);
  return null;
});

describe('Home Screen', () => {
  const originalAppState = AppState.currentState;

  beforeEach(() => {
    AppState.currentState = 'active';
    jest.clearAllMocks();
    getTrackPlayerTestApi().resetAll();
    jest.mocked(useActiveTrack).mockReturnValue(undefined);
  });
  afterEach(() => {
    AppState.currentState = originalAppState;
  });

  const metadataRequestCount = () =>
    jest
      .mocked(fetch)
      .mock.calls.filter(([url]) => url === 'https://wmbr.org/dynamic.xml')
      .length;

  // Home and TestWrapper each start polling on mount, producing two requests.
  const mountMetadataRequests = 2;

  test.each([
    ['wmbr-stream', State.Playing],
    ['wmbr-stream', State.Paused],
    ['preview-track', State.Playing],
    ['archive-track', State.Playing],
    [undefined, State.Playing],
  ])(
    'starts polling once on mount regardless of playback (%s, %s)',
    async (trackId, playbackState) => {
      setPlaybackState(playbackState);
      jest
        .mocked(useActiveTrack)
        .mockReturnValue(
          trackId
            ? { id: trackId, url: 'https://example.com/audio' }
            : undefined,
        );

      await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

      // Live playback must not cause a second refresh on mount.
      expect(metadataRequestCount()).toBe(mountMetadataRequests);
    },
  );

  test.each([State.Stopped, State.Paused])(
    'refreshes once when the active live track transitions from %s to playing',
    async initialPlaybackState => {
      setPlaybackState(initialPlaybackState);
      jest.mocked(useActiveTrack).mockReturnValue({
        id: 'wmbr-stream',
        url: 'https://wmbr.org:8002/hi',
      });
      const { rerenderAsync } = await renderAsync(<HomeScreen />, {
        wrapper: TestWrapper,
      });
      expect(metadataRequestCount()).toBe(mountMetadataRequests);

      // Keep the track unchanged so only the playback-state dependency can trigger a refresh.
      setPlaybackState(State.Playing);
      await rerenderAsync(<HomeScreen />);
      expect(metadataRequestCount()).toBe(mountMetadataRequests + 1);

      await rerenderAsync(<HomeScreen />);
      expect(metadataRequestCount()).toBe(mountMetadataRequests + 1);
    },
  );

  test('refreshes when switching to live without changing playback state', async () => {
    setPlaybackState(State.Playing);
    jest.mocked(useActiveTrack).mockReturnValue({
      id: 'preview-track',
      url: 'https://example.com/preview',
    });
    const { rerenderAsync } = await renderAsync(<HomeScreen />, {
      wrapper: TestWrapper,
    });
    expect(metadataRequestCount()).toBe(mountMetadataRequests);

    jest.mocked(useActiveTrack).mockReturnValue({
      id: 'wmbr-stream',
      url: 'https://wmbr.org:8002/hi',
    });
    await rerenderAsync(<HomeScreen />);
    expect(metadataRequestCount()).toBe(mountMetadataRequests + 1);

    // A new track object with the same ID must not restart polling.
    jest.mocked(useActiveTrack).mockReturnValue({
      id: 'wmbr-stream',
      url: 'https://wmbr.org:8002/hi',
    });
    await rerenderAsync(<HomeScreen />);
    expect(metadataRequestCount()).toBe(mountMetadataRequests + 1);

    jest.mocked(useActiveTrack).mockReturnValue({
      id: 'archive-track',
      url: 'https://example.com/archive',
    });
    await rerenderAsync(<HomeScreen />);
    // Leaving live playback returns to foreground polling with one fresh request.
    expect(metadataRequestCount()).toBe(mountMetadataRequests + 2);
  });
  test.each([
    ['wmbr-stream', State.Stopped],
    ['wmbr-stream', State.Playing],
    ['archive-track', State.Playing],
    ['preview-track', State.Playing],
  ])(
    'polling follows app visibility and live playback (%s, %s)',
    async (trackId, initialPlaybackState) => {
      jest.mocked(useActiveTrack).mockReturnValue({
        id: trackId,
        url: 'https://example.com/audio',
      });
      const appStateListener = jest.mocked(AppState.addEventListener);
      const intervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      setPlaybackState(initialPlaybackState);

      try {
        // Use only the UI providers: TestWrapper starts its own metadata poller.
        const { rerenderAsync } = await renderAsync(<HomeScreen />, {
          wrapper: ({ children }) => (
            <SafeAreaProvider
              initialMetrics={{
                insets: { top: 0, left: 0, right: 0, bottom: 0 },
                frame: { x: 0, y: 0, width: 0, height: 0 },
              }}
            >
              <NavigationContainer>{children}</NavigationContainer>
            </SafeAreaProvider>
          ),
        });

        expect(metadataRequestCount()).toBe(1);
        expect(
          intervalSpy.mock.calls.filter(([, interval]) => interval === 30000),
        ).toHaveLength(1);
        const pollingIndex = intervalSpy.mock.calls.findIndex(
          ([, interval]) => interval === 30000,
        );
        expect(pollingIndex).toBeGreaterThanOrEqual(0);
        const pollingTimer = intervalSpy.mock.results[pollingIndex].value;
        const listener = appStateListener.mock.calls.find(
          ([event]) => event === 'change',
        )?.[1];
        expect(listener).toBeDefined();

        const changeAppState = async (nextState: AppStateStatus) => {
          await act(async () => listener?.(nextState));
        };

        clearIntervalSpy.mockClear();
        intervalSpy.mockClear();
        await changeAppState('background');

        if (
          initialPlaybackState === State.Playing &&
          trackId === 'wmbr-stream'
        ) {
          // Backgrounding restarts polling for live audio, but never creates two timers.
          expect(metadataRequestCount()).toBe(2);
          expect(
            intervalSpy.mock.calls.filter(([, interval]) => interval === 30000),
          ).toHaveLength(1);
          const backgroundPollingIndex = intervalSpy.mock.calls.findIndex(
            ([, interval]) => interval === 30000,
          );
          const backgroundPollingTimer =
            intervalSpy.mock.results[backgroundPollingIndex].value;

          // Stopping live playback in the background must stop polling too.
          setPlaybackState(State.Stopped);
          await rerenderAsync(<HomeScreen />);
          expect(clearIntervalSpy).toHaveBeenCalledWith(backgroundPollingTimer);
        } else {
          expect(metadataRequestCount()).toBe(1);
          expect(
            intervalSpy.mock.calls.filter(([, interval]) => interval === 30000),
          ).toHaveLength(0);
        }
        expect(clearIntervalSpy).toHaveBeenCalledWith(pollingTimer);

        if (
          initialPlaybackState === State.Stopped &&
          trackId === 'wmbr-stream'
        ) {
          // Starting live audio in the background must create only one polling session.
          intervalSpy.mockClear();
          const requestsBeforePlayback = metadataRequestCount();
          setPlaybackState(State.Playing);
          await rerenderAsync(<HomeScreen />);
          expect(metadataRequestCount()).toBe(requestsBeforePlayback + 1);
          expect(
            intervalSpy.mock.calls.filter(([, interval]) => interval === 30000),
          ).toHaveLength(1);

          setPlaybackState(State.Stopped);
          await rerenderAsync(<HomeScreen />);
        }

        intervalSpy.mockClear();
        await changeAppState('active');
        expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      } finally {
        intervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
      }
    },
  );

  test('track player is set up on home screen', async () => {
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

    expect(TrackPlayer.setupPlayer).toHaveBeenCalled();
  });

  test('tapping Play button calls TrackPlayer.play()', async () => {
    const user = userEvent.setup();
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const playButton = await screen.findByLabelText('Play');
    await user.press(playButton);

    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  test('pressing Play adds the live stream', async () => {
    const user = userEvent.setup();
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const playButton = await screen.findByLabelText('Play');
    await user.press(playButton);

    // Main stream should be added to TrackPlayer
    expect(TrackPlayer.add).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://wmbr.org:8002/hi' }),
    );
  });

  test('pressing Stop calls TrackPlayer.stop()', async () => {
    const user = userEvent.setup();

    // Start in Playing state so Pause button is shown
    setPlaybackState(State.Playing);

    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const stopButton = await screen.findByLabelText('Stop');
    await user.press(stopButton);

    expect(TrackPlayer.stop).toHaveBeenCalled();
  });

  describe('archive skip buttons', () => {
    const { setDuration, setPosition } = getTrackPlayerTestApi();

    beforeEach(async () => {
      // Home only shows the skip buttons while an archive is playing, so start
      // one through the real ArchiveService rather than mocking its state.
      await act(async () => {
        await ArchiveService.getInstance().playArchive(
          mockShow.archives[0],
          mockShow,
        );
        setDuration(120); // 2 minutes
        setPosition(40); // start at 40s
      });
    });

    afterEach(async () => {
      // ArchiveService is a singleton, so return it to live for the next test.
      await act(async () => {
        await ArchiveService.getInstance().switchToLive();
      });
    });

    test('skip forward seeks 30 seconds ahead with a relative seek', async () => {
      const user = userEvent.setup();
      await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

      await user.press(
        await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
      );

      expect(TrackPlayer.seekBy).toHaveBeenLastCalledWith(SKIP_INTERVAL);
      expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
      expect(await TrackPlayer.getPosition()).toBe(70);
    });

    test('skip backward seeks 30 seconds back with a relative seek', async () => {
      const user = userEvent.setup();
      await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

      await user.press(
        await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
      );

      expect(TrackPlayer.seekBy).toHaveBeenLastCalledWith(-SKIP_INTERVAL);
      expect(TrackPlayer.seekTo).not.toHaveBeenCalled();
      expect(await TrackPlayer.getPosition()).toBe(10);
    });

    test('successive presses stack without a progress update', async () => {
      const user = userEvent.setup();
      await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

      // No progress event is emitted between presses, so each seek must build
      // on the player's own position (40s -> 70s -> 100s).
      const skipForwardButton = await screen.findByLabelText(
        `Skip forward ${SKIP_INTERVAL} seconds`,
      );
      await user.press(skipForwardButton);
      await user.press(skipForwardButton);

      expect(TrackPlayer.seekBy).toHaveBeenCalledTimes(2);
      expect(TrackPlayer.seekBy).toHaveBeenNthCalledWith(1, SKIP_INTERVAL);
      expect(TrackPlayer.seekBy).toHaveBeenNthCalledWith(2, SKIP_INTERVAL);
      expect(await TrackPlayer.getPosition()).toBe(100);
    });
  });
});
