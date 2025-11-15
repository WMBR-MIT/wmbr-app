import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@utils/Colors';

function getIconName(routeName: string) {
  switch (routeName) {
    case 'Schedule':
      return 'calendar-outline';
    case 'Recently Played':
      return 'albums-outline';
    case 'About':
      return 'information-circle-outline';
    case 'Home':
      return 'home-outline';
    default:
      return 'ellipse-outline';
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
              color={focused ? '#00D17A' : '#888'}
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
    borderTopColor: '#222',
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
    color: '#00D17A',
    fontWeight: '600',
  },
});
