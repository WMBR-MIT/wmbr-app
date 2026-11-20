import { StyleSheet, View, useColorScheme } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ArchivedShowView from './ArchivedShowView';
import ShowDetailsPage from './ShowDetailsPage';
import SchedulePage from './SchedulePage';
import { Platform } from 'react-native';
import { COLORS, CORE_COLORS } from '@utils/Colors';

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

  const colorScheme = useColorScheme();

  return (
    <View style={styles.gradient}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTransparent: true,
          // Android doesn't do header blur effects, so it needs a solid
          // background color
          ...(Platform.OS === 'android' && {
            headerStyle: {
              backgroundColor:
                colorScheme === 'dark' ? CORE_COLORS.BLACK : CORE_COLORS.WHITE,
            },
          }),
          title: 'Schedule',
          headerTintColor:
            colorScheme === 'dark' ? CORE_COLORS.WHITE : CORE_COLORS.BLACK,
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
