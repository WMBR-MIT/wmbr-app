import { ScheduleShow, ScheduleResponse } from '../types/Schedule';

export const mockScheduleShows: ScheduleShow[] = [
  {
    id: '1001',
    name: 'Morning Jazz',
    day: 1,
    day_str: 'Monday',
    time: '360', // 6:00 AM in minutes
    time_str: '6:00a',
    length: 120, // 2 hours
    alternates: 0,
    hosts: 'Sarah Johnson',
    multihosts: 0,
    producers: '',
    url: 'https://example.com/morning-jazz',
    email: 'sarah@wmbr.org',
    description: 'Start your week with smooth jazz classics and contemporary favorites.',
  },
  {
    id: '1002',
    name: 'Rock Revival',
    day: 1,
    day_str: 'Monday',
    time: '900', // 3:00 PM (15:00) in minutes
    time_str: '3:00p',
    length: 60, // 1 hour
    alternates: 0,
    hosts: 'Mike Thompson',
    multihosts: 0,
    producers: 'Lisa Chen',
    url: 'https://example.com/rock-revival',
    email: 'mike@wmbr.org',
    description: 'Classic rock hits from the 70s, 80s, and 90s that shaped music history.',
  },
  {
    id: '1003',
    name: 'Post-tentious',
    day: 2,
    day_str: 'Tuesday',
    time: '1290', // 9:30 PM (21:30) in minutes
    time_str: '9:30p',
    length: 90, // 1.5 hours
    alternates: 0,
    hosts: 'Eda Lozada',
    multihosts: 0,
    producers: '',
    url: 'https://example.com/post-tentious',
    email: 'eda@wmbr.org',
    description: 'Post music for post people. We regularly play post-punk, post-rock, post-hardcore, and more.',
  },
  {
    id: '1004',
    name: 'Electronic Frontiers',
    day: 3,
    day_str: 'Wednesday',
    time: '1200', // 8:00 PM (20:00) in minutes
    time_str: '8:00p',
    length: 120, // 2 hours
    alternates: 0,
    hosts: 'Alex Rivera, Jordan Kim',
    multihosts: 1,
    producers: '',
    url: 'https://example.com/electronic-frontiers',
    email: 'electronic@wmbr.org',
    description: 'Exploring the cutting edge of electronic music, from ambient to techno.',
  },
  {
    id: '1005',
    name: 'World Beat',
    day: 7, // Weekday show (Monday-Friday)
    day_str: 'Weekdays',
    time: '720', // 12:00 PM (noon) in minutes
    time_str: '12:00p',
    length: 60, // 1 hour
    alternates: 0,
    hosts: 'Carmen Rodriguez',
    multihosts: 0,
    producers: '',
    url: 'https://example.com/world-beat',
    email: 'carmen@wmbr.org',
    description: 'Global rhythms and international sounds from every corner of the world.',
  },
];

export const mockScheduleResponse: ScheduleResponse = {
  shows: mockScheduleShows,
};
