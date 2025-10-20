import React, { use, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function BottomMenuBar({ state, navigation }: BottomTabBarProps) {
  const activeIndex = state.index;
  const insets = useSafeAreaInsets();

  const bottomSpacing = useMemo(
    () => Math.max(insets.bottom, 8),
    [insets.bottom]
  );

  const heightSpacing = useMemo(() => 72 + bottomSpacing, [bottomSpacing]);

  return (
    <View style={[styles.container, { paddingBottom: bottomSpacing, height: heightSpacing }]}> 
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
            <Icon name={iconName} size={22} color={focused ? '#00D17A' : '#888'} />
            <Text style={[styles.label, focused && styles.labelActive]}>{route.name}</Text>
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
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  labelActive: {
    color: '#00D17A',
    fontWeight: '600',
  },
});
