import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainTabs from './pages/MainTabs';
import SchedulePage from './pages/SchedulePage';
import ShowDetailsPage from './pages/ShowDetailsPage';

const Stack = createNativeStackNavigator();

const PrimaryScreens = (
  <>
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen name="SchedulePage" component={SchedulePage} />
  </>
);

const ModalScreens = (
  <>
    <Stack.Screen name="ShowDetails" component={ShowDetailsPage} />
  </>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Group>{PrimaryScreens}</Stack.Group>
          <Stack.Group screenOptions={{ presentation: 'modal' }}>{ModalScreens}</Stack.Group>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
