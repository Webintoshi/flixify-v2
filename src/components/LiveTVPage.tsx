/**
 * FLIXIFY LIVE TV PAGE
 * 
 * Netflix-style Live TV interface.
 * Yeni IPTV API ile entegre, tema korunmuştur.
 */

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VideoPlayer } from './VideoPlayer';
import { useIPTVStore } from '../store/useIPTVStore';
import { useAuth } from '../contexts/AuthContext';
import { UpgradePrompt } from './UpgradePrompt';
import type { Channel } from '../lib/iptvApi';

import {
  Search, Tv, Globe, Play, Grid3X3,
  List, ArrowLeft, Star, Loader2, AlertCircle
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
  'MY_LIST': 'from-primary via-primary-hover to-black',
  'default': 'from-surface-hover via-surface to-background',
};

const CHANNELS_PER_PAGE = 50;

// Optimized country selection page component
const CountrySelectionView = memo(function CountrySelectionView({
  profile,
  countries,
  countrySearch,
  setCountrySearch,
  activeRegion,
  setActiveRegion,
  selectCountry,
  navigate,
  isLoading,
  error,
  retry,
}: any) {
  const popularCountries = countries.slice(0, 2);
  const otherCountries = countries.slice(2, 62);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return otherCountries;
    return [...popularCountries, ...otherCountries].filter((c: any) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countries, countrySearch]);

  const getChannelCountText = useCallback((country: any) => {
    return `${country.channelCount} kanal`;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/60">Kanallar yükleniyor...</p>
        </div>
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 group text-white hover:text-primary transition-colors"
            >
              <div className="p-2 rounded-full bg-surface group-hover:bg-primary/20 transition-colors">
                <ArrowLeft size={20} />
              </div>
              <div className="flex items-center gap-2">
                <Tv size={24} className="text-primary" />
                <span className="text-xl font-bold tracking-tight hidden md:block">FLIXIFY</span>
                <span className="text-xl font-medium text-foreground-muted hidden md:block">| Canlı TV</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative group max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <input
                type="text"
                placeholder="Ülke ara..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-surface/50 border border-white/10 rounded-full text-sm text-white placeholder-foreground-muted focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-full border border-white/5">
              <Globe size={16} className="text-foreground-muted" />
              <span className="text-white text-sm font-medium">TR</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative pb-24">
        <div className="container mx-auto px-4 pt-12 md:pt-20 relative z-10">
          <div className="flex flex-col items-center justify-center text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-white/80 text-sm font-medium mb-8">
              <Globe size={16} className="text-primary" />
              <span>{countries.reduce((acc: number, c: any) => acc + c.channelCount, 0)}+ Kanal · {countries.length}+ Ülke</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Ülke Seçin
            </h2>
            <p className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto font-medium">
              İzlemek istediğiniz ülkenin kanallarını keşfedin
            </p>

            <div className="w-full max-w-md mx-auto mt-8 relative md:hidden">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <input
                type="text"
                placeholder="Ülke veya kanal ara..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 rounded-full py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 md:mt-12">
              {['Tümü', '🔥 Popüler', '🌍 Avrupa', '🌏 Asya', '🌎 Amerika'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRegion(tab)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${activeRegion === tab
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                    : 'bg-white/5 text-foreground-muted border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Popular Countries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {popularCountries.map((country: any) => (
                <button
                  key={country.code}
                  onClick={() => selectCountry(country.code)}
                  className={`group relative overflow-hidden rounded-2xl h-40 md:h-56 text-left
                             bg-gradient-to-br ${countryGradients[country.code] || 'from-surface to-background'}
                             hover:scale-[1.02] transition-all duration-300 shadow-xl border border-white/5`}
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-wider">
                          🔥 Popüler
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-black/40 px-2 py-1 rounded-full border border-green-500/20">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          {getChannelCountText(country)}
                        </span>
                      </div>
                      <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-3">
                        <span className="text-3xl">{country.flag}</span>
                        {country.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-semibold text-sm">İzlemeye Başla</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Other Countries Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {filteredCountries.map((country: any) => (
                <button
                  key={country.code}
                  onClick={() => selectCountry(country.code)}
                  className="group relative bg-[#141414] border border-white/5 rounded-xl p-4 md:p-6 text-center
                           hover:bg-[#1E1E1E] hover:border-primary transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="mb-3 md:mb-4 flex justify-center">
                    <span className="text-5xl md:text-6xl">{country.flag}</span>
                  </div>
                  <h4 className="font-semibold text-white/90 text-sm md:text-base truncate mb-1">
                    {country.name}
                  </h4>
                  <p className="text-xs text-foreground-muted font-medium">
                    {country.channelCount} kanal
                  </p>
                </button>
              ))}
            </div>
          </div>
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
  const getCountryName = useCallback((code: string) => {
    const country = countries.find((c: any) => c.code === code);
    return country?.name || code;
  }, [countries]);

  const getCountryFlag = useCallback((code: string) => {
    const country = countries.find((c: any) => c.code === code);
    return country?.flag || code;
  }, [countries]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-8 h-20">
          <div className="flex items-center gap-6">
            <button onClick={goBack} className="p-2.5 rounded-full bg-surface/80 hover:bg-surface text-white border border-white/5 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-surface to-background border border-white/10 flex items-center justify-center text-2xl shadow-xl">
                {getCountryFlag(selectedCountryCode)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{getCountryName(selectedCountryCode)} Canlı TV</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">{filteredChannels.length} Aktif Yayın</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kanal ara..."
                className="w-full pl-11 pr-10 py-2.5 bg-surface border border-border rounded-lg text-white 
                         placeholder-foreground-muted focus:outline-none focus:border-primary/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-hover rounded-full"
                >
                  <span className="text-foreground-muted">×</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-foreground-muted hover:text-white'}`}
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-foreground-muted hover:text-white'}`}
            >
              <Grid3X3 size={20} />
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara..."
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-white placeholder-foreground-muted focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="text-primary animate-spin" />
          </div>
        ) : displayedChannels.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {displayedChannels.map((channel: Channel, index: number) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    index={index}
                    onClick={() => setSelectedChannel(channel)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayedChannels.map((channel: Channel, index: number) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    index={index}
                    onClick={() => setSelectedChannel(channel)}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-surface hover:bg-surface-hover text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Tv size={64} className="text-foreground-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Kanal Bulunamadı</h3>
            <p className="text-foreground-muted">
              {searchQuery ? `"${searchQuery}" için sonuç bulunamadı` : 'Bu ülkede kanal bulunmuyor'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
});

// Optimized channel row component
const ChannelRow = memo(function ChannelRow({ channel, index, onClick }: { 
  channel: Channel; 
  index: number; 
  onClick: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-surface/40 backdrop-blur-sm border border-white/5 rounded-xl hover:bg-surface/80 hover:border-white/10 cursor-pointer group transition-all duration-200"
      style={{ animationDelay: `${index * 10}ms` }}
    >
      <div className="w-20 h-14 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <Tv size={20} className="text-foreground-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <h4 className="font-bold text-base text-white group-hover:text-primary transition-colors truncate">{channel.name}</h4>
        </div>
        <p className="text-xs text-foreground-muted font-medium uppercase tracking-wider">{channel.group || 'Genel'}</p>
      </div>
      <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white group-hover:bg-primary group-hover:border-primary transition-all flex-shrink-0">
        <Play size={16} fill="currentColor" className="ml-0.5" />
      </button>
    </div>
  );
});

// Optimized channel card component
const ChannelCard = memo(function ChannelCard({ channel, index, onClick }: { 
  channel: Channel; 
  index: number; 
  onClick: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative aspect-video bg-surface rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
      style={{ animationDelay: `${index * 5}ms` }}
    >
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-white/5 to-white/10">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`max-w-[70%] max-h-[70%] object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <Tv size={24} className="text-white/20" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent 
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
        <div className="flex items-center gap-2 mb-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white">
            <Play size={14} fill="white" className="ml-0.5" />
          </button>
          <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] uppercase font-bold rounded">CANLI</span>
        </div>
        <h4 className="font-bold text-white text-sm truncate">{channel.name}</h4>
      </div>
    </div>
  );
});

// Main LiveTV Page Component
export function LiveTVPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const selectedCountryCode = queryParams.get('ulke');

  // Zustand Store
  const {
    channels,
    countries,
    filteredChannels,
    selectedChannel,
    streamUrl,
    isLoading,
    error,
    page,
    hasMore,
    loadPlaylist,
    selectCountry,
    setSearchQuery,
    selectChannel,
    closePlayer,
    loadMore,
    displayedChannels,
  } = useIPTVStore();

  // Local UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setLocalSearchQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [activeRegion, setActiveRegion] = useState('Tümü');

  // Load playlist on mount
  useEffect(() => {
    if (channels.length === 0 && !isLoading) {
      loadPlaylist();
    }
  }, [channels.length, isLoading, loadPlaylist]);

  // Filter when country or search changes
  useEffect(() => {
    if (selectedCountryCode) {
      selectCountry(selectedCountryCode);
    }
  }, [selectedCountryCode, selectCountry]);

  // Handle search input
  const handleSearchChange = useCallback((query: string) => {
    setLocalSearchQuery(query);
    setSearchQuery(query);
  }, [setSearchQuery]);

  // Navigation handlers
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

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  // Show upgrade prompt if no subscription
  if (!profile?.m3u_url && !profile?.subscription_expiry) {
    return <UpgradePrompt />;
  }

  // Country selection view
  if (!selectedCountryCode) {
    return (
      <CountrySelectionView
        profile={profile}
        countries={countries}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
        activeRegion={activeRegion}
        setActiveRegion={setActiveRegion}
        selectCountry={handleSelectCountry}
        navigate={navigate}
        isLoading={isLoading}
        error={error}
        retry={loadPlaylist}
      />
    );
  }

  // Channel list view
  return (
    <>
      <ChannelListView
        selectedCountryCode={selectedCountryCode}
        displayedChannels={displayedChannels()}
        filteredChannels={filteredChannels}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        goBack={handleGoBack}
        setSelectedChannel={handleSelectChannel}
        loadMore={handleLoadMore}
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
