"use client";

import { useState, useEffect } from 'react';
import { Loader2, Video, Music, Download, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

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

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClips = () => {
      try {
        const allClips: Clip[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('clips_')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                allClips.push(...parsed);
              }
            }
          }
        }
        // Sort by newest first
        allClips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setClips(allClips);
      } catch (e) {
        console.error('Failed to load clips', e);
      } finally {
        setLoading(false);
      }
    };

    loadClips();
    
    // Listen for storage changes to sync clips across different browser tabs instantly
    window.addEventListener('storage', loadClips);
    return () => window.removeEventListener('storage', loadClips);
  }, []);

  const handleDeleteClip = async (clipId: string, videoId: string) => {
    if (!confirm('Delete this clip from history?')) return;
    try {
        const key = `clips_${videoId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed: Clip[] = JSON.parse(stored);
            const clipToDelete = parsed.find(c => c.id === clipId);
            
            // Tell backend to cancel if it's currently running
            if (clipToDelete && (clipToDelete.status === 'PROCESSING' || clipToDelete.status === 'PENDING')) {
                try {
                    await fetch(`/api/clips/${clipId}/cancel`, { method: 'POST' });
                } catch (e) {
                    console.error('Failed to cancel clip', e);
                }
            }
            
            const updated = parsed.filter(c => c.id !== clipId);
            localStorage.setItem(key, JSON.stringify(updated));
            // Update local state
            setClips(prev => prev.filter(c => c.id !== clipId));
        }
    } catch (e) {
        console.error('Failed to delete clip', e);
    }
  };

  const handleClearAll = () => {
      if (confirm('Are you sure you want to delete all clips history? This cannot be undone.')) {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('clips_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            setClips([]);
        } catch (e) {
            console.error('Failed to clear all clips', e);
        }
      }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center pt-32">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest">Loading Your Clips...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-32 pb-24 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-4xl font-black text-[#333333] tracking-tighter">Your Clips</h1>
            {clips.length > 0 && (
                <button 
                    onClick={handleClearAll}
                    className="text-xs sm:text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-colors flex items-center gap-1 sm:gap-2"
                >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    Clear History
                </button>
            )}
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-12 sm:py-24 bg-gray-50 rounded-3xl sm:rounded-[2.5rem] border-2 border-dashed border-gray-100 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
                <Video className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No clips yet</h3>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-sm mx-auto">Start cutting your favorite YouTube videos to build your collection.</p>
            <Link 
                href="/"
                className="inline-flex items-center justify-center px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-black text-white bg-[#5875F5] hover:bg-[#4763E4] rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
                Start Cutting
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {clips.filter(c => c.status !== 'FAILED' && c.status !== 'CANCELLED').map((clip) => (
                <div key={clip.id} className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group">
                    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0 ${clip.format === 'mp3' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                        {clip.format === 'mp3' ? <Music className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
                    </div>
                    
                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <h3 className="font-bold text-sm sm:text-lg text-gray-900 line-clamp-2 sm:line-clamp-1" title={clip.title || 'Untitled Clip'}>
                                {clip.title || 'Untitled Clip'}
                            </h3>
                            <span className="text-[9px] sm:text-xs font-bold text-gray-400 whitespace-nowrap pt-1">
                                {getRelativeTime(clip.createdAt)}
                            </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs font-black uppercase tracking-widest text-gray-500">
                            <span className="bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-gray-600">{clip.format}</span>
                            {clip.quality && (
                                <span className="bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-gray-600">
                                    {clip.quality}{clip.format === 'mp3' ? ' KBPS' : 'P'}
                                </span>
                            )}
                            <span className="bg-gray-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-gray-500 border border-gray-100">
                                {formatDuration(clip.endTime - clip.startTime)}
                            </span>
                            {clip.fileSize && (
                                <span className="bg-blue-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-blue-600">
                                    {formatFileSize(clip.fileSize)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end w-full sm:w-auto gap-2 sm:gap-3 pt-3 flex-wrap sm:flex-nowrap sm:pt-0 border-t sm:border-t-0 border-gray-50">
                        {clip.status === 'COMPLETED' && clip.downloadUrl ? (
                            <a 
                                href={clip.downloadUrl}
                                download={`${(clip.title || 'clip').replace(/[^a-z0-9]/gi, '_')}.${clip.format || 'mp4'}`}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl shadow-sm sm:shadow-md transition-all sm:hover:scale-105 active:scale-95 text-[10px] sm:text-sm font-black tracking-wide"
                            >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>DOWNLOAD</span>
                            </a>
                        ) : clip.status === 'FAILED' ? (
                            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-red-50 text-red-600 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl text-[10px] sm:text-sm font-bold" title="Failed to process">
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>FAILED</span>
                            </div>
                        ) : (
                            <div className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-blue-50 text-blue-600 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl min-w-[80px] sm:min-w-[120px]">
                                <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest">PROCESSING</span>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => handleDeleteClip(clip.id, clip.videoId)}
                            className="p-2 sm:p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all ml-auto sm:ml-0"
                            title="Delete Clip"
                        >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
