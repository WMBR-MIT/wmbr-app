import { jest } from '@jest/globals';
import { createMockFetch } from './__mocks__/MockNetworkResponses';

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Gesture: {
      Pan: jest.fn().mockReturnValue({
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        runOnJS: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      children || View,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children || View,
  };
});

jest.mock('react-native-reanimated', () => {
  const { Easing, View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (component: unknown) => component,
    },
    Easing,
    useAnimatedProps: (callback: () => unknown) => callback(),
    useAnimatedStyle: (callback: () => unknown) => callback(),
    useDerivedValue: (callback: () => unknown) => ({ value: callback() }),
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations.at(-1),
    withTiming: (value: unknown) => value,
    runOnJS: (callback: () => void) => callback,
  };
});

// Silence debug logs
jest.mock('./src/utils/Debug.ts', () => ({
  debugLog: jest.fn(),
  debugError: jest.fn(),
}));

// Mock fetch at the network boundary instead of mocking services
// This allows real service code to run in tests
jest.spyOn(global, 'fetch').mockImplementation(createMockFetch());

// Mock useHeaderHeight from @react-navigation/elements used by header components
jest.mock('@react-navigation/elements', () => {
  const actual = jest.requireActual(
    '@react-navigation/elements',
  ) as typeof import('@react-navigation/elements');

  return {
    ...actual,
    useHeaderHeight: () => 0,
  };
});
