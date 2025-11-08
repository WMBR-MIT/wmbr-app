import React, { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import RecentlyPlayed from './RecentlyPlayed';
import { COLORS, CORE_COLORS } from '../utils/Colors';

const { height: screenHeight } = Dimensions.get('window');
const DRAWER_HEIGHT = screenHeight * 0.8;
const HANDLE_HEIGHT = 20;
const PEEK_HEIGHT = 100; // How much of the drawer shows when collapsed

export default function RecentlyPlayedDrawer() {  
  // Animation values - start in peeking position
  const translateY = useSharedValue(DRAWER_HEIGHT - PEEK_HEIGHT);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // When the screen regains focus, ensure the drawer snaps to the peek position
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      // animate to peek position when returning to the screen
      translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT);
    }
  }, [isFocused, translateY]);

  // Load playlist data when drawer becomes visible
  useEffect(() => {
    if (isDrawerOpen) {
      handleRefresh();
    }
  }, [isDrawerOpen]);

  const handleDrawerInteraction = (isOpening: boolean) => {
    setIsDrawerOpen(isOpening);
  };

  const handleRefresh = () => {
    // increment refreshKey to notify RecentlyPlayed component to refresh
    setRefreshKey(k => k + 1);
  };

   const startPosition = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Store the initial position when gesture starts
      startPosition.value = translateY.value;
    })
    .onUpdate((event) => {
      // Calculate new position based on initial position + translation
      const newY = startPosition.value + event.translationY;
      translateY.value = Math.max(0, Math.min(DRAWER_HEIGHT - PEEK_HEIGHT, newY));
    })
    .onEnd((event) => {
      const currentPosition = translateY.value;
      const isExpanded = currentPosition < (DRAWER_HEIGHT - PEEK_HEIGHT) / 2;
      
      if (event.translationY > 0 && event.velocityY > 300) {
        // Swiping down fast - collapse
        translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT);
        runOnJS(handleDrawerInteraction)(false);
      } else if (event.translationY < 0 && event.velocityY < -300) {
        // Swiping up fast - expand
        translateY.value = withSpring(0);
        runOnJS(handleDrawerInteraction)(true);
      } else {
        // Snap to nearest position based on current position
        if (isExpanded) {
          translateY.value = withSpring(0); // Fully expanded
          runOnJS(handleDrawerInteraction)(true);
        } else {
          translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT); // Peeking
          runOnJS(handleDrawerInteraction)(false);
        }
      }
    });

  const drawerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, DRAWER_HEIGHT - PEEK_HEIGHT],
      [0.5, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <>
      {/* Background overlay - only show when expanded */}
      <Animated.View 
        style={[styles.overlay, backgroundAnimatedStyle]}
        pointerEvents="none"
      />
      
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.drawer, drawerAnimatedStyle]}>
          <View style={styles.handle} />          
          <View style={styles.peekHeader}>
            <Text style={styles.peekHeaderTitle}>Recently Played</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>↻</Text>
              </TouchableOpacity>
              <Text style={styles.dragHint}>▲</Text>
            </View>
          </View>
          <View style={styles.recentlyPlayedWrapper}>
            <RecentlyPlayed
              refreshKey={refreshKey}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  recentlyPlayedWrapper: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    zIndex: 998,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 999,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  peekHeader: {
    height: PEEK_HEIGHT - HANDLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  peekHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: CORE_COLORS.WMBR_GREEN,
  },
  dragHint: {
    fontSize: 16,
    color: '#888',
    fontWeight: 'bold',
  },
});
