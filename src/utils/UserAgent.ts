import { Platform } from 'react-native';
import packageJson from '../../package.json';

/**
 * Generates a platform-specific user agent string for HTTP requests.
 * This helps servers identify iOS vs Android clients.
 *
 * Format: WMBRApp/{version} ({device}; {os})
 * Examples:
 *   - "WMBRApp/0.0.1 (iPhone; iOS 17.0)"
 *   - "WMBRApp/0.0.1 (Android; SDK 33)"
 */
export function getUserAgent(): string {
  const version = packageJson.version;
  const osVersion = Platform.Version;

  if (Platform.OS === 'ios') {
    return `WMBRApp/${version} (iPhone; iOS ${osVersion})`;
  } else {
    return `WMBRApp/${version} (Android; SDK ${osVersion})`;
  }
}
