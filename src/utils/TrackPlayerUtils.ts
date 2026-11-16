import { Capability } from 'react-native-track-player';

export const SKIP_INTERVAL = 30;

export const archiveCapabilities = [
  Capability.Play,
  Capability.Pause,
  Capability.Stop,
  Capability.JumpForward,
  Capability.JumpBackward,
  Capability.SeekTo,
];

export const liveCapabilities = [
  Capability.Play,
  Capability.Stop,
  // `Capability.Pause` won't, on its own, enable pause. We listen for
  // RemotePause from RNTP, and if we receive it -- for instance, when AirPods
  // are removed or pressed -- we stop if it's a live stream, and pause if it's
  // an archive.
  Capability.Pause,
];
