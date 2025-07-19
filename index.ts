/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import TrackPlayer from 'react-native-track-player';
import TrackPlayerService from './TrackPlayerService';

// Register the main app
AppRegistry.registerComponent(appName, () => App);

// Register the background audio service
TrackPlayer.registerPlaybackService(() => TrackPlayerService);