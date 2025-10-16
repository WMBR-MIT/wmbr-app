import { useCallback, useEffect, useState } from 'react';
import { RecentlyPlayedService } from '../../services/RecentlyPlayedService';
import { ProcessedSong, ShowGroup } from '../../types/RecentlyPlayed';
import { ScheduleService } from '../../services/ScheduleService';
import { debugError } from '../../utils/Debug';

interface ShowPlaylist {
  showName: string;
  songs: ProcessedSong[];
}

export function useShowPlaylists(currentShow?: string) {
  const recentlyPlayedService = RecentlyPlayedService.getInstance();
  const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
  const [showPlaylists, setShowPlaylists] = useState<ShowPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoLoadPrevious, setShouldAutoLoadPrevious] = useState(false);
  const [hasReachedEndOfDay, setHasReachedEndOfDay] = useState(false);

  const fetchRecentlyPlayed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const groups = await recentlyPlayedService.fetchRecentlyPlayed(isRefresh);
      setShowGroups(groups);
    } catch (err) {
      setError('Failed to load recently played songs');
      debugError('Error fetching recently played:', err);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [recentlyPlayedService]);

  const fetchShowPlaylist = useCallback(async (showName: string, date: string, signal?: AbortSignal) => {
    try {
      const songs = await recentlyPlayedService.fetchPlaylistAsSongs(showName, date, signal);
      return songs;
    } catch (err) {
      debugError('Error in fetchShowPlaylist:', err);
      return [] as ProcessedSong[];
    }
  }, [recentlyPlayedService]);

  const fetchCurrentShowPlaylist = useCallback(async (isRefresh = false) => {
    if (!currentShow || currentShow === 'WMBR 88.1 FM') return;
    if (isRefresh) {
      setRefreshing(true);
      setShowPlaylists([]);
      setHasReachedEndOfDay(false);
      setShouldAutoLoadPrevious(false);
    } else {
      setLoading(true);
    }
    setError(null);
    let shouldTriggerAutoLoad = false;

    try {
      await fetchRecentlyPlayed(isRefresh);
      const today = new Date();
      const easternDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const year = easternDate.getFullYear();
      const month = String(easternDate.getMonth() + 1).padStart(2, '0');
      const day = String(easternDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const controller = new AbortController();
      const songs = await fetchShowPlaylist(currentShow, dateStr, controller.signal);
      setShowPlaylists([{ showName: currentShow, songs }]);
      if (songs.length === 0) shouldTriggerAutoLoad = true;
    } catch (err) {
      setError(`Failed to load playlist for ${currentShow}`);
      debugError('Error fetching current show playlist:', err);
      setShowPlaylists([]);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
      if (shouldTriggerAutoLoad) setShouldAutoLoadPrevious(true);
    }
  }, [currentShow, fetchRecentlyPlayed, fetchShowPlaylist]);

  const loadPreviousShow = useCallback(async () => {
    const lastLoadedShow = showPlaylists.length > 0 ? showPlaylists[showPlaylists.length - 1].showName : currentShow;
    if (!lastLoadedShow || !currentShow || currentShow === 'WMBR 88.1 FM' || loadingMore || hasReachedEndOfDay) return;
    setLoadingMore(true);
    try {
      const scheduleService = ScheduleService.getInstance();
      const previousShow = await scheduleService.findPreviousShow(lastLoadedShow);
      if (!previousShow) {
        setHasReachedEndOfDay(true);
        return;
      }
      const alreadyLoaded = showPlaylists.some(p => p.showName === previousShow.show.name);
      if (alreadyLoaded) return;
      try {
        const songs = await fetchShowPlaylist(previousShow.show.name, previousShow.date);
        setShowPlaylists(prev => [...prev, { showName: previousShow.show.name, songs }]);
      } catch (playlistError) {
        setShowPlaylists(prev => [...prev, { showName: previousShow.show.name, songs: [] }]);
      }
    } catch (err) {
      debugError('Error loading previous show:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentShow, showPlaylists, loadingMore, hasReachedEndOfDay, fetchShowPlaylist]);

  useEffect(() => {
    setShowPlaylists([]);
    setHasReachedEndOfDay(false);
    setShouldAutoLoadPrevious(false);
    setError(null);
  }, [currentShow]);

  return {
    showGroups,
    showPlaylists,
    loading,
    loadingMore,
    refreshing,
    error,
    fetchRecentlyPlayed,
    fetchCurrentShowPlaylist,
    loadPreviousShow,
    setHasReachedEndOfDay,
    setShouldAutoLoadPrevious,
    shouldAutoLoadPrevious,
    hasReachedEndOfDay,
  } as const;
}
