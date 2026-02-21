"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface VideoPreviewProps {
  videoId: string;
  seekTime?: number;
  endTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
}

interface YouTubePlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
    };
  }
}

const VideoPreviewComponent = forwardRef<VideoPlayerHandle, VideoPreviewProps>(
  ({ videoId, seekTime, endTime, onTimeUpdate }, ref) => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Expose play/pause methods to parent via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        try {
          playerRef.current.playVideo();
        } catch {
          // Ignore errors
        }
      }
    },
    pause: () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo();
        } catch {
          // Ignore errors
        }
      }
    },
    seek: (time: number) => {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(time, true);
        } catch {
          // Ignore
        }
      }
    }
  }), []);
  
  // Use refs for dynamic props to avoid re-initializing player on every boundary change
  const endTimeRef = useRef(endTime);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    endTimeRef.current = endTime;
  }, [endTime]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Load YouTube API
  useEffect(() => {
    let isMounted = true;

    function initPlayer() {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      if (playerRef.current) {
          try { playerRef.current.destroy(); } catch {}
      }
      
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
              if (isMounted) setIsPlayerReady(true);
          },
          // onStateChange removed - using polling instead for reliability
        },
      });
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]); // ONLY re-init if videoId changes

  // Robust polling for time updates
  useEffect(() => {
    const interval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.getPlayerState === 'function') {
            try {
                const state = playerRef.current.getPlayerState();
                // 1 = PLAYING
                if (state === 1) {
                    const time = playerRef.current.getCurrentTime();
                    if (onTimeUpdateRef.current) {
                        onTimeUpdateRef.current(time);
                    }

                    // Auto-pause at end with a tiny buffer to avoid premature stops
                    if (typeof endTimeRef.current === 'number' && time >= endTimeRef.current + 0.1) {
                        if (playerRef.current.pauseVideo) playerRef.current.pauseVideo();
                    }
                }
            } catch {
                // Ignore errors checking state
            }
        }
    }, 50); // Check every 50ms (~20fps) for smooth UI without overloading

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPlayerReady && playerRef.current && typeof seekTime === 'number') {
      try {
        if (playerRef.current.seekTo) {
            playerRef.current.seekTo(seekTime, true);
        }
        // Update UI display to show the new seek position
        if (onTimeUpdateRef.current) {
          onTimeUpdateRef.current(seekTime);
        }
      } catch {
        // Ignore errors during player transition
      }
    }
  }, [seekTime, isPlayerReady]);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md relative">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

VideoPreviewComponent.displayName = 'VideoPreview';
export const VideoPreview = VideoPreviewComponent;
