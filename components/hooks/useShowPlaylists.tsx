import { useCallback, useEffect, useRef, useState } from 'react';
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
      // do NOT clear existing playlists immediately on refresh to avoid flashing "no playlists"
      setHasReachedEndOfDay(false);
      setShouldAutoLoadPrevious(false);
    } else {
      setLoading(true);
    }
    setError(null);
    let shouldTriggerAutoLoad = false;
    const controllerRef = controllerRefGlobal;
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();
    const controller = controllerRef.current;

    try {
      await fetchRecentlyPlayed(isRefresh);

      // Safely compute date in America/New_York using Intl to avoid platform-specific parsing issues
      const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = dtf.formatToParts(new Date());
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      if (!year || !month || !day) {
        debugError('fetchCurrentShowPlaylist: invalid date parts, skipping playlist fetch');
        return;
      }
      const dateStr = `${year}-${month}-${day}`;

      debugError(`fetchCurrentShowPlaylist: fetching playlist for ${currentShow} on ${dateStr}`);
      const songs = await fetchShowPlaylist(currentShow, dateStr, controller.signal);
      debugError(`fetchCurrentShowPlaylist: fetched ${songs.length} songs for ${currentShow}`);

      // If the request was aborted, skip any state updates
      if (controller.signal.aborted) {
        debugError('fetchCurrentShowPlaylist: aborted, skipping state update');
        return;
      }

      // Only update playlists when we actually received songs.
      // If the fetch returned 0 songs (e.g., 400/404 or no data), do not clobber the UI — instead trigger loading previous.
      if (songs.length > 0) {
        setShowPlaylists([{ showName: currentShow, songs }]);
      } else {
        debugError(`fetchCurrentShowPlaylist: received 0 songs for ${currentShow}, will trigger load previous`);
        shouldTriggerAutoLoad = true;
      }
    } catch (err: any) {
      // If aborted, quietly return without changing UI
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        debugError('fetchCurrentShowPlaylist: fetch aborted');
        return;
      }
      setError(`Failed to load playlist for ${currentShow}`);
      debugError('Error fetching current show playlist:', err);
      // Don't overwrite existing playlists on transient errors
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
      if (shouldTriggerAutoLoad) setShouldAutoLoadPrevious(true);
    }
  }, [currentShow, fetchRecentlyPlayed, fetchShowPlaylist]);

  // Keep a single AbortController ref for current-show fetches so we can cancel stale requests
  const controllerRefGlobal = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (controllerRefGlobal.current) controllerRefGlobal.current.abort();
    };
  }, []);

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
    debugError(`useShowPlaylists: clearing playlists because currentShow changed -> ${currentShow}`);
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
