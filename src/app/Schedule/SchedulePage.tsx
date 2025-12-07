import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  SectionList,
  SectionListData,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { debugLog, debugError } from '@utils/Debug';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { ScheduleShow, ScheduleResponse } from '@customTypes/Schedule';
import { ScheduleService } from '@services/ScheduleService';
import { RecentlyPlayedService } from '@services/RecentlyPlayedService';
import { WmbrRouteName } from '@customTypes/Navigation';
import { COLORS, CORE_COLORS } from '@utils/Colors';
import { dayNames } from '@utils/DateTime';

const now = new Date();
const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

// Order days starting from the current day index and wrapping around.
// e.g., if today is Wednesday (index 3) the order will be [Wed, Thu, Fri, Sat, Sun, Mon, Tue]
const startDay = Math.max(0, Math.min(currentDay, dayNames.length - 1));
const daysOrder = [...dayNames.slice(startDay), ...dayNames.slice(0, startDay)];

export default function SchedulePage() {
  const navigation =
    useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  const headerHeight = useHeaderHeight();

  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [currentShowTitle, setCurrentShowTitle] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scheduleService = ScheduleService.getInstance();
  const recentlyPlayedService = RecentlyPlayedService.getInstance();

  useEffect(() => {
    const unsubscribe = recentlyPlayedService.subscribeToCurrentShow(show => {
      setCurrentShowTitle(show ?? undefined);
    });

    return unsubscribe;
  }, [recentlyPlayedService]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const scheduleData = await scheduleService.fetchSchedule();
      debugLog('Schedule data received:', scheduleData);
      setSchedule(scheduleData);
    } catch (err) {
      debugError('Error fetching schedule:', err);
      setError(
        `Failed to load schedule: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  }, [scheduleService]);

  // instead fetch once on mount
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const scheduleData = await scheduleService.fetchSchedule();
      if (scheduleData) setSchedule(scheduleData);
    } catch (err) {
      debugError('Error refreshing schedule:', err);
    } finally {
      setRefreshing(false);
    }
  }, [scheduleService]);

  const handleShowPress = async (show: ScheduleShow) => {
    try {
      // fetch show cache (xml only)
      await recentlyPlayedService.fetchShowsCacheOnly();

      // find the show from the cache
      const showWithArchiveData = recentlyPlayedService.getShowByName(
        show.name,
      );

      if (showWithArchiveData && showWithArchiveData.archives.length > 0) {
        navigation.navigate('ShowDetails' as WmbrRouteName, {
          show: showWithArchiveData,
        });
      } else {
        // If no archives found, show info message
        Alert.alert(
          show.name,
          `No archived episodes found for "${show.name}". This show may not have been archived yet or may use a different name in the archive system.`,
          [{ text: 'OK' }],
        );
      }
    } catch (err) {
      debugError('Error fetching show archives:', err);
      Alert.alert(
        'Error',
        'Unable to fetch archive data. Please try again later.',
        [{ text: 'OK' }],
      );
    }
  };

  const isCurrentShowForDay = (
    show: ScheduleShow,
    dayName: string,
  ): boolean => {
    if (!currentShowTitle) return false;

    // Match by name (case insensitive)
    const isNameMatch =
      show.name.trim().toLowerCase() === currentShowTitle.trim().toLowerCase();
    if (!isNameMatch) return false;

    // Get current day info
    const currentDayName = dayNames[currentDay];

    // For weekday shows (day=7), only highlight if we're rendering the current day and it's a weekday
    if (show.day === 7) {
      const isWeekday = currentDay >= 1 && currentDay <= 5;
      return isWeekday && dayName === currentDayName;
    } else {
      // For single-day shows, only highlight if we're rendering the current day
      return dayName === currentDayName;
    }
  };

  const getShowFrequency = (show: ScheduleShow): string => {
    // Interpret alternates field with user-friendly terms
    switch (show.alternates) {
      case 0:
        // Every week
        return show.day === 7 ? 'Weekdays' : 'Weekly';
      case 1:
      case 2:
        // Every other week (alternating weeks)
        return show.day === 7
          ? 'Weekdays (Every Other Week)'
          : 'Every Other Week';
      case 5:
      case 6:
      case 7:
      case 8:
        // Once a month (one specific week out of 4)
        return show.day === 7 ? 'Weekdays (Once a Month)' : 'Once a Month';
      default:
        // Fallback
        return show.day === 7 ? 'Weekdays' : 'Weekly';
    }
  };

  const filteredShows = useMemo(() => {
    if (!schedule) return [];

    // First filter out TBA shows
    const nonTBAShows = schedule.shows.filter(
      show => show.name.toLowerCase() !== 'tba',
    );

    // Then apply search filter if query exists
    if (!searchQuery.trim()) return nonTBAShows;

    const lowercaseQuery = searchQuery.toLowerCase().trim();
    return nonTBAShows.filter(
      show =>
        show.name.toLowerCase().includes(lowercaseQuery) ||
        show.hosts.toLowerCase().includes(lowercaseQuery) ||
        show.description.toLowerCase().includes(lowercaseQuery),
    );
  }, [schedule, searchQuery]);

  const groupedShows = scheduleService.groupShowsByDay(filteredShows);

  const scheduleViewData = daysOrder.map((day, index) => ({
    title: day,
    key: index.toString(),
    data: groupedShows[day] || [],
  }));

  const renderShow = ({ item }: { item: ScheduleShow }) => {
    const isCurrent = isCurrentShowForDay(item, item.day_str);
    return (
      <TouchableOpacity
        style={[styles.showItem, isCurrent && styles.currentShowItem]}
        onPress={() => handleShowPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.showContent}>
          <View style={styles.showMainInfo}>
            <Text
              style={[styles.showName, isCurrent && styles.currentShowName]}
              numberOfLines={1}
            >
              {item.name}
              {isCurrent && ' ● LIVE'}
            </Text>
            <Text
              style={[styles.showTime, isCurrent && styles.currentShowTime]}
            >
              {scheduleService.formatTime(item.time_str)}
            </Text>
          </View>

          {item.hosts && (
            <Text
              style={[styles.showHosts, isCurrent && styles.currentShowHosts]}
              numberOfLines={1}
            >
              with {item.hosts}
            </Text>
          )}

          <Text
            style={[
              styles.showFrequency,
              isCurrent && styles.currentShowFrequency,
            ]}
          >
            {getShowFrequency(item)}
          </Text>

          {item.description && (
            <Text
              style={[
                styles.showDescription,
                isCurrent && styles.currentShowDescription,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>

        <Icon
          name="chevron-forward"
          size={20}
          color={isCurrent ? CORE_COLORS.WMBR_GREEN : '#888'}
        />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<ScheduleShow>;
  }) => (
    <View
      style={[styles.daySection, section.key === '0' && styles.firstDaySection]}
    >
      <Text style={styles.dayHeader}>{section.title}</Text>
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.BACKGROUND.PRIMARY}
      />

      <LinearGradient
        colors={['#1a1a1a', '#0a0a0a', '#000000']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={[styles.safeArea, { paddingTop: headerHeight }]}>
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon
                name="search"
                size={16}
                color="#888"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search shows, hosts, or keywords..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Icon name="close-circle" size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.contentWrapper}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading schedule...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={fetchSchedule}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scheduleContainer}>
                {schedule?.shows?.length === 0 ? (
                  <Text style={styles.debugText}>
                    No shows were parsed from XML
                  </Text>
                ) : null}
                <SectionList
                  stickySectionHeadersEnabled={false}
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  sections={scheduleViewData}
                  keyExtractor={(item, index) => item.name + index}
                  renderItem={renderShow}
                  renderSectionHeader={renderSectionHeader}
                />
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
  contentWrapper: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.TEXT.TERTIARY,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: COLORS.TEXT.ERROR,
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scheduleContainer: {
    paddingHorizontal: 20,
  },
  daySection: {
    marginBottom: 16,
    marginTop: 24,
  },
  firstDaySection: {
    marginTop: 0,
  },
  dayHeader: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 22,
    fontWeight: 'bold',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  showItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentShowItem: {
    backgroundColor: 'rgba(0, 132, 61, 0.2)',
    borderColor: CORE_COLORS.WMBR_GREEN,
    borderWidth: 2,
  },
  showContent: {
    flex: 1,
    marginRight: 12,
  },
  showMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  showName: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  currentShowName: {
    color: CORE_COLORS.WMBR_GREEN,
    fontWeight: 'bold',
  },
  showTime: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '500',
  },
  currentShowTime: {
    color: CORE_COLORS.WMBR_GREEN,
    fontWeight: '600',
  },
  showHosts: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
    marginBottom: 4,
  },
  currentShowHosts: {
    color: COLORS.TEXT.PRIMARY,
  },
  showFrequency: {
    color: COLORS.TEXT.META,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  currentShowFrequency: {
    color: '#BBBBBB',
  },
  showDescription: {
    color: COLORS.TEXT.TERTIARY,
    fontSize: 12,
    lineHeight: 16,
  },
  currentShowDescription: {
    color: COLORS.TEXT.SECONDARY,
  },
  bottomPadding: {
    height: 100,
  },
  debugText: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
});
