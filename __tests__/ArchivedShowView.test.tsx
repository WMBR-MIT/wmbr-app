import {
  act,
  renderAsync,
  screen,
  userEvent,
} from '@testing-library/react-native';
import TrackPlayer from 'react-native-track-player';

import ArchivedShowView from '@app/Schedule/ArchivedShowView';
import { mockShow } from '../__mocks__/MockShows';
import { getTrackPlayerTestApi, TestWrapper } from '@utils/TestUtils';
import { SKIP_INTERVAL } from '@utils/TrackPlayerUtils';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({
      params: {
        show: mockShow,
        archive: mockShow.archives[0],
      },
    }),
  };
});

describe('ArchivedShowView', () => {
  test('renders ArchivedShowView', async () => {
    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    expect(screen.getByText(mockShow.name)).toBeTruthy();
  });

  test('renders skip forward and back', async () => {
    const user = userEvent.setup();

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(await screen.findByLabelText('Play'));

    expect(
      await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
    ).toBeTruthy();

    expect(
      await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
    ).toBeTruthy();
  });
});

describe('ArchivedShowView skip buttons', () => {
  test('skip forward works', async () => {
    const user = userEvent.setup();

    const { setDuration, setPosition } = getTrackPlayerTestApi();

    await act(async () => {
      setDuration(120); // 2 minutes
      setPosition(40); // start at 40s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(await screen.findByLabelText('Play'));

    await user.press(
      await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
    );

    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(70);
  });

  test('skip backward works', async () => {
    const user = userEvent.setup();

    const { setDuration, setPosition } = getTrackPlayerTestApi();

    await act(async () => {
      setDuration(120); // 2 minutes
      setPosition(40); // start at 40s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(await screen.findByLabelText('Play'));

    await user.press(
      await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
    );

    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(10);
  });

  test('skip forward is clamped to duration', async () => {
    const user = userEvent.setup();

    const { setDuration, setPosition } = getTrackPlayerTestApi();

    await act(async () => {
      setDuration(120); // 2 minutes
      setPosition(110); // start at 110s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(await screen.findByLabelText('Play'));

    await user.press(
      await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(120);
  });

  test('skip backward is clamped to 0', async () => {
    const user = userEvent.setup();

    const { setDuration, setPosition } = getTrackPlayerTestApi();

    await act(async () => {
      setDuration(120); // 2 minutes
      setPosition(10); // start at 10s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(await screen.findByLabelText('Play'));

    await user.press(
      await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(0);
  });
});
