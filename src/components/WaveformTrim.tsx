"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Play, Pause } from 'lucide-react';

interface WaveformTrimProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime?: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
  onSeek: (val: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export const WaveformTrim = ({
  duration,
  startTime,
  endTime,
  currentTime,
  onStartChange,
  onEndChange,
  onSeek,
  onPlay,
  onPause,
}: WaveformTrimProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'window' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [startInput, setStartInput] = useState('0:00');
  const [endInput, setEndInput] = useState('0:00');

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const min = Math.floor((time % 3600) / 60);
    const sec = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const parseTime = (str: string) => {
    const parts = str.split(':');
    if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0], 10) || 0;
      const min = parseInt(parts[1], 10) || 0;
      const sec = parseInt(parts[2], 10) || 0;
      return hours * 3600 + min * 60 + sec;
    } else if (parts.length === 2) {
      // MM:SS format
      const min = parseInt(parts[0], 10) || 0;
      const sec = parseInt(parts[1], 10) || 0;
      return min * 60 + sec;
    }
    return parseInt(str, 10) || 0;
  };

  // Generate random bar heights for "waveform" look - done in lazy state initializer to stay pure
  const [bars] = useState(() => Array.from({ length: 100 }, () => Math.random() * 0.6 + 0.2));

  const getPositionFromTime = React.useCallback((time: number) => (time / duration) * 100, [duration]);
  const getTimeFromPosition = React.useCallback((pos: number) => (pos / 100) * duration, [duration]);

  // Update inputs when user is not dragging and props change
  // This is a valid pattern for keeping UI in sync with derived state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (isDragging) return;
    setStartInput(formatTime(startTime));
    setEndInput(formatTime(endTime));
  }, [startTime, endTime, isDragging]);

  // Reset playing state when video reaches the end
  React.useEffect(() => {
    if (currentTime !== undefined && currentTime >= endTime - 0.1) {
      // Stop playback immediately
      onPause?.();
      setIsPlaying(false);
    }
  }, [currentTime, endTime]);

  const handleStartSubmit = (e: React.FormEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const time = parseTime(startInput);
    const validTime = Math.max(0, Math.min(time, endTime - 1));
    onStartChange(validTime);
    onSeek(validTime);
    setStartInput(formatTime(validTime));
  };

  const handleEndSubmit = (e: React.FormEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const time = parseTime(endInput);
    const validTime = Math.max(startTime + 1, Math.min(time, duration));
    onEndChange(validTime);
    onSeek(startTime);
    onPlay?.();
    setEndInput(formatTime(validTime));
  };

  const handleStartDecrement = () => {
    const newTime = Math.max(0, startTime - 1);
    onStartChange(newTime);
    onSeek(newTime);
    setStartInput(formatTime(newTime));
  };

  const handleStartIncrement = () => {
    const newTime = Math.min(endTime - 1, startTime + 1);
    onStartChange(newTime);
    onSeek(newTime);
    setStartInput(formatTime(newTime));
  };

  const handleEndDecrement = () => {
    const newTime = Math.max(startTime + 1, endTime - 1);
    onEndChange(newTime);
    // When at end, rewind from the new end time by 1 second
    const rewindTime = Math.max(startTime, newTime - 1);
    onSeek(rewindTime);
    onPlay?.();
    setEndInput(formatTime(newTime));
  };

  const handleEndIncrement = () => {
    const newTime = Math.min(duration, endTime + 1);
    onEndChange(newTime);
    // When at end, move forward from start by keeping same offset
    const forwardTime = Math.max(startTime, newTime - (endTime - (currentTime || startTime)));
    onSeek(forwardTime);
    onPlay?.();
    setEndInput(formatTime(newTime));
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    const time = getTimeFromPosition(percent);

    if (isDragging === 'start') {
      if (time < endTime - 1) {
        onStartChange(Math.max(0, Math.round(time)));
        onSeek(Math.round(time));
      }
    } else if (isDragging === 'end') {
      if (time > startTime + 1) {
        onEndChange(Math.min(duration, Math.round(time)));
        onSeek(startTime);
        onPlay?.();
      }
    } else if (isDragging === 'window') {
        const currentDuration = endTime - startTime;
        let newStart = Math.max(0, Math.round(time - dragOffset));
        let newEnd = newStart + currentDuration;
        
        if (newEnd > duration) {
            newEnd = duration;
            newStart = newEnd - currentDuration;
        }
        
        onStartChange(newStart);
        onEndChange(newEnd);
        onSeek(newStart);
    }
  }, [isDragging, startTime, endTime, duration, dragOffset, onStartChange, onEndChange, onSeek, onPlay, getTimeFromPosition]);

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startTime, endTime, handleMouseMove]);

  const startPct = getPositionFromTime(startTime);
  const endPct = getPositionFromTime(endTime);

  return (
    <div className="space-y-4 py-8">
      <div 
        ref={containerRef}
        className="relative h-20 bg-gray-100 rounded-lg select-none touch-none"
      >
        {/* Background Bars */}
        <div className="absolute inset-0 flex items-center justify-between px-1 gap-[2px]">
          {bars.map((height, i) => (
            <div 
              key={i}
              style={{ height: `${height * 100}%` }}
              className={`flex-1 rounded-full transition-colors ${
                (i / bars.length) * 100 >= startPct && (i / bars.length) * 100 <= endPct
                  ? 'bg-[#5875F5]' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Overlay Darkening */}
        <div 
          className="absolute inset-y-0 left-0 bg-black/10 pointer-events-none"
          style={{ width: `${startPct}%` }}
        />
        <div 
          className="absolute inset-y-0 right-0 bg-black/10 pointer-events-none"
          style={{ left: `${endPct}%` }}
        />

        {/* Selection Window */}
        <div 
          className="absolute inset-y-0 border-y-4 border-[#5875F5] cursor-grab active:cursor-grabbing"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          onMouseDown={(e) => {
              const rect = containerRef.current!.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percent = (x / rect.width) * 100;
              const time = getTimeFromPosition(percent);
              setDragOffset(time - startTime);
              setIsDragging('window');
          }}
        >
            <div className="absolute inset-0 bg-[#5875F5]/5" />
        </div>

        {/* Handles */}
        <div 
          className="absolute inset-y-0 w-4 bg-[#5875F5] border-2 border-white rounded-md cursor-ew-resize shadow-lg flex items-center justify-center translate-x-[-50%] z-10"
          style={{ left: `${startPct}%` }}
          onMouseDown={(e) => { e.stopPropagation(); setIsDragging('start'); }}
        >
          <div className="w-1 h-6 bg-white/50 rounded-full" />
        </div>
        
        <div 
          className="absolute inset-y-0 w-4 bg-[#5875F5] border-2 border-white rounded-md cursor-ew-resize shadow-lg flex items-center justify-center translate-x-[-50%] z-10"
          style={{ left: `${endPct}%` }}
          onMouseDown={(e) => { e.stopPropagation(); setIsDragging('end'); }}
        >
          <div className="w-1 h-6 bg-white/50 rounded-full" />
        </div>

        {/* Current Playhead Line */}
        {currentTime !== undefined && (
          <div 
            className="absolute inset-y-0 w-[2px] bg-orange-600 shadow-[0_0_8px_rgba(0,0,0,0.3)] z-20 pointer-events-none transition-all duration-75"
            style={{ left: `${getPositionFromTime(currentTime)}%` }}
          />
        )}
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between text-xs font-black text-gray-400 uppercase tracking-widest px-1">
        <span className="w-16 text-center bg-gray-50 py-1 rounded-lg">0:00</span>
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-4 py-2 rounded-2xl shadow-sm">
          {/* Start Time Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartDecrement}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-[#5875F5]"
              title="Decrease start time by 1 second"
            >
              <Minus size={16} />
            </button>
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              onBlur={handleStartSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleStartSubmit(e)}
              className="w-24 bg-white border border-gray-100 rounded-lg py-1 px-2 text-center text-sm text-gray-900 font-black focus:border-[#5875F5] focus:ring-2 focus:ring-[#5875F5]/20 focus:outline-none transition-all"
            />
            <button
              onClick={handleStartIncrement}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-[#5875F5]"
              title="Increase start time by 1 second"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Play/Pause Toggle Button */}
          <button
            onClick={() => {
              if (isPlaying) {
                // Pause: stop playback
                onPause?.();
                setIsPlaying(false);
              } else {
                // Play: stop any current playback, seek to start, then play
                onPause?.();  // Ensure player is stopped first
                setTimeout(() => {
                  onSeek(startTime);  // Seek to start time
                }, 50);
                setTimeout(() => {
                  onPlay?.();  // Start playing from start time
                  setIsPlaying(true);
                }, 250);  // Total delay: 250ms for pause + seek + play
              }
            }}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-[#5875F5] rounded-md transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>

          {/* End Time Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleEndDecrement}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-[#5875F5]"
              title="Decrease end time by 1 second"
            >
              <Minus size={16} />
            </button>
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              onBlur={handleEndSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleEndSubmit(e)}
              className="w-24 bg-white border border-gray-100 rounded-lg py-1 px-2 text-center text-sm text-gray-900 font-black focus:border-[#5875F5] focus:ring-2 focus:ring-[#5875F5]/20 focus:outline-none transition-all"
            />
            <button
              onClick={handleEndIncrement}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-600 hover:text-[#5875F5]"
              title="Increase end time by 1 second"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
        <span className="w-16 text-center bg-gray-50 py-1 rounded-lg">{formatTime(duration)}</span>
      </div>
    </div>
  );
};
