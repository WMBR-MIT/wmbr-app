import React from 'react';
import { View, SafeAreaView, Text, StyleSheet } from 'react-native';
import RecentlyPlayed from '../components/RecentlyPlayed';

export default function RecentlyPlayedPage() {

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Played</Text>
        <View style={styles.spacer} />
      </View>
      <RecentlyPlayed />
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
});
