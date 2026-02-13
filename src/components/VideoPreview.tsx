"use client";

import dynamic from 'next/dynamic';
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import { useRef } from 'react';

interface VideoPreviewProps {
  videoId: string;
  thumbnailUrl?: string;
}

export const VideoPreview = ({ videoId, thumbnailUrl }: VideoPreviewProps) => {
  const playerRef = useRef<any>(null);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md relative">
      <ReactPlayer 
        url={`https://www.youtube.com/watch?v=${videoId}`}
        width="100%"
        height="100%"
        controls
        light={thumbnailUrl || true}
        ref={playerRef}
      />
    </div>
  );
};
