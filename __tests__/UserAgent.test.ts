import { Platform } from 'react-native';
import packageJson from '../package.json';
import { getUserAgent } from '@utils/UserAgent';

// Mock Platform from react-native.
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

const version = packageJson.version;

const setPlatform = (os: 'ios' | 'android', versionValue: string | number) => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });

  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: versionValue,
  });
};

describe('getUserAgent', () => {
  beforeEach(() => {
    setPlatform('ios', '17.0');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return iOS user agent when platform is iOS', () => {
    const userAgent = getUserAgent();

    expect(userAgent).toBe(`WMBRApp/${version} (iPhone; iOS 17.0)`);
  });

  test('should return Android user agent when platform is Android', () => {
    setPlatform('android', 33);

    const userAgent = getUserAgent();

    expect(userAgent).toBe(`WMBRApp/${version} (Android; SDK 33)`);
  });

  test('should include correct SDK version for Android', () => {
    setPlatform('android', 30);

    const userAgent = getUserAgent();

    expect(userAgent).toContain('SDK 30');
  });

  test('should always include app version in user agent', () => {
    const iosUserAgent = getUserAgent();
    expect(iosUserAgent).toContain(`WMBRApp/${version}`);
  });
});
