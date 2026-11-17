import { render, screen, userEvent } from '@testing-library/react-native';
import { Button, Text } from 'react-native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { TestWrapper } from '@utils/TestUtils';
import BottomMenuBar from '@app/_BottomMenuBar';

const mockNavigation = {
  navigate: jest.fn(),
  emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
};

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
  navigation: mockNavigation as any,
  descriptors: {},
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

// Use real navigators so the regression test exercises the native stack's
// tabPress listener rather than duplicating its pop-to-top behavior in a mock.
type ScheduleTestRoutes = {
  ScheduleMain: undefined;
  ShowDetails: undefined;
  Episode: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<ScheduleTestRoutes>();

function ScheduleMainScreen({
  navigation,
}: NativeStackScreenProps<ScheduleTestRoutes, 'ScheduleMain'>) {
  return (
    <Button
      title="Open show"
      onPress={() => navigation.navigate('ShowDetails')}
    />
  );
}

function ShowDetailsScreen({
  navigation,
}: NativeStackScreenProps<ScheduleTestRoutes, 'ShowDetails'>) {
  return (
    <Button
      title="Open episode"
      onPress={() => navigation.navigate('Episode')}
    />
  );
}

function EpisodeScreen() {
  return <Text>Episode details</Text>;
}

function ScheduleTestStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'none' }}>
      <Stack.Screen name="ScheduleMain" component={ScheduleMainScreen} />
      <Stack.Screen name="ShowDetails" component={ShowDetailsScreen} />
      <Stack.Screen name="Episode" component={EpisodeScreen} />
    </Stack.Navigator>
  );
}

const renderTabBar = (props: BottomTabBarProps) => <BottomMenuBar {...props} />;

describe('BottomMenuBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigation.emit.mockReturnValue({
      defaultPrevented: false,
    });
  });

  test('imports without crashing', () => {
    expect(BottomMenuBar).toBeDefined();
  });

  test('emits tabPress and navigates when switching tabs', async () => {
    const user = userEvent.setup();
    render(<BottomMenuBar {...mockProps} />, { wrapper: TestWrapper });

    await user.press(screen.getByRole('button', { name: 'Schedule' }));

    expect(mockNavigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'Schedule',
      canPreventDefault: true,
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Schedule');
  });

  test('does not navigate when tabPress is prevented', async () => {
    const user = userEvent.setup();
    mockNavigation.emit.mockReturnValue({ defaultPrevented: true });
    render(<BottomMenuBar {...mockProps} />, { wrapper: TestWrapper });

    await user.press(screen.getByRole('button', { name: 'Schedule' }));

    expect(mockNavigation.emit).toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('emits tabPress without navigating when reselecting the active tab', async () => {
    const user = userEvent.setup();
    render(<BottomMenuBar {...mockProps} />, { wrapper: TestWrapper });

    await user.press(screen.getByRole('button', { name: 'Home' }));

    expect(mockNavigation.emit).toHaveBeenCalledWith({
      type: 'tabPress',
      target: 'Home',
      canPreventDefault: true,
    });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  test('returns from an episode to the main schedule when Schedule is reselected', async () => {
    const user = userEvent.setup();
    render(
      <Tab.Navigator
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Schedule" component={ScheduleTestStack} />
      </Tab.Navigator>,
      { wrapper: TestWrapper },
    );

    await user.press(screen.getByRole('button', { name: 'Open show' }));
    await user.press(
      await screen.findByRole('button', { name: 'Open episode' }),
    );
    expect(await screen.findByText('Episode details')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Schedule' }));

    expect(
      await screen.findByRole('button', { name: 'Open show' }),
    ).toBeTruthy();
    expect(screen.queryByText('Episode details')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open episode' })).toBeNull();
  });

  test('renders four navigation buttons', async () => {
    render(<BottomMenuBar {...mockProps} />, { wrapper: TestWrapper });

    // Check that all four route names appear in the rendered output
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Schedule')).toBeTruthy();
    expect(screen.getByText('Recently Played')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });
});
