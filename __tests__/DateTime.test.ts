import {
  getEasternCalendarDate,
  getEasternCalendarDateAtNoonUTC,
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

describe('getEasternCalendarDate', () => {
  test('changes date at Eastern midnight in standard and daylight time', () => {
    const cases = [
      { timestamp: '2026-01-06T04:59:59Z', expectedDate: '2026-01-05' },
      { timestamp: '2026-01-06T05:00:00Z', expectedDate: '2026-01-06' },
      { timestamp: '2026-07-07T03:59:59Z', expectedDate: '2026-07-06' },
      { timestamp: '2026-07-07T04:00:00Z', expectedDate: '2026-07-07' },
    ];

    for (const { timestamp, expectedDate } of cases) {
      expect(getEasternCalendarDate(new Date(timestamp))).toEqual(
        new Date(`${expectedDate}T00:00:00Z`),
      );
    }
  });

  test('preserves the Eastern date across both DST clock changes', () => {
    const cases = [
      { timestamp: '2026-03-08T06:59:59Z', expectedDate: '2026-03-08' },
      { timestamp: '2026-03-08T07:00:00Z', expectedDate: '2026-03-08' },
      { timestamp: '2026-11-01T05:59:59Z', expectedDate: '2026-11-01' },
      { timestamp: '2026-11-01T06:00:00Z', expectedDate: '2026-11-01' },
    ];

    for (const { timestamp, expectedDate } of cases) {
      expect(getEasternCalendarDate(new Date(timestamp))).toEqual(
        new Date(`${expectedDate}T00:00:00Z`),
      );
    }
  });
});

describe('getEasternCalendarDateAtNoonUTC', () => {
  test.each([
    ['2026-01-06T04:59:59Z', '2026-01-05'],
    ['2026-07-07T03:59:59Z', '2026-07-06'],
  ])('represents the Eastern date of %s at noon UTC', (timestamp, date) => {
    const input = new Date(timestamp);
    const result = getEasternCalendarDateAtNoonUTC(input);

    expect(result).toEqual(new Date(`${date}T12:00:00Z`));
    expect(getEasternCalendarDate(result)).toEqual(
      new Date(`${date}T00:00:00Z`),
    );
    expect(input).toEqual(new Date(timestamp));
  });

  test('supports calendar-day arithmetic across both DST transitions', () => {
    const cases = [
      { timestamp: '2026-03-07T12:00:00Z', nextDate: '2026-03-08' },
      { timestamp: '2026-10-31T12:00:00Z', nextDate: '2026-11-01' },
    ];

    for (const { timestamp, nextDate } of cases) {
      const result = getEasternCalendarDateAtNoonUTC(new Date(timestamp));
      result.setUTCDate(result.getUTCDate() + 1);

      expect(getEasternCalendarDate(result)).toEqual(
        new Date(`${nextDate}T00:00:00Z`),
      );
    }
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

  // Dates represent weeks 1-4, with week 1 beginning on the reference date.
  const cycleDates = ['2026-05-25', '2026-06-01', '2026-06-08', '2026-06-15'];

  test.each([
    { alternates: 1, expectedActiveWeeks: [true, false, true, false] },
    { alternates: 2, expectedActiveWeeks: [false, true, false, true] },
    { alternates: 5, expectedActiveWeeks: [true, false, false, false] },
    { alternates: 6, expectedActiveWeeks: [false, true, false, false] },
    { alternates: 7, expectedActiveWeeks: [false, false, true, false] },
    { alternates: 8, expectedActiveWeeks: [false, false, false, true] },
  ])(
    'selects the correct weeks for alternates=$alternates across four weeks',
    ({ alternates, expectedActiveWeeks }) => {
      const show = createShow(alternates);
      const activeWeeks = cycleDates.map(date =>
        isAlternatingShowActive(
          show,
          getEasternMidnightDate(date),
          referenceDate,
        ),
      );

      expect(activeWeeks).toEqual(expectedActiveWeeks);
    },
  );
});
