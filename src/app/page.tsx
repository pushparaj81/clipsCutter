"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { VideoPreview } from '@/components/VideoPreview';
import { TimeSelector } from '@/components/TimeSelector';
import { isValidYoutubeUrl } from '@/utils/validateUrl';

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');


  const fetchMetadata = async () => {
    if (!url) return;
    if (!isValidYoutubeUrl(url)) {
      setError('Invalid YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setVideoInfo(null);
    setDownloadUrl('');

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setVideoInfo(data);
      setEndTime(data.duration);
      setStartTime(0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch video');
    } finally {
      setLoading(false);
    }
  };

  const handleClip = async () => {
    if (!videoInfo) return;
    setProcessing(true);
    setError('');
    setDownloadUrl('');

    try {
      const res = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoInfo.videoId,
          startTime,
          endTime
        })
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      
      // Poll for status
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/status?id=${data.clipId}`);
        const statusData = await statusRes.json();

        if (statusData.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setDownloadUrl(statusData.downloadUrl);
          setProcessing(false);
        } else if (statusData.status === 'FAILED') {
          clearInterval(pollInterval);
          setError(statusData.error || 'Clipping failed');
          setProcessing(false);
        }
      }, 3000); // Poll every 3 seconds

    } catch (err: any) {
      setError(err.message || 'Clipping failed');
    } finally {
      // setProcessing(false); // Handled in poll
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 flex justify-center items-center gap-2">
            ClipsCutter
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Trim YouTube videos instantly. Secure & Fast.
          </p>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMetadata()}
            className="flex-1"
          />
          <Button onClick={fetchMetadata} disabled={loading} size="lg">
            {loading ? <Loader2 className="animate-spin" /> : 'Fetch'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Video Editor Interface */}
        {videoInfo && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VideoPreview videoId={videoInfo.videoId} thumbnailUrl={videoInfo.thumbnail} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Metadata */}
              <div className="space-y-2">
                <h3 className="font-semibold text-xl line-clamp-1" title={videoInfo.title}>
                  {videoInfo.title}
                </h3>
              </div>

              {/* Controls */}
              <TimeSelector
                startTime={startTime}
                endTime={endTime}
                duration={videoInfo.duration}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
                onClip={handleClip}
                processing={processing}
              />
            </div>

            {/* Result */}
            {downloadUrl && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                <p className="text-green-800 font-medium mb-3">Clip Ready!</p>
                <a 
                  href={downloadUrl} 
                  download 
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Clip
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
