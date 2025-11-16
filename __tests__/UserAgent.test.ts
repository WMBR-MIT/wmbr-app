import { Platform } from 'react-native';
import { getUserAgent } from '../src/utils/UserAgent';

// Mock Platform from react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

describe('getUserAgent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return iOS user agent when platform is iOS', () => {
    (Platform as any).OS = 'ios';
    (Platform as any).Version = '17.0';

    const userAgent = getUserAgent();

    expect(userAgent).toBe('WMBRApp/0.0.1 (iOS; iPhone)');
  });

  test('should return Android user agent when platform is Android', () => {
    (Platform as any).OS = 'android';
    (Platform as any).Version = 33;

    const userAgent = getUserAgent();

    expect(userAgent).toBe('WMBRApp/0.0.1 (Android; SDK 33)');
  });

  test('should include correct SDK version for Android', () => {
    (Platform as any).OS = 'android';
    (Platform as any).Version = 30;

    const userAgent = getUserAgent();

    expect(userAgent).toContain('SDK 30');
  });

  test('should always include app version in user agent', () => {
    const iosUserAgent = getUserAgent();
    expect(iosUserAgent).toContain('WMBRApp/0.0.1');
  });
});
