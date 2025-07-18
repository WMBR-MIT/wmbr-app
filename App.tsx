/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import TrackPlayer, { Capability } from 'react-native-track-player';
// import { NewAppScreen } from '@react-native/new-app-screen';

const streamUrl = 'https://wmbr.org:8002/hi';

export default function App() {
  // const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    async function setup() {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });

      await TrackPlayer.add({
        id: 'stream',
        url: streamUrl,
        title: 'Live Stream',
        artist: 'WMBR 88.1 FM',
        artwork: require('./assets/cover.png'),
      });
    }

    setup();

    return () => {
      TrackPlayer.reset();
    };
  }, []);


  const play = () => TrackPlayer.play();
  const pause = () => TrackPlayer.pause();

  return (
    <View style={styles.container}>
      {/* <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NewAppScreen templateFileName="App.tsx" /> */}
      <Text style={styles.title}>Live Radio Player</Text>
      <Button title="Play" onPress={play} />
      <Button title="Pause" onPress={pause} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  title: {
    fontSize: 20, marginBottom: 20,
  },
});
