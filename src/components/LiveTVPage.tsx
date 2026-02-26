/**
 * FLIXIFY LIVE TV PAGE - Performance Optimized
 * 
 * Uses selective subscriptions to minimize re-renders
 */

import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VideoPlayer } from './VideoPlayer';
import { useIPTVStore, useDisplayedChannels, useIPTVLoading, useIPTVError } from '../store/useIPTVStore';
import { useCountries, useFilteredChannels } from '../store/useIPTVStore';
import { useProfile } from '../contexts/AuthContext';
import { UpgradePrompt } from './UpgradePrompt';
import type { Channel } from '../lib/iptvApi';

import {
  Search, Tv, Globe, Play, Grid3X3,
  List, ArrowLeft, Loader2, AlertCircle
} from 'lucide-react';

const countryGradients: Record<string, string> = {
  'TR': 'from-red-600 via-red-500 to-orange-500',
  'RU': 'from-blue-600 via-blue-500 to-white',
  'US': 'from-blue-700 via-red-600 to-white',
  'UK': 'from-blue-600 via-red-500 to-blue-400',
  'DE': 'from-yellow-500 via-red-500 to-black',
  'FR': 'from-blue-600 via-white to-red-500',
  'IT': 'from-green-500 via-white to-red-500',
  'ES': 'from-yellow-500 via-red-500 to-yellow-500',
  'default': 'from-surface-hover via-surface to-background',
};

