/**
 * FLIXIFY LIVE TV PAGE - Xtream Codes API
 * 
 * Uses new IPTVService with Xtream Codes API
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

import { VideoPlayer } from './VideoPlayer';
import { IPTVService, LiveCategory, LiveStream, toLogoProxyUrl } from '../lib/iptvService';

import { UpgradePrompt } from './UpgradePrompt';
import {
  Search, Tv, Play, Grid3X3, List, ArrowLeft, 
  Loader2, AlertCircle
} from 'lucide-react';

export function LiveTVPage() {
  
  // Data state
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!IPTVService.hasCredentials()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const cats = await IPTVService.getLiveCategories();
      setCategories(cats);
      
      // Load all streams initially
      const allStreams = await IPTVService.getLiveStreams();
      setStreams(allStreams);
      
      console.log('[LiveTVPage] Loaded:', cats.length, 'categories,', allStreams.length, 'streams');
    } catch (err: any) {
      console.error('[LiveTVPage] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Sayfa görünür olduğunda yenile (admin değişikliği sonrası)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[LiveTVPage] Sayfa aktif oldu, yenileniyor...');
        loadCategories();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadCategories]);

  // Filter streams when category changes
  useEffect(() => {
    async function loadCategoryStreams() {
      if (!selectedCategory || !IPTVService.hasCredentials()) return;
      
      setLoading(true);
      try {
        const catStreams = await IPTVService.getLiveStreams(selectedCategory);
        setStreams(catStreams);
      } catch (err: any) {
        console.error('[LiveTVPage] Error loading category:', err);
      } finally {
        setLoading(false);
      }
    }

    if (selectedCategory) {
      loadCategoryStreams();
    }
  }, [selectedCategory]);

  // Filtered streams by search
  const filteredStreams = useMemo(() => {
    if (!searchQuery.trim()) return streams;
    
    const q = searchQuery.toLowerCase();
    return streams.filter(s => 
      s.name.toLowerCase().includes(q)
    );
  }, [streams, searchQuery]);

  // Handle play stream
  const handlePlayStream = useCallback((stream: LiveStream) => {
    const url = IPTVService.getLiveStreamUrl(stream.stream_id);
    setStreamUrl(url);
    setSelectedStream(stream);
  }, []);

  // Handle close player
  const handleClosePlayer = useCallback(() => {
    setSelectedStream(null);
    setStreamUrl('');
  }, []);

  // Check credentials
  if (!IPTVService.hasCredentials() && !loading) {
    return <UpgradePrompt />;
  }

  // Loading state
  if (loading && streams.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 size={48} className="text-primary animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && streams.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Yükleme Hatası</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 md:px-8 h-20">
          <div className="flex items-center gap-4">
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory('')} 
                className="p-2 rounded-full bg-white/5 hover:bg-white/10"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <Tv size={24} className="text-primary" />
              <div>
                <h1 className="text-xl font-bold">Canlı TV</h1>
                <p className="text-xs text-white/50">
                  {selectedCategory 
                    ? `${filteredStreams.length} kanal`
                    : `${categories.length} kategori`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="hidden md:block px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>

            {/* Search */}
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

            {/* View Mode */}
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

      {/* Main Content */}
      <main className="p-4 md:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : !selectedCategory ? (
          // Category Grid View
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(cat.category_id)}
                className="group relative overflow-hidden rounded-2xl p-6 text-left
                         bg-gradient-to-br from-surface-hover via-surface to-background
                         hover:scale-[1.02] transition-transform duration-300
                         border border-white/10 hover:border-primary/50"
              >
                <div className="relative z-10">
                  <Tv size={32} className="text-primary mb-4" />
                  <h3 className="text-lg font-bold text-white">{cat.category_name}</h3>
                  <p className="text-sm text-white/50 mt-1">Kategori {cat.parent_id || ''}</p>
                </div>
              </button>
            ))}
          </div>
        ) : filteredStreams.length > 0 ? (
          // Channel List View
          <>
            {viewMode === 'list' ? (
              <div className="space-y-2 max-w-4xl">
                {filteredStreams.map((stream) => (
                  <div
                    key={stream.stream_id}
                    onClick={() => handlePlayStream(stream)}
                    className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center overflow-hidden">
                      {stream.stream_icon ? (
                        <img 
                          src={toLogoProxyUrl(stream.stream_icon)} 
                          alt={stream.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Tv size={20} className="text-white/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white group-hover:text-primary">{stream.name}</h4>
                      <p className="text-xs text-white/50">
                        {stream.epg_channel_id || 'Canlı'}
                      </p>
                    </div>
                    <Play size={16} className="text-white/30 group-hover:text-white" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredStreams.map((stream) => (
                  <div
                    key={stream.stream_id}
                    onClick={() => handlePlayStream(stream)}
                    className="aspect-video bg-white/5 rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-white/10 hover:ring-2 hover:ring-primary transition-all"
                  >
                    {stream.stream_icon ? (
                      <img 
                        src={toLogoProxyUrl(stream.stream_icon)} 
                        alt={stream.name}
                        className="w-12 h-12 object-contain mb-2"
                      />
                    ) : (
                      <Tv size={32} className="text-white/30 mb-2" />
                    )}
                    <span className="text-sm font-medium text-center truncate w-full">{stream.name}</span>
                  </div>
                ))}
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

      {/* Video Player */}
      {selectedStream && streamUrl && (
        <VideoPlayer
          content={{
            id: selectedStream.stream_id.toString(),
            name: selectedStream.name,
            url: streamUrl,
            type: 'live',
            poster: toLogoProxyUrl(selectedStream.stream_icon),
          }}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  );
}

export default LiveTVPage;
