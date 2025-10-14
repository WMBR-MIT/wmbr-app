import React from 'react';
import { View, SafeAreaView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RecentlyPlayed from '../components/RecentlyPlayed';

export default function RecentlyPlayedPage() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingTop: 30,
  },
  backButton: { padding: 8 },
  backText: { color: '#fff', fontSize: 20 },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: '600' },
  spacer: { width: 40 },
});
