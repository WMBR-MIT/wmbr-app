import React from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { COLORS, CORE_COLORS } from '@utils/Colors';

import RecentlyPlayed from './RecentlyPlayed';
import HomeScreen from './Home';
import AboutPage from './About';
import { ScheduleStack } from './Schedule';
import { PlaybackAccessory } from '@components/PlaybackAccessory';

const Tab = createNativeBottomTabNavigator();

export default function App() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.gestureRoot}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              headerTransparent: true,
              headerTintColor:
                colorScheme === 'dark' ? CORE_COLORS.WHITE : CORE_COLORS.BLACK,
              tabBarActiveTintColor: CORE_COLORS.GREEN_500,
              tabBarStyle: {
                backgroundColor: COLORS.BACKGROUND.PRIMARY,
              },
              bottomAccessory: PlaybackAccessory,
            }}
          >
            <Tab.Screen
              name="Home"
              component={HomeScreen}
              options={{
                tabBarIcon: Platform.select({
                  ios: {
                    type: 'sfSymbol',
                    name: 'music.note.house',
                  },
                  android: {
                    type: 'image',
                    source: MaterialIcons.getImageSourceSync('home', 24),
                  },
                }),
              }}
            />
            <Tab.Screen
              name="Recently Played"
              component={RecentlyPlayed}
              options={{
                headerShown: true,
                tabBarIcon: Platform.select({
                  ios: {
                    type: 'sfSymbol',
                    name: 'music.note.list',
                  },
                  android: {
                    type: 'image',
                    source: MaterialIcons.getImageSourceSync('home', 24),
                  },
                }),
              }}
            />
            <Tab.Screen
              name="Schedule"
              component={ScheduleStack}
              options={{
                tabBarIcon: Platform.select({
                  ios: {
                    type: 'sfSymbol',
                    name: 'calendar',
                  },
                  android: {
                    type: 'image',
                    source: MaterialIcons.getImageSourceSync('home', 24),
                  },
                }),
              }}
            />
            <Tab.Screen
              name="About"
              component={AboutPage}
              options={{
                tabBarIcon: Platform.select({
                  ios: {
                    type: 'sfSymbol',
                    name: 'info.circle',
                  },
                  android: {
                    type: 'image',
                    source: MaterialIcons.getImageSourceSync('home', 24),
                  },
                }),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
