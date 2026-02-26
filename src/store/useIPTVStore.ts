/**
 * FLIXIFY IPTV STORE
 * 
 * Yeni API ile entegre, performans optimize edilmiş Zustand store.
 * Mevcut tema (LiveTVPage) ile uyumlu çalışır.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  
  // Derived
  displayedChannels: () => Channel[];
}

export const useIPTVStore = create<IPTVState>()(
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

      // Load Playlist from API
      loadPlaylist: async () => {
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const response = await fetchPlaylist();
          
          const filtered = filterChannels(
            response.channels,
            state.searchQuery,
            state.selectedCountry || undefined
          );

          set({
            channels: response.channels,
            countries: response.countries,
            filteredChannels: filtered,
            hasMore: filtered.length > state.itemsPerPage,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('[IPTV Store] Load playlist error:', error);
          set({
            error: error.message || 'Failed to load playlist',
            isLoading: false,
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

        set({
          selectedCountry: countryCode,
          filteredChannels: filtered,
          page: 1,
          hasMore: filtered.length > itemsPerPage,
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

        set({
          searchQuery: query,
          filteredChannels: filtered,
          page: 1,
          hasMore: filtered.length > itemsPerPage,
        });
      },

      // Select Channel (Start Stream)
      selectChannel: async (channel) => {
        if (!channel) {
          set({ selectedChannel: null, streamToken: null, streamUrl: null });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Önceki stream'i temizle
          const { streamToken } = get();
          if (streamToken) {
            // Cleanup previous session (async, no await)
            fetch('/api/stream/end', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken: streamToken }),
            }).catch(() => {});
          }

          // Yeni token al
          const tokenResponse = await generateStreamToken(channel.id);
          const proxyUrl = getProxyStreamUrl(channel.id, tokenResponse.token);

          set({
            selectedChannel: channel,
            streamToken: tokenResponse.token,
            streamUrl: proxyUrl,
            isLoading: false,
          });

          // Heartbeat başlat (30 saniyede bir)
          startHeartbeat(tokenResponse.token);

        } catch (error: any) {
          console.error('[IPTV Store] Select channel error:', error);
          set({
            error: error.message || 'Failed to start stream',
            isLoading: false,
            selectedChannel: null,
            streamToken: null,
            streamUrl: null,
          });
        }
      },

      // Close Player
      closePlayer: () => {
        const { streamToken } = get();
        
        if (streamToken) {
          stopHeartbeat();
          
          // Session'ı sonlandır
          fetch('/api/stream/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: streamToken }),
          }).catch(() => {});
        }

        set({
          selectedChannel: null,
          streamToken: null,
          streamUrl: null,
        });
      },

      // Load More (Pagination)
      loadMore: () => {
        const { page, itemsPerPage, filteredChannels } = get();
        const newPage = page + 1;
        const displayedCount = newPage * itemsPerPage;
        
        set({
          page: newPage,
          hasMore: displayedCount < filteredChannels.length,
        });
      },

      // Clear Error
      clearError: () => set({ error: null }),

      // Get Displayed Channels (computed)
      displayedChannels: () => {
        const { filteredChannels, page, itemsPerPage } = get();
        return filteredChannels.slice(0, page * itemsPerPage);
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
);

// Heartbeat management
let heartbeatInterval: NodeJS.Timeout | null = null;

function startHeartbeat(token: string) {
  stopHeartbeat(); // Eski varsa temizle
  
  heartbeatInterval = setInterval(() => {
    fetch('/api/stream/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token }),
    }).catch(() => {
      // Hata durumunda heartbeat'i durdur
      stopHeartbeat();
    });
  }, 30000); // 30 saniye
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Export individual selectors for performance
export const useChannels = () => useIPTVStore(state => state.channels);
export const useCountries = () => useIPTVStore(state => state.countries);
export const useSelectedChannel = () => useIPTVStore(state => state.selectedChannel);
export const useStreamUrl = () => useIPTVStore(state => state.streamUrl);
export const useIPTVLoading = () => useIPTVStore(state => state.isLoading);
export const useIPTVError = () => useIPTVStore(state => state.error);
