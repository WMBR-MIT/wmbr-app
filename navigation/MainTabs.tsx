import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import HomeScreen from '../pages/HomeScreen';
import BottomMenuBar from '../components/BottomMenuBar';
import SchedulePage from './SchedulePage';
import RecentlyPlayedPage from '../pages/RecentlyPlayedPage';

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
      <Tab.Screen name="Schedule" component={SchedulePage} />
      <Tab.Screen name="Recently Played" component={RecentlyPlayedPage} />
      <Tab.Screen name="Messages" children={() => <PlaceholderScreen title="Messages" />} />
    </Tab.Navigator>
  );
}
