import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import BottomMenuBar from '../components/BottomMenuBar';
import { ScheduleStack } from './SchedulePage';
import RecentlyPlayedPage from './RecentlyPlayedPage';
import AboutPage from './AboutPage';

const Tab = createBottomTabNavigator<any>();
const renderTabBar = (props: any) => <BottomMenuBar {...props} />;

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Recently Played" component={RecentlyPlayedPage} />
      <Tab.Screen name="Schedule" component={ScheduleStack} />
      <Tab.Screen name="About" component={AboutPage} />
    </Tab.Navigator>
  );
}
