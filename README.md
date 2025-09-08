# WMBR Radio App

A React Native app for streaming WMBR 88.1 FM and browsing show archives, song history, and schedules.

## Features

- **Live Stream**: Listen to WMBR 88.1 FM with live show information
- **Song History**: Browse recently played songs with Apple Music previews
- **Show Archives**: Access and play archived shows
- **Schedule**: View weekly show schedule with current show highlighting
- **Show Information**: See current hosts, descriptions, and show frequency

## Quick Start

### Prerequisites
- Complete the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- Install dependencies: `npm install`
- Install iOS pods: `cd ios && pod install`

### Run the App
```bash
npm run ios -- --simulator="iPhone 16"
```

That's it! The app will launch in the iPhone 16 simulator.

## Development

- **Hot reload**: Save any file to see changes instantly
- **Restart**: Press `R` in the simulator to reload
- **Debug menu**: Press `Cmd + D` in simulator for debug options

## Architecture

- **Audio Streaming**: React Native Track Player
- **State Management**: React hooks and context
- **UI**: React Native with custom animations
- **APIs**: WMBR metadata and archive services