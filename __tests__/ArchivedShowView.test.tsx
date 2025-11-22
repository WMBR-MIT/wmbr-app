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
    useNavigation: () => ({
      goBack: jest.fn(),
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('ArchivedShowView', () => {
  // afterEach(async () => {
  //   // Reset TrackPlayer mock and ArchiveService to a neutral state between tests
  //   resetAll();
  //   await act(async () => {
  //     await archiveService.switchToLive();
  //   });
  // });

  test('renders ArchivedShowView', async () => {
    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    expect(screen.getByText(mockShow.name)).toBeTruthy();
  });

  test('renders skip forward and back', async () => {
    // Drive the ArchiveService into a playing state using its public API
    await archiveService.playArchive(testArchive, mockShow);

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    // Wait for the skip buttons to appear after service subscription updates
    expect(
      await screen.findByLabelText('Skip backward 30 seconds'),
    ).toBeTruthy();
    expect(
      await screen.findByLabelText('Skip forward 30 seconds'),
    ).toBeTruthy();
  });

  test('skip buttons modify TrackPlayer position', async () => {
    const user = userEvent.setup();

    // Arrange: make archive playing and set duration/position
    await archiveService.playArchive(testArchive, mockShow);
    const { setPlaybackState, setDuration, setPosition } =
      getTrackPlayerTestApi();
    await act(async () => {
      setPlaybackState(State.Playing);
      setDuration(120); // 2 minutes
      setPosition(40); // start at 40s
    });

    await renderAsync(<ArchivedShowView />, { wrapper: TestWrapper });

    // Act: skip forward by SKIP_INTERVAL (30) -> expect 70
    await user.press(await screen.findByLabelText('Skip forward 30 seconds'));
    expect(await TrackPlayer.getPosition()).toBe(70);

    // Act: skip backward by SKIP_INTERVAL (30) -> expect 40 (clamped)
    await user.press(await screen.findByLabelText('Skip backward 30 seconds'));
    expect(await TrackPlayer.getPosition()).toBe(40);

    // Edge cases: skip forward near end should clamp to duration
    await act(async () => setPosition(110)); // 110 + 30 -> clamp to 120
    await user.press(await screen.findByLabelText('Skip forward 30 seconds'));
    expect(await TrackPlayer.getPosition()).toBe(120);

    // Edge case: skip backward near start should clamp to 0 (or min allowed)
    await act(async () => setPosition(10));
    await user.press(await screen.findByLabelText('Skip backward 30 seconds'));
    expect(await TrackPlayer.getPosition()).toBe(0);
  });
});
