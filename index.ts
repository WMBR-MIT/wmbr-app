/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/app';
import { name as appName } from './app.json';

import TrackPlayer from 'react-native-track-player';
import TrackPlayerService from './src/services/TrackPlayerService';

// Register the main app (App renders the navigation root)
AppRegistry.registerComponent(appName, () => App);

// Register the background audio service
TrackPlayer.registerPlaybackService(() => TrackPlayerService);
