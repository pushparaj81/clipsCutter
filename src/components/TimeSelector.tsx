"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Scissors, Loader2 } from 'lucide-react';

interface TimeSelectorProps {
  startTime: number;
  endTime: number;
  duration: number;
  onStartChange: (val: number) => void;
  onEndChange: (val: number) => void;
  onClip: () => void;
  processing: boolean;
}

export const TimeSelector = ({ 
  startTime, 
  endTime, 
  duration, 
  onStartChange, 
  onEndChange, 
  onClip, 
  processing 
}: TimeSelectorProps) => {
  
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>Start: {formatTime(startTime)}</span>
          <span>End: {formatTime(endTime)}</span>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="text-xs text-gray-400">Start Time (sec)</label>
            <Input 
              type="number" 
              value={startTime} 
              onChange={(e) => {
                 const val = Number(e.target.value);
                 if (val < endTime && val >= 0) onStartChange(val);
              }} 
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400">End Time (sec)</label>
             <Input 
              type="number" 
              value={endTime} 
              onChange={(e) => {
                 const val = Number(e.target.value);
                 if (val > startTime && val <= duration) onEndChange(val);
              }} 
            />
          </div>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Clip Duration: {formatTime(endTime - startTime)}
        </p>
      </div>

      <Button 
        onClick={onClip} 
        disabled={processing || (endTime - startTime) <= 0} 
        className="w-full"
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Scissors className="mr-2 h-4 w-4" />
            Cut Video
          </>
        )}
      </Button>
    </div>
  );
};
