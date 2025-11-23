import {
  act,
  renderAsync,
  screen,
  userEvent,
} from '@testing-library/react-native';
import TrackPlayer, { State } from 'react-native-track-player';

import ArchivedShowView from '@app/Schedule/ArchivedShowView';
import { mockShow } from '../__mocks__/MockShows';
import { getTrackPlayerTestApi, TestWrapper } from '@utils/TestUtils';
import { SKIP_INTERVAL } from '@utils/TrackPlayerUtils';
import { ArchiveService } from '@services/ArchiveService';

const archiveService = ArchiveService.getInstance();
const testArchive = mockShow.archives[0];

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
    /**
     * Drive the ArchiveService into a playing state using its public API.
     *
     * This is necessary so that `isArchivePlaying` is true in the component,
     * causing the skip buttons to appear.
     *
     * Technically this only needs to be done once for the whole test suite, but
     * I'm putting it in each test so that each test is more self-contained.
     *
     */
    await archiveService.playArchive(testArchive, mockShow);

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

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

    const { setPlaybackState, setDuration, setPosition } =
      getTrackPlayerTestApi();

    await archiveService.playArchive(testArchive, mockShow);

    await act(async () => {
      setPlaybackState(State.Playing);
      setDuration(120); // 2 minutes
      setPosition(40); // start at 40s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(
      await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(70);
  });

  test('skip backward works', async () => {
    const user = userEvent.setup();

    const { setPlaybackState, setDuration, setPosition } =
      getTrackPlayerTestApi();

    await archiveService.playArchive(testArchive, mockShow);

    await act(async () => {
      setPlaybackState(State.Playing);
      setDuration(120); // 2 minutes
      setPosition(40); // start at 40s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(
      await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(10);
  });

  test('skip forward is clamped to duration', async () => {
    const user = userEvent.setup();

    const { setPlaybackState, setDuration, setPosition } =
      getTrackPlayerTestApi();

    await archiveService.playArchive(testArchive, mockShow);

    await act(async () => {
      setPlaybackState(State.Playing);
      setDuration(120); // 2 minutes
      setPosition(110); // start at 110s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(
      await screen.findByLabelText(`Skip forward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(120);
  });

  test('skip backward is clamped to 0', async () => {
    const user = userEvent.setup();

    const { setPlaybackState, setDuration, setPosition } =
      getTrackPlayerTestApi();

    await archiveService.playArchive(testArchive, mockShow);

    await act(async () => {
      setPlaybackState(State.Playing);
      setDuration(120); // 2 minutes
      setPosition(10); // start at 10s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    await user.press(
      await screen.findByLabelText(`Skip backward ${SKIP_INTERVAL} seconds`),
    );
    expect(TrackPlayer.seekTo).toHaveBeenLastCalledWith(0);
  });
});
