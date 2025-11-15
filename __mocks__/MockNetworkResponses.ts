import {
  generateNowPlayingXml,
  generatePlaylistResponse,
} from '../src/utils/TestUtils';
import { PlaylistResponse } from '../src/types/Playlist';

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

    // Playlist endpoint
    if (urlStr.includes('alexandersimoes.com/get_playlist')) {
      // Check if the show name in the URL is one we have mock data for
      if (urlStr.includes('Post-tentious') || urlStr.includes('Post')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(effectivePlaylistResponse),
        } as Response);
      }

      // Return empty playlist for other shows
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ error: 'No playlist found' }),
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
