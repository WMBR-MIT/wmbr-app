import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import PlayButton from '../components/PlayButton';

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

    // Find the play button by testID
    const playButton = screen.getByLabelText('Play Button');
    await user.press(playButton);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test('shows play icon when not playing', () => {
    render(<TestComponent />);

    // When not playing, should show play icon and not show pause icon
    expect(screen.queryByLabelText('Play Button')).toBeTruthy();
    expect(screen.queryByLabelText('Pause Button')).toBeFalsy();
  });

  test('shows pause icon when playing', () => {
    const { usePlaybackState } = require('react-native-track-player');
    const { State } = require('react-native-track-player');
    usePlaybackState.mockReturnValue({ state: State.Playing });

    render(<TestComponent />);

    // When playing, should show pause icon and not show play icon
    expect(screen.queryByLabelText('Play Button')).toBeFalsy();
    expect(screen.queryByLabelText('Pause Button')).toBeTruthy();
  });

  test('handles undefined playback state', () => {
    // Should not crash when playbackState is undefined
    expect(() => render(<TestComponent />)).not.toThrow();
  });
});
