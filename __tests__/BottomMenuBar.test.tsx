import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomMenuBar from '../components/BottomMenuBar';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Simple mock props
const mockProps: BottomTabBarProps = {
  state: {
    index: 0,
    routeNames: ['Home', 'Schedule', 'Recently Played', 'About'],
    routes: [
      { key: 'Home', name: 'Home', params: undefined },
      { key: 'Schedule', name: 'Schedule', params: undefined },
      { key: 'Recently Played', name: 'Recently Played', params: undefined },
      { key: 'About', name: 'About', params: undefined },
    ],
    type: 'tab' as const,
    key: 'tab',
    stale: false,
    history: [],
    preloadedRouteKeys: [],
  },
  navigation: {
    navigate: jest.fn(),
  } as any,
  descriptors: {},
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

describe('BottomMenuBar', () => {
  test('imports without crashing', () => {
    expect(BottomMenuBar).toBeDefined();
  });

  test('renders four navigation buttons', async () => {
     render(
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
          frame: { x: 0, y: 0, width: 0, height: 0 },
        }}
      >
        <BottomMenuBar {...mockProps} />
      </SafeAreaProvider>
    );
    
    // Check that all four route names appear in the rendered output
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Schedule')).toBeTruthy();
    expect(screen.getByText('Recently Played')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });
});
