import { useState, useCallback, memo } from 'react';
import { Header } from './Header';
import { NetflixRow } from './NetflixRow';
import { VideoPlayer } from './VideoPlayer';

import { useAuth } from '../contexts/AuthContext';
import { Tv, Play, Info, Plus, Check, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// MOCK DATA - INSTANT LOAD
// ==========================================

const FEATURED_HERO = {
  id: 'hero-1',
  title: 'The Witcher',
  description: 'Kaderleri birleşen üç kişinin, dünyanın düzenini değiştiren bir savaşın ortasında hayatta kalma mücadelesi. Geralt, Ciri ve Yennefer\'in destansı hikayesi.',
  backdrop: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
  poster: 'https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg',
  year: '2023',
  duration: '2 Sezon',
  rating: '8.5',
  match: 98,
  genres: ['Aksiyon', 'Fantastik', 'Macera'],
  type: 'series'
};

const TRENDING_MOVIES = [
  { id: 'm1', title: 'Oppenheimer', poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', year: '2023', rating: '8.9', match: 97, genres: ['Biyografi', 'Dram'], type: 'movie' },
  { id: 'm2', title: 'Dune: Part Two', poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', year: '2024', rating: '8.7', match: 96, genres: ['Bilim Kurgu', 'Macera'], type: 'movie' },
  { id: 'm3', title: 'The Batman', poster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36FpoooUf8vcGAemGk.jpg', year: '2022', rating: '8.4', match: 95, genres: ['Aksiyon', 'Suç'], type: 'movie' },
  { id: 'm4', title: 'Spider-Man: No Way Home', poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', year: '2021', rating: '8.2', match: 94, genres: ['Aksiyon', 'Macera'], type: 'movie' },
  { id: 'm5', title: 'Top Gun: Maverick', poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1O5z8pP9.jpg', year: '2022', rating: '8.3', match: 95, genres: ['Aksiyon', 'Dram'], type: 'movie' },
  { id: 'm6', title: 'Inception', poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', year: '2010', rating: '8.8', match: 98, genres: ['Bilim Kurgu', 'Gerilim'], type: 'movie' },
  { id: 'm7', title: 'Interstellar', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniL6E8ahDaX062sVJtXNYL.jpg', year: '2014', rating: '8.7', match: 97, genres: ['Bilim Kurgu', 'Dram'], type: 'movie' },
  { id: 'm8', title: 'The Dark Knight', poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', year: '2008', rating: '9.0', match: 99, genres: ['Aksiyon', 'Suç'], type: 'movie' },
  { id: 'm9', title: 'Avengers: Endgame', poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', year: '2019', rating: '8.4', match: 95, genres: ['Aksiyon', 'Macera'], type: 'movie' },
  { id: 'm10', title: 'Joker', poster: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', year: '2019', rating: '8.4', match: 94, genres: ['Suç', 'Dram'], type: 'movie' },
];

const POPULAR_SERIES = [
  { id: 's1', title: 'Stranger Things', poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', year: '2022', rating: '8.7', match: 96, genres: ['Bilim Kurgu', 'Korku'], type: 'series' },
  { id: 's2', title: 'The Last of Us', poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmJxNgEC2UzgqO6Rz.jpg', year: '2023', rating: '8.8', match: 97, genres: ['Dram', 'Korku'], type: 'series' },
  { id: 's3', title: 'Breaking Bad', poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', year: '2013', rating: '9.5', match: 99, genres: ['Suç', 'Dram'], type: 'series' },
  { id: 's4', title: 'Game of Thrones', poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', year: '2019', rating: '8.9', match: 98, genres: ['Fantastik', 'Dram'], type: 'series' },
  { id: 's5', title: 'The Mandalorian', poster: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg', year: '2023', rating: '8.5', match: 95, genres: ['Bilim Kurgu', 'Aksiyon'], type: 'series' },
  { id: 's6', title: 'House of the Dragon', poster: 'https://image.tmdb.org/t/p/w500/z2yahl2ueuiDGlD8WCvrDKz4mh.jpg', year: '2024', rating: '8.4', match: 94, genres: ['Fantastik', 'Dram'], type: 'series' },
  { id: 's7', title: 'Wednesday', poster: 'https://image.tmdb.org/t/p/w500/jeGvNOVMXFXpxXP5474clhEVmUV.jpg', year: '2022', rating: '8.1', match: 93, genres: ['Komedi', 'Gizem'], type: 'series' },
  { id: 's8', title: 'The Crown', poster: 'https://image.tmdb.org/t/p/w500/8kOWDBKcAQyzTW72mo5Wa3T1Jt.jpg', year: '2023', rating: '8.2', match: 92, genres: ['Biyografi', 'Dram'], type: 'series' },
  { id: 's9', title: 'Money Heist', poster: 'https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg', year: '2021', rating: '8.2', match: 93, genres: ['Suç', 'Aksiyon'], type: 'series' },
  { id: 's10', title: 'Squid Game', poster: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93KZSVabUaa8Pd.jpg', year: '2021', rating: '8.0', match: 92, genres: ['Gerilim', 'Dram'], type: 'series' },
];

const TURKISH_CHANNELS = [
  { id: 't1', title: 'TRT 1', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/TRT_1_logo_2021.svg/512px-TRT_1_logo_2021.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/TRT_1_logo_2021.svg/512px-TRT_1_logo_2021.svg.png', year: 'Canlı', rating: '-', match: 95, genres: ['Ulusal'], type: 'live' },
  { id: 't2', title: 'ATV', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/ATV_logo_2010.svg/512px-ATV_logo_2010.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/ATV_logo_2010.svg/512px-ATV_logo_2010.svg.png', year: 'Canlı', rating: '-', match: 94, genres: ['Ulusal'], type: 'live' },
  { id: 't3', title: 'KANAL D', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Kanal_D_logo.svg/512px-Kanal_D_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Kanal_D_logo.svg/512px-Kanal_D_logo.svg.png', year: 'Canlı', rating: '-', match: 93, genres: ['Ulusal'], type: 'live' },
  { id: 't4', title: 'STAR TV', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Star_TV_logo.svg/512px-Star_TV_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Star_TV_logo.svg/512px-Star_TV_logo.svg.png', year: 'Canlı', rating: '-', match: 92, genres: ['Ulusal'], type: 'live' },
  { id: 't5', title: 'SHOW TV', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Show_TV_logo.svg/512px-Show_TV_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Show_TV_logo.svg/512px-Show_TV_logo.svg.png', year: 'Canlı', rating: '-', match: 91, genres: ['Ulusal'], type: 'live' },
  { id: 't6', title: 'TV8', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/TV8_logo.svg/512px-TV8_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/TV8_logo.svg/512px-TV8_logo.svg.png', year: 'Canlı', rating: '-', match: 90, genres: ['Ulusal'], type: 'live' },
  { id: 't7', title: 'NOW', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Now_logo.svg/512px-Now_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Now_logo.svg/512px-Now_logo.svg.png', year: 'Canlı', rating: '-', match: 89, genres: ['Ulusal'], type: 'live' },
  { id: 't8', title: 'FOX', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Fox_Broadcasting_Company_logo_%282019%29.svg/512px-Fox_Broadcasting_Company_logo_%282019%29.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Fox_Broadcasting_Company_logo_%282019%29.svg/512px-Fox_Broadcasting_Company_logo_%282019%29.svg.png', year: 'Canlı', rating: '-', match: 88, genres: ['Ulusal'], type: 'live' },
  { id: 't9', title: 'Beyaz TV', poster: 'https://upload.wikimedia.org/wikipedia/tr/thumb/5/55/Beyaz_TV_logosu.svg/512px-Beyaz_TV_logosu.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/tr/thumb/5/55/Beyaz_TV_logosu.svg/512px-Beyaz_TV_logosu.svg.png', year: 'Canlı', rating: '-', match: 87, genres: ['Ulusal'], type: 'live' },
  { id: 't10', title: 'Haber Global', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Haber_Global_logo.svg/512px-Haber_Global_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Haber_Global_logo.svg/512px-Haber_Global_logo.svg.png', year: 'Canlı', rating: '-', match: 86, genres: ['Haber'], type: 'live' },
];

const BEIN_SPORTS = [
  { id: 'b1', title: 'beIN SPORTS 1', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/BeIN_Sports_1_logo.svg/512px-BeIN_Sports_1_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/BeIN_Sports_1_logo.svg/512px-BeIN_Sports_1_logo.svg.png', year: 'Canlı', rating: '-', match: 99, genres: ['Spor'], type: 'live' },
  { id: 'b2', title: 'beIN SPORTS 2', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/BeIN_Sports_2_logo.svg/512px-BeIN_Sports_2_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/BeIN_Sports_2_logo.svg/512px-BeIN_Sports_2_logo.svg.png', year: 'Canlı', rating: '-', match: 98, genres: ['Spor'], type: 'live' },
  { id: 'b3', title: 'beIN SPORTS 3', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/BeIN_Sports_3_logo.svg/512px-BeIN_Sports_3_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/BeIN_Sports_3_logo.svg/512px-BeIN_Sports_3_logo.svg.png', year: 'Canlı', rating: '-', match: 97, genres: ['Spor'], type: 'live' },
  { id: 'b4', title: 'beIN SPORTS 4', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/BeIN_Sports_4_logo.svg/512px-BeIN_Sports_4_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/BeIN_Sports_4_logo.svg/512px-BeIN_Sports_4_logo.svg.png', year: 'Canlı', rating: '-', match: 96, genres: ['Spor'], type: 'live' },
  { id: 'b5', title: 'beIN SPORTS MAX 1', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BeIN_Sports_MAX_1_logo.svg/512px-BeIN_Sports_MAX_1_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BeIN_Sports_MAX_1_logo.svg/512px-BeIN_Sports_MAX_1_logo.svg.png', year: 'Canlı', rating: '-', match: 95, genres: ['Spor'], type: 'live' },
  { id: 'b6', title: 'beIN SPORTS MAX 2', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/BeIN_Sports_MAX_2_logo.svg/512px-BeIN_Sports_MAX_2_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/BeIN_Sports_MAX_2_logo.svg/512px-BeIN_Sports_MAX_2_logo.svg.png', year: 'Canlı', rating: '-', match: 94, genres: ['Spor'], type: 'live' },
  { id: 'b7', title: 'beIN SPORTS HABER', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/BeIN_Sports_Haber_logo.svg/512px-BeIN_Sports_Haber_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/BeIN_Sports_Haber_logo.svg/512px-BeIN_Sports_Haber_logo.svg.png', year: 'Canlı', rating: '-', match: 93, genres: ['Spor'], type: 'live' },
  { id: 'b8', title: 'Tivibu Spor', poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tivibu_Spor_logo.svg/512px-Tivibu_Spor_logo.svg.png', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tivibu_Spor_logo.svg/512px-Tivibu_Spor_logo.svg.png', year: 'Canlı', rating: '-', match: 92, genres: ['Spor'], type: 'live' },
];

// ==========================================
// HERO COMPONENT
// ==========================================

const HeroSection = memo(function HeroSection({ movie, onPlay }: { movie: typeof FEATURED_HERO, onPlay: () => void }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isInList, setIsInList] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative w-full h-[85vh] sm:h-[90vh] md:h-[95vh] lg:h-[100vh] overflow-hidden">
      {/* Backdrop Image with Gradient */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop}
          alt=""
          className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && <div className="absolute inset-0 bg-surface animate-pulse" />}
        
        {/* Netflix-style gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pb-20 sm:pb-24 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-2xl"
          >
            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 drop-shadow-2xl tracking-tight leading-tight">
              {movie.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4 text-sm md:text-base">
              <span className="text-green-400 font-bold">{movie.match}% Eşleşme</span>
              <span className="text-foreground-muted hidden sm:inline">·</span>
              <span className="text-foreground-muted">{movie.year}</span>
              <span className="text-foreground-muted hidden sm:inline">·</span>
              <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted text-xs rounded">{movie.duration}</span>
              <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted text-xs rounded">4K</span>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6">
              {movie.genres.map((genre, idx) => (
                <span key={genre} className="text-white/90 text-sm sm:text-base">
                  {genre}
                  {idx < movie.genres.length - 1 && <span className="mx-2 text-white/40">•</span>}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-8 line-clamp-3 drop-shadow-lg max-w-xl">
              {movie.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button 
                onClick={onPlay}
                className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Play size={24} fill="currentColor" />
                <span className="text-base sm:text-lg">Oynat</span>
              </button>

              <button
                className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/30 active:scale-95 transition-all duration-200"
              >
                <Info size={24} />
                <span className="text-base sm:text-lg">Daha Fazla Bilgi</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
                <button
                  onClick={() => setIsInList(!isInList)}
                  className={`p-2.5 sm:p-3 rounded-full border-2 transition-all duration-200 ${
                    isInList ? 'bg-white border-white text-black' : 'border-white/50 text-white hover:border-white'
                  }`}
                >
                  {isInList ? <Check size={22} /> : <Plus size={22} />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2.5 sm:p-3 rounded-full border-2 border-white/50 text-white hover:border-white transition-all duration-200"
                >
                  {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />
    </div>
  );
});

// ==========================================
// MAIN COMPONENT
// ==========================================

export const HomePage = memo(function HomePage() {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { profile } = useAuth();

  // Instantly load all content - no loading states
  const handlePlay = useCallback((item: any) => {
    setSelectedItem(item);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // No Content State
  if (!profile?.iptv_username || profile?.subscription_status === 'expired') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <Header />
        <div className="max-w-2xl w-full bg-gradient-to-br from-zinc-900/90 to-black/90 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl mt-20 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
              <Tv size={40} className="text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Henüz Bir Paketiniz Yok
            </h2>
            
            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
               Binlerce film, dizi ve canlı kanalı izlemeye başlamak için hesabınıza bir yayın paketi tanımlamanız gerekmektedir.
             </p>
 
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button 
                 onClick={() => window.location.href = '/profil?tab=plans'}
                 className="w-full sm:w-auto px-10 py-4 bg-primary hover:bg-primary-hover text-white font-black text-lg rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-primary/25 flex items-center justify-center gap-3 uppercase tracking-wide"
               >
                 <Play size={24} fill="currentColor" />
                 PAKETLERİ İNCELE & SATIN AL
               </button>
             </div>
 
             <p className="mt-8 text-xs text-gray-500 font-medium">
               Satın alım sonrası erişiminiz anında açılacaktır. <br/>
               Sorularınız için destek hattımıza ulaşabilirsiniz.
             </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 w-full pb-20">
        {/* HERO SECTION */}
        <HeroSection 
          movie={FEATURED_HERO} 
          onPlay={() => handlePlay(FEATURED_HERO)} 
        />

        {/* CONTENT ROWS */}
        <div className="relative z-10 -mt-24 space-y-8">
          
          {/* Trending Movies */}
          <NetflixRow 
            title="Şimdi Trend Olanlar" 
            movies={TRENDING_MOVIES} 
            isTop10={false}
            onSelectMovie={handlePlay}
          />

          {/* Popular Series */}
          <NetflixRow 
            title="Popüler Diziler" 
            movies={POPULAR_SERIES} 
            isTop10={false}
            onSelectMovie={handlePlay}
          />

          {/* Turkish Channels */}
          <NetflixRow 
            title="Yerel Kanallar" 
            movies={TURKISH_CHANNELS} 
            isTop10={false}
            onSelectMovie={handlePlay}
          />

          {/* beIN Sports */}
          <NetflixRow 
            title="beIN Sports" 
            movies={BEIN_SPORTS} 
            isTop10={false}
            onSelectMovie={handlePlay}
          />

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-white/5 bg-background">
        <div className="flex items-center justify-center gap-2 text-primary mb-4">
          <Tv size={20} />
          <span className="text-lg font-bold">FLIXIFY</span>
        </div>
        <p className="text-gray-500 text-xs">© 2026 Flixify. Tüm hakları saklıdır.</p>
      </footer>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedItem && (
          <VideoPlayer
            content={selectedItem}
            onClose={handleClosePlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default HomePage;
