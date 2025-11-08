import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { debugLog, debugError } from '../utils/Debug';
import { RefreshControl } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { SvgXml } from 'react-native-svg';
import { ScheduleShow, ScheduleResponse } from '../types/Schedule';
import { ScheduleService } from '../services/ScheduleService';
import { getWMBRLogoSVG } from '../utils/WMBRLogo';
import { RecentlyPlayedService } from '../services/RecentlyPlayedService';
import { WmbrRouteName } from '../types/Navigation';
import { COLORS, CORE_COLORS } from '../utils/Colors';

interface SchedulePageProps {
  currentShow?: string;
}

export default function SchedulePage({ currentShow }: SchedulePageProps) { 

  const navigation = useNavigation<NavigationProp<Record<WmbrRouteName, object | undefined>>>();

  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const currentShowRef = useRef<View>(null);

  const scheduleService = ScheduleService.getInstance();

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const scheduleData = await scheduleService.fetchSchedule();
      debugLog('Schedule data received:', scheduleData);
      setSchedule(scheduleData);
    } catch (err) {
      debugError('Error fetching schedule:', err);
      setError(`Failed to load schedule: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      // Fetch archives for this show from the recently played service
      const recentlyPlayedService = RecentlyPlayedService.getInstance();

      // fetch show cache (xml only)
      await recentlyPlayedService.fetchShowsCacheOnly();

      // find the show from the cache
      const showWithArchiveData = recentlyPlayedService.getShowByName(show.name);

      if (showWithArchiveData && showWithArchiveData.archives.length > 0) {
        navigation.navigate('ShowDetails' as WmbrRouteName, { show: showWithArchiveData });
      } else {
        // If no archives found, show info message
        Alert.alert(
          show.name,
          `No archived episodes found for "${show.name}". This show may not have been archived yet or may use a different name in the archive system.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      debugError('Error fetching show archives:', err);
      Alert.alert(
        'Error',
        'Unable to fetch archive data. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const isCurrentShowForDay = (show: ScheduleShow, dayName: string): boolean => {
    if (!currentShow) return false;
    
    // Match by name (case insensitive)
    const isNameMatch = show.name.toLowerCase() === currentShow.toLowerCase();
    if (!isNameMatch) return false;
    
    // Get current day info
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay];
    
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
        return show.day === 7 ? 'Weekdays (Every Other Week)' : 'Every Other Week';
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

  const renderShowsByDay = () => {
    if (!schedule) {
      return null;
    }

    const filteredShows = filterShows(schedule.shows, searchQuery);
    const groupedShows = scheduleService.groupShowsByDay(filteredShows);
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return daysOrder.map(day => {
      const dayShows = groupedShows[day];
      if (!dayShows || dayShows.length === 0) return null;

      return (
        <View key={day} style={styles.daySection}>
          <Text style={styles.dayHeader}>{day}</Text>
          {dayShows.map((show, index) => {
            const isCurrent = isCurrentShowForDay(show, day);
            return (
              <TouchableOpacity
                key={`${show.id}-${index}`}
                style={[
                  styles.showItem,
                  isCurrent && styles.currentShowItem
                ]}
                onPress={() => handleShowPress(show)}
                activeOpacity={0.7}
                ref={isCurrent ? currentShowRef : null}
              >
                <View style={styles.showContent}>
                  <View style={styles.showMainInfo}>
                    <Text style={[
                      styles.showName,
                      isCurrent && styles.currentShowName
                    ]} numberOfLines={1}>
                      {show.name}
                      {isCurrent && ' ● LIVE'}
                    </Text>
                    <Text style={[
                      styles.showTime,
                      isCurrent && styles.currentShowTime
                    ]}>
                      {scheduleService.formatTime(show.time_str)}
                    </Text>
                  </View>
                  
                  {show.hosts && (
                    <Text style={[
                      styles.showHosts,
                      isCurrent && styles.currentShowHosts
                    ]} numberOfLines={1}>
                      with {show.hosts}
                    </Text>
                  )}
                  
                  <Text style={[
                    styles.showFrequency,
                    isCurrent && styles.currentShowFrequency
                  ]}>
                    {getShowFrequency(show)}
                  </Text>
                  
                  {show.description && (
                    <Text style={[
                      styles.showDescription,
                      isCurrent && styles.currentShowDescription
                    ]} numberOfLines={2}>
                      {show.description}
                    </Text>
                  )}
                </View>
                
                <Icon 
                  name="chevron-forward" 
                  size={20} 
                  color={isCurrent ? CORE_COLORS.WMBR_GREEN : "#888"} 
                />
              </TouchableOpacity>
            );
          })}
        </View>
      );
    });
  };


  const filterShows = (shows: ScheduleShow[], query: string): ScheduleShow[] => {
    // First filter out TBA shows
    const nonTBAShows = shows.filter(show => 
      show.name.toLowerCase() !== 'tba'
    );
    
    // Then apply search filter if query exists
    if (!query.trim()) return nonTBAShows;
    
    const lowercaseQuery = query.toLowerCase().trim();
    return nonTBAShows.filter(show => 
      show.name.toLowerCase().includes(lowercaseQuery) ||
      show.hosts.toLowerCase().includes(lowercaseQuery) ||
      show.description.toLowerCase().includes(lowercaseQuery)
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND.PRIMARY} />
      
      <LinearGradient
        colors={['#1a1a1a', '#0a0a0a', '#000000']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <SvgXml xml={getWMBRLogoSVG('#FFFFFF')} width={60} height={13} />
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={16} color="#888" style={styles.searchIcon} />
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
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Icon name="close-circle" size={16} color="#888" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading schedule...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchSchedule} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scheduleContainer}>
                {schedule?.shows.length === 0 ? (
                  <Text style={styles.debugText}>No shows were parsed from XML</Text>
                ) : null}
                {renderShowsByDay()}
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1002,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  scrollView: {
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
    marginBottom: 32,
  },
  dayHeader: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  stickyDayHeader: {
    backgroundColor: COLORS.BACKGROUND.ELEVATED,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dayHeaderSticky: {
    color: COLORS.TEXT.PRIMARY,
    fontSize: 20,
    fontWeight: 'bold',
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
    color: '#999',
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

