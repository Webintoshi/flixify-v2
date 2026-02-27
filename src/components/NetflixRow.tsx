import { useRef, useState, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, Play, Plus, ChevronDown } from 'lucide-react';

interface NetflixRowProps {
  title: string;
  movies: any[];
  isTop10?: boolean;
  onSelectMovie?: (movie: any) => void;
}

// Memoized Row Component - Prevents re-render when parent changes
export const NetflixRow = memo(function NetflixRow({ title, movies, isTop10 = false, onSelectMovie }: NetflixRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  // Use a ref for hovered state to avoid re-rendering the entire row
  const hoveredRef = useRef<string | null>(null);
  const [, forceUpdate] = useState({});

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = isTop10 ? 300 : 400;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, [isTop10]);

  const handleScroll = useCallback(() => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  // Optimized hover handler using ref instead of state
  const handleHover = useCallback((id: string | null) => {
    hoveredRef.current = id;
    // Force minimal re-render only for arrow buttons
    forceUpdate({});
  }, []);

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative mb-8 md:mb-12 group/row">
      {/* Title */}
      <h2 className="text-lg md:text-xl font-semibold text-white mb-4 px-4 md:px-16 flex items-center gap-2 group cursor-pointer hover:text-primary transition-colors">
        {title}
        <ChevronRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" size={20} />
      </h2>

      {/* Container */}
      <div className="relative">
        {/* Left Arrow - Only render when needed */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-20 w-16 md:w-24 
                     bg-gradient-to-r from-background to-transparent
                     flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          >
            <div className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
              <ChevronLeft size={28} />
            </div>
          </button>
        )}

        {/* Right Arrow - Only render when needed */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-20 w-16 md:w-24 
                     bg-gradient-to-l from-background to-transparent
                     flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
          >
            <div className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
              <ChevronRight size={28} />
            </div>
          </button>
        )}

        {/* Slider - Optimized with will-change */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-2 md:gap-4 overflow-x-auto overflow-y-visible scrollbar-hide px-4 md:px-16 py-8 will-change-scroll"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {movies.map((movie, index) => (
            <ChannelCard
              key={movie.id}
              channel={movie}
              index={index}
              isTop10={isTop10}
              onSelectMovie={onSelectMovie}
              onHover={handleHover}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

interface ChannelCardProps {
  channel: any;
  index: number;
  isTop10: boolean;
  onSelectMovie?: (movie: any) => void;
  onHover: (id: string | null) => void;
}

// Individual memoized card - Only re-renders when its own props change
const ChannelCard = memo(function ChannelCard({ channel, index, isTop10, onSelectMovie, onHover }: ChannelCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover(channel.id);
  }, [channel.id, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    onSelectMovie?.(channel);
  }, [channel, onSelectMovie]);

  // Top 10 Card
  if (isTop10) {
    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="relative flex-shrink-0 w-48 md:w-64 h-36 md:h-48 cursor-pointer"
        style={{ scrollSnapAlign: 'start' }}
      >
        <div className="flex items-center h-full">
          {/* Number */}
          <span
            className="text-7xl md:text-9xl font-black text-black leading-none"
            style={{
              WebkitTextStroke: '3px #595959',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {index + 1}
          </span>

          {/* Poster/Logo */}
          <div className="relative -ml-8 w-24 md:w-32 h-36 md:h-44 rounded-lg overflow-hidden shadow-2xl bg-surface">
            {channel.poster ? (
              <img
                src={channel.poster}
                alt={channel.title || channel.name}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-contain p-2 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                  } ${isHovered ? 'scale-110' : 'scale-100'} transition-transform duration-300`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface">
                <span className="text-white text-xs text-center px-2">{channel.title || channel.name}</span>
              </div>
            )}
            {!imageLoaded && channel.poster && <div className="absolute inset-0 bg-surface animate-pulse" />}
          </div>
        </div>
      </div>
    );
  }

  // Normal Card - Optimized
  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative flex-shrink-0 w-40 md:w-56 aspect-video rounded-md overflow-hidden cursor-pointer bg-surface origin-center transition-all duration-300 ease-out ${isHovered ? 'scale-[1.15] z-50 shadow-2xl ring-1 ring-white/10' : 'scale-100 z-10'
        }`}
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Logo/Thumbnail */}
      <div className={`absolute inset-0 flex items-center justify-center ${channel.type === 'live' ? 'bg-white p-3' : 'p-4'}`}>
        {channel.poster || channel.logo ? (
          <img
            src={channel.poster || channel.logo}
            alt={channel.title || channel.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'} transition-transform duration-300`}
          />
        ) : (
          <span className="text-white text-xs text-center line-clamp-2">{channel.title || channel.name}</span>
        )}
        {!imageLoaded && (channel.poster || channel.logo) && <div className={`absolute inset-0 animate-pulse ${channel.type === 'live' ? 'bg-white' : 'bg-surface'}`} />}
      </div>

      {/* Hover Overlay - Simplified animation */}
      {isHovered && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent flex flex-col justify-end p-4 animate-in fade-in duration-200"
        >
          {/* Actions */}
          <div className="flex items-center gap-2 mb-3">
            <button className="p-2 rounded-full bg-white text-black hover:scale-110 transition-transform">
              <Play size={16} fill="currentColor" />
            </button>
            <button className="p-2 rounded-full border-2 border-white/70 text-white hover:border-white">
              <Plus size={16} />
            </button>
            <button className="p-2 rounded-full border-2 border-white/70 text-white hover:border-white ml-auto">
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Info */}
          <h4 className="text-white font-semibold text-sm line-clamp-1 mb-1">{channel.title || channel.name}</h4>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span className="text-green-400 font-bold">%{channel.match || 95}</span>
            <span className="truncate max-w-[80px]">{channel.genres?.[0] || 'Genel'}</span>

            {channel.type === 'live' ? (
              <span className="px-1 border border-red-500/40 text-red-400 rounded text-[10px]">CANLI</span>
            ) : (
              <span className="px-1 border border-white/40 rounded text-[10px]">HD</span>
            )}
          </div>
        </div>
      )}

      {/* Live Badge */}
      {channel.type === 'live' && (
        <div className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  );
});

export default NetflixRow;
