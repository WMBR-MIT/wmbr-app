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

## Upgrading React Native

Upgrade one minor version at a time. Skipping versions makes the native diffs
harder to review.

1. Find the target version in the
   [React Native releases overview](https://reactnative.dev/releases/overview).
2. Look up the changes between your current and target versions in the
   [Upgrade Helper](https://react-native-community.github.io/upgrade-helper/).
   It shows the native file diffs to apply and the steps to follow.
3. Align the JavaScript dependencies with Microsoft's
   [`@rnx-kit/align-deps`](https://www.npmjs.com/package/@rnx-kit/align-deps),
   which the Upgrade Helper instructions also use. For example:
   ```bash
   npx @rnx-kit/align-deps@latest --requirements react-native@0.86
   npx @rnx-kit/align-deps@latest --requirements react-native@0.86 --write
   ```
   Review the proposed changes before running `--write`, then run
   `npm install`.
4. Update the React Native pods, which are pinned in `ios/Podfile.lock`:
   ```bash
   cd ios && pod update React-Core-prebuilt --no-repo-update
   ```
   If other React Native pods still show the old version, delete
   `ios/Podfile.lock` and run `pod install --no-repo-update` instead.
5. Check that `ios/Podfile.lock` lists the new version for the React Native
   pods.
6. Build and run both apps, then fix any native breakage the Upgrade Helper
   flagged.
7. Commit `package.json`, `package-lock.json`, `ios/Podfile.lock`, and any
   changed native files together.

## Building for Release

### Bump the version number

```bash
npx react-native bump-version --type (patch|minor|major)
```

Add a new tag for the release:

```bash
git tag vX.Y.Z
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

### Android Studio

If the Android app won't build, with the message "INSTALL_FAILED_VERSION_DOWNGRADE: Downgrade detected", try uninstalling the existing app:

```bash
adp uninstall com.wmbrapp
```

If there are some Gradle package errors, try cleaning the Gradle cache:

```bash
cd android && ./gradlew clean
```

Delete the `autolinking` directory:

```bash
rm -rf android/app/build/generated/autolinking
```

Then click the elephant icon ("Sync Project with Gradle Files").

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
