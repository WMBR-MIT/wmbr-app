import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { COLORS, CORE_COLORS } from '../utils/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.7;
const PEEK_HEIGHT = 80;
const SNAP_THRESHOLD = DRAWER_HEIGHT * 0.3;

interface Song {
  id: string;
  title: string;
  artist: string;
  timestamp: string;
}

interface SongHistoryDrawerProps {
  songs: Song[];
  isVisible: boolean;
}

const SongHistoryDrawer: React.FC<SongHistoryDrawerProps> = ({ songs, isVisible }) => {
  const translateY = useSharedValue(DRAWER_HEIGHT - PEEK_HEIGHT);
  const isExpanded = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Store initial position
    })
    .onUpdate((event) => {
      const newTranslateY = event.translationY;
      
      if (newTranslateY >= 0 && newTranslateY <= DRAWER_HEIGHT - PEEK_HEIGHT) {
        translateY.value = newTranslateY;
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      
      if (velocityY > 500 || (velocityY > 0 && translationY > SNAP_THRESHOLD)) {
        translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT);
        isExpanded.value = false;
      } else if (velocityY < -500 || (velocityY < 0 && -translationY > SNAP_THRESHOLD)) {
        translateY.value = withSpring(0);
        isExpanded.value = true;
      } else {
        if (isExpanded.value) {
          translateY.value = withSpring(0);
        } else {
          translateY.value = withSpring(DRAWER_HEIGHT - PEEK_HEIGHT);
        }
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleOpacity = useAnimatedStyle(() => {
    const progress = 1 - translateY.value / (DRAWER_HEIGHT - PEEK_HEIGHT);
    return {
      opacity: progress * 0.5 + 0.5,
    };
  });

  if (!isVisible) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.drawer, animatedStyle]}>
        <Animated.View style={[styles.handle, handleOpacity]} />
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recently Played</Text>
          <Text style={styles.headerSubtitle}>Current show history</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {songs.length > 0 ? (
            songs.map((song) => (
              <View key={song.id} style={styles.songItem}>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
                <Text style={styles.songTime}>{song.timestamp}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No songs played yet</Text>
              <Text style={styles.emptySubtext}>
                Song history will appear here when streaming
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: CORE_COLORS.WMBR_GREEN,
    shadowColor: CORE_COLORS.WMBR_GREEN,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: CORE_COLORS.WMBR_GREEN,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: COLORS.TEXT.TERTIARY,
  },
  songTime: {
    fontSize: 12,
    color: CORE_COLORS.WMBR_GREEN,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SongHistoryDrawer;
