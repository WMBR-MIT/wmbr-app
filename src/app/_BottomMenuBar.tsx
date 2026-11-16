import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, CORE_COLORS } from '@utils/Colors';
import Icon, { IconName } from '@components/Icon';

function getIconName(routeName: string): IconName {
  switch (routeName) {
    case 'Home':
      return {
        ios: 'music.note.house',
        android: 'home',
      };
    case 'Recently Played':
      return {
        ios: 'music.note.list',
        android: 'queue-music',
      };
    case 'Schedule':
      return {
        ios: 'calendar',
        android: 'calendar-month',
      };
    case 'About':
      return {
        ios: 'info.circle',
        android: 'info',
      };
    default:
      return {
        ios: 'questionmark.circle',
        android: 'help',
      };
  }
}

export default function BottomMenuBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const activeIndex = state.index;
  const insets = useSafeAreaInsets();

  const bottomSpacing = Math.max(insets.bottom, 8);
  const heightSpacing = 72 + bottomSpacing;

  const containerInline = useMemo(
    () => ({ paddingBottom: bottomSpacing, height: heightSpacing }),
    [bottomSpacing, heightSpacing],
  );

  return (
    <View style={[styles.container, containerInline]}>
      {state.routes.map((route, idx) => {
        const focused = idx === activeIndex;
        const iconName = getIconName(route.name);

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.8}
          >
            <Icon
              name={iconName}
              size={22}
              color={focused ? CORE_COLORS.GREEN_500 : '#888'}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.SUBTLE,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 12,
    marginTop: 2,
  },
  labelActive: {
    color: CORE_COLORS.GREEN_500,
    fontWeight: '600',
  },
});
