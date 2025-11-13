import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    frame: { x: 0, y: 0, width: 0, height: 0 },
    }}
  >
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </SafeAreaProvider>
);
