import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainTabs from './pages/MainTabs';
import SchedulePage from './pages/SchedulePage';
import ShowDetailsPage from './pages/ShowDetailsPage';
import AboutPage from './pages/AboutPage';

const Stack = createNativeStackNavigator();

const PrimaryScreens = (
  <>
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen name="SchedulePage" component={SchedulePage} />
    <Stack.Screen name="AboutPage" component={AboutPage} />
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
      <GestureHandlerRootView style={styles.gestureRoot}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Group>{PrimaryScreens}</Stack.Group>
            <Stack.Group screenOptions={{ presentation: 'modal' }}>{ModalScreens}</Stack.Group>
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
