import { StyleSheet, View } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ArchivedShowView from './ArchivedShowView';
import ShowDetailsPage from './ShowDetailsPage';
import SchedulePage from './SchedulePage';
import { COLORS } from '@utils/Colors';

const Stack = createNativeStackNavigator();

export const ScheduleStack = () => {
  const getShowDetailsOptions = ({
    route,
  }: {
    route: RouteProp<Record<string, any>, 'ShowDetails'>;
  }) => ({
    title: route.params?.show?.name || 'Show Details',
  });

  const getArchivedShowViewOptions = ({
    route,
  }: {
    route: RouteProp<Record<string, any>, 'ArchivedShowView'>;
  }) => ({
    title: route.params?.archive?.date
      ? new Date(route.params.archive.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Archived Show',
  });

  return (
    <View style={styles.gradient}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          title: 'Schedule',
          headerTintColor: COLORS.TEXT.PRIMARY,
        }}
      >
        <Stack.Screen name="ScheduleMain" component={SchedulePage} />
        <Stack.Screen
          name="ShowDetails"
          component={ShowDetailsPage}
          options={getShowDetailsOptions}
        />
        <Stack.Screen
          name="ArchivedShowView"
          component={ArchivedShowView}
          options={getArchivedShowViewOptions}
        />
      </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
});
