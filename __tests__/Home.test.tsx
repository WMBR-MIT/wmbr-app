import TrackPlayer, { State, useActiveTrack } from 'react-native-track-player';

import { renderAsync, screen, userEvent } from '@testing-library/react-native';

import HomeScreen from '../src/app/Home';
import { TestWrapper, getTrackPlayerTestApi } from '../src/utils/TestUtils';

const { setPlaybackState } = getTrackPlayerTestApi();

// Mock the local SplashScreen so Home renders its UI immediately
jest.mock('../src/app/Home/SplashScreen', () => (props: any) => {
  // Call onAnimationEnd asynchronously to avoid setState during render warnings.
  setTimeout(() => props.onAnimationEnd?.(), 0);
  return null;
});

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTrackPlayerTestApi().resetAll();
    jest.mocked(useActiveTrack).mockReturnValue(undefined);
  });
  const metadataRequestCount = () =>
    jest
      .mocked(fetch)
      .mock.calls.filter(([url]) => url === 'https://wmbr.org/dynamic.xml')
      .length;

  // Home and TestWrapper each start polling on mount, producing two requests.
  const mountMetadataRequests = 2;

  test.each([
    ['wmbr-stream', State.Playing, 1],
    ['wmbr-stream', State.Paused, 0],
    ['preview-track', State.Playing, 0],
    ['archive-track', State.Playing, 0],
    [undefined, State.Playing, 0],
  ])(
    'refreshes metadata only for playing live track (%s, %s)',
    async (trackId, playbackState, expectedExtraRequests) => {
      setPlaybackState(playbackState);
      jest
        .mocked(useActiveTrack)
        .mockReturnValue(
          trackId
            ? { id: trackId, url: 'https://example.com/audio' }
            : undefined,
        );

      await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

      // Only playing the live track should add a refresh to the mount requests.
      expect(metadataRequestCount()).toBe(
        mountMetadataRequests + expectedExtraRequests,
      );
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
    expect(metadataRequestCount()).toBe(mountMetadataRequests + 1);
  });

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
});
