import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainTabs from './pages/MainTabs';
import SchedulePage from './pages/SchedulePage';
import ShowDetailsPage from './pages/ShowDetailsPage';
import AboutPage from './pages/AboutPage';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
  <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="SchedulePage" component={SchedulePage} />
            <Stack.Screen name="About" component={AboutPage} />
          </Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="ShowDetails" component={ShowDetailsPage} />
          </Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
