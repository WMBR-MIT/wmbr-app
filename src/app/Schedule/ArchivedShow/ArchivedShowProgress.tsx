import { View, Text, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';
import PlaybackSlider from '@components/PlaybackSlider';
import { COLORS } from '@utils/Colors';
import { secondsToTime } from '@utils/DateTime';

export const ArchivedShowProgress = () => {
  const progress = useProgress();

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressContainer}>
        <PlaybackSlider style={styles.slider} />

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {secondsToTime(progress.position)}
          </Text>
          <Text style={styles.timeText}>
            {secondsToTime(progress.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 300,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
