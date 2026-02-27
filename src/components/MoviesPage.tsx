import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { Header } from './Header';
import { VideoPlayer } from './VideoPlayer';
import { useContentStore } from '../store/useContentStore';
import { Play, Info, ChevronDown, Filter, Film, Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { getUserIptvUrl, fetchUserPlaylist } from '../lib/iptvService';
import { useAuth } from '../contexts/AuthContext';
import { UpgradePrompt } from './UpgradePrompt';

// ==========================================
// MOCK MOVIES - Fallback when playlist fails
// ==========================================
const MOCK_MOVIES = [
  { id: 'm1', title: 'Oppenheimer', poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdrop: 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg', year: 2023, rating: 8.9, match: 97, genres: ['Biyografi', 'Dram'], description: 'Atom bombasının babası J. Robert Oppenheimer\'ın hikayesi.' },
  { id: 'm2', title: 'Dune: Part Two', poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', backdrop: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5qz0Wc.jpg', year: 2024, rating: 8.7, match: 96, genres: ['Bilim Kurgu', 'Macera'], description: 'Paul Atreides Fremenlerle birleşerek Harkonenlere karşı savaş açıyor.' },
  { id: 'm3', title: 'The Batman', poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36FpoooUf8vcGAemGk.jpg', backdrop: 'https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaMZQFc.jpg', year: 2022, rating: 8.4, match: 95, genres: ['Aksiyon', 'Suç'], description: 'Genç Batman, Gotham\'daki bir seri katili takip ederken karanlık sırları açığa çıkarır.' },
  { id: 'm4', title: 'Spider-Man: No Way Home', poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', backdrop: 'https://image.tmdb.org/t/p/original/ocUp7DJBIc8VJgLEw1prcyK1dYv.jpg', year: 2021, rating: 8.2, match: 94, genres: ['Aksiyon', 'Macera'], description: 'Kimliği açığa çıkan Spider-Man, çoklu evrenin kapılarını aralar.' },
  { id: 'm5', title: 'Top Gun: Maverick', poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1O5z8pP9.jpg', backdrop: 'https://image.tmdb.org/t/p/origional/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg', year: 2022, rating: 8.3, match: 95, genres: ['Aksiyon', 'Dram'], description: 'Pilot Maverick, yeni bir nesle hayatta kalma becerilerini öğretir.' },
  { id: 'm6', title: 'Inception', poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', backdrop: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg', year: 2010, rating: 8.8, match: 98, genres: ['Bilim Kurgu', 'Gerilim'], description: 'Rüya hırsızı Dom Cobb, zihinlere fikir yerleştirmek için son görevini üstlenir.' },
  { id: 'm7', title: 'Interstellar', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniL6E8ahDaX062sVJtXNYL.jpg', backdrop: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg', year: 2014, rating: 8.7, match: 97, genres: ['Bilim Kurgu', 'Dram'], description: 'İnsanlığın kurtuluşu için uzayda yeni bir yuva arayışı.' },
  { id: 'm8', title: 'The Dark Knight', poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', backdrop: 'https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', year: 2008, rating: 9.0, match: 99, genres: ['Aksiyon', 'Suç'], description: 'Batman, Joker olarak bilinen tehlikeli bir suçluyla yüzleşir.' },
  { id: 'm9', title: 'Avengers: Endgame', poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', backdrop: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg', year: 2019, rating: 8.4, match: 95, genres: ['Aksiyon', 'Macera'], description: 'Kahramanlar, Thanos\'un yok ettiği her şeyi geri getirmek için son şanslarını kullanır.' },
  { id: 'm10', title: 'Joker', poster: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', backdrop: 'https://image.tmdb.org/t/p/original/n6bUvigpRFqSwmPp1m2YFGdbwI9.jpg', year: 2019, rating: 8.4, match: 94, genres: ['Suç', 'Dram'], description: 'Arthur Fleck, Gotham\'ın en büyük düşmanı Joker\'e dönüşümünü anlatıyor.' },
  { id: 'm11', title: 'The Matrix', poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', backdrop: 'https://image.tmdb.org/t/p/original/l4QHerqBb6C5p5yLgMh1FpeI9hC.jpg', year: 1999, rating: 8.7, match: 96, genres: ['Bilim Kurgu', 'Aksiyon'], description: 'Neo, gerçekliğin bir simülasyon olduğunu keşfeder.' },
  { id: 'm12', title: 'Gladiator', poster: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUkARfzhmLqA7HwBz.jpg', backdrop: 'https://image.tmdb.org/t/p/original/hND7xA3ucQk2RqH6XLD7Vqbl7p8.jpg', year: 2000, rating: 8.5, match: 95, genres: ['Aksiyon', 'Dram'], description: 'General Maximus, Roma İmparatorluğu\'na karşı intikam peşinde.' },
  { id: 'm13', title: 'Forrest Gump', poster: 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', backdrop: 'https://image.tmdb.org/t/p/original/3h1JZGDhZ8nzxdgVnHWPN0SJUEND.jpg', year: 1994, rating: 8.8, match: 97, genres: ['Dram', 'Romantik'], description: 'Forrest Gump\'ın sıradışı hayat hikayesi.' },
  { id: 'm14', title: 'Pulp Fiction', poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', backdrop: 'https://image.tmdb.org/t/p/original/9rZg1F9xI5nz8n1jR3T4h5y8U9g.jpg', year: 1994, rating: 8.9, match: 98, genres: ['Suç', 'Dram'], description: 'Birbirine bağlı üç farklı hikaye.' },
  { id: 'm15', title: 'The Shawshank Redemption', poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', backdrop: 'https://image.tmdb.org/t/p/original/kXfqCQXUQfS6vX8K0Q5x5v9y8.jpg', year: 1994, rating: 9.3, match: 99, genres: ['Dram'], description: 'Andy Dufresne, Shawshank hapishanesinde umudu ve dostluğu bulur.' },
  { id: 'm16', title: 'Fight Club', poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', backdrop: 'https://image.tmdb.org/t/p/original/rr7E0NoGKxvbBV4643a6qg6v6h8.jpg', year: 1999, rating: 8.8, match: 96, genres: ['Dram'], description: 'Bir ofis çalışanı ve sabun satıcısı, yeraltı dövüş kulübü kurar.' },
  { id: 'm17', title: 'Goodfellas', poster: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', backdrop: 'https://image.tmdb.org/t/p/original/sw7mordbZxgITU877yTpZCudNM.jpg', year: 1990, rating: 8.7, match: 95, genres: ['Suç', 'Dram'], description: 'Henry Hill\'in mafya dünyasındaki yükselişi ve düşüşü.' },
  { id: 'm18', title: 'The Godfather', poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', backdrop: 'https://image.tmdb.org/t/p/original/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg', year: 1972, rating: 9.2, match: 99, genres: ['Suç', 'Dram'], description: 'Corleone ailesinin hikayesi.' },
  { id: 'm19', title: 'Parasite', poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', backdrop: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg', year: 2019, rating: 8.5, match: 94, genres: ['Komedi', 'Dram'], description: 'Yoksul bir aile, zengin bir ailenin hayatına sızmaya çalışır.' },
  { id: 'm20', title: 'Everything Everywhere All at Once', poster: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdnJRYqL8cth4C.jpg', backdrop: 'https://image.tmdb.org/t/p/original/w3LxiVYdWWRvEVdnJRYqL8cth4C.jpg', year: 2022, rating: 7.8, match: 93, genres: ['Aksiyon', 'Macera'], description: 'Çoklu evrende bir kadının varoluş mücadelesi.' },
];

function getLanguageFromItem(item: any): string {
  const name = (item.rawName || item.name || '').toUpperCase();
  const group = (item.group || '').toUpperCase();

  if (name.startsWith('TR:') || group.includes('TR') || group.includes('TÜRK') || group.includes('TURK')) return "Türkçe";
  if (name.startsWith('EN:') || name.startsWith('UK:') || group.includes('ENG') || group.includes('UK') || group.includes('USA')) return "İngilizce";
  if (name.startsWith('DE:') || group.includes('GERMAN') || group.includes('DE ')) return "Almanca";
  if (name.startsWith('FR:') || group.includes('FRANCE') || group.includes('FRA ')) return "Fransızca";
  if (name.startsWith('NL:') || group.includes('NETHERLAND') || group.includes('DTCH')) return "Felemenkçe";
  if (name.startsWith('ES:') || group.includes('SPANISH') || group.includes('ESP ')) return "İspanyolca";
  if (name.startsWith('AR:') || group.includes('ARABIC') || group.includes('ARA ')) return "Arapça";
  if (name.startsWith('IT:') || group.includes('ITALY') || group.includes('ITA ')) return "İtalyanca";
  if (name.startsWith('RU:') || group.includes('RUSSIA') || group.includes('RUS ')) return "Rusça";
  if (group.includes('AZERBAIJAN') || group.includes('AZ ')) return "Azerice";
  if (group.includes('KURD') || group.includes('KU ')) return "Kürtçe";

  return "Diğer";
}

// M3U kanalını Netflix formatına çevir
function itemToMovie(item: any): any {
  return {
    id: item.id,
    name: item.title || item.name,
    title: item.title || item.name,
    year: item.year || 2024,
    rating: item.rating || (Math.random() * 3 + 6).toFixed(1),
    duration: "2sa 15dk",
    genres: item.genres || [item.group || "Sinema"],
    description: item.description || `${item.title || item.name} - En yeni ve popüler filmler Flixify'da.`,
    poster: item.logo || item.poster || "",
    backdrop: item.backdrop || item.logo || "",
    isOriginal: false,
    isNew: item.isNew || false,
    match: Math.floor(Math.random() * 15) + 85,
    category: item.group || 'Sinema',
    type: item.type,
    url: item.url,
    language: getLanguageFromItem(item),
  };
}

// Mock movies'ı store formatına çevir
function getMockMovies() {
  return MOCK_MOVIES.map(m => ({
    ...m,
    type: 'movie',
    language: 'Türkçe',
  }));
}

const genres = ["Tümü", "Aksiyon", "Komedi", "Dram", "Bilim Kurgu", "Korku", "Romantik", "Belgesel"];

export function MoviesPage() {
  const {
    playlists,
    allChannels,
    movies,
    selectedItem,
    setSelectedItem,
    parseAndCategorizeContent,
  } = useContentStore();

  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState("Tümü");
  const [selectedLanguage, setSelectedLanguage] = useState("Tümü");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(localSearchQuery);
  const [sortBy, setSortBy] = useState<"popularity" | "newest" | "rating">("popularity");
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(150);

  // Parse playlists
  useEffect(() => {
    if (playlists.length > 0 && allChannels.length === 0) {
      parseAndCategorizeContent('');
    }
  }, [playlists, allChannels.length, parseAndCategorizeContent]);

  // Load specific user playlist with fallback to mock data
  useEffect(() => {
    if (playlists.length === 0 && user) {
      setLoading(true);
      getUserIptvUrl(user.id)
        .then(async url => {
          if (!url) {
            console.log('[MoviesPage] No M3U URL found, using mock data');
            setUseMockData(true);
            return null;
          }
          return fetchUserPlaylist(url);
        })
        .then(content => {
          if (!content) {
            console.log('[MoviesPage] Playlist fetch failed, using mock data');
            setUseMockData(true);
            return;
          }

          const lines = content.split('\n');
          const channels: any[] = [];
          let currentChannel: any = {};

          lines.forEach(line => {
            line = line.trim();
            if (!line) return;

            if (line.startsWith('#EXTINF:')) {
              const logoMatch = line.match(/tvg-logo="([^"]+)"/);
              const groupMatch = line.match(/group-title="([^"]+)"/);
              const commaIndex = line.lastIndexOf(',');
              const rawName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : '';

              currentChannel = {
                id: Math.random().toString(36).substring(2, 10),
                name: rawName,
                logo: logoMatch ? logoMatch[1] : '',
                group: groupMatch ? groupMatch[1] : 'Diğer',
              };
            } else if (!line.startsWith('#') && currentChannel.name) {
              channels.push({ ...currentChannel, url: line });
              currentChannel = {};
            }
          });

          if (channels.length > 0) {
            useContentStore.setState({
              playlists: [{
                name: 'Flixify Playlist',
                url: 'default',
                channels,
              }],
            });
          } else {
            setUseMockData(true);
          }
        })
        .catch(err => {
          console.warn('[MoviesPage] Error loading playlist:', err);
          setUseMockData(true);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [playlists.length, user]);



  // Tüm filmleri düz listeye çevir (mock veya real)
  const allMovies = useMemo(() => {
    if (useMockData || movies.length === 0) {
      return getMockMovies().map(itemToMovie);
    }
    return movies.map(itemToMovie);
  }, [movies, useMockData]);

  // Dinamik diller listesi
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    allMovies.forEach(m => {
      if (m.language) langs.add(m.language);
    });

    const langArray = Array.from(langs);
    const hasTr = langArray.includes("Türkçe");
    const otherLangs = langArray.filter(l => l !== "Türkçe").sort();

    return [
      "Tümü",
      ...(hasTr ? ["Türkçe"] : []),
      ...otherLangs
    ];
  }, [allMovies]);

  // Filtrelenmiş ve sıralanmış filmler
  const filteredMovies = useMemo(() => {
    let filtered = allMovies;

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    if (selectedGenre !== "Tümü") {
      filtered = filtered.filter(m =>
        m.genres.some((g: string) => g.toLowerCase().includes(selectedGenre.toLowerCase()))
      );
    }

    if (selectedLanguage !== "Tümü") {
      filtered = filtered.filter(m => m.language === selectedLanguage);
    }

    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort((a, b) => b.year - a.year);
        break;
      case "rating":
        filtered = [...filtered].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        break;
      default:
        filtered = [...filtered].sort((a, b) => b.match - a.match);
    }

    return filtered;
  }, [allMovies, selectedGenre, sortBy, selectedLanguage, deferredSearchQuery]);

  // Öne çıkan film (hero section için)
  const featuredMovie = useMemo(() => {
    if (filteredMovies.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(20, filteredMovies.length));
      return filteredMovies[randomIndex];
    }
    return null;
  }, [filteredMovies]);

  // Check if user has M3U URL assigned
  if (!profile?.m3u_url && !useMockData && playlists.length === 0 && movies.length === 0 && !loading) {
    return <UpgradePrompt />;
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-foreground-muted text-lg">İçerikler yükleniyor...</p>
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
                    <span className="text-green-400 font-bold">{featuredMovie.match}% Eşleşme</span>
                    <span className="text-gray-400">{featuredMovie.year}</span>
                    <span className="px-2 py-0.5 border border-white/30 text-xs rounded">HD</span>
                  </div>

                  <p className="text-white/80 text-lg mb-6 line-clamp-2">
                    {featuredMovie.description}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedItem(featuredMovie)}
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

            {/* Language Filter */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg text-white hover:bg-surface-hover transition-colors"
              >
                <Film size={16} />
                {selectedLanguage}
                <ChevronDown size={16} className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageDropdown && (
                <div className="absolute top-full mt-2 w-48 bg-surface border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {availableLanguages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setSelectedLanguage(lang); setShowLanguageDropdown(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-white/5 transition-colors ${selectedLanguage === lang ? 'text-primary' : 'text-white'}`}
                    >
                      {lang}
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
                onClick={() => setSelectedItem(movie)}
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

      {selectedItem && (
        <VideoPlayer
          content={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default MoviesPage;
