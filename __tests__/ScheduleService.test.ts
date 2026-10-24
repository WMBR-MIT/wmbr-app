import { ScheduleService } from '@services/ScheduleService';
import { debugError } from '@utils/Debug';
import { ScheduleShow } from '@customTypes/Schedule';
import { createMockFetch } from '../__mocks__/MockNetworkResponses';

// The XML season starts Monday: May 25-31 is week 1, June 1-7 is week 2.
// These are synthetic entries, not a claim about the current live schedule.
const scheduleXml = `
<wmbr_schedule season_start="Mon, 25 May 2026 14:00:00 GMT" daystart="240">
${[
  { id: 'weekly', day: 1, time: 600, alternates: 0 },
  { id: 'weekday-week-1', day: 7, time: 720, alternates: 1 },
  { id: 'weekday-week-2', day: 7, time: 720, alternates: 2 },
  { id: 'sunday-night-week-1', day: 0, time: 60, alternates: 1 },
  { id: 'sunday-night-week-2', day: 0, time: 60, alternates: 2 },
  { id: 'sunday-cycle-week-1', day: 0, time: 780, alternates: 1 },
  { id: 'sunday-cycle-week-2', day: 0, time: 780, alternates: 2 },
  { id: 'monday-4am-week-2', day: 1, time: 240, alternates: 2 },
  { id: 'monthly-week-1', day: 1, time: 900, alternates: 5 },
  { id: 'monthly-week-2', day: 1, time: 900, alternates: 6 },
]
  .map(
    show => `<show id="${show.id}">
      <name>${show.id}</name>
      <day>${show.day}</day>
      <time>${show.time}</time>
      <alternates>${show.alternates}</alternates>
    </show>`,
  )
  .join('\n')}
</wmbr_schedule>`;

