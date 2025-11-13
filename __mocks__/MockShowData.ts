import { Show } from '../types/RecentlyPlayed';

// Mock show data with archives for testing navigation to ShowDetails
export const mockShowWithArchives: Show = {
  id: '1003',
  name: 'Post-tentious',
  day: 2,
  day_str: 'Tuesday',
  time: 1290,
  time_str: '9:30p',
  length: 90,
  hosts: 'Eda Lozada',
  alternates: 0,
  archives: [
    {
      url: 'https://example.com/archive1.mp3',
      date: '2024-11-05',
      size: '65MB'
    },
    {
      url: 'https://example.com/archive2.mp3',
      date: '2024-10-29',
      size: '72MB'
    }
  ]
};
