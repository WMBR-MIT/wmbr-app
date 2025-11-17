import TrackPlayer, { State } from 'react-native-track-player';

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
  test('track player is set up on home screen', async () => {
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });

    expect(TrackPlayer.setupPlayer).toHaveBeenCalled();
  });

  test('tapping Play button calls TrackPlayer.play()', async () => {
    const user = userEvent.setup();
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const playButton = await screen.findByLabelText('Play Button');
    await user.press(playButton);

    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  test('pressing Play while an audio preview is active adds the live stream then plays', async () => {
    const user = userEvent.setup();
    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const playButton = await screen.findByLabelText('Play Button');
    await user.press(playButton);

    // Main stream should be added to TrackPlayer
    expect(TrackPlayer.add).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://wmbr.org:8002/hi' }),
    );
  });

  test('pressing Pause calls TrackPlayer.pause()', async () => {
    const user = userEvent.setup();

    // Start in Playing state so Pause button is shown
    setPlaybackState(State.Playing);

    await renderAsync(<HomeScreen />, { wrapper: TestWrapper });
    const pauseButton = await screen.findByLabelText('Pause Button');
    await user.press(pauseButton);

    expect(TrackPlayer.pause).toHaveBeenCalled();
  });
});
