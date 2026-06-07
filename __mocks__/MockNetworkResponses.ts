import {
  generateNowPlayingXml,
  generatePlaylistResponse,
} from '../src/utils/TestUtils';
import { PlaylistResponse } from '../src/types/Playlist';
import { getDateYMD } from '../src/utils/DateTime';

// Sample schedule XML from wmbr.org/cgi-bin/xmlsched
const scheduleXml = `<?xml version="1.0" encoding="utf-8" ?>
<wmbr_schedule season_id="73" season_name="Fall/Winter 2025" season_start="Mon, 22 Sep 2025 14:00:00 GMT" season_end="Sat, 28 Feb 2026 15:00:00 GMT" last_update="Tue, 11 Nov 2025 13:01:06 GMT" daystart="240">
<show id="8974">
<name>Compas sur FM</name>
<day>0</day>
<day_str>Sunday</day_str>
<time>360</time>
<time_str>6:00a</time_str>
<length>120</length>
<alternates>0</alternates>
<hosts>Emmanuel Rene</hosts>
<multihosts>0</multihosts>
<producers>101</producers>
<url></url>
<email></email>
<description>The show's goal is to present Compas Music to WMBR's audience.</description>
</show>
<show id="8982">
<name>Africa Kabisa</name>
<day>0</day>
<day_str>Sunday</day_str>
<time>960</time>
<time_str>4:00p</time_str>
<length>120</length>
<alternates>0</alternates>
<hosts>Brutus leaderson</hosts>
<multihosts>0</multihosts>
<producers>64</producers>
<url></url>
<email>africa@wmbr.org</email>
<description>Africa Absolutely! Since 1992, Boston's African music radio show.</description>
</show>
<show id="8977">
<name>Sound and Fury</name>
<day>0</day>
<day_str>Sunday</day_str>
<time>600</time>
<time_str>10:00a</time_str>
<length>60</length>
<alternates>1</alternates>
<hosts>David "The Central Cogitator" Goodman</hosts>
<multihosts>0</multihosts>
<producers>40</producers>
<url></url>
<email></email>
<description>Unconventional Wisdom Meets Dramatic Radio</description>
</show>
<show id="8976">
<name>Radio with a View</name>
<day>0</day>
<day_str>Sunday</day_str>
<time>600</time>
<time_str>10:00a</time_str>
<length>60</length>
<alternates>2</alternates>
<hosts>Marc Stern</hosts>
<multihosts>0</multihosts>
<producers>40,118</producers>
<url></url>
<email></email>
<description>Economic democracy, human rights, and other idealistic visions.</description>
</show>
<show id="9028">
<name>Nonstop Ecstatic Screaming</name>
<day>1</day>
<day_str>Monday</day_str>
<time>300</time>
<time_str>5:00a</time_str>
<length>120</length>
<alternates>0</alternates>
<hosts>Thao</hosts>
<multihosts>0</multihosts>
<producers>187</producers>
<url></url>
<email></email>
<description>Two hours of sound designed to split your skull open.</description>
</show>
<show id="8992">
<name>Research &amp; Development</name>
<day>1</day>
<day_str>Monday</day_str>
<time>840</time>
<time_str>2:00p</time_str>
<length>120</length>
<alternates>0</alternates>
<hosts>Charlie Kohlhase</hosts>
<multihosts>0</multihosts>
<producers>162</producers>
<url></url>
<email>research</email>
<description>Forward-looking Jazz from the 40's to the present.</description>
</show>
<show id="8998">
<name>If 6 Was 9</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>240</time>
<time_str>4:00a</time_str>
<length>180</length>
<alternates>0</alternates>
<hosts>Rick Biskit Roth</hosts>
<multihosts>0</multihosts>
<producers>1351</producers>
<url></url>
<email>if6was9@wmbr.org</email>
<description>A morning wake-up that goes from jazz to punk.</description>
</show>
<show id="9001">
<name>The Jazz Train</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>960</time>
<time_str>4:00p</time_str>
<length>90</length>
<alternates>0</alternates>
<hosts>Jon Pollack</hosts>
<multihosts>0</multihosts>
<producers>94</producers>
<url></url>
<email>jazztrain</email>
<description>A weekly trip through the jazz legacy.</description>
</show>
<show id="9007">
<name>Post-tentious</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>1260</time>
<time_str>9:00p</time_str>
<length>60</length>
<alternates>0</alternates>
<hosts>Anton Perez and Eda Lozada</hosts>
<multihosts>0</multihosts>
<producers>1880,1942</producers>
<url></url>
<email></email>
<description>post music for post people.</description>
</show>
</wmbr_schedule>`;

