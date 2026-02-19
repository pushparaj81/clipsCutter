"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, Loader2, Scissors, Video, Music, X, Trash2, ChevronDown } from 'lucide-react';
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

const QualitySelect = ({ 
  options, 
  value, 
  onChange 
}: { 
  options: { label: string, value: string }[], 
  value: string, 
  onChange: (val: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === String(value))?.label || value;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold shadow-sm hover:border-blue-500 transition-colors min-w-[100px] justify-between"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full min-w-[140px] bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-[300px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-gray-50 flex items-center justify-between ${
                  String(value) === String(opt.value) ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'
                }`}
              >
                {opt.label}
                {String(value) === String(opt.value) && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface VideoEditorProps {
  videoId: string;
}

export function VideoEditor({ videoId }: VideoEditorProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);

  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState<'edit' | 'clips'>('edit');
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);
  
  const currentJobIdRef = useRef<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<string>('');
  const [completedClip, setCompletedClip] = useState<Clip | null>(null);

  // Local Storage Helpers
  const getStoredClips = useCallback((vid: string): Clip[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`clips_${vid}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to parse stored clips', e);
      return [];
    }
  }, []);

  const saveClipsToStorage = useCallback((vid: string, newClips: Clip[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`clips_${vid}`, JSON.stringify(newClips));
    } catch (e) {
      console.error('Failed to save clips to storage', e);
    }
  }, []);

  const fetchClips = useCallback(async () => {
    if (!videoId) return;
    try {
      setLoadingClips(true);
      
      const localClips = getStoredClips(videoId);
      setStorageStatus('');
      
      const res = await fetch(`/api/clips/video/${videoId}`);
      const serverClips: Clip[] = await res.json();
      
      if (serverClips && !Array.isArray(serverClips)) {
         setClips(localClips);
         return;
      }

      const mergedMap = new Map<string, Clip>();
      localClips.forEach(c => mergedMap.set(c.id, c));
      
      // Update local clips with server status, but DO NOT add new clips from server
      serverClips.forEach(c => {
          if (mergedMap.has(c.id)) {
              mergedMap.set(c.id, { ...mergedMap.get(c.id)!, ...c });
          }
      });
      
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setClips(mergedList);
      saveClipsToStorage(videoId, mergedList);
    } catch (err) {
      console.error('Error fetching clips:', err);
      setClips(getStoredClips(videoId));
      setStorageStatus('Offline Mode: Using Local Storage');
    } finally {
      setLoadingClips(false);
    }
  }, [videoId, getStoredClips, saveClipsToStorage]);

  // Load initial from local storage
  useEffect(() => {
    if (videoId) {
        setClips(getStoredClips(videoId));
    }
  }, [videoId, getStoredClips]);

  useEffect(() => {
    const fetchInfo = async () => {
      if (!videoId) return;
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      let cached = null;
      
      const cachedString = sessionStorage.getItem(`videoData_${videoId}`);
      if (cachedString) {
        try {
          cached = JSON.parse(cachedString);
          setVideoInfo(cached);
          setStartTime(0);
          setEndTime(cached.duration || 0);
          if (cached.availableQualities?.length > 0) {
            const defaultQuality = cached.availableQualities.find((q: { height: number }) => q.height === 720) 
              ? '720' 
              : (cached.availableQualities.find((q: { height: number }) => q.height === 480) ? '480' : String(cached.availableQualities[0].height));
            setQuality(defaultQuality);
          }
        } catch (e) {
          console.error('[CACHE ERROR]', e);
          cached = null;
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
        
        if (!cached) {
          setStartTime(0);
          setEndTime(data.duration || 0);
          if (data.availableQualities?.length > 0) {
            const defaultQuality = data.availableQualities.find((q: { height: number }) => q.height === 720) 
              ? '720' 
              : (data.availableQualities.find((q: { height: number }) => q.height === 480) ? '480' : String(data.availableQualities[0].height));
            setQuality(defaultQuality);
          }
        }
        
        fetchClips();
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Failed to load video info');
        }
      }
    };

    fetchInfo();
  }, [videoId, fetchClips]);

  useEffect(() => {
    if (format === 'mp3') {
        if (quality !== '128' && quality !== '320') {
            setQuality('128');
        }
    } else if (videoInfo && videoInfo.availableQualities && videoInfo.availableQualities.length > 0) {
        if (quality === '128' || quality === '320') {
            const defaultQuality = videoInfo.availableQualities.find((q: { height: number }) => q.height === 720) 
                ? '720' 
                : (videoInfo.availableQualities.find((q: { height: number }) => q.height === 480) ? '480' : String(videoInfo.availableQualities[0].height));
            setQuality(defaultQuality);
        }
    }
  }, [format, videoInfo, quality]);

  useEffect(() => {
    setCompletedClip(null);
  }, [startTime, endTime, format, quality]);

  const handleSeek = (time: number) => {
    setSeekTime(time);
  };

  const handleClip = async () => {
    if (!videoInfo) return;
    setProcessing(true);
    setError('');

    setCompletedClip(null);
    
    currentJobIdRef.current = 'initial';

    try {
      const startTimeVal = startTime;
      const endTimeVal = endTime;

      const res = await fetch('/api/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: videoInfo.videoId,
          title: videoInfo.title,
          startTime: startTimeVal,
          endTime: endTimeVal,
          format,
          quality: format === 'mp3' ? null : quality
        })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const clipId = data.clipId;
      currentJobIdRef.current = clipId;

      
      const newClip: Clip = {
          id: clipId,
          videoId: videoInfo.videoId,
          title: 'Processing...',
          status: 'PROCESSING',
          format,
          quality: format === 'mp3' ? null : quality,
          startTime: startTimeVal,
          endTime: endTimeVal,
          progress: 0,
          downloadUrl: null,
          createdAt: new Date().toISOString()
      };
      
      const currentClips = getStoredClips(videoInfo.videoId);
      const updatedClips = [newClip, ...currentClips];
      saveClipsToStorage(videoInfo.videoId, updatedClips);
      setClips(updatedClips);

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/clips/${clipId}`);
          const statusData = await statusRes.json();
          
          const currentLocal = getStoredClips(videoInfo.videoId);
          const index = currentLocal.findIndex(c => c.id === clipId);
          if (index !== -1) {
              currentLocal[index] = { ...currentLocal[index], ...statusData };
              saveClipsToStorage(videoInfo.videoId, currentLocal);
              setClips([...currentLocal]);
          }

          if (statusData.status === 'COMPLETED') {
            clearInterval(pollInterval);
            fetchClips();
            if (currentJobIdRef.current === clipId) {
                setCompletedClip({ ...statusData, id: clipId });
                setProcessing(false);

            }
          } else if (statusData.status === 'FAILED') {
            clearInterval(pollInterval);
            fetchClips();
            if (currentJobIdRef.current === clipId) {
                setError(statusData.error || 'Clipping failed');
                setProcessing(false);

            }
          } else {
            if (currentJobIdRef.current === clipId) {

            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);

    } catch (err) {
      console.error('HandleClip Error:', err);
      if (err instanceof Error) {
          setError(err.message);
      } else {
          setError('Clipping failed');
      }
      setProcessing(false);

      fetchClips();
    }
  };

  const handleClearClips = async (silent = false) => {
    if (!videoId) return;
    try {
      setLoadingClips(true);
      // Optimistically clear local state and storage
      setClips([]);
      localStorage.removeItem(`clips_${videoId}`);
      
      // Attempt to clear on server
      await fetch(`/api/clips/video/${videoId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error clearing clips:', err);
    } finally {
      if (!silent) setLoadingClips(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in zoom-in duration-500 mt-10">


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
        <div className="h-96 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-bold uppercase tracking-widest">Fetching Video Info...</p>
        </div>
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
                      <QualitySelect 
                        value={quality === '128' || quality === '320' ? quality : '128'}
                        onChange={(val) => setQuality(val)}
                        options={[
                          { label: '128 kbps', value: '128' },
                          { label: '320 kbps', value: '320' }
                        ]}
                      />
                    </div>
                  ) : (
                    videoInfo.availableQualities?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quality:</span>
                        <QualitySelect 
                          value={quality}
                          onChange={(val) => setQuality(val)}
                          options={videoInfo.availableQualities.map((q: { height: number; label: string }) => ({
                            label: q.label,
                            value: String(q.height)
                          }))}
                        />
                      </div>
                    )
                  )}
                </div>

                <div className={`flex flex-col sm:flex-row gap-4 mt-6 ${!completedClip ? 'space-y-0' : ''}`}>
                  <Button 
                    onClick={() => {
                      if (completedClip) {
                        setCompletedClip(null);
                      } else {
                        handleClip();
                      }
                    }} 
                    disabled={processing || (endTime - startTime) <= 0} 
                    className={`h-16 text-xl font-black rounded-3xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95 ${
                      completedClip ? 'flex-1 bg-gray-200 text-gray-600 hover:bg-gray-300' : 'w-full bg-[#5875F5] hover:bg-[#4763E4]'
                    }`}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                        {format === 'mp3' ? 'CUTTING AUDIO...' : 'CUTTING VIDEO...'}
                      </>
                    ) : (
                      <>
                        {completedClip ? <X className="mr-3 h-7 w-7" /> : <Scissors className="mr-3 h-7 w-7" />}
                        {completedClip ? 'CANCEL' : (format === 'mp3' ? 'CUT AUDIO' : 'CUT VIDEO')}
                      </>
                    )}
                  </Button>

                  {completedClip && completedClip.downloadUrl && (
                    <a 
                      href={completedClip.downloadUrl}
                      download={`${(completedClip.title || 'clip').replace(/[^a-z0-9]/gi, '_')}.${completedClip.format || 'mp4'}`}
                      className="flex-1 h-16 flex items-center justify-center gap-3 text-xl font-black rounded-3xl bg-green-600 hover:bg-green-700 text-white shadow-2xl transition-all hover:-translate-y-1 active:scale-95 animate-in zoom-in duration-300"
                    >
                      <Download className="h-7 w-7" />
                      DOWNLOAD
                    </a>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Recent Clips</h2>
                  <div className="flex items-center gap-2">
                      {storageStatus && (
                          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                              {storageStatus}
                          </span>
                      )}
                      {clips.length > 0 && (
                          <button 
                              onClick={() => handleClearClips()}
                              className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors"
                          >
                              Clear All
                          </button>
                      )}
                  </div>
              </div>

              {loadingClips && clips.length === 0 ? (
                  <div className="flex flex-col items-center py-20 opacity-50">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading Clips...</p>
                  </div>
              ) : clips.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-400 font-bold uppercase tracking-widest">No clips found</p>
                      <button onClick={() => setActiveTab('edit')} className="mt-4 text-blue-600 font-black text-sm underline underline-offset-4 uppercase">Start Cutting</button>
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
                                  <button 
                                      onClick={() => {
                                          const updatedClips = clips.filter(c => c.id !== clip.id);
                                          setClips(updatedClips);
                                          saveClipsToStorage(videoInfo.videoId, updatedClips);
                                      }}
                                      className="ml-2 p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Delete Clip"
                                  >
                                      <Trash2 className="h-5 w-5" />
                                  </button>
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
  );
}
