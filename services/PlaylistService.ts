import { PlaylistResponse } from '../types/Playlist';
import { debugLog, debugError } from '../utils/Debug';
import { getDateISO } from '../utils/DateTime';

export class PlaylistService {
  private static instance: PlaylistService;
  private cache = new Map<string, PlaylistResponse>();

  static getInstance(): PlaylistService {
    if (!PlaylistService.instance) {
      PlaylistService.instance = new PlaylistService();
    }
    return PlaylistService.instance;
  }

  async fetchPlaylist(showName: string, date: string): Promise<PlaylistResponse> {
    const cacheKey = `${showName}-${date}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Convert date from "Wed, 06 Aug 2025 20:00:00 GMT" format to "2025-08-06"
      const formattedDate = getDateISO(new Date(date));
      const encodedShowName = encodeURIComponent(showName);
      
      const url = `https://wmbr.alexandersimoes.com/get_playlist?show_name=${encodedShowName}&date=${formattedDate}`;
      debugLog('Fetching playlist from:', url);
      
      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
      }

      const data: PlaylistResponse = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      debugError('Error fetching playlist:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