// Mock XML for archives endpoint (real structure from actual xmlarch endpoint)
const archivesXml = `<?xml version="1.0" encoding="utf-8" ?>
<wmbr_archives season_id="73" season_name="Fall/Winter 2025" season_start="Mon, 22 Sep 2025 14:00:00 GMT" season_end="Sat, 28 Feb 2026 15:00:00 GMT">
<show id="9007">
<name>Post-tentious</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>1260</time>
<time_str>9:00p</time_str>
<length>60</length>
<alternates>0</alternates>
<hosts>Anton Perez and Eda Lozada</hosts>
<archives>
<archive>
<url>https://wmbr.org/archive/Post-tentious____11_4_25_8%3A58_PM.mp3</url>
<date>Wed, 05 Nov 2025 02:00:00 GMT</date>
<size>61484722</size>
</archive>
<archive>
<url>https://wmbr.org/archive/Post-tentious____11_11_25_8%3A58_PM.mp3</url>
<date>Wed, 12 Nov 2025 02:00:00 GMT</date>
<size>61418684</size>
</archive>
<archive>
<url></url>
<date>Wed, 16 Apr 2025 01:00:00 GMT</date>
<size>0</size>
</archive>
</archives>
</show>
<show id="8982">
<name>Africa Kabisa</name>
<day>0</day>
<day_str>Sunday</day_str>
<time>960</time>
<time_str>4:00p</time_str>
<length>120</length>
<alternates>0</alternates>
<hosts>Brutus leaderson</hosts>
<archives>
<archive>
<url>https://wmbr.org/archive/Africa_Kabisa_%28rebroadcast%29____11_12_25_1%3A58_AM.mp3</url>
<date>Wed, 12 Nov 2025 07:00:00 GMT</date>
<size>119046897</size>
</archive>
<archive>
<url>https://wmbr.org/archive/Africa_Kabisa____11_9_25_3%3A58_PM.mp3</url>
<date>Sun, 09 Nov 2025 21:00:00 GMT</date>
<size>119033104</size>
</archive>
<archive>
<url>https://wmbr.org/archive/Africa_Kabisa____11_2_25_3%3A58_PM.mp3</url>
<date>Sun, 02 Nov 2025 21:00:00 GMT</date>
<size>119066540</size>
</archive>
</archives>
</show>
<show id="9001">
<name>The Jazz Train</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>960</time>
<time_str>4:00p</time_str>
<length>90</length>
<alternates>0</alternates>
<hosts>Jon Pollack</hosts>
<archives>
<archive>
<url>https://wmbr.org/archive/The_Jazz_Train____11_11_25_3%3A58_PM.mp3</url>
<date>Tue, 11 Nov 2025 21:00:00 GMT</date>
<size>90265809</size>
</archive>
<archive>
<url>https://wmbr.org/archive/The_Jazz_Train____11_4_25_3%3A58_PM.mp3</url>
<date>Tue, 04 Nov 2025 21:00:00 GMT</date>
<size>90233626</size>
</archive>
</archives>
</show>
<show id="9069">
<name>The Willows</name>
<day>1</day>
<day_str>Monday</day_str>
<time>1140</time>
<time_str>7:00p</time_str>
<length>60</length>
<alternates>1</alternates>
<hosts>Jay Sitter</hosts>
<archives>
<archive>
<url>https://wmbr.org/archive/The_Willows____11_3_25_6%3A58_PM.mp3</url>
<date>Tue, 04 Nov 2025 00:00:00 GMT</date>
<size>61441672</size>
</archive>
</archives>
</show>
<show id="9077">
<name>C^2</name>
<day>2</day>
<day_str>Tuesday</day_str>
<time>420</time>
<time_str>7:00a</time_str>
<length>60</length>
<alternates>0</alternates>
<hosts>Chloe Lee</hosts>
<archives>
</archives>
</show>
</wmbr_archives>`;

