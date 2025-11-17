import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
      frame: { x: 0, y: 0, width: 0, height: 0 },
    }}
  >
    <NavigationContainer>{children}</NavigationContainer>
  </SafeAreaProvider>
);

// Test helpers for driving the react-native-track-player mock from tests.
// These access the __testApi exported by the jest setup mock above.
export const getTrackPlayerTestApi = () => {
  const api = require('react-native-track-player')?.default?.__testApi;

  if (!api) {
    throw new Error(
      'TrackPlayer test API not available. Ensure the mock exposes __testApi.',
    );
  }

  return api as {
    resetAll: () => void;
    setPlaybackState: (s: string) => void;
    setPosition: (sec: number) => void;
    setDuration: (sec: number) => void;
    advance: (ms: number) => void;
  };
};
