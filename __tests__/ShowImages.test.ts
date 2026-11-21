import {
  normalizeShowName,
  REMOTE_SHOW_IMAGE_BASE_URL,
} from '../src/utils/ShowImages';

describe('normalizeShowName', () => {
  test('turns schedule names into the file slug used on the server', () => {
    expect(normalizeShowName('Sound Principles')).toBe('sound-principles');
    expect(normalizeShowName("Late Risers' Club")).toBe('late-risers-club');
    expect(normalizeShowName('Research & Development')).toBe(
      'research-and-development',
    );
  });

  test('drops the rebroadcast suffix so rebroadcasts share the original art', () => {
    expect(normalizeShowName('Sewersounds (rebroadcast)')).toBe('sewersounds');
  });
});

describe('getShowImage', () => {
  // getShowImage keeps a per-session cache, so each test loads a fresh copy of
  // the module to start with an empty cache.
  const loadGetShowImage = () => {
    let getShowImage: typeof import('../src/utils/ShowImages').getShowImage;
    jest.isolateModules(() => {
      getShowImage = require('../src/utils/ShowImages').getShowImage;
    });
    return getShowImage!;
  };

  const mockFetch = (implementation: jest.Mock) => {
    global.fetch = implementation as unknown as typeof fetch;
    return implementation;
  };

  test('uses the remote image when the server has the file', async () => {
    const fetchMock = mockFetch(jest.fn().mockResolvedValue({ ok: true }));
    const getShowImage = loadGetShowImage();

    const artwork = await getShowImage('Sound Principles');

    expect(artwork).toBe(`${REMOTE_SHOW_IMAGE_BASE_URL}/sound-principles.jpg`);
    expect(fetchMock).toHaveBeenCalledWith(
      `${REMOTE_SHOW_IMAGE_BASE_URL}/sound-principles.jpg`,
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  test('falls back to the bundled image when the server has no file', async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: false }));
    const getShowImage = loadGetShowImage();

    const artwork = await getShowImage('Breakfast of Champions');

    expect(artwork).toEqual(
      require('@assets/showImages/breakfastofchampions.jpg'),
    );
  });

  test('falls back to the WMBR cover when the request fails', async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error('Network request failed')));
    const getShowImage = loadGetShowImage();

    const artwork = await getShowImage('Unknown Show');

    expect(artwork).toEqual(require('@assets/cover.png'));
  });

  test('checks each show only once per session', async () => {
    const fetchMock = mockFetch(jest.fn().mockResolvedValue({ ok: false }));
    const getShowImage = loadGetShowImage();

    await getShowImage('Unknown Show');
    await getShowImage('Unknown Show');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
