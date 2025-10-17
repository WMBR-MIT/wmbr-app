import React from 'react';
import { useNavigation } from '@react-navigation/native';
import ShowScheduleView from '../components/ShowScheduleView';

export default function ShowScheduleScreen() {
  const navigation = useNavigation();
  return <ShowScheduleView isVisible={true} onClose={() => navigation.goBack()} />;
}
