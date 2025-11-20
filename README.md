# WMBR Radio App

A React Native app for streaming WMBR 88.1 FM and browsing show archives, song history, and schedules.

You can download the latest release from the [Apple](https://apps.apple.com/app/wmbr/id6749026414) and [Google Play](https://apps.apple.com/app/wmbr/id6749026414) mobile app stores.

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
- Start the server:
  ```bash
  npm start
  ```

## Build and Run

### iOS
- Install iOS pods: `bundle install && cd ios && bundle exec pod install`
    - If `bundle exec pod install` fails, try `pod install`
- Copy `ios/.xcode.env` to `ios/.xcode.env.local` and modify the node path
- Open the app in Xcode:
  ```bash
  open ios/WmbrApp.xcworkspace
  ```
- Build the app (⇧⌘B)
- Start the simulator with:
  ```bash
  npm run ios -- --simulator="iPhone 16" # "iPhone 17" if you're on macOS / Xcode 26
  ```

### Android
- Start Android emulator via Android Studio or connect physical device
- Enable USB debugging on physical devices
- Run debug build:
  ```bash
  npm run android
  ```

## Building for Release

### Bump the version number

```bash
npx react-native bump-version --type (patch|minor|major)
```

Tag the current HEAD of `main` branch with the new version number.

```bash
git tag vX.Y.Z
git push origin --tags
```

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
- **Path aliases**: Path aliases must be set up in both `tsconfig.json` and
    `babel.config.js`

## Troubleshooting

### General Issues

1. Clear Metro cache:
  ```bash
  npm start -- --reset-cache
  ```

### Kotlin 2.1.x Compatibility Fix

This project uses a patch-package solution to fix compatibility issues between `react-native-track-player` and Kotlin 2.1.x. The original package had TurboModule compatibility issues with newer Kotlin versions causing build failures.

**Solution Steps**: 
1. Modified the problematic Kotlin files in `node_modules/react-native-track-player/`
2. Generated the patch file using `npx patch-package react-native-track-player`
3. Patches are automatically applied during `npm install` via the `postinstall` script
4. No manual intervention required - the fixes are version controlled in the `patches/` directory

**Modifications made to react-native-track-player:**

**In `MusicModule.kt`:**
- Added a wrapper function `launchInScope()` to fix coroutine scope issues with Kotlin 2.1.x
- Replaced all `scope.launch` calls with `launchInScope` calls  
- Fixed nullable bundle handling by adding `?: Bundle()` fallbacks
- Changed all `return@launch` to `return@launchInScope` for consistency

**In `MusicService.kt`:**
- Fixed the `onBind()` method signature to handle nullable Intent parameter properly

**If you encounter build errors with react-native-track-player:**
- Ensure patches are applied: `npx patch-package`
- Check that `patches/react-native-track-player+4.1.1.patch` exists
- Verify `postinstall` script is in package.json

## Architecture

- **State Management**: React hooks and context
- **UI**: React Native with custom animations
- **APIs**: WMBR metadata and archive services