// Memoized country selection view
const CountrySelectionView = memo(function CountrySelectionView({
  countries,
  countrySearch,
  setCountrySearch,
  selectCountry,
  isLoading,
  error,
  retry,
}: any) {
  const popularCountries = countries.slice(0, 2);
  const otherCountries = countries.slice(2, 62);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 size={48} className="text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Yükleme Hatası</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={retry}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-12 h-20">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv size={24} className="text-primary" />
            FLIXIFY <span className="text-white/60">| Canlı TV</span>
          </h1>
          <div className="relative max-w-md w-full hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Ülke ara..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-12 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6">Ülke Seçin</h2>
          <p className="text-white/60 text-lg">İzlemek istediğiniz ülkenin kanallarını keşfedin</p>
        </div>

        {/* Popular Countries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {popularCountries.map((country: any) => (
            <button
              key={country.code}
              onClick={() => selectCountry(country.code)}
              className={`group relative overflow-hidden rounded-2xl h-48 text-left
                         bg-gradient-to-br ${countryGradients[country.code] || countryGradients.default}
                         hover:scale-[1.02] transition-transform duration-300`}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 h-full flex flex-col justify-between p-6">
                <div>
                  <span className="text-5xl">{country.flag}</span>
                  <h3 className="text-3xl font-black text-white mt-2">{country.name}</h3>
                </div>
                <span className="text-white/80 font-medium">{country.channelCount} kanal</span>
              </div>
            </button>
          ))}
        </div>

        {/* Other Countries */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">
          {otherCountries.map((country: any) => (
            <button
              key={country.code}
              onClick={() => selectCountry(country.code)}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center
                       hover:bg-white/10 hover:border-primary transition-all"
            >
              <span className="text-4xl mb-2 block">{country.flag}</span>
              <h4 className="font-semibold text-white text-sm truncate">{country.name}</h4>
              <p className="text-xs text-white/50">{country.channelCount} kanal</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
});

// Optimized channel list view
const ChannelListView = memo(function ChannelListView({
  selectedCountryCode,
  displayedChannels,
  filteredChannels,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  goBack,
  setSelectedChannel,
  loadMore,
  hasMore,
  countries,
  isLoading,
}: any) {
  const country = countries.find((c: any) => c.code === selectedCountryCode);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-8 h-20">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country?.flag}</span>
              <div>
                <h1 className="text-xl font-bold">{country?.name} Canlı TV</h1>
                <p className="text-xs text-white/50">{filteredChannels.length} kanal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kanal ara..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-primary/50 outline-none"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary text-white' : 'text-white/50'}`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-white/50'}`}
              >
                <Grid3X3 size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : displayedChannels.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <div className="space-y-2 max-w-4xl">
                {displayedChannels.map((channel: Channel) => (
                  <div
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
                      <Tv size={20} className="text-white/40" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white group-hover:text-primary">{channel.name}</h4>
                      <p className="text-xs text-white/50">{channel.group}</p>
                    </div>
                    <Play size={16} className="text-white/30 group-hover:text-white" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {displayedChannels.map((channel: Channel) => (
                  <div
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className="aspect-video bg-white/5 rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-white/10 hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Tv size={32} className="text-white/30 mb-2" />
                    <span className="text-sm font-medium text-center truncate w-full">{channel.name}</span>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Daha Fazla Yükle
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Tv size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Kanal bulunamadı</p>
          </div>
        )}
      </main>
    </div>
  );
});

// Main LiveTV Page Component
export function LiveTVPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useProfile();
  const queryParams = new URLSearchParams(location.search);
  const selectedCountryCode = queryParams.get('ulke');

  // Selective subscriptions - only subscribe to needed state
  const countries = useCountries();
  const filteredChannels = useFilteredChannels();
  const displayedChannels = useDisplayedChannels();
  const isLoading = useIPTVLoading();
  const error = useIPTVError();
  const hasMore = useIPTVStore(state => state.hasMore);
  const selectedChannel = useIPTVStore(state => state.selectedChannel);
  const streamUrl = useIPTVStore(state => state.streamUrl);
  
  // Actions
  const loadPlaylist = useIPTVStore(state => state.loadPlaylist);
  const selectCountry = useIPTVStore(state => state.selectCountry);
  const setSearchQuery = useIPTVStore(state => state.setSearchQuery);
  const selectChannel = useIPTVStore(state => state.selectChannel);
  const closePlayer = useIPTVStore(state => state.closePlayer);
  const loadMore = useIPTVStore(state => state.loadMore);

  // Local UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setLocalSearchQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  // Load playlist once on mount
  useEffect(() => {
    if (countries.length === 0) {
      loadPlaylist();
    }
  }, [countries.length, loadPlaylist]);

  // Handle country selection
  useEffect(() => {
    if (selectedCountryCode) {
      selectCountry(selectedCountryCode);
    }
  }, [selectedCountryCode, selectCountry]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timeout);
  }, [searchQuery, setSearchQuery]);

  // Handlers
  const handleSelectCountry = useCallback((code: string) => {
    navigate(`/canli-tv?ulke=${code}`);
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    setLocalSearchQuery('');
    setSearchQuery('');
    navigate('/canli-tv');
  }, [navigate, setSearchQuery]);

  const handleSelectChannel = useCallback(async (channel: Channel) => {
    await selectChannel(channel);
  }, [selectChannel]);

  const handleClosePlayer = useCallback(() => {
    closePlayer();
  }, [closePlayer]);

  const handleSearchChange = useCallback((query: string) => {
    setLocalSearchQuery(query);
    setSearchQuery(query);
  }, [setSearchQuery]);

  // Show upgrade prompt if no subscription
  if (!profile?.m3u_url && !profile?.subscription_expiry) {
    return <UpgradePrompt />;
  }

  if (!selectedCountryCode) {
    return (
      <CountrySelectionView
        countries={countries}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
        selectCountry={handleSelectCountry}
        isLoading={isLoading}
        error={error}
        retry={loadPlaylist}
      />
    );
  }

  return (
    <>
      <ChannelListView
        selectedCountryCode={selectedCountryCode}
        displayedChannels={displayedChannels}
        filteredChannels={filteredChannels}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        goBack={handleGoBack}
        setSelectedChannel={handleSelectChannel}
        loadMore={loadMore}
        hasMore={hasMore}
        countries={countries}
        isLoading={isLoading}
      />

      {selectedChannel && streamUrl && (
        <VideoPlayer
          channel={selectedChannel}
          streamUrl={streamUrl}
          onClose={handleClosePlayer}
        />
      )}
    </>
  );
}

export default LiveTVPage;
