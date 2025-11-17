import { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ArchivedShowView from './ArchivedShowView';
import ShowDetailsPage from './ShowDetailsPage';
import SchedulePage from './SchedulePage';

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
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        title: 'Schedule',
        headerTintColor: '#ffffff',
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
  );
};
