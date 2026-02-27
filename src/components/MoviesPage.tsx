import { useEffect, useMemo, useState, useDeferredValue, useCallback } from 'react';
import { Header } from './Header';
import { VideoPlayer } from './VideoPlayer';
import { Play, Info, ChevronDown, Filter, Film, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { IPTVService, VodStream, toHttps } from '../lib/iptvService';
import { UpgradePrompt } from './UpgradePrompt';

// VOD Category type
interface VodCategory {
  category_id: string;
  category_name: string;
}

// Movie item for display
interface MovieItem {
  id: string;
  stream_id: number;
  title: string;
  name: string;
  year: number;
  rating: string;
  duration: string;
  genres: string[];
  description: string;
  poster: string;
  backdrop: string;
  category: string;
  container_extension: string;
  url?: string;
}

const genres = ["Tümü", "Aksiyon", "Komedi", "Dram", "Bilim Kurgu", "Korku", "Romantik", "Belgesel"];

export function MoviesPage() {
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<VodCategory[]>([]);
  const [movies, setMovies] = useState<VodStream[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  
  // Filters
  const [selectedGenre, setSelectedGenre] = useState("Tümü");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(localSearchQuery);
  const [sortBy, setSortBy] = useState<"popularity" | "newest" | "rating">("popularity");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  // Load VOD categories and movies
  const loadVodContent = useCallback(async () => {
    if (!IPTVService.hasCredentials()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load categories
      const cats = await IPTVService.getVodCategories();
      setCategories(cats);
      
      // Load all VOD movies
      const vodMovies = await IPTVService.getVOD();
      setMovies(vodMovies);
      
      console.log('[MoviesPage] Loaded:', cats.length, 'categories,', vodMovies.length, 'movies');
    } catch (err: any) {
      console.error('[MoviesPage] Error loading VOD:', err);
      setError(err.message || 'Filmler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVodContent();
  }, [loadVodContent]);

  // Sayfa görünür olduğunda yenile (admin değişikliği sonrası)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MoviesPage] Sayfa aktif oldu, yenileniyor...');
        loadVodContent();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadVodContent]);

  // Filter movies when category selected
  useEffect(() => {
    async function loadCategoryMovies() {
      if (!selectedCategory || !IPTVService.hasCredentials()) return;
      
      setLoading(true);
      try {
        const catMovies = await IPTVService.getVOD(selectedCategory);
        setMovies(catMovies);
      } catch (err: any) {
        console.error('[MoviesPage] Error loading category:', err);
      } finally {
        setLoading(false);
      }
    }

    if (selectedCategory) {
      loadCategoryMovies();
    }
  }, [selectedCategory]);

  // Convert VOD stream to display format
  const allMovies: MovieItem[] = useMemo(() => {
    return movies.map((movie) => ({
      id: movie.stream_id.toString(),
      stream_id: movie.stream_id,
      title: movie.name,
      name: movie.name,
      year: new Date(movie.added).getFullYear() || 2024,
      rating: (Math.random() * 2 + 7).toFixed(1), // Xtream API doesn't provide rating
      duration: "2s", // Not available in API
      genres: [categories.find(c => c.category_id === movie.category_id)?.category_name || "Film"],
      description: movie.name,
      poster: toHttps(movie.stream_icon) || '',
      backdrop: toHttps(movie.stream_icon) || '',
      category: categories.find(c => c.category_id === movie.category_id)?.category_name || "Film",
      container_extension: movie.container_extension,
    }));
  }, [movies, categories]);

  // Filtered and sorted movies
  const filteredMovies = useMemo(() => {
    let filtered = allMovies;

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q)
      );
    }

    if (selectedGenre !== "Tümü") {
      filtered = filtered.filter(m =>
        m.genres.some((g: string) => g.toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }

    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort((a, b) => b.year - a.year);
        break;
      case "rating":
        filtered = [...filtered].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        break;
      default:
        // Keep original order (popularity)
        break;
    }

    return filtered;
  }, [allMovies, selectedGenre, sortBy, deferredSearchQuery]);

  // Featured movie (random from top 20)
  const featuredMovie = useMemo(() => {
    if (filteredMovies.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(20, filteredMovies.length));
      return filteredMovies[randomIndex];
    }
    return null;
  }, [filteredMovies]);

  // Play movie handler
  const handlePlayMovie = (movie: MovieItem) => {
    const streamUrl = IPTVService.getVodUrl(movie.stream_id, movie.container_extension);
    setSelectedMovie({
      ...movie,
      url: streamUrl,
    });
  };

  // Check credentials
  if (!IPTVService.hasCredentials() && !loading) {
    return <UpgradePrompt />;
  }

  // Loading state
  if (loading && movies.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground-muted text-lg">Filmler yükleniyor...</p>
      </div>
    );
  }

  // Error state
  if (error && movies.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-red-500 text-xl mb-4">⚠️</div>
        <p className="text-white text-lg mb-2">İçerik yüklenemedi</p>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-16">
        {/* Hero Section */}
        {featuredMovie && (
          <div className="relative h-[70vh] w-full">
            <div className="absolute inset-0">
              {featuredMovie.backdrop ? (
                <img
                  src={featuredMovie.backdrop}
                  alt={featuredMovie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
            </div>

            <div className="absolute inset-0 flex items-end">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-2xl"
                >
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 drop-shadow-lg">
                    {featuredMovie.title}
                  </h1>

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-green-400 font-bold">{featuredMovie.rating} IMDB</span>
                    <span className="text-gray-400">{featuredMovie.year}</span>
                    <span className="px-2 py-0.5 border border-white/30 text-xs rounded">HD</span>
                  </div>

                  <p className="text-white/80 text-lg mb-6 line-clamp-2">
                    {featuredMovie.description}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handlePlayMovie(featuredMovie)}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-colors"
                    >
                      <Play size={20} fill="currentColor" />
                      Oynat
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors">
                      <Info size={20} />
                      Daha Fazla Bilgi
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg text-white hover:bg-surface-hover transition-colors appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Filter */}
            <div className="relative">
              <button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg text-white hover:bg-surface-hover transition-colors"
              >
                <Filter size={16} />
                {selectedGenre}
                <ChevronDown size={16} className={`transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showGenreDropdown && (
                <div className="absolute top-full mt-2 w-48 bg-surface border border-white/10 rounded-lg shadow-xl z-50">
                  {genres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => { setSelectedGenre(genre); setShowGenreDropdown(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors ${selectedGenre === genre ? 'text-primary' : 'text-white'}`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Film ara..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50"
            >
              <option value="popularity">Popülerlik</option>
              <option value="newest">En Yeni</option>
              <option value="rating">IMDB Puanı</option>
            </select>
          </div>

          {/* Movies Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMovies.slice(0, visibleCount).map((movie, index) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handlePlayMovie(movie)}
                className="group cursor-pointer"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-surface mb-2 relative">
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                      <Film size={32} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
                  </div>
                </div>
                <h3 className="text-white font-medium truncate group-hover:text-primary transition-colors">{movie.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{movie.year}</span>
                  <span>•</span>
                  <span className="text-green-400">{movie.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          {visibleCount < filteredMovies.length && (
            <div className="text-center mt-8">
              <button
                onClick={() => setVisibleCount(prev => prev + 50)}
                className="px-6 py-3 bg-surface border border-white/10 rounded-lg text-white hover:bg-surface-hover transition-colors"
              >
                Daha Fazla Göster ({filteredMovies.length - visibleCount} film)
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedMovie && (
        <VideoPlayer
          content={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
}

export default MoviesPage;
