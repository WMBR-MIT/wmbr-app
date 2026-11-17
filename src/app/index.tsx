import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { COLORS, CORE_COLORS } from '@utils/Colors';
import Icon, { IconName } from '@components/Icon';

import RecentlyPlayed from './RecentlyPlayed';
import HomeScreen from './Home';
import AboutPage from './About';
import { ScheduleStack } from './Schedule';

const Tab = createBottomTabNavigator<any>();

const getIconName = (routeName: string): IconName => {
  switch (routeName) {
    case 'Home':
      return {
        ios: 'music.note.house',
        android: 'home',
      };
    case 'Recently Played':
      return {
        ios: 'music.note.list',
        android: 'queue-music',
      };
    case 'Schedule':
      return {
        ios: 'calendar',
        android: 'calendar-month',
      };
    case 'About':
      return {
        ios: 'info.circle',
        android: 'info',
      };
    default:
      return {
        ios: 'questionmark.circle',
        android: 'help',
      };
  }
};

const renderTabBarIcon = (routeName: string) => {
  const iconName = getIconName(routeName);
  return ({ color, size }: { color: string; size: number }) => (
    <Icon name={iconName} size={size} color={color} />
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              headerTransparent: true,
              // Android doesn't do header blur effects, so it needs a solid
              // background color
              ...(Platform.OS === 'android' && {
                headerStyle: {
                  backgroundColor: COLORS.BACKGROUND.PRIMARY,
                },
              }),
              headerTintColor: COLORS.TEXT.PRIMARY,
              tabBarActiveTintColor: CORE_COLORS.GREEN_500,
              tabBarInactiveTintColor: COLORS.TEXT.TERTIARY,
              tabBarStyle: {
                backgroundColor: COLORS.BACKGROUND.PRIMARY,
                borderTopColor: COLORS.BORDER.SUBTLE,
              },
              tabBarIcon: renderTabBarIcon(route.name),
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen
              name="Recently Played"
              component={RecentlyPlayed}
              options={{
                headerShown: true,
              }}
            />
            <Tab.Screen name="Schedule" component={ScheduleStack} />
            <Tab.Screen name="About" component={AboutPage} />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
