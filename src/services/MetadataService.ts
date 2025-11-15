import { DEFAULT_NAME } from '@customTypes/Playlist';
import { debugLog, debugError } from '@utils/Debug';

interface ShowInfo {
  showTitle: string;
  hosts?: string;
  description?: string;
  currentSong?: string;
  currentArtist?: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  timestamp: string;
}

class MetadataService {
  private static instance: MetadataService;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: ((data: ShowInfo) => void)[] = [];
  private songHistoryListeners: ((songs: Song[]) => void)[] = [];

  static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  async fetchMetadata(): Promise<ShowInfo | null> {
    try {
      const response = await fetch('https://wmbr.org/dynamic.xml', {
        method: 'GET',
        headers: {
          Accept: 'application/xml, text/xml',
        },
      });

      if (!response.ok) {
        debugError('Metadata fetch failed:', response.status);
        return this.getFallbackData();
      }

      const xmlText = await response.text();
      return this.parseWMBRXML(xmlText);
    } catch (error) {
      debugError('Error fetching metadata:', error);
      return this.getFallbackData();
    }
  }

  private parseWMBRXML(xmlText: string): ShowInfo {
    try {
      debugLog('=== Raw XML received ===');
      debugLog(xmlText.substring(0, 500) + '...');

      // Extract wmbr_show content
      const showMatch = xmlText.match(/<wmbr_show>(.*?)<\/wmbr_show>/s);
      if (!showMatch) {
        debugLog('No wmbr_show match found');
        return this.getFallbackData();
      }

      const showContent = showMatch[1];
      debugLog('=== Show content extracted ===');
      debugLog(showContent);

      // First decode HTML entities to get actual HTML
      const decodedContent = this.decodeHTMLEntities(showContent);
      debugLog('=== Decoded content ===');
      debugLog(decodedContent);

      // Extract show title (first <b> tag)
      const titleMatch = decodedContent.match(/<b>(.*?)<\/b>/);
      debugLog('=== Title match ===', titleMatch);
      const rawTitle = titleMatch ? titleMatch[1] : DEFAULT_NAME;
      debugLog('Raw title before stripping:', rawTitle);
      const showTitle = this.stripHTML(rawTitle);
      debugLog('Show title after stripping:', showTitle);

      // Extract hosts (content within div with margin-bottom: 4px)
      const hostsMatch = decodedContent.match(
        /<div[^>]*margin-bottom:\s*4px[^>]*>(.*?)<\/div>/s,
      );
      debugLog('=== Hosts match ===', hostsMatch);
      let hosts = '';
      if (hostsMatch) {
        const hostsContent = hostsMatch[1];
        debugLog('Raw hosts content:', hostsContent);
        // Remove <br> and extract text after "with"
        const cleanHosts = this.stripHTML(hostsContent)
          .replace(/^\s*with\s*/i, '')
          .trim();
        debugLog('Clean hosts after processing:', cleanHosts);
        hosts = cleanHosts;
      }

      // Extract description (remaining text after removing title and hosts sections)
      let description = decodedContent;
      debugLog('=== Description processing ===');
      debugLog('Before removing title:', description);
      // Remove the title <b> tag
      description = description.replace(/<b>.*?<\/b>\s*/, '');
      debugLog('After removing title:', description);
      // Remove the hosts div
      description = description.replace(
        /<div[^>]*margin-bottom:\s*4px[^>]*>.*?<\/div>\s*/s,
        '',
      );
      debugLog('After removing hosts div:', description);
      // Clean up HTML and trim
      description = this.stripHTML(description).trim();
      debugLog('Final description:', description);

      // Extract current song from wmbr_plays section (most recent entry)
      let currentSong = '';
      let currentArtist = '';

      try {
        const playsMatch = xmlText.match(/<wmbr_plays>(.*?)<\/wmbr_plays>/s);
        if (playsMatch) {
          const playsContent = playsMatch[1];
          const decodedPlaysContent = this.decodeHTMLEntities(playsContent);

          // Get the first (most recent) song entry
          const firstSongMatch = decodedPlaysContent.match(
            /<p class="recent">(.*?)<\/p>/,
          );
          if (firstSongMatch) {
            const songContent = firstSongMatch[1];
            // Parse format: "7:59p&nbsp;<b>Earl Grant</b>: Dreamy"
            const songMatch = songContent.match(
              /\d+:\d+[ap].*?<b>(.*?)<\/b>:\s*(.*)/,
            );
            if (songMatch) {
              currentArtist = this.stripHTML(songMatch[1]).trim();
              currentSong = this.stripHTML(songMatch[2]).trim();
            }
          }
        }
      } catch (error) {
        debugError('Error parsing current song:', error);
      }

      const result = {
        showTitle,
        hosts: hosts || undefined,
        description: description || undefined,
        currentSong: currentSong || undefined,
        currentArtist: currentArtist || undefined,
      };

      debugLog('=== Final parsed result ===', result);
      return result;
    } catch (error) {
      debugError('Error parsing WMBR XML:', error);
      return this.getFallbackData();
    }
  }

  private decodeHTMLEntities(text: string): string {
    debugLog('decodeHTMLEntities input:', text);

    const result = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&'); // Do this last since other entities contain &

    debugLog('decodeHTMLEntities output:', result);
    return result;
  }

