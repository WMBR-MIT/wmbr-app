import { ScheduleService } from '../src/services/ScheduleService';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;

  beforeEach(() => {
    scheduleService = ScheduleService.getInstance();
  });

  describe('formatTime', () => {
    test('should format midnight (0 minutes) as 12:00am', () => {
      expect(scheduleService.formatTime(0)).toBe('12:00am');
    });

    test('should format noon (720 minutes) as 12:00pm', () => {
      expect(scheduleService.formatTime(720)).toBe('12:00pm');
    });

    test('should format 6:00am (360 minutes)', () => {
      expect(scheduleService.formatTime(360)).toBe('6:00am');
    });

    test('should format 4:00pm (960 minutes)', () => {
      expect(scheduleService.formatTime(960)).toBe('4:00pm');
    });

    test('should format 10:00am (600 minutes)', () => {
      expect(scheduleService.formatTime(600)).toBe('10:00am');
    });

    test('should format 9:00pm (1260 minutes)', () => {
      expect(scheduleService.formatTime(1260)).toBe('9:00pm');
    });

    test('should format times with non-zero minutes correctly', () => {
      expect(scheduleService.formatTime(690)).toBe('11:30am'); // 11:30am
      expect(scheduleService.formatTime(795)).toBe('1:15pm'); // 1:15pm
    });

    test('should handle 1:00am (60 minutes)', () => {
      expect(scheduleService.formatTime(60)).toBe('1:00am');
    });

    test('should handle 11:59pm (1439 minutes)', () => {
      expect(scheduleService.formatTime(1439)).toBe('11:59pm');
    });
  });
});
