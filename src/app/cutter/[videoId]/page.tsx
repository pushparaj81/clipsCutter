"use client";

import { useState, useEffect, use, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, Loader2, Scissors, Video, Music } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VideoPreview } from '@/components/VideoPreview';
import { WaveformTrim } from '@/components/WaveformTrim';

interface VideoQualities {
  label: string;
  height: number;
}

interface VideoInfo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
  availableQualities: VideoQualities[];
  availableFormats: string[];
}

interface Clip {
  id: string;
  videoId: string;
  status: string;
  format: string;
  quality: string | null;
  startTime: number;
  endTime: number;
  downloadUrl: string | null;
  title: string | null;
  progress: number;
  fileSize?: number | null;
  createdAt: string;
}

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hrs ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};

export default function CutterPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  const router = useRouter();
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string>('');
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'edit' | 'clips'>('edit');
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const fetchClips = useCallback(async () => {
    if (!videoId) return;
    try {
      setLoadingClips(true);
      const res = await fetch(`/api/clips/video/${videoId}`);
      const data = await res.json();
      if (!data.error) setClips(data);
    } catch (err) {
      console.error('Error fetching clips:', err);
    } finally {
      setLoadingClips(false);
    }
  }, [videoId]);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!videoId) return;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      let cached = null;
      
      // Check for cached info from landing page for instant loading
      const cachedString = sessionStorage.getItem(`videoData_${videoId}`);
      if (cachedString) {
        try {
          cached = JSON.parse(cachedString);
          console.log('[INFO] Loading from session cache');
          setVideoInfo(cached);
          setStartTime(0);
          setEndTime(cached.duration || 0);
          if (cached.availableQualities?.length > 0) {
            const defaultQuality = cached.availableQualities.find((q: { height: number }) => q.height === 480) 
              ? '480' 
              : String(cached.availableQualities[0].height);
            setQuality(defaultQuality);
          }
        } catch (e) {
          console.error('[CACHE ERROR]', e);
          cached = null; // Invalidate cache if parsing fails
        }
      }

      try {
        const res = await fetch('/api/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        setVideoInfo(data);
        
        // Only set defaults if they haven't been set by cache or previous fetch
        if (!cached) {
          setStartTime(0);
          setEndTime(data.duration || 0);
          if (data.availableQualities?.length > 0) {
            const defaultQuality = data.availableQualities.find((q: { height: number }) => q.height === 480) 
              ? '480' 
              : String(data.availableQualities[0].height);
            setQuality(defaultQuality);
          }
        }
        
        // Initial clips fetch
        fetchClips();
      } catch (err: any) {
        setError(err.message || 'Failed to load video info');
      } finally {
        // loading state handled by videoInfo presence now
      }
    };

    fetchInfo();
  }, [videoId, fetchClips]);

  // Handle default quality when format changes
  useEffect(() => {
    if (format === 'mp3') {
        setQuality('128');
    } else if (videoInfo && videoInfo.availableQualities && videoInfo.availableQualities.length > 0) {
        // Only reset if it's currently an audio bitrate
        if (quality === '128' || quality === '320') {
            const defaultQuality = videoInfo.availableQualities.find((q: { height: number }) => q.height === 480) 
                ? '480' 
                : String(videoInfo.availableQualities[0].height);
            setQuality(defaultQuality);
        }
    }
  }, [format, videoInfo, quality]);

  const handleSeek = (time: number) => {
    setSeekTime(time);
  };

  const handleClip = async () => {
    if (!videoInfo) return;
    setProcessing(true);
    setError('');
    setStatus('Cutting...');
    
    // Create an optimistic entry or just clear the current one
    setCurrentJobId('initial'); // Temporary marker

    try {
      const res = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoInfo.videoId,
          title: videoInfo.title,
          startTime,
          endTime,
          format,
          quality: format === 'mp3' ? null : quality
        })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      // Successfully queued, now switch to clips tab as requested
      setActiveTab('clips');

      const clipId = data.clipId;
      setCurrentJobId(clipId);
      setStatus('Processing...');
      fetchClips(); 

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/clips/${clipId}`);
          const statusData = await statusRes.json();
          console.log('[POLL] Received Status:', statusData);
          
          if (statusData.status === 'COMPLETED') {
            clearInterval(pollInterval);
            fetchClips(); 
            setCurrentJobId(prev => {
              if (prev === clipId) {
                setProcessing(false);
                setStatus('');
              }
              return prev;
            });
          } else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
            fetchClips();
            setCurrentJobId(prev => {
              if (prev === clipId) {
                setError(statusData.error || 'Clipping failed');
                setProcessing(false);
                setStatus('');
              }
              return prev;
            });
          } else {
            // Update clips list frequently for progress UI
            fetchClips();
            setCurrentJobId(prev => {
              if (prev === clipId) setStatus(statusData.status);
              return prev;
            });
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000); // Poll slightly faster for progress

    } catch (err: any) {
      console.error('HandleClip Error:', err);
      setError(err.message || 'Clipping failed');
      setProcessing(false);
      setStatus('');
      fetchClips();
    }
  };

  const handleClearClips = async (silent = false) => {
    if (!videoId) return;
    if (!silent && !confirm('Are you sure you want to clear all clips for this video? This will also delete the files from the server.')) return;

    try {
      setLoadingClips(true);
      const res = await fetch(`/api/clips/video/${videoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setClips([]);
      }
    } catch (err) {
      console.error('Error clearing clips:', err);
    } finally {
      if (!silent) setLoadingClips(false);
    }
  };


  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 pb-24 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl w-full space-y-8 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-white">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b pb-4">
            <button 
                onClick={async () => {
                    await handleClearClips(true); // Silent cleanup on exit
                    router.push('/');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center gap-2"
            >
                ← BACK
            </button>
            {videoInfo && <h1 className="text-lg font-black text-gray-800 line-clamp-1 flex-1 text-center ml-4 uppercase tracking-tight">{videoInfo.title}</h1>}
        </div>

        {/* Tabs Navigation */}
        <div className="flex justify-center">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full max-w-sm">
                <button
                    onClick={() => setActiveTab('edit')}
                    className={`flex-1 py-3 px-6 rounded-xl font-black text-sm tracking-widest transition-all ${
                        activeTab === 'edit' 
                            ? 'bg-white text-blue-600 shadow-xl scale-[1.02]' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    EDIT
                </button>
                <button
                    onClick={() => {
                        setActiveTab('clips');
                        fetchClips();
                    }}
                    className={`flex-1 py-3 px-6 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'clips' 
                            ? 'bg-white text-blue-600 shadow-xl scale-[1.02]' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    CLIPS
                    {clips.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{clips.length}</span>}
                </button>
            </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 text-red-600 p-4 rounded-2xl flex items-center justify-center gap-2 border border-red-100 animate-in fade-in zoom-in">
            <AlertCircle className="h-5 w-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Tab Content */}
        {!videoInfo ? (
          <div className="h-96" /> // Simple spacer while fetching if not in cache
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'edit' ? (
              <div className="space-y-6">
                <VideoPreview 
                  videoId={videoInfo.videoId} 
                  seekTime={seekTime} 
                  endTime={endTime} 
                  onTimeUpdate={setCurrentTime}
                />

                <WaveformTrim
                  duration={videoInfo.duration}
                  startTime={startTime}
                  endTime={endTime}
                  currentTime={currentTime}
                  onStartChange={setStartTime}
                  onEndChange={setEndTime}
                  onSeek={handleSeek}
                />

                <div className="max-w-2xl mx-auto w-full">
                  <div className="flex flex-wrap items-center justify-center gap-6 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                      {['mp4', 'mp3'].map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${
                            format === f 
                              ? 'bg-blue-600 text-white shadow-lg' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {format === 'mp3' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quality:</span>
                        <select
                          value={quality === '128' || quality === '320' ? quality : '128'}
                          onChange={(e) => setQuality(e.target.value)}
                          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="128">128k</option>
                          <option value="320">320k</option>
                        </select>
                      </div>
                    ) : (
                      videoInfo.availableQualities?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quality:</span>
                          <select
                            value={quality}
                            onChange={(e) => setQuality(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            {videoInfo.availableQualities.map((q: { height: number; label: string }) => (
                              <option key={q.height} value={q.height}>
                                {q.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    )}
                  </div>

                  <div className="space-y-6">
                    <Button 
                      onClick={handleClip} 
                      disabled={processing || (endTime - startTime) <= 0} 
                      className="w-full h-16 text-xl font-black rounded-3xl bg-[#5875F5] hover:bg-[#4763E4] shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                          {status || 'CUTTING...'}
                        </>
                      ) : (
                        <>
                          <Scissors className="mr-3 h-7 w-7" />
                          {format === 'mp3' ? 'CUT AUDIO' : 'CUT VIDEO'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Redundant download UI removed as per user request */}
              </div>
            ) : (
              /* Clips Tab Content */
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Recent Clips</h2>
                </div>

                {loadingClips && clips.length === 0 ? (
                    <div className="flex flex-col items-center py-20 opacity-50">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">Loading Clips...</p>
                    </div>
                ) : clips.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="text-gray-400 font-bold uppercase tracking-widest">No clips found for this video</p>
                        <button onClick={() => setActiveTab('edit')} className="mt-4 text-blue-600 font-black text-sm underline underline-offset-4">START CUTTING</button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {clips.map((clip) => (
                            <div key={clip.id} className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                                <div className={`p-3 rounded-2xl ${clip.format === 'mp3' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {clip.format === 'mp3' ? <Music className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                                </div>
                                <div className="space-y-1 flex-1 pr-4">
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{clip.title || 'Untitled Clip'}</h3>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{clip.format}</span>
                                        {clip.quality && (
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                {clip.quality}{clip.format === 'mp3' ? ' KBPS' : 'P'}
                                            </span>
                                        )}
                                        <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-500 border border-gray-100">
                                            {formatDuration(clip.endTime - clip.startTime)}
                                        </span>
                                        {clip.fileSize && (
                                            <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600">
                                                {formatFileSize(clip.fileSize)}
                                            </span>
                                        )}
                                        <span className="ml-auto text-gray-300 font-bold">{getRelativeTime(clip.createdAt)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {clip.status === 'COMPLETED' && clip.downloadUrl ? (
                                        <a 
                                            href={clip.downloadUrl}
                                            download={`${(clip.title || 'clip').replace(/[^a-z0-9]/gi, '_')}.${clip.format || 'mp4'}`}
                                            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl shadow-lg transition-all hover:scale-110"
                                        >
                                            <Download className="h-5 w-5" />
                                        </a>
                                    ) : clip.status === 'FAILED' ? (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-2xl" title="Failed to process">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-600 px-3 py-2 rounded-2xl min-w-[60px]">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            {clip.progress > 0 && <span className="text-[10px] font-black mt-1">{clip.progress}%</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
