/**
 * FLIXIFY IPTV STORE - Performance Optimized
 * 
 * Uses selective subscriptions to prevent unnecessary re-renders
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  fetchPlaylist,
  generateStreamToken,
  getProxyStreamUrl,
  filterChannels,
  type Channel,
  type Country,
} from '../lib/iptvApi';

interface IPTVState {
  // Data
  channels: Channel[];
  countries: Country[];
  filteredChannels: Channel[];
  selectedCountry: string | null;
  searchQuery: string;
  
  // Stream
  selectedChannel: Channel | null;
  streamToken: string | null;
  streamUrl: string | null;
  
  // UI State
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Pagination
  page: number;
  itemsPerPage: number;
  hasMore: boolean;
  
  // Actions
  loadPlaylist: () => Promise<void>;
  selectCountry: (countryCode: string | null) => void;
  setSearchQuery: (query: string) => void;
  selectChannel: (channel: Channel | null) => Promise<void>;
  closePlayer: () => void;
  loadMore: () => void;
  clearError: () => void;
  
  // Computed
  getDisplayedChannels: () => Channel[];
  getChannelsByCountry: (countryCode: string) => Channel[];
}

export const useIPTVStore = create<IPTVState>()(
  immer(
    persist(
      (set, get) => ({
        // Initial State
        channels: [],
        countries: [],
        filteredChannels: [],
        selectedCountry: null,
        searchQuery: '',
        selectedChannel: null,
        streamToken: null,
        streamUrl: null,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        page: 1,
        itemsPerPage: 50,
        hasMore: false,

        // Load Playlist
        loadPlaylist: async () => {
          const state = get();
          if (state.isLoading) return;

          set(draft => { draft.isLoading = true; draft.error = null; });

          try {
            const response = await fetchPlaylist();
            
            const filtered = filterChannels(
              response.channels,
              state.searchQuery,
              state.selectedCountry || undefined
            );

            set(draft => {
              draft.channels = response.channels;
              draft.countries = response.countries;
              draft.filteredChannels = filtered;
              draft.hasMore = filtered.length > draft.itemsPerPage;
              draft.isLoading = false;
            });
          } catch (error: any) {
            set(draft => {
              draft.error = error.message || 'Failed to load playlist';
              draft.isLoading = false;
            });
          }
        },

        // Select Country
        selectCountry: (countryCode) => {
          const { channels, searchQuery, itemsPerPage } = get();
          
          const filtered = filterChannels(
            channels,
            searchQuery,
            countryCode || undefined
          );

          set(draft => {
            draft.selectedCountry = countryCode;
            draft.filteredChannels = filtered;
            draft.page = 1;
            draft.hasMore = filtered.length > itemsPerPage;
          });
        },

        // Set Search Query
        setSearchQuery: (query) => {
          const { channels, selectedCountry, itemsPerPage } = get();
          
          const filtered = filterChannels(
            channels,
            query,
            selectedCountry || undefined
          );

          set(draft => {
            draft.searchQuery = query;
            draft.filteredChannels = filtered;
            draft.page = 1;
            draft.hasMore = filtered.length > itemsPerPage;
          });
        },

        // Select Channel (Start Stream)
        selectChannel: async (channel) => {
          if (!channel) {
            set(draft => {
              draft.selectedChannel = null;
              draft.streamToken = null;
              draft.streamUrl = null;
            });
            return;
          }

          set(draft => { draft.isLoading = true; draft.error = null; });

          try {
            const tokenResponse = await generateStreamToken(channel.id);
            const proxyUrl = getProxyStreamUrl(channel.id, tokenResponse.token);

            set(draft => {
              draft.selectedChannel = channel;
              draft.streamToken = tokenResponse.token;
              draft.streamUrl = proxyUrl;
              draft.isLoading = false;
            });

            // Start heartbeat
            startHeartbeat(tokenResponse.token);

          } catch (error: any) {
            set(draft => {
              draft.error = error.message || 'Failed to start stream';
              draft.isLoading = false;
              draft.selectedChannel = null;
              draft.streamToken = null;
              draft.streamUrl = null;
            });
          }
        },

        // Close Player
        closePlayer: () => {
          const { streamToken } = get();
          
          if (streamToken) {
            stopHeartbeat();
            fetch('/api/stream/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: streamToken }),
            }).catch(() => {});
          }

          set(draft => {
            draft.selectedChannel = null;
            draft.streamToken = null;
            draft.streamUrl = null;
          });
        },

        // Load More (Pagination)
        loadMore: () => {
          const { filteredChannels, itemsPerPage } = get();
          set(draft => {
            draft.page += 1;
            draft.hasMore = (draft.page * itemsPerPage) < filteredChannels.length;
          });
        },

        // Clear Error
        clearError: () => set(draft => { draft.error = null; }),

        // Get Displayed Channels
        getDisplayedChannels: () => {
          const { filteredChannels, page, itemsPerPage } = get();
          return filteredChannels.slice(0, page * itemsPerPage);
        },

        // Get Channels By Country
        getChannelsByCountry: (countryCode) => {
          const { channels } = get();
          return channels.filter(ch => ch.countryCode === countryCode);
        },
      }),
      {
        name: 'flixify-iptv-storage',
        partialize: (state) => ({
          channels: state.channels,
          countries: state.countries,
        }),
      }
    )
  )
);

// Heartbeat management
let heartbeatInterval: NodeJS.Timeout | null = null;

function startHeartbeat(token: string) {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    fetch('/api/stream/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token }),
    }).catch(() => {
      stopHeartbeat();
    });
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Selectors for better performance
export const useChannels = () => useIPTVStore(state => state.channels);
export const useCountries = () => useIPTVStore(state => state.countries);
export const useFilteredChannels = () => useIPTVStore(state => state.filteredChannels);
export const useSelectedChannel = () => useIPTVStore(state => state.selectedChannel);
export const useStreamUrl = () => useIPTVStore(state => state.streamUrl);
export const useIPTVLoading = () => useIPTVStore(state => state.isLoading);
export const useIPTVError = () => useIPTVStore(state => state.error);
export const useDisplayedChannels = () => {
  const filtered = useIPTVStore(state => state.filteredChannels);
  const page = useIPTVStore(state => state.page);
  const itemsPerPage = useIPTVStore(state => state.itemsPerPage);
  return filtered.slice(0, page * itemsPerPage);
};
