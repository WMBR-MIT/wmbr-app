import { Capability } from 'react-native-track-player';

export const SKIP_INTERVAL = 30;

export const archiveCapabilities = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.JumpForward,
  Capability.JumpBackward,
];

/**
 * Strangely, the order seems to matter here. If Play comes before Stop, the
 * Stop button doesn't show up on the lock screen controls.
 */
export const liveCapabilities = [Capability.Stop, Capability.Play];
