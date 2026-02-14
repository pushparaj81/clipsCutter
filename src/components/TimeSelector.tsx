"use client";

import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Scissors, Loader2 } from 'lucide-react';

interface TimeSelectorProps {
  startTime: number;
  endTime: number;
  duration: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
  onSeek: (val: number) => void;
  onClip: () => void;
  processing: boolean;
}

export const TimeSelector = ({ 
  startTime, 
  endTime, 
  duration, 
  onStartChange, 
  onEndChange, 
  onSeek,
  onClip, 
  processing 
}: TimeSelectorProps) => {
  
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
      <div className="space-y-6">
        {/* Start Time Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-semibold text-slate-700">
            <span>Start Time</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded text-xs">{formatTime(startTime)}</span>
          </div>
          <Slider 
            min={0}
            max={duration}
            step={1}
            value={startTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val < endTime) {
                onStartChange(val);
                onSeek(val);
              }
            }}
          />
        </div>

        {/* End Time Slider */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-semibold text-slate-700">
            <span>End Time</span>
            <span className="bg-slate-200 px-2 py-0.5 rounded text-xs">{formatTime(endTime)}</span>
          </div>
          <Slider 
            min={0}
            max={duration}
            step={1}
            value={endTime}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > startTime) onEndChange(val);
            }}
          />
        </div>
        
        <div className="pt-2">
          <p className="text-xs font-medium text-slate-400 text-center uppercase tracking-wider">
            Selected Clip Length: <span className="text-primary">{formatTime(endTime - startTime)}</span>
          </p>
        </div>
      </div>

      <Button 
        onClick={onClip} 
        disabled={processing || (endTime - startTime) <= 0} 
        className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Clip...
          </>
        ) : (
          <>
            <Scissors className="mr-2 h-5 w-5" />
            Cut Video
          </>
        )}
      </Button>
    </div>
  );
};
