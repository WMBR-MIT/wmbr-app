import { Platform } from 'react-native';
import packageJson from '../../package.json';

/**
 * Generates a platform-specific user agent string for HTTP requests.
 * This helps servers identify iOS vs Android clients.
 *
 * Format: WMBRApp/{version} ({platform}; {os})
 * Examples:
 *   - "WMBRApp/0.0.1 (iOS; iPhone)"
 *   - "WMBRApp/0.0.1 (Android; SDK 33)"
 */
export function getUserAgent(): string {
  const version = packageJson.version;
  const osVersion = Platform.Version;

  if (Platform.OS === 'ios') {
    return `WMBRApp/${version} (iOS; iPhone)`;
  } else {
    return `WMBRApp/${version} (Android; SDK ${osVersion})`;
  }
}
