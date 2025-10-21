import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import HomeScreen from './HomeScreen';
import BottomMenuBar from '../components/BottomMenuBar';
import ShowScheduleScreen from './ShowScheduleScreen';

const Tab = createBottomTabNavigator<any>();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{title}</Text>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <BottomMenuBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Recently Played" children={() => <PlaceholderScreen title="Recently Played" />} />
      <Tab.Screen name="Schedule" component={ShowScheduleScreen} />
      <Tab.Screen name="About" children={() => <PlaceholderScreen title="About" />} />
    </Tab.Navigator>
  );
}
