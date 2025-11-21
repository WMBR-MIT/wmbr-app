import { Capability } from 'react-native-track-player';

export const archiveCapabilities = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.JumpForward,
  Capability.JumpBackward,
];

export const liveCapabilities = [Capability.Play, Capability.Stop];
