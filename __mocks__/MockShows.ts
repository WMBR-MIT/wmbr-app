import { Show } from '@customTypes/RecentlyPlayed';

// Realistic mock show based on __mocks__/MockNetworkResponses.ts (archivesXml)
export const mockShow: Show = {
  id: '8982',
  name: 'Africa Kabisa',
  day: 0,
  day_str: 'Sunday',
  time: 960,
  time_str: '4:00p',
  length: 120,
  hosts: 'Brutus leaderson',
  alternates: 0,
  archives: [
    {
      url: 'https://wmbr.org/archive/Africa_Kabisa_%28rebroadcast%29____11_12_25_1%3A58_AM.mp3',
      date: 'Wed, 12 Nov 2025 07:00:00 GMT',
      size: '119046897',
    },
    {
      url: 'https://wmbr.org/archive/Africa_Kabisa____11_9_25_3%3A58_PM.mp3',
      date: 'Sun, 09 Nov 2025 21:00:00 GMT',
      size: '119033104',
    },
    {
      url: 'https://wmbr.org/archive/Africa_Kabisa____11_2_25_3%3A58_PM.mp3',
      date: 'Sun, 02 Nov 2025 21:00:00 GMT',
      size: '119066540',
    },
  ],
};
