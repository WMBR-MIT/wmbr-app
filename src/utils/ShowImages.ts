import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import slugify from 'slugify';
import { Track } from 'react-native-track-player';

export const SHOW_IMAGES: Record<string, any> = {
  'Breakfast of Champions': require('@assets/showImages/breakfastofchampions.jpg'),
  'The Willows': require('@assets/showImages/the-willows.jpg'),
  Coffeetime: require('@assets/showImages/coffeetime.jpg'),
};

export const REMOTE_SHOW_IMAGE_BASE_URL = 'https://wmbr.org/images/show-thumbs';

// Long enough for a normal response, short enough that playback isn't held up
// when the server is slow or unreachable.
const REMOTE_CHECK_TIMEOUT_MS = 3000;

// Turns a schedule show name into the slug used for its remote image file,
// e.g. "Nonstop Ecstatic Screaming" -> "nonstop-ecstatic-screaming" and
// "Research & Development" -> "research-and-development".
export const normalizeShowName = (showName: string): string => {
  // Rebroadcasts share the original show's artwork, so drop the suffix first.
  const nameWithoutRebroadcast = showName.replace(/\s*\(rebroadcast\)$/i, '');

  // `strict` removes punctuation (parentheses, "!", "+", apostrophes, ...) and
  // `lower` lowercases; slugify also transliterates accents to ASCII.
  return slugify(nameWithoutRebroadcast, { lower: true, strict: true });
};

// Outcome of asking the server for a show's image:
// - 'found': the file exists.
// - 'missing': the server confirmed there is no file (HTTP 404).
// - 'failed': the check didn't get a clear answer (timeout, network error,
//   server error, ...), so it may succeed later.
type RemoteImageCheck = 'found' | 'missing' | 'failed';

// Remembers each show's confirmed outcome ('found' with its URL, or 'missing')
// for the rest of the app session, so those shows aren't re-checked. 'failed'
// checks are never stored, so they're retried the next time the show is looked up.
const remoteImageCache = new Map<
  string,
  { check: 'found'; imageUrl: string } | { check: 'missing' }
>();

// Sends a HEAD request, which asks whether the file exists without downloading
// it. Only a 404 counts as a confirmed missing file; other responses and
// connection problems are 'failed'.
const checkRemoteImage = async (
  imageUrl: string,
): Promise<RemoteImageCheck> => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    REMOTE_CHECK_TIMEOUT_MS,
  );

  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: abortController.signal,
    });
    if (response.ok) {
      return 'found';
    }
    return response.status === 404 ? 'missing' : 'failed';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timeoutId);
  }
};

// Returns the show's own artwork: the image on the WMBR server if there is one,
// otherwise the bundled image. Returns undefined when neither exists, so each
// caller can pick its own fallback.
export const getShowImage = async (
  showName: string,
): Promise<Track['artwork']> => {
  const slug = normalizeShowName(showName);

  let cachedResult = remoteImageCache.get(slug);
  if (!cachedResult) {
    const imageUrl = `${REMOTE_SHOW_IMAGE_BASE_URL}/${slug}.jpg`;
    const check = await checkRemoteImage(imageUrl);

    if (check === 'failed') {
      // Not cached, so a later lookup will check again. This call uses the
      // bundled image.
      return SHOW_IMAGES[showName];
    }

    cachedResult =
      check === 'found' ? { check: 'found', imageUrl } : { check: 'missing' };
    remoteImageCache.set(slug, cachedResult);
  }

  if (cachedResult.check === 'found') {
    return cachedResult.imageUrl;
  }

  return SHOW_IMAGES[showName];
};

// While a show has no remote image, the hook looks it up again every minute, at
// most this many times (per show).
const SHOW_IMAGE_RETRY_INTERVAL_MS = 60 * 1000;
const SHOW_IMAGE_MAX_RETRIES = 5;

// Keeps a show's artwork (see getShowImage) in state. Until the lookup finishes,
// the hook returns the bundled image, so something shows right away.
//
// A show with no remote image is retried every minute, up to five times. Coming
// back to the foreground starts a fresh set of retries, since the phone may
// have been offline while the app was in the background. Confirmed results are
// cached, so repeated lookups don't re-check those shows.
export const useShowArtwork = (showName: string): Track['artwork'] => {
  const [showArtwork, setShowArtwork] = useState<{
    showName: string;
    artwork: Track['artwork'];
  }>({
    showName,
    artwork: SHOW_IMAGES[showName],
  });
  const [retryCount, setRetryCount] = useState(0);
  const hasRemoteImage = typeof showArtwork === 'string';

  // A new show starts its retries from scratch.
  useEffect(() => {
    setRetryCount(0);
  }, [showName]);

  // Returning to the foreground gives the lookup a fresh set of retries.
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          setRetryCount(0);
        }
      },
    );

    return () => appStateSubscription.remove();
  }, []);

  // Schedules the next retry one minute later, stopping once the remote image
  // is found or the retries are used up. Each retry schedules the next one.
  useEffect(() => {
    if (hasRemoteImage || retryCount >= SHOW_IMAGE_MAX_RETRIES) {
      return;
    }

    const retryTimeoutId = setTimeout(() => {
      setRetryCount(previousCount => previousCount + 1);
    }, SHOW_IMAGE_RETRY_INTERVAL_MS);

    return () => clearTimeout(retryTimeoutId);
  }, [hasRemoteImage, retryCount, showName]);

  useEffect(() => {
    // Ignore a lookup that finishes after the show has already changed.
    let isCurrentLookup = true;

    getShowImage(showName).then(artwork => {
      if (isCurrentLookup) {
        setShowArtwork({ showName, artwork });
      }
    });

    return () => {
      isCurrentLookup = false;
    };
  }, [showName, retryCount]);

  // Ensure we're getting the correct show artwork
  return showArtwork.showName === showName
    ? showArtwork.artwork
    : SHOW_IMAGES[showName];
};
