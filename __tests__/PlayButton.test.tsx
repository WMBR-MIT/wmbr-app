import { render, screen, userEvent } from '@testing-library/react-native';
import PlayButton from '@app/Home/PlayButton';
import { getTrackPlayerTestApi } from '@utils/TestUtils';
import { State } from 'react-native-track-player';

const { setPlaybackState } = getTrackPlayerTestApi();

const mockOnPress = jest.fn();

const defaultProps = {
  onPress: mockOnPress,
  isPlayerInitialized: true,
};

const TestComponent = () => <PlayButton {...defaultProps} />;

describe('PlayButton', () => {
  test('renders correctly', () => {
    const component = render(<TestComponent />);

    // Check that the component renders without crashing
    expect(component).toBeTruthy();
  });

  test('calls onPress when pressed', async () => {
    const user = userEvent.setup();

    render(<TestComponent />);

    const playButton = screen.getByLabelText('Play Button');
    await user.press(playButton);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('shows play icon when not playing', () => {
    render(<TestComponent />);

    // When not playing, should show play icon and not show pause icon
    expect(screen.queryByLabelText('Play Button')).toBeTruthy();
    expect(screen.queryByLabelText('Stop Button')).toBeFalsy();
  });

  test('shows stop icon when playing', () => {
    setPlaybackState(State.Playing);

    render(<TestComponent />);

    // When playing, should show stop icon and not show play icon
    expect(screen.queryByLabelText('Play Button')).toBeFalsy();
    expect(screen.queryByLabelText('Stop Button')).toBeTruthy();
  });

  test('handles undefined playback state', () => {
    // Should not crash when playbackState is undefined
    expect(() => render(<TestComponent />)).not.toThrow();
  });
});