const nowPlayingXml = generateNowPlayingXml();
const mockPlaylistResponse = generatePlaylistResponse();

/**
 * Generate the Track Blaster pl_recent_shows.php XML response for a given
 * show name and ISO date string (YYYY-MM-DD).
 */
function generateRecentShowsXml(showName: string, dateStr: string): string {
  return `<?xml version="1.0" ?>
<showlist timestamp="${dateStr} 12:00:00">
<show id="test-pl-123">
<show_start>${dateStr} 21:00:00</show_start>
<dj_name>Test DJ</dj_name>
<program_name>${showName}</program_name>
</show>
</showlist>`;
}

/**
 * Convert a PlaylistResponse to the tab-separated format returned by
 * pl_download.php, so mock tests exercise the real CSV parsing code path.
 */
function generatePlaylistCsv(playlist: PlaylistResponse): string {
  const header0 =
    'DJ Name\tDate\tStart Time\tEnd Time\tProgram Name\tHeader\tSubheader';
  const header1 = `Test DJ\tToday\t21:00\t22:00\t${playlist.show_name}\t\t`;
  const header2 =
    'Hidden\tBreak\tTime\tArtist\tArtistLink\tComposer\tSong\tVersion\tAlbum\tFormat\tLabel\tLabelLink\tYear\tMisc\tNew\tComp\tINT\tComment';

  const rows = playlist.songs.map(song => {
    // song.time is "YYYY/MM/DD HH:MM:SS" — extract just the HH:MM portion
    const hhmm = song.time.split(' ')[1]?.substring(0, 5) ?? '00:00';
    return `0\t0\t${hhmm}\t${song.artist}\t\t\t${song.song}\t\t${song.album ?? ''}\t\t\t\t\t\t0\t0\t0\t0\t`;
  });

  return [header0, header1, header2, ...rows].join('\n');
}

/**
 * Mock fetch implementation that returns appropriate responses based on URL
 *
 * To use custom data in a test, create a new jest spy with createMockFetch
 * and pass in overrides for the desired endpoints. For example:
 *
 * ```
 * jest.spyOn(global, 'fetch').mockImplementation(
 *   createMockFetch({
 *     scheduleXml,
 *     playlistResponse,
 *     nowPlayingXml,
 *   }),
 * );
 * ```
 */
export function createMockFetch(options?: {
  scheduleXml?: string;
  archivesXml?: string;
  nowPlayingXml?: string;
  playlistResponse?: PlaylistResponse;
}): jest.Mock {
  const effectiveScheduleXml = options?.scheduleXml || scheduleXml;
  const effectiveArchivesXml = options?.archivesXml || archivesXml;
  const effectivePlaylistResponse =
    options?.playlistResponse || mockPlaylistResponse;
  const effectiveNowPlayingXml = options?.nowPlayingXml || nowPlayingXml;

  return jest.fn((url: string) => {
    const urlStr = url.toString();

    // Schedule endpoint
    if (urlStr.includes('wmbr.org/cgi-bin/xmlsched')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(effectiveScheduleXml),
      } as Response);
    }

    // Archives endpoint
    if (urlStr.includes('wmbr.org/cgi-bin/xmlarch')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(effectiveArchivesXml),
      } as Response);
    }

    // Now playing endpoint
    if (urlStr.includes('wmbr.org/dynamic.xml')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(effectiveNowPlayingXml),
      } as Response);
    }

    // Track Blaster recent shows list — return XML with today's show so the
    // name+date lookup in PlaylistService.fetchPlaylist finds a match
    if (urlStr.includes('track-blaster.com/wmbr/pl_recent_shows.php')) {
      // Use getDateYMD (local date) to match what PlaylistService uses for lookup
      const dateStr = getDateYMD(new Date());
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(generateRecentShowsXml('Post-tentious', dateStr)),
      } as Response);
    }

    // Track Blaster playlist CSV download
    if (urlStr.includes('track-blaster.com/wmbr/pl_download.php')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(generatePlaylistCsv(effectivePlaylistResponse)),
      } as Response);
    }

    // Default: return 404
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    } as Response);
  });
}
