import { useState } from 'react';
import { Play, Info, Volume2, VolumeX, Plus, Check, ChevronDown } from 'lucide-react';
import { ContentItem } from '../store/useContentStore';
import { motion, AnimatePresence } from 'framer-motion';

interface NetflixHeroProps {
  movie: ContentItem | any;
}

export function NetflixHero({ movie }: NetflixHeroProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isInList, setIsInList] = useState(false);
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="relative w-full h-[85vh] sm:h-[90vh] md:h-[95vh] lg:h-[100vh] overflow-hidden">
      {/* Backdrop Image with Gradient */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* Netflix-style gradient overlays - Enhanced for better text readability */}
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
            <span className="text-foreground-muted hidden sm:inline" aria-hidden="true">·</span>
            <span className="text-foreground-muted">{movie.year}</span>
            <span className="text-foreground-muted hidden sm:inline" aria-hidden="true">·</span>
            <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted text-xs rounded">{movie.duration}</span>
            <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted text-xs rounded">HD</span>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6">
            {movie.genres?.map((genre: string, idx: number) => (
              <span key={genre} className="text-white/90 text-sm sm:text-base">
                {genre}
                {idx < (movie.genres?.length || 0) - 1 && <span className="mx-2 text-white/40" aria-hidden="true">•</span>}
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
              className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Play size={24} fill="currentColor" aria-hidden="true" />
              <span className="text-base sm:text-lg">Oynat</span>
            </button>

            <button
              onClick={() => setShowMore(true)}
              className="flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/30 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Info size={24} aria-hidden="true" />
              <span className="text-base sm:text-lg">Daha Fazla Bilgi</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
              <button
                onClick={() => setIsInList(!isInList)}
                className={`p-2.5 sm:p-3 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isInList ? 'bg-white border-white text-black' : 'border-white/50 text-white hover:border-white'
                }`}
                aria-label={isInList ? 'Listemden çıkar' : 'Listeme ekle'}
              >
                {isInList ? <Check size={22} /> : <Plus size={22} />}
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 sm:p-3 rounded-full border-2 border-white/50 text-white hover:border-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={isMuted ? 'Sesi aç' : 'Sesi kapat'}
              >
                {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            </div>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Bottom Gradient - Smooth transition to content */}
      <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" />

      {/* More Info Modal */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMore(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-2xl overflow-hidden max-w-3xl w-full"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header with Image */}
              <div className="relative h-64 md:h-80">
                <img src={movie.backdrop} alt={movie.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                <button
                  onClick={() => setShowMore(false)}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <ChevronDown size={24} className="rotate-180" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-4xl font-bold text-white mb-2">{movie.title}</h2>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-400 font-bold">{movie.match}% Eşleşme</span>
                    <span className="text-foreground-muted">{movie.year}</span>
                    <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted">{movie.duration}</span>
                    <span className="px-2 py-0.5 border border-foreground-muted/50 text-foreground-muted">HD</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <button className="flex items-center gap-2 px-6 py-2 bg-white text-black font-bold rounded hover:bg-white/90">
                    <Play size={20} fill="currentColor" />
                    Oynat
                  </button>
                  <button className="p-2 border-2 border-white/50 rounded-full text-white hover:border-white">
                    <Plus size={20} />
                  </button>
                </div>

                <p className="text-white/90 text-lg mb-4">{movie.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-foreground-muted">Tür:</span>{' '}
                    <span className="text-white">{movie.genres?.join(', ') || (movie as any).group || 'Sinema'}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">Yıl:</span>{' '}
                    <span className="text-white">{movie.year}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">Süre:</span>{' '}
                    <span className="text-white">{movie.duration}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted">IMDB:</span>{' '}
                    <span className="text-white">{movie.rating}/10</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NetflixHero;
