import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import HomeScreen from './HomeScreen';
import BottomMenuBar from '../components/BottomMenuBar';
import ShowScheduleScreen from './ShowScheduleScreen';

type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Archive: undefined;
  Messages: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

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
      <Tab.Screen name="Schedule" component={ShowScheduleScreen} />
      <Tab.Screen name="Archive" children={() => <PlaceholderScreen title="Archive" />} />
      <Tab.Screen name="Messages" children={() => <PlaceholderScreen title="Messages" />} />
    </Tab.Navigator>
  );
}