describe('ScheduleService calendar-day filtering', () => {
  let scheduleService: ScheduleService;
  let scheduleShows: ScheduleShow[];

  beforeEach(async () => {
    jest.mocked(fetch).mockImplementation(createMockFetch({ scheduleXml }));
    scheduleService = new ScheduleService();
    const schedule = await scheduleService.fetchSchedule();
    scheduleShows = schedule.shows;
  });

  afterEach(() => {
    jest.mocked(fetch).mockImplementation(createMockFetch());
  });

  test.each([
    ['2026-05-30T03:59:59Z', 'Friday'],
    ['2026-05-30T04:00:00Z', 'Saturday'],
  ])(
    'starts seven consecutive days at the Eastern date of %s',
    (timestamp, day) => {
      const days = scheduleService.getRollingScheduleDays(
        scheduleShows,
        new Date(timestamp),
      );

      expect(days.map(scheduleDay => scheduleDay.dayName)).toEqual(
        day === 'Friday'
          ? [
              'Friday',
              'Saturday',
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
            ]
          : [
              'Saturday',
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
            ],
      );
    },
  );

  test('returns all seven empty days without requiring a season start', () => {
    jest.mocked(debugError).mockClear();
    const serviceWithoutSeasonStart = new ScheduleService();
    const days = serviceWithoutSeasonStart.getRollingScheduleDays(
      [],
      new Date('2026-05-30T12:00:00Z'),
    );

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ dayName: 'Saturday', shows: [] });
    expect(days.every(day => day.shows.length === 0)).toBe(true);
    expect(debugError).not.toHaveBeenCalled();
  });

  test.each([
    ['Friday', '2026-05-29T16:00:00Z'],
    ['Monday after the shows have aired', '2026-06-02T03:00:00Z'],
  ])('uses the next Monday occurrence when viewed on %s', (_, timestamp) => {
    const days = scheduleService.getRollingScheduleDays(
      scheduleShows,
      new Date(timestamp),
    );
    const mondayShows = days.find(day => day.dayName === 'Monday')?.shows;

    expect(mondayShows?.map(show => show.id)).toEqual([
      'sunday-night-week-1',
      'monday-4am-week-2',
      'weekly',
      'weekday-week-2',
      'monthly-week-2',
    ]);
  });

  test.each([
    ['spring forward', 'Mon, 02 Mar 2026 15:00:00 GMT', '2026-03-08T04:30:00Z'],
    ['fall back', 'Mon, 26 Oct 2026 14:00:00 GMT', '2026-10-31T04:30:00Z'],
  ])(
    'keeps rolling dates and overnight cycles correct across %s',
    async (_, seasonStart, timestamp) => {
      jest.mocked(fetch).mockImplementation(
        createMockFetch({
          scheduleXml: scheduleXml.replace(
            'Mon, 25 May 2026 14:00:00 GMT',
            seasonStart,
          ),
        }),
      );
      const schedule = await scheduleService.fetchSchedule();
      const days = scheduleService.getRollingScheduleDays(
        schedule.shows,
        new Date(timestamp),
      );

      expect(days.map(day => day.dayName)).toEqual([
        'Saturday',
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
      ]);
      expect(days[1].shows.map(show => show.id)).toEqual([
        'sunday-cycle-week-1',
      ]);
      expect(days[2].shows.map(show => show.id)).toEqual([
        'sunday-night-week-1',
        'monday-4am-week-2',
        'weekly',
        'weekday-week-2',
        'monthly-week-2',
      ]);
    },
  );

  test('filters expanded weekday entries separately across a week boundary', () => {
    const days = scheduleService.getRollingScheduleDays(
      scheduleShows,
      new Date('2026-05-29T12:00:00Z'),
    );
    const fridayShows = days[0].shows;
    const mondayShows = days[3].shows;

    expect(fridayShows.map(show => show.id)).toEqual(['weekday-week-1']);
    expect(mondayShows.map(show => show.id)).toContain('weekday-week-2');
    expect(mondayShows.map(show => show.id)).not.toContain('weekday-week-1');
  });

  test.each([
    ['2026-10-11', '2026-10-12', 1, 2],
    ['2026-10-18', '2026-10-19', 2, 1],
    ['2026-10-25', '2026-10-26', 1, 2],
  ])(
    'uses the XML season anchor for Sunday %s and the following Monday',
    async (sundayDate, mondayDate, sundayWeek, mondayWeek) => {
      // Match the live season's date relationships without real show names.
      jest.mocked(fetch).mockImplementation(
        createMockFetch({
          scheduleXml: scheduleXml.replace(
            'Mon, 25 May 2026 14:00:00 GMT',
            'Mon, 05 Oct 2026 14:00:00 GMT',
          ),
        }),
      );
      const schedule = await scheduleService.fetchSchedule();
      const sundayShows = scheduleService.getRollingScheduleDays(
        schedule.shows,
        new Date(`${sundayDate}T12:00:00Z`),
      )[0].shows;
      const mondayShows = scheduleService.getRollingScheduleDays(
        schedule.shows,
        new Date(`${mondayDate}T12:00:00Z`),
      )[0].shows;

      expect(sundayShows.map(show => show.id)).toEqual([
        `sunday-cycle-week-${sundayWeek}`,
      ]);
      expect(mondayShows.map(show => show.id)).toContain(
        `weekday-week-${mondayWeek}`,
      );
      expect(mondayShows.map(show => show.id)).not.toContain(
        `weekday-week-${3 - mondayWeek}`,
      );
    },
  );

  test("keeps 1am Monday under Monday but uses Sunday's broadcast cycle", () => {
    const days = scheduleService.getRollingScheduleDays(
      scheduleShows,
      new Date('2026-05-31T12:00:00Z'),
    );
    const sundayShows = days[0].shows;
    const mondayShows = days[1].shows;

    expect(sundayShows.map(show => show.id)).toEqual(['sunday-cycle-week-1']);
    expect(mondayShows.map(show => show.id)).toContain('sunday-night-week-1');
    expect(mondayShows.map(show => show.id)).not.toContain(
      'sunday-night-week-2',
    );
    // The cutoff itself belongs to Monday's new broadcast day.
    expect(mondayShows.map(show => show.id)).toContain('monday-4am-week-2');
  });

  test('uses the XML cutoff even when it differs from 4am', async () => {
    // At a 1am cutoff, these 1am slots belong to Monday's broadcast day.
    // Tag them Monday in the XML so their calendar-day grouping stays Monday.
    const scheduleWithEarlierCutoff = scheduleXml
      .replace('daystart="240"', 'daystart="60"')
      .replace(/<day>0<\/day>/g, '<day>1</day>');

    jest
      .mocked(fetch)
      .mockImplementation(
        createMockFetch({ scheduleXml: scheduleWithEarlierCutoff }),
      );
    const schedule = await scheduleService.fetchSchedule();
    const mondayShows = scheduleService.getRollingScheduleDays(
      schedule.shows,
      new Date('2026-06-01T12:00:00Z'),
    )[0].shows;

    expect(mondayShows.map(show => show.id)).toContain('sunday-night-week-2');
    expect(mondayShows.map(show => show.id)).not.toContain(
      'sunday-night-week-1',
    );
  });

  test('keeps weekly shows regardless of the section week', () => {
    for (const date of ['2026-05-25', '2026-06-01']) {
      const mondayShows = scheduleService.getRollingScheduleDays(
        scheduleShows,
        new Date(`${date}T12:00:00Z`),
      )[0].shows;
      expect(mondayShows.map(show => show.id)).toContain('weekly');
    }
  });

  test('uses the section date for four-week cycles too', () => {
    const mondayShows = scheduleService.getRollingScheduleDays(
      scheduleShows,
      new Date('2026-06-01T12:00:00Z'),
    )[0].shows;

    expect(mondayShows.map(show => show.id)).toContain('monthly-week-2');
    expect(mondayShows.map(show => show.id)).not.toContain('monthly-week-1');
  });

  test('uses the Eastern date even when UTC has reached the next day', () => {
    const mondayShows = scheduleService.getRollingScheduleDays(
      scheduleShows,
      new Date('2026-06-02T03:00:00Z'), // Still Monday, 11pm Eastern.
    )[0].shows;

    expect(mondayShows.map(show => show.id)).toContain('sunday-night-week-1');
    expect(mondayShows.map(show => show.id)).not.toContain(
      'sunday-night-week-2',
    );
    expect(mondayShows.map(show => show.id)).toContain('weekday-week-2');
  });

  test('keeps overnight broadcast dates correct across the DST transition', async () => {
    // March 2-8 is week 1. DST starts Sunday, before Monday's cycle change.
    jest.mocked(fetch).mockImplementation(
      createMockFetch({
        scheduleXml: scheduleXml.replace(
          'Mon, 25 May 2026 14:00:00 GMT',
          'Mon, 02 Mar 2026 15:00:00 GMT',
        ),
      }),
    );
    const schedule = await scheduleService.fetchSchedule();
    const mondayShows = scheduleService.getRollingScheduleDays(
      schedule.shows,
      new Date('2026-03-09T04:00:00Z'), // Midnight Eastern after the clock change.
    )[0].shows;

    expect(mondayShows.map(show => show.id)).toContain('sunday-night-week-1');
    expect(mondayShows.map(show => show.id)).not.toContain(
      'sunday-night-week-2',
    );
    expect(mondayShows.map(show => show.id)).toContain('weekday-week-2');
  });

  test('preserves the unfiltered fallback when the season start is missing', async () => {
    jest.mocked(fetch).mockImplementation(
      createMockFetch({
        scheduleXml: scheduleXml.replace(
          ' season_start="Mon, 25 May 2026 14:00:00 GMT"',
          '',
        ),
      }),
    );
    const serviceWithoutSeasonStart = new ScheduleService();
    const schedule = await serviceWithoutSeasonStart.fetchSchedule();
    const days = serviceWithoutSeasonStart.getRollingScheduleDays(
      schedule.shows,
      new Date('2026-06-01T12:00:00Z'),
    );

    expect(days[0].shows.map(show => show.id)).toEqual([
      'sunday-night-week-1',
      'sunday-night-week-2',
      'monday-4am-week-2',
      'weekly',
      'weekday-week-1',
      'weekday-week-2',
      'monthly-week-1',
      'monthly-week-2',
    ]);
  });
});
