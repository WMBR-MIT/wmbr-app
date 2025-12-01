import { Capability } from 'react-native-track-player';

export const SKIP_INTERVAL = 30;

export const archiveCapabilities = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.JumpForward,
  Capability.JumpBackward,
];

export const liveCapabilities = [Capability.Stop, Capability.Play];
