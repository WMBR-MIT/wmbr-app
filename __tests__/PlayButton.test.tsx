import { render, screen, userEvent } from '@testing-library/react-native';
import PlayButton from '@app/Home/PlayButton';
import { getTrackPlayerTestApi } from '@utils/TestUtils';
import { State } from 'react-native-track-player';
import { SFSymbol } from 'react-native-sfsymbols';

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

    const playButton = screen.getByLabelText('Play');
    await user.press(playButton);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('shows play icon when not playing', () => {
    render(<TestComponent />);

    // When not playing, should show play icon and not show pause icon
    expect(screen.queryByLabelText('Play')).toBeTruthy();
    expect(screen.queryByLabelText('Stop')).toBeFalsy();
  });

  test('shows stop icon when playing', () => {
    setPlaybackState(State.Playing);

    render(<TestComponent />);

    // When playing, should show stop icon and not show play icon
    expect(screen.queryByLabelText('Play')).toBeFalsy();
    expect(screen.queryByLabelText('Stop')).toBeTruthy();
  });

  test('shows the buffering indicator on successive playback attempts', () => {
    setPlaybackState(State.Stopped);
    const { rerender } = render(<TestComponent />);

    expect(screen.getByLabelText('Play')).toBeTruthy();
    expect(screen.queryByLabelText('Buffering')).toBeNull();

    setPlaybackState(State.Buffering);
    rerender(<TestComponent />);

    expect(screen.getByLabelText('Buffering')).toBeTruthy();
    expect(screen.queryByLabelText('Play')).toBeNull();
    // Native symbols have no text or accessible name of their own, so inspect
    // the real symbol's props to verify that the icon changes, not just its label.
    expect(screen.UNSAFE_getByType(SFSymbol).props.name).toBe(
      'progress.indicator',
    );

    setPlaybackState(State.Playing);
    rerender(<TestComponent />);

    expect(screen.getByLabelText('Stop')).toBeTruthy();
    expect(screen.queryByLabelText('Buffering')).toBeNull();
    expect(screen.UNSAFE_getByType(SFSymbol).props.name).toBe('stop.fill');

    setPlaybackState(State.Stopped);
    rerender(<TestComponent />);

    expect(screen.getByLabelText('Play')).toBeTruthy();
    expect(screen.UNSAFE_getByType(SFSymbol).props.name).toBe('play.fill');

    setPlaybackState(State.Buffering);
    rerender(<TestComponent />);

    expect(screen.getByLabelText('Buffering')).toBeTruthy();
    expect(screen.UNSAFE_getByType(SFSymbol).props.name).toBe(
      'progress.indicator',
    );
  });

  test('handles undefined playback state', () => {
    // Should not crash when playbackState is undefined
    expect(() => render(<TestComponent />)).not.toThrow();
  });
});
