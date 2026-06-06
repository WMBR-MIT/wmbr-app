import {
  isAlternatingShowActive,
  parsePlaylistTimestamp,
} from '@utils/DateTime';

// Mock the debugError function to avoid console noise in tests
import { debugError } from '@utils/Debug';
import { Show } from '@customTypes/RecentlyPlayed';

const mockedDebugError = debugError as jest.MockedFunction<typeof debugError>;

describe('parsePlaylistTimestamp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid timestamps', () => {
    test('should parse a valid timestamp correctly', () => {
      const result = parsePlaylistTimestamp('2024/01/15 14:30:45');
      expect(result).toEqual(new Date(2024, 0, 15, 14, 30, 45));
    });

    test('should handle single digit values correctly', () => {
      const result = parsePlaylistTimestamp('2024/1/5 9:5:3');
      expect(result).toEqual(new Date(2024, 0, 5, 9, 5, 3));
    });

    test('should handle edge case dates correctly', () => {
      const result = parsePlaylistTimestamp('2023/12/31 23:59:59');
      expect(result).toEqual(new Date(2023, 11, 31, 23, 59, 59));
    });
  });

  describe('invalid timestamps', () => {
    test('should return current date for empty string', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid playlist timestamp format:',
        '',
      );
    });

    test('should return current date for invalid format - missing time part', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('2024/01/15');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid playlist timestamp format:',
        '2024/01/15',
      );
    });

    test('should return current date for invalid format - missing date part', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('14:30:45');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid playlist timestamp format:',
        '14:30:45',
      );
    });

    test('should return current date for malformed date components', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('invalid/date/format 14:30:45');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid date components in playlist timestamp:',
        'invalid/date/format 14:30:45',
      );
    });

    test('should return current date for malformed time components', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('2024/01/15 invalid:time:format');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid date components in playlist timestamp:',
        '2024/01/15 invalid:time:format',
      );
    });

    test('should return current date for completely invalid string', () => {
      const beforeCall = new Date();
      const result = parsePlaylistTimestamp('not a timestamp at all');
      const afterCall = new Date();

      expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledWith(
        'Invalid date components in playlist timestamp:',
        'not a timestamp at all',
      );
    });

    test('should handle null or undefined gracefully', () => {
      const beforeCall = new Date();
      const result1 = parsePlaylistTimestamp(null as any);
      const result2 = parsePlaylistTimestamp(undefined as any);
      const afterCall = new Date();

      expect(result1.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result1.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(result2.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result2.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      expect(mockedDebugError).toHaveBeenCalledTimes(2);
      expect(mockedDebugError).toHaveBeenNthCalledWith(
        1,
        'Error parsing playlist timestamp:',
        null,
        expect.any(Error),
      );
      expect(mockedDebugError).toHaveBeenNthCalledWith(
        2,
        'Error parsing playlist timestamp:',
        undefined,
        expect.any(Error),
      );
    });
  });

  describe('edge cases and boundary values', () => {
    test('should handle leap year correctly', () => {
      const result = parsePlaylistTimestamp('2024/02/29 12:00:00');
      expect(result).toEqual(new Date(2024, 1, 29, 12, 0, 0));
    });

    test('should handle midnight correctly', () => {
      const result = parsePlaylistTimestamp('2024/01/15 00:00:00');
      expect(result).toEqual(new Date(2024, 0, 15, 0, 0, 0));
    });

    test('should handle whitespace around input', () => {
      const result = parsePlaylistTimestamp('  2024/01/15 14:30:45  ');
      expect(result).toEqual(new Date(2024, 0, 15, 14, 30, 45));
    });

    test('should handle extra spaces between date and time', () => {
      const result = parsePlaylistTimestamp('2024/01/15    14:30:45');
      expect(result).toEqual(new Date(2024, 0, 15, 14, 30, 45));
    });
  });
});

describe('isAlternatingShowActive', () => {
  const createShow = (alternates: number): Show => ({
    id: 'show-id',
    name: 'Test Show',
    day: 1,
    day_str: 'Monday',
    time: 0,
    time_str: '12:00 AM',
    length: 60,
    hosts: 'Test Host',
    alternates,
    archives: [],
  });

  // These UTC values line up with midnight in New York during EDT,
  // which keeps the week-boundary math stable in test environments.
  const getEasternMidnightDate = (dateString: string) =>
    new Date(`${dateString}T04:00:00Z`);

  const referenceDate = getEasternMidnightDate('2026-05-25');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns true for a non-alternating show', () => {
    const show = createShow(0);

    expect(
      isAlternatingShowActive(show, getEasternMidnightDate('2026-06-01'), null),
    ).toBe(true);
  });

  test('returns false and logs when an alternating show has no reference date', () => {
    const show = createShow(1);

    expect(
      isAlternatingShowActive(show, getEasternMidnightDate('2026-06-01'), null),
    ).toBe(false);
    expect(mockedDebugError).toHaveBeenCalledWith(
      'Reference date for alternating shows is not set.',
    );
  });

  test('treats alternates=1 as active on reference week and inactive the next week', () => {
    const show = createShow(1);

    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-05-25'),
        referenceDate,
      ),
    ).toBe(true);
    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-06-01'),
        referenceDate,
      ),
    ).toBe(false);
  });

  test('treats alternates=2 as inactive on reference week and active the next week', () => {
    const show = createShow(2);

    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-05-25'),
        referenceDate,
      ),
    ).toBe(false);
    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-06-01'),
        referenceDate,
      ),
    ).toBe(true);
  });

  test('treats alternates=5 as active on the first week of a four-week cycle', () => {
    const show = createShow(5);

    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-05-25'),
        referenceDate,
      ),
    ).toBe(true);
    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-06-01'),
        referenceDate,
      ),
    ).toBe(false);
  });

  test('treats alternates=8 as active only on the fourth week of a four-week cycle', () => {
    const show = createShow(8);

    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-06-15'),
        referenceDate,
      ),
    ).toBe(true);
    expect(
      isAlternatingShowActive(
        show,
        getEasternMidnightDate('2026-06-08'),
        referenceDate,
      ),
    ).toBe(false);
  });
});
