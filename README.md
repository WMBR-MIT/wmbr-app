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

## Build and Run

### iOS
- Install iOS pods: `cd ios && bundle exec pod install`
- Copy `ios/.xcode.env` to `ios/.xcode.env.local` and modify the node path
- Open the app in Xcode:
  ```bash
  open ios/WMBRRadioApp.xcworkspace
  ```
- Build the app (⇧⌘B)
- Run iOS simulator:
  ```bash
  npm run ios -- --simulator="iPhone 16"
  ```

### Android
- Start Android emulator via Android Studio or connect physical device
- Enable USB debugging on physical devices
- Run debug build:
  ```bash
  npm run android
  ```

## Building for Release

### Android Release Setup

- Get `wmbr-upload-key.keystore` file and place in `android/` directory
- Set up signing configuration:
  ```bash
  cd android
  cp gradle-local.properties.default gradle-local.properties
  ```
- Edit `gradle-local.properties` with keystore credentials (passwords and alias)

### Build Release AAB

**Windows:**
```bash
cd android && gradlew bundleRelease
```

**macOS/Linux:**
```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Development

- **Hot reload**: Save any file to see changes instantly
- **Restart**: Press `R` in the simulator to reload
- **Debug menu**: Press `Cmd + D` in simulator for debug options

## Architecture

- **Audio Streaming**: React Native Track Player
- **State Management**: React hooks and context
- **UI**: React Native with custom animations
- **APIs**: WMBR metadata and archive services