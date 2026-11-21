import { useEffect, useState } from 'react';
import slugify from 'slugify';
import { Track } from 'react-native-track-player';

export const SHOW_IMAGES: Record<string, any> = {
  'Breakfast of Champions': require('@assets/showImages/breakfastofchampions.jpg'),
  'The Willows': require('@assets/showImages/the-willows.jpg'),
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

// Remembers each show's remote check (URL, or null when no file was found) for
// the rest of the app session, so every show is only checked once. A show whose
// check failed to connect is also remembered as missing, until the app restarts.
const remoteImageUrlCache = new Map<string, string | null>();

// Sends a HEAD request, which asks whether the file exists without downloading
// it. Any network error or timeout counts as "not there".
const remoteImageExists = async (imageUrl: string): Promise<boolean> => {
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
    return response.ok;
  } catch {
    return false;
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

  if (!remoteImageUrlCache.has(slug)) {
    const imageUrl = `${REMOTE_SHOW_IMAGE_BASE_URL}/${slug}.jpg`;
    const foundRemotely = await remoteImageExists(imageUrl);
    remoteImageUrlCache.set(slug, foundRemotely ? imageUrl : null);
  }

  const remoteImageUrl = remoteImageUrlCache.get(slug);
  if (remoteImageUrl) {
    return remoteImageUrl;
  }

  return SHOW_IMAGES[showName];
};

// Keeps a show's artwork (see getShowImage) in state. Until the lookup finishes,
// the hook returns the bundled image, so something shows right away.
export const useShowArtwork = (showName: string): Track['artwork'] => {
  const [showArtwork, setShowArtwork] = useState<Track['artwork']>(
    SHOW_IMAGES[showName],
  );

  useEffect(() => {
    // Ignore a lookup that finishes after the show has already changed.
    let isCurrentLookup = true;

    getShowImage(showName).then(artwork => {
      if (isCurrentLookup) {
        setShowArtwork(artwork);
      }
    });

    return () => {
      isCurrentLookup = false;
    };
  }, [showName]);

  return showArtwork;
};
