import { parseString } from 'react-native-xml2js';
import { ScheduleShow, ScheduleResponse } from '@customTypes/Schedule';
import { debugLog, debugError } from '@utils/Debug';
import { dayNames } from '@utils/DateTime';

export class ScheduleService {
  private static instance: ScheduleService;
  private readonly scheduleUrl = 'https://wmbr.org/cgi-bin/xmlsched';
  // Store the current "start of the broadcast day" (in minutes after midnight)
  // given by the root element of the schedule XML.
  private dayStart = 0;

  static getInstance(): ScheduleService {
    if (!ScheduleService.instance) {
      ScheduleService.instance = new ScheduleService();
    }
    return ScheduleService.instance;
  }

  async fetchSchedule(): Promise<ScheduleResponse> {
    try {
      const response = await fetch(this.scheduleUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();

      return new Promise((resolve, reject) => {
        parseString(xmlText, (err, result) => {
          if (err) {
            reject(new Error(`XML parsing error: ${err.message}`));
            return;
          }

          try {
            debugLog('XML Parse Result:', JSON.stringify(result, null, 2));
            this.dayStart =
              parseInt(result?.wmbr_schedule?.$?.daystart, 10) || 0;
            const shows = this.parseShows(result);
            debugLog('Parsed shows:', shows.length);
            resolve({ shows });
          } catch (parseError) {
            debugError('Parse error:', parseError);
            reject(parseError);
          }
        });
      });
    } catch (error) {
      debugError('Error fetching schedule:', error);
      throw error;
    }
  }

  private parseShows(xmlResult: any): ScheduleShow[] {
    debugLog('parseShows input:', xmlResult);

    if (!xmlResult?.wmbr_schedule?.show) {
      debugLog('No shows found in XML structure');
      return [];
    }

    const showsArray = Array.isArray(xmlResult.wmbr_schedule.show)
      ? xmlResult.wmbr_schedule.show
      : [xmlResult.wmbr_schedule.show];

    debugLog('Shows array length:', showsArray.length);
    debugLog('First show sample:', showsArray[0]);

    return showsArray.map((show: any) => ({
      id: show.$.id || '',
      name: show.name?.[0] || '',
      day: parseInt(show.day?.[0] || '0', 10),
      day_str: show.day_str?.[0] || '',
      time: show.time?.[0] || '',
      time_str: show.time_str?.[0] || '',
      length: parseInt(show.length?.[0] || '0', 10),
      alternates: parseInt(show.alternates?.[0] || '0', 10),
      hosts: show.hosts?.[0] || '',
      multihosts: parseInt(show.multihosts?.[0] || '0', 10),
      producers: show.producers?.[0] || '',
      url: show.url?.[0] || '',
      email: show.email?.[0] || '',
      description: show.description?.[0] || '',
    }));
  }

  // Helper method to group shows by day
  groupShowsByDay(shows: ScheduleShow[]): { [key: string]: ScheduleShow[] } {
    const grouped: { [key: string]: ScheduleShow[] } = {};

    shows.forEach(show => {
      if (show.day === 7) {
        // Shows that air every weekday (Monday-Friday)
        const weekdays = [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
        ];
        weekdays.forEach(day => {
          if (!grouped[day]) {
            grouped[day] = [];
          }
          grouped[day].push(show);
        });
      } else {
        /**
         * Regular show for specific day.
         *
         * If show time (minutes after midnight) is before dayStart, that means it's not "really" on this
         * "day," but on the next day.
         *
         * For instance, Radio Ninja: Long Play has this XML:
         *
         * ```xml
         * <show id="9106">
         *   <name>Radio Ninja: Long Play</name>
         *   <day>1</day>
         *   <day_str>Monday</day_str>
         *   <time>60</time>
         *   <time_str>1:00a</time_str>
         *   <length>120</length>
         * </show>
         * ```
         *
         * Where `<day>1</day>` means Monday, and `<time>60</time>` means 1:00
         * AM. In this case, the show actually airs early Tuesday morning, so we
         * have to add 1 to the value of `show.day` to get the correct day name.
         *
         * TODO: Write tests for this.
         */
        const day =
          parseInt(show.time, 10) < this.dayStart
            ? dayNames[(show.day + 1) % dayNames.length] // Wrap back to 0th index if out of bounds
            : dayNames[show.day];

        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(show);
      }
    });

    // Sort shows within each day by time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => {
        const timeA = parseInt(a.time, 10);
        const timeB = parseInt(b.time, 10);
        return timeA - timeB;
      });
    });

    return grouped;
  }

  // Helper method to format time for display (just start time)
  formatTime(timeStr: string): string {
    return timeStr;
  }

  // Helper method to determine if alternating show is active this week
  private isAlternatingShowActive(
    show: ScheduleShow,
    targetDate: Date,
  ): boolean {
    if (show.alternates === 0) {
      return true; // Non-alternating show is always active
    }

    // For alternating shows, we need a reference date to calculate weeks
    // Using a fixed reference date of September 1, 2024 (start of fall semester)
    const referenceDate = new Date('2024-09-01T00:00:00-04:00'); // Eastern Time
    const targetDateEastern = new Date(
      targetDate.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    );

    // Calculate weeks since reference date
    const daysDiff = Math.floor(
      (targetDateEastern.getTime() - referenceDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const weeksSince = Math.floor(daysDiff / 7);

    debugLog(
      `Show "${show.name}" alternates: ${show.alternates}, weeks since ref: ${weeksSince}, active: ${weeksSince % 2 === 0}`,
    );

    // Even weeks = first show in alternating pair, odd weeks = second show
    return weeksSince % 2 === 0;
  }

  async getShowById(showId: string): Promise<ScheduleShow | null> {
    try {
      const scheduleData = await this.fetchSchedule();

      const matchingShow =
        scheduleData.shows.find(show => show.id === showId) || null;

      return matchingShow;
    } catch (error) {
      debugError('Error getting show by ID:', error);
      return null;
    }
  }

  // Helper method to find the previous show based on current time
  async findPreviousShow(
    currentShowName: string,
  ): Promise<{ show: ScheduleShow; date: Date } | null> {
    try {
      const scheduleData = await this.fetchSchedule();
      const now = new Date();
      const easternNow = new Date(
        now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
      );
      const currentDay = easternNow.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const currentTimeMinutes =
        easternNow.getHours() * 60 + easternNow.getMinutes();

      debugLog(`Finding previous show for: "${currentShowName}"`);
      debugLog(
        `Eastern Time: ${easternNow.toLocaleString()}, Day: ${currentDay}, Minutes: ${currentTimeMinutes}`,
      );
      debugLog(`Total shows in schedule: ${scheduleData.shows.length}`);

      // Map JavaScript day numbers to schedule day numbers
      // Schedule: 1=Monday, 2=Tuesday, ..., 6=Saturday, 0=Sunday, 7=Weekdays
      const scheduleDayMap = [0, 1, 2, 3, 4, 5, 6]; // JS [Sun,Mon,Tue,Wed,Thu,Fri,Sat] -> Schedule [0,1,2,3,4,5,6]
      const scheduleDay = scheduleDayMap[currentDay];

      // Get all shows for today (including weekday shows if it's Monday-Friday)
      const allTodayShows = scheduleData.shows.filter(
        show =>
          show.day === scheduleDay ||
          (scheduleDay >= 1 && scheduleDay <= 5 && show.day === 7),
      );

      // Filter to only shows that are active this week (considering alternates)
      const todayShows = allTodayShows.filter(show =>
        this.isAlternatingShowActive(show, easternNow),
      );

      debugLog(`All shows for day ${scheduleDay}: ${allTodayShows.length}`);
      debugLog(`Active shows for day ${scheduleDay}: ${todayShows.length}`);

      // Convert time strings to minutes for comparison
      const showsWithTime = todayShows.map(show => ({
        ...show,
        timeMinutes: parseInt(show.time, 10),
      }));

      // Sort shows by time
      showsWithTime.sort((a, b) => a.timeMinutes - b.timeMinutes);

      // Find the current show and return the previous one
      const currentShowIndex = showsWithTime.findIndex(
        show => show.name.toLowerCase() === currentShowName.toLowerCase(),
      );

      debugLog(
        `Current show "${currentShowName}" found at index: ${currentShowIndex}`,
      );

      if (currentShowIndex > 0) {
        const previousShow = showsWithTime[currentShowIndex - 1];
        debugLog(
          `Previous show found: "${previousShow.name}" at ${previousShow.time_str}`,
        );
        return { show: previousShow, date: easternNow };
      }

      // If current show is the first show of the day, we've reached the beginning
      if (currentShowIndex === 0) {
        debugLog(
          `Current show "${currentShowName}" is first show of the day - no previous show available`,
        );
        return null; // Don't look at previous days
      }

      // If we can't find the current show in the schedule, find the show that would be playing now
      debugLog(`Current show not found by name, trying to find by time`);
      const currentShow = showsWithTime.find((show, index) => {
        const nextShow = showsWithTime[index + 1];
        return (
          show.timeMinutes <= currentTimeMinutes &&
          (!nextShow || nextShow.timeMinutes > currentTimeMinutes)
        );
      });

      if (currentShow) {
        debugLog(`Found current show by time: "${currentShow.name}"`);
        const currentIndex = showsWithTime.indexOf(currentShow);
        if (currentIndex > 0) {
          const previousByTime = showsWithTime[currentIndex - 1];
          debugLog(
            `Previous show by time: "${previousByTime.name}" at ${previousByTime.time_str}`,
          );
          return { show: previousByTime, date: easternNow };
        }
      }

      debugLog(`No previous show found`);
      return null;
    } catch (error) {
      debugError('Error finding previous show:', error);
      return null;
    }
  }
}
