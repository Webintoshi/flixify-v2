/**
 * FLIXIFY VIDEO PLAYER
 * 
 * Universal video player for:
 * - Live TV (IPTV channels with proxy stream)
 * - Movies/VOD (direct content playback)
 * 
 * Features: HLS.js, retry logic, error handling, keyboard shortcuts
 * Tema: Netflix-style
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Maximize, Minimize, Volume2, VolumeX,
  Loader2, X, SkipBack, Settings, PictureInPicture2,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Types
interface ContentItem {
  id: string;
  name: string;
  url?: string;
  type?: 'live' | 'movie' | 'series';
  group?: string;
  poster?: string;
  isLive?: boolean;
}

interface Channel {
  id: string;
  name: string;
  group: string;
}

// Universal VideoPlayer props
interface VideoPlayerProps {
  // For Live TV
  channel?: Channel;
  streamUrl?: string;
  // For Movies/VOD
  content?: ContentItem;
  // Common
  onClose: () => void;
}

// Memoized player to prevent unnecessary re-renders
export const VideoPlayer = memo(function VideoPlayer({ 
  channel, 
  streamUrl,
  content,
  onClose 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Determine mode and data
  const isLiveMode = !!channel && !!streamUrl;
  const item = isLiveMode ? channel : content;
  const videoUrl = isLiveMode ? streamUrl : content?.url || '';
  const title = item?.name || 'Unknown';
  const group = isLiveMode ? (channel as Channel).group : content?.group;
  const isLive = isLiveMode || content?.isLive || content?.type === 'live';

  // State
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, []);

  // Setup player when URL changes
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    setupPlayer(videoUrl);

    return () => {
      cleanupPlayer();
    };
  }, [videoUrl]);

  // Cleanup function
  const cleanupPlayer = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  // Setup HLS Player
  const setupPlayer = async (url: string) => {
    const video = videoRef.current;
    if (!video) return;

    cleanupPlayer();

    setIsLoading(true);
    setError(null);
    retryCountRef.current = 0;

    try {
      // HLS.js ile oynat
      if (Hls.isSupported() && (url.includes('.m3u8') || url.includes('.ts') || url.includes('/api/'))) {
        console.log('[Player] Using HLS.js for stream:', url.substring(0, 60) + '...');
        
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
          debug: false,
          
          // CORS için credentials mode
          xhrSetup: function(xhr, _url) {
            xhr.withCredentials = false;
          },
          
          // Retry configuration - daha agresif retry
          manifestLoadingMaxRetry: 3,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 3,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 4,
          fragLoadingRetryDelay: 1000,
          
          // Adaptive bitrate
          startLevel: -1, // Auto
          abrEwmaFastLive: 3.0,
          abrEwmaSlowLive: 9.0,
          
          // Low latency settings
          lowLatencyMode: false,
        });

        hlsRef.current = hls;

        // Error handling
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.warn('[Player] HLS Error:', data.type, data.details, data.fatal);
          
          if (data.fatal) {
            handleFatalError(data);
          } else {
            // Non-fatal hataları logla ama devam et
            console.log('[Player] Non-fatal HLS error, continuing...');
          }
        });

        // Manifest parsed - ready to play
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch((e) => {
            console.warn('[Player] Autoplay blocked:', e);
            setIsPlaying(false);
          });
        });

        // Load source
        hls.loadSource(url);
        hls.attachMedia(video);

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = url;
        
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play();
        });

        video.addEventListener('error', () => {
          handleFatalError({ type: Hls.ErrorTypes.NETWORK_ERROR, details: '', fatal: true } as any);
        });
      } else {
        // Direct video URL (MP4, etc.)
        video.src = url;
        
        video.addEventListener('loadeddata', () => {
          setIsLoading(false);
          video.play().catch(() => setIsPlaying(false));
        });

        video.addEventListener('error', () => {
          setError('Video cannot be played');
          setIsLoading(false);
        });
      }

    } catch (err: any) {
      console.error('[Player] Setup error:', err);
      setError('Failed to initialize player');
      setIsLoading(false);
    }
  };

  // Handle fatal errors with retry logic
  const handleFatalError = (data: any) => {
    console.error('[Player] Fatal error:', data);

    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      setRetrying(true);
      
      setTimeout(() => {
        if (hlsRef.current) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsRef.current.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsRef.current.recoverMediaError();
              break;
            default:
              setupPlayer(videoUrl);
              break;
          }
        }
        setRetrying(false);
      }, 2000 * retryCountRef.current);
    } else {
      setError('Stream unavailable. Please try again.');
      setIsLoading(false);
    }
  };

  // Manual retry
  const handleRetry = () => {
    retryCountRef.current = 0;
    setupPlayer(videoUrl);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Toggle play
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Adjust volume
  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = Math.max(0, Math.min(1, video.volume + delta));
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  // Handle volume change from slider
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.volume = val;
    }
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('[Player] Fullscreen error:', err);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={(e) => {
          console.error('[Player] Video element error:', e);
          setError('Video playback error');
          setIsLoading(false);
        }}
        playsInline
        muted={false}
        autoPlay
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {(isLoading || retrying) && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
          >
            <Loader2 size={56} className="text-primary animate-spin mb-4" />
            <p className="text-white/80 text-lg">
              {retrying ? 'Reconnecting...' : 'Loading...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/90"
          >
            <div className="text-center max-w-md px-6">
              <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Playback Error</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  <RefreshCw size={18} />
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-surface text-white rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
        className="absolute top-0 inset-x-0 p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div>
              <h2 className="text-white font-semibold text-lg">{title}</h2>
              {group && (
                <p className="text-white/60 text-sm">{group}</p>
              )}
            </div>
          </div>

          {isLive && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 text-white text-sm font-semibold rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </motion.div>

      {/* Bottom Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none"
        style={{ pointerEvents: showControls ? 'auto' : 'none' }}
      >
        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-white text-black hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>

            <div className="flex items-center gap-2 group">
              <button
                onClick={toggleMute}
                className="p-2 text-white hover:text-primary transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-24 opacity-0 group-hover:opacity-100 transition-all duration-300 accent-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-white/70 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 text-white/70 hover:text-white transition-colors">
              <PictureInPicture2 size={20} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:text-primary transition-colors"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

export default VideoPlayer;
