import { PlaylistResponse } from '../types/Playlist';
import { debugLog, debugError } from '../utils/Debug';

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
      const formattedDate = this.formatDateForAPI(date);
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

  private formatDateForAPI(dateString: string): string {
    try {
      // Parse the GMT date string and format as YYYY-MM-DD
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      debugError('Error formatting date:', dateString, error);
      // Fallback: try to extract date parts if it's already in YYYY-MM-DD format
      const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      throw new Error(`Unable to format date: ${dateString}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
