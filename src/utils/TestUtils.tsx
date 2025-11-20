import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { PlaylistResponse } from '../types/Playlist';
import MetadataService, { ShowInfo } from '../services/MetadataService';
import { RecentlyPlayedService } from '../services/RecentlyPlayedService';
import { debugError } from '../utils/Debug';

/**
 * This is currently needed to set the current show metadata for testing
 * RecentlyPlayed, for instance.
 *
 * In practice, this is handled by `Home/index.tsx`, but we don't want to have
 * to include that component in all our tests, so we create this lightweight
 * wrapper instead.
 */
function RecentlyPlayedServiceWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const metadataService = MetadataService.getInstance();

    const unsubscribeMetadata = metadataService.subscribe((data: ShowInfo) => {
      try {
        RecentlyPlayedService.getInstance().setCurrentShow(data.showTitle);
      } catch (e) {
        debugError('current show update failed:', e);
      }
    });

    metadataService.startPolling(15000);

    return () => {
      MetadataService.getInstance().stopPolling();
      unsubscribeMetadata();
    };
  }, []); // Empty dependency array - only run once on mount

  return <>{children}</>;
}

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
      frame: { x: 0, y: 0, width: 0, height: 0 },
    }}
  >
    <NavigationContainer>
      <RecentlyPlayedServiceWrapper>{children}</RecentlyPlayedServiceWrapper>
    </NavigationContainer>
  </SafeAreaProvider>
);

/**
 * Generate a mock playlist response for testing.
 *
 * JSON format from alexandersimoes.com endpoint
 */
export function generatePlaylistResponse(options?: {
  date?: Date;
  showName?: string;
}): PlaylistResponse {
  const effectiveDate = options?.date ?? new Date();
  const effectiveShowName = options?.showName ?? 'Post-tentious';

  const dateIso = effectiveDate.toISOString().split('T')[0];
  const dateYMD = dateIso.replace(/-/g, '/');

  return {
    show_name: effectiveShowName,
    date: dateIso,
    playlist_id: 'test-123',
    songs: [
      {
        time: `${dateYMD} 21:30:00`,
        artist: 'Fugazi',
        song: 'Waiting Room',
        album: '13 Songs',
      },
      {
        time: `${dateYMD} 21:33:00`,
        artist: 'Slint',
        song: 'Breadcrumb Trail',
        album: 'Spiderland',
      },
    ],
  };
}

// Generate sample data from wmbr.org/dynamic.xml
export function generateNowPlayingXml(options?: { showName?: string }) {
  const effectiveShowName = options?.showName ?? 'Post-tentious';

  return `<wmbr_dynamic version="1.0">
<wmbr_info>
Sat 4:29 PM : now playing: &nbsp;
<b><a href="http://auralfixradio.org" target="_blank">Aural Fixation</a></b>
<br>
mostly cloudy, 44°F
</wmbr_info>
<wmbr_show>
<b>${effectiveShowName}</b>
</wmbr_show>
<wmbr_twitter/>
<wmbr_plays>
<p class="recent">4:27p&nbsp;<b>Vieon</b>: Inter-City</p>
<p class="recent">4:24p&nbsp;<b>The KVB</b>: Dead Of Night</p>
<p class="recent">4:20p&nbsp;<b>Les Big Byrd</b>: Diamonds, Rhinestones and Hard Rain</p>
<p class="recent">4:16p&nbsp;<b>Th' Losin Streaks</b>: I Mean You</p>
<p class="recent">4:13p&nbsp;<b>The Brooms</b>: Just Can't Love you</p>
<p class="recent">4:11p&nbsp;<b>Smalltown Tigers</b>: Crush On You</p>
<p class="recent">4:09p&nbsp;<b>Sprints</b>: Adore Adore Adore</p>
<p class="recent">4:02p&nbsp;<b>Karkara</b>: Anthropia</p>
<a href="https://track-blaster.com/wmbr/playlist.php?date=latest" target="_blank">full playlist</a>
</wmbr_plays>
<wmbr_upcoming>
<div class="upcoming">
<span class="upcoming"><b>6:00p:</b></span>
<a href="/cgi-bin/show?id=9051">James Dean Death Car Experience</a>
</div>
<div class="upcoming">
<span class="upcoming"><b>8:00p:</b></span>
<a href="/cgi-bin/show?id=9052">Backpacks and Magazines</a>
</div>
<div class="upcoming">
<span class="upcoming"><b>9:00p:</b></span>
<a href="/cgi-bin/show?id=9099">Whatever Forever</a>
</div>
<div class="upcoming">
<span class="upcoming"><b>10:00p:</b></span>
<a href="/cgi-bin/show?eid=34175">Under the Sun</a>
</div>
<div class="upcoming">
<span class="upcoming"><b>11:00p:</b></span>
<a href="/cgi-bin/show?id=9056">Music for Eels</a> 
</div>
<div class="upcoming">
<span class="upcoming"><b>12:00m:</b></span>
<a href="/cgi-bin/show?eid=34168">Radio Ninja (rebroadcast)</a>
</div>
</wmbr_upcoming>
</wmbr_dynamic>`;
}

export function generateScheduleXml(options?: {
  date?: Date;
  showName?: string;
}) {
  const effectiveDate = options?.date ?? new Date();
  const effectiveShowName = options?.showName ?? 'Post-tentious';
  const dayNum = effectiveDate.getDay(); // 0=Sunday .. 6=Saturday
  // Use the current time (minutes from midnight) so the show is considered "now playing"
  const minutesFromMidnight =
    effectiveDate.getHours() * 60 + effectiveDate.getMinutes();
  // Build a human-readable time string like "9:00p" to match scheduleXml time_str format
  const hours = effectiveDate.getHours();
  const mins = effectiveDate.getMinutes();
  const ampm = hours >= 12 ? 'p' : 'a';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutePadded = String(mins).padStart(2, '0');
  const timeStr = `${hour12}:${minutePadded}${ampm}`;

  // Derive a proper day_str (e.g. "Tuesday") expected by ScheduleService.parseShows
  // Use Intl.DateTimeFormat for a locale-aware weekday name
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    effectiveDate,
  );

  return `<?xml version="1.0" encoding="utf-8" ?>
<wmbr_schedule>
<show id="9007">
<name>${effectiveShowName}</name>
<day>${dayNum}</day>
<day_str>${dayName}</day_str>
<time>${minutesFromMidnight}</time>
<time_str>${timeStr}</time_str>
<length>60</length>
<alternates>0</alternates>
<hosts>Tester</hosts>
</show>
</wmbr_schedule>`;
}

// Test helpers for driving the react-native-track-player mock from tests.
// These access the __testApi exported by the mock in __mocks__/react-native-track-player.ts.
export const getTrackPlayerTestApi = () => {
  const api = require('react-native-track-player')?.default?.__testApi;

  if (!api) {
    throw new Error(
      'TrackPlayer test API not available. Ensure the mock exposes __testApi.',
    );
  }

  return api as {
    resetAll: () => void;
    setPlaybackState: (s: string) => void;
    setPosition: (sec: number) => void;
    setDuration: (sec: number) => void;
    advance: (ms: number) => void;
  };
};
