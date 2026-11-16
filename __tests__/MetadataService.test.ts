import MetadataService from '@services/MetadataService';

const metadataXml = `
<wmbr_show>&lt;b&gt;Test Show&lt;/b&gt;</wmbr_show>
<wmbr_plays>&lt;p class="recent"&gt;7:59p &lt;b&gt;Test Artist&lt;/b&gt;: First Song&lt;/p&gt;</wmbr_plays>`;

// Only the network boundary is mocked; parsing and subscriptions run normally.
const xmlResponse = (xml: string, ok = true): Response =>
  ({ ok, text: async () => xml }) as Response;

describe('MetadataService polling', () => {
  let service: MetadataService;
  const onMetadata = jest.fn();
  const onSongHistory = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    onMetadata.mockClear();
    onSongHistory.mockClear();
    service = new MetadataService();
    service.subscribe(onMetadata);
    service.subscribeSongHistory(onSongHistory);
    jest.mocked(fetch).mockReset();
    jest.mocked(fetch).mockResolvedValue(xmlResponse(metadataXml));
  });

  afterEach(() => {
    service.stopPolling();
    jest.useRealTimers();
  });

  it('keeps fetching but skips subscriber updates for identical XML', async () => {
    service.startPolling(30000);
    await jest.advanceTimersByTimeAsync(0);
    expect(onMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ currentSong: 'First Song' }),
    );
    expect(onSongHistory).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'First Song' }),
    ]);

    await jest.advanceTimersByTimeAsync(30000);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onMetadata).toHaveBeenCalledTimes(1);
    expect(onSongHistory).toHaveBeenCalledTimes(1);
  });

  it('delivers changed song metadata and history on the next poll', async () => {
    service.startPolling(30000);
    await jest.advanceTimersByTimeAsync(0);
    jest
      .mocked(fetch)
      .mockResolvedValue(
        xmlResponse(metadataXml.replace('First Song', 'Next Song')),
      );

    await jest.advanceTimersByTimeAsync(30000);

    expect(onMetadata).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentSong: 'Next Song' }),
    );
    expect(onSongHistory).toHaveBeenLastCalledWith([
      expect.objectContaining({ title: 'Next Song' }),
    ]);
    expect(onMetadata).toHaveBeenCalledTimes(2);
  });

  it('delivers the first response again when polling restarts', async () => {
    service.startPolling(30000);
    await jest.advanceTimersByTimeAsync(0);

    service.startPolling(30000);
    await jest.advanceTimersByTimeAsync(0);

    expect(onMetadata).toHaveBeenCalledTimes(2);
    expect(onSongHistory).toHaveBeenCalledTimes(2);
  });

  it.each(['network', 'http'])(
    'restores unchanged metadata after a %s failure',
    async failure => {
      service.startPolling(30000);
      await jest.advanceTimersByTimeAsync(0);

      if (failure === 'network') {
        jest.mocked(fetch).mockRejectedValueOnce(new Error('Offline'));
      } else {
        jest.mocked(fetch).mockResolvedValueOnce(xmlResponse('', false));
      }
      await jest.advanceTimersByTimeAsync(30000);
      onMetadata.mockClear();
      onSongHistory.mockClear();

      await jest.advanceTimersByTimeAsync(30000);

      expect(onMetadata).toHaveBeenCalledTimes(1);
      expect(onMetadata).toHaveBeenLastCalledWith(
        expect.objectContaining({ currentSong: 'First Song' }),
      );
      expect(onSongHistory).toHaveBeenCalledTimes(1);
    },
  );
});
