import { ScheduleService } from '../src/services/ScheduleService';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;

  beforeEach(() => {
    scheduleService = ScheduleService.getInstance();
  });

  describe('formatTime', () => {
    test('should convert 12:00m to 12:00am (midnight)', () => {
      expect(scheduleService.formatTime('12:00m')).toBe('12:00am');
    });

    test('should convert 12:00n to 12:00pm (noon)', () => {
      expect(scheduleService.formatTime('12:00n')).toBe('12:00pm');
    });

    test('should not change other time formats with "a" suffix', () => {
      expect(scheduleService.formatTime('6:00a')).toBe('6:00a');
      expect(scheduleService.formatTime('10:00a')).toBe('10:00a');
    });

    test('should not change other time formats with "p" suffix', () => {
      expect(scheduleService.formatTime('4:00p')).toBe('4:00p');
      expect(scheduleService.formatTime('9:00p')).toBe('9:00p');
    });

    test('should handle empty string', () => {
      expect(scheduleService.formatTime('')).toBe('');
    });

    test('should not modify time strings that do not match midnight or noon', () => {
      expect(scheduleService.formatTime('11:30a')).toBe('11:30a');
      expect(scheduleService.formatTime('1:00p')).toBe('1:00p');
    });
  });
});
