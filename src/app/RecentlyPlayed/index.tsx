import React, { useState, useCallback } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import RecentlyPlayed from './RecentlyPlayed';
import { COLORS } from '../../utils/Colors';

export default function RecentlyPlayedPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(
    () => setRefreshKey(k => k + 1),
    [setRefreshKey],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Played</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
      <RecentlyPlayed refreshKey={refreshKey} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND.SECONDARY },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingTop: 55,
    paddingBottom: 15,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.TEXT.PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  spacer: { width: 40 },
  refreshButton: { width: 40, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: COLORS.TEXT.PRIMARY, fontSize: 18 },
});
