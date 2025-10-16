import React, { useState } from 'react';
import { View, SafeAreaView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import RecentlyPlayed from '../components/RecentlyPlayed';

export default function RecentlyPlayedPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Played</Text>
        <TouchableOpacity onPress={() => setRefreshKey(k => k + 1)} style={styles.refreshButton}>
          <Text style={styles.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
      <RecentlyPlayed refreshKey={refreshKey} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingTop: 55,
    paddingBottom: 15,
  },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '700' },
  spacer: { width: 40 },
  refreshButton: { width: 40, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#fff', fontSize: 18 },
});
