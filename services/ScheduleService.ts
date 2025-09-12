import { parseString } from 'react-native-xml2js';
import { ScheduleShow, ScheduleResponse } from '../types/Schedule';
import { debugLog, debugError } from '../utils/Debug';

export class ScheduleService {
  private static instance: ScheduleService;
  private readonly scheduleUrl = 'https://wmbr.org/cgi-bin/xmlsched';

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
        // Weekday show (Monday-Friday)
        const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        weekdays.forEach(day => {
          if (!grouped[day]) {
            grouped[day] = [];
          }
          grouped[day].push(show);
        });
      } else {
        // Regular show for specific day
        const day = show.day_str || 'Unknown';
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
}