  private stripHTML(html: string): string {
    debugLog('stripHTML input:', html);

    const result = html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace any remaining &nbsp; with space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    debugLog('stripHTML output:', result);
    return result;
  }

  private getFallbackData(): ShowInfo {
    return {
      showTitle: DEFAULT_NAME,
      hosts: undefined,
      description: undefined,
    };
  }

  private parseSongHistory(xmlText: string): Song[] {
    try {
      debugLog('=== Parsing song history ===');
      // Extract wmbr_plays content
      const playsMatch = xmlText.match(/<wmbr_plays>(.*?)<\/wmbr_plays>/s);
      if (!playsMatch) {
        debugLog('No wmbr_plays match found');
        return this.generateMockSongHistory();
      }

      const playsContent = playsMatch[1];
      debugLog('Plays content:', playsContent);

      // Decode HTML entities first
      const decodedPlaysContent = this.decodeHTMLEntities(playsContent);
      debugLog('Decoded plays content:', decodedPlaysContent);

      // Extract individual song entries
      const songMatches = Array.from(
        decodedPlaysContent.matchAll(/<p class="recent">(.*?)<\/p>/g),
      );
      debugLog('Found', songMatches.length, 'song matches');
      const songs: Song[] = [];

      for (const match of songMatches) {
        const songContent = match[1];
        debugLog('Raw song content:', songContent);

        // Parse time, artist, and title
        // Format: "7:59p&nbsp;<b>Earl Grant</b>: Dreamy"
        const songMatch = songContent.match(
          /(\d+:\d+[ap]).*?<b>(.*?)<\/b>:\s*(.*)/,
        );
        debugLog('Song regex match:', songMatch);

        if (songMatch) {
          const [, time, artist, title] = songMatch;
          debugLog('Parsed - Time:', time, 'Artist:', artist, 'Title:', title);

          const processedSong = {
            id: `song-${Date.now()}-${songs.length}`,
            title: this.stripHTML(title).trim(),
            artist: this.stripHTML(artist).trim(),
            timestamp: this.stripHTML(time).trim(),
          };

          debugLog('Processed song:', processedSong);
          songs.push(processedSong);
        }
      }

      debugLog('Final songs array:', songs);
      debugLog('Returning', songs.length, 'real songs vs fallback');
      return songs.length > 0 ? songs : [];
    } catch (error) {
      debugError('Error parsing song history:', error);
      return this.generateMockSongHistory();
    }
  }

  private generateMockSongHistory(): Song[] {
    const mockSongs = [
      { title: 'Electric Feel', artist: 'MGMT' },
      { title: 'Time to Dance', artist: 'The Sounds' },
      { title: 'Mr. Brightside', artist: 'The Killers' },
      { title: 'Seven Nation Army', artist: 'The White Stripes' },
      { title: 'Take Me Out', artist: 'Franz Ferdinand' },
      { title: 'Somebody Told Me', artist: 'The Killers' },
      { title: 'Float On', artist: 'Modest Mouse' },
      { title: 'Hey Ya!', artist: 'OutKast' },
    ];

    const now = new Date();
    return mockSongs
      .slice(0, Math.floor(Math.random() * 6) + 2)
      .map((song, index) => {
        const timestamp = new Date(now.getTime() - index * 15 * 60 * 1000);
        return {
          id: `song-${Date.now()}-${index}`,
          title: song.title,
          artist: song.artist,
          timestamp: this.formatTime(timestamp),
        };
      });
  }

  startPolling(intervalMs: number = 15000): void {
    this.stopPolling();

    const poll = async () => {
      try {
        const response = await fetch('https://wmbr.org/dynamic.xml', {
          method: 'GET',
          headers: {
            Accept: 'application/xml, text/xml',
          },
        });

        if (response.ok) {
          const xmlText = await response.text();

          // Parse show metadata
          const metadata = this.parseWMBRXML(xmlText);
          this.notifyListeners(metadata);

          // Parse song history
          debugLog('About to parse song history...');
          const songHistory = this.parseSongHistory(xmlText);
          debugLog(
            'Song history parsing complete, got:',
            songHistory.length,
            'songs',
          );
          this.notifySongHistoryListeners(songHistory);
        } else {
          // Fallback to default data
          const metadata = await this.fetchMetadata();
          if (metadata) {
            this.notifyListeners(metadata);
          }

          const mockHistory = this.generateMockSongHistory();
          this.notifySongHistoryListeners(mockHistory);
        }
      } catch (error) {
        debugError('Error in polling:', error);
        const metadata = this.getFallbackData();
        this.notifyListeners(metadata);

        const mockHistory = this.generateMockSongHistory();
        this.notifySongHistoryListeners(mockHistory);
      }
    };

    poll();
    this.pollInterval = setInterval(poll, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  subscribe(callback: (data: ShowInfo) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  subscribeSongHistory(callback: (songs: Song[]) => void): () => void {
    this.songHistoryListeners.push(callback);
    return () => {
      this.songHistoryListeners = this.songHistoryListeners.filter(
        listener => listener !== callback,
      );
    };
  }

  private notifyListeners(data: ShowInfo): void {
    this.listeners.forEach(callback => callback(data));
  }

  private notifySongHistoryListeners(songs: Song[]): void {
    this.songHistoryListeners.forEach(callback => callback(songs));
  }
}

export default MetadataService;
export type { ShowInfo, Song };
