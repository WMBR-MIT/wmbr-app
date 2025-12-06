import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FavoritesProvider } from '@context/Favorites';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import BottomMenuBar from './_BottomMenuBar';

import RecentlyPlayedPage from './RecentlyPlayed';
import HomeScreen from './Home';
import AboutPage from './About';
import { ScheduleStack } from './Schedule';

const Tab = createBottomTabNavigator<any>();
const renderTabBar = (props: any) => <BottomMenuBar {...props} />;

export default function App() {
  return (
    <SafeAreaProvider>
      <FavoritesProvider>
        <GestureHandlerRootView style={styles.gestureRoot}>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{ headerShown: false }}
              tabBar={renderTabBar}
            >
              <Tab.Screen name="Home" component={HomeScreen} />
              <Tab.Screen
                name="Recently Played"
                component={RecentlyPlayedPage}
              />
              <Tab.Screen name="Schedule" component={ScheduleStack} />
              <Tab.Screen name="About" component={AboutPage} />
            </Tab.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </FavoritesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
