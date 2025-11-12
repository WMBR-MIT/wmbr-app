import { Show } from '../types/RecentlyPlayed';

// Create a mock show with archives for testing navigation
export const mockShowWithArchives: Show = {
  id: 'posttentious',
  day: 0,
  day_str: 'Monday',
  time: 0,
  time_str: '12:00 AM',
  length: 60,
  hosts: 'Jane Doe',
  alternates: 0,
  name: 'Post-tentious',
  archives: [
    {
      date: '2024-01-15',
      size: '45000000', // ~45MB
      url: '',
    },
    {
      date: '2024-01-08',
      size: '42000000', // ~42MB
      url: '',
    },
  ],
};

