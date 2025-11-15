import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  generateNowPlayingXml,
  generatePlaylistResponse,
  generateScheduleXml,
  TestWrapper,
} from '../src/utils/TestUtils';
import RecentlyPlayed from '../src/app/RecentlyPlayed/RecentlyPlayed';
import { createMockFetch } from '../__mocks__/MockNetworkResponses';

const scheduleXml = generateScheduleXml();
const playlistResponse = generatePlaylistResponse();
const nowPlayingXml = generateNowPlayingXml('Post-tentious');

jest.spyOn(global, 'fetch').mockImplementation(
  createMockFetch({
    scheduleXml,
    playlistResponse,
    nowPlayingXml,
  }),
);

describe('RecentlyPlayed', () => {
  test('shows songs for a provided current show', async () => {
    // Render the component
    render(<RecentlyPlayed />, { wrapper: TestWrapper });

    // The mock playlist for "Post-tentious" contains songs by Fugazi and Slint
    expect(await screen.findByText('Waiting Room')).toBeTruthy();
    expect(await screen.findByText('Fugazi')).toBeTruthy();
  });
});
