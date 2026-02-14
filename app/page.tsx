'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Download,
  Clock,
  Video,
  Music,
  Settings,
  ExternalLink,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [error, setError] = useState('');

  // Clip Settings
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('1080');

  // Job State
  const [isCreating, setIsCreating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);

  const handleFetchInfo = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const res = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Failed to fetch video info');

      const data = await res.json();
      setVideoInfo(data);
      setStartTime(0);
      setEndTime(Math.min(data.duration, 60)); // Default to first 60s or total duration
      setQuality(data.availableQualities?.[0]?.height.toString() || '1080');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClip = async () => {
    if (!videoInfo || isCreating) return;
    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoInfo.url,
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          format,
          quality: `${quality}p`,
        }),
      });

      if (!res.ok) throw new Error('Failed to create clip job');
      const data = await res.json();
      setJobId(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to start clipping');
      setIsCreating(false);
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/clips/${jobId}`);
        const data = await res.json();
        setJobStatus(data);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
          setIsCreating(false);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m, s]
      .map(v => v < 10 ? "0" + v : v)
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const formatSeconds = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white selection:bg-[#5865F2]/30 selection:text-white overflow-x-hidden pb-24">

      {/* Tailwind Status Bar (DIAGNOSTIC - If you see a green bar, Tailwind is working) */}
      <div className="h-1 w-full bg-green-500/20" />

      {/* Hero Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5865F2]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF0050]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky Header */}
      <header className="sticky top-0 w-full z-50 backdrop-blur-xl border-b border-white/5 bg-black/40 h-20">
        <div className="container mx-auto px-6 h-full flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-[#5865F2] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(88,101,242,0.4)] group-hover:scale-110 transition-transform duration-300">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter">
              CLIPS<span className="text-[#5865F2]">CUTTER</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-10">
            <a href="#" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <a
              href="https://github.com/pushparaj81/clipsCutter"
              target="_blank"
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold transition-all"
            >
              Github
            </a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-12 lg:pt-24 max-w-6xl">
        {/* Landing Hero */}
        {!videoInfo && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-[11px] font-black uppercase tracking-[0.2em] text-[#5865F2]">
              Next-Gen Video Processing
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[1.05]">
              Trim moments, <br />
              <span className="gradient-text">master content.</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Professional-grade tools for YouTube content creators. High-fidelity exports in seconds, zero configuration required.
            </p>
          </motion.div>
        )}

        {/* Input Section */}
        <section className={cn(
          "w-full max-w-3xl mx-auto transition-all duration-700 ease-in-out",
          videoInfo ? "mb-16" : "mb-32"
        )}>
          <div className="glass rounded-[2rem] p-3 shadow-2xl relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#5865F2] to-[#FF0050] rounded-[2.2rem] blur-2xl opacity-10 group-hover:opacity-20 transition duration-1000 group-focus-within:opacity-25 pointer-events-none"></div>
            <div className="relative flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex items-center bg-black/40 rounded-2xl border border-white/5 focus-within:border-[#5865F2]/40 transition-colors px-6">
                <ExternalLink className="w-5 h-5 text-zinc-600 mr-4" />
                <input
                  type="text"
                  placeholder="Paste YouTube Video URL here..."
                  className="flex-1 bg-transparent border-none outline-none py-5 text-lg font-medium placeholder:text-zinc-700"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                />
              </div>
              <button
                onClick={handleFetchInfo}
                disabled={loading || !url}
                className="bg-[#5865F2] hover:bg-[#4752c4] disabled:bg-zinc-800 disabled:text-zinc-500 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(88,101,242,0.3)]"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    <span>Extract</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-6 flex items-center gap-3 text-red-400 bg-red-400/5 px-6 py-4 rounded-2xl border border-red-400/10">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wide">{error}</span>
            </div>
          )}
        </section>

        {/* Workspace Area */}
        <AnimatePresence>
          {videoInfo && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid lg:grid-cols-[1.3fr,0.7fr] gap-10 items-start"
            >
              {/* Left Side: Preview & Trimmer */}
              <div className="space-y-10">
                <div className="glass rounded-[3rem] p-6 space-y-6 shadow-2xl">
                  {/* Video Box */}
                  <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-black ring-1 ring-white/10 group">
                    <Image
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      fill
                      className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 bg-[#5865F2] rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-10 h-10 fill-white ml-2" />
                      </div>
                    </div>
                  </div>

                  <div className="px-4">
                    <h2 className="text-3xl font-black leading-tight mb-2 tracking-tight line-clamp-2">{videoInfo.title}</h2>
                    <div className="flex items-center gap-6 text-xs font-black uppercase tracking-widest text-[#5865F2]">
                      <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {formatSeconds(videoInfo.duration)}</span>
                      <span className="px-3 py-1 bg-[#5865F2]/10 rounded-lg border border-[#5865F2]/20">4K Ready</span>
                    </div>
                  </div>
                </div>

                {/* Range Card */}
                <div className="glass rounded-[3rem] p-10 space-y-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black tracking-tight">Timeline Selection</h3>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select your segment to clip</p>
                    </div>
                    <div className="bg-[#5865F2] text-white px-5 py-2 rounded-2xl text-xs font-black shadow-lg shadow-[#5865F2]/20">
                      {formatSeconds(endTime - startTime)} DURATION
                    </div>
                  </div>

                  <div className="space-y-12">
                    {/* Custom Range UI */}
                    <div className="relative h-4 bg-white/5 rounded-full px-1">
                      <div
                        className="absolute h-full top-0 bg-gradient-to-r from-[#5865F2] to-[#FF0050] rounded-full z-0"
                        style={{
                          left: `${(startTime / videoInfo.duration) * 100}%`,
                          right: `${100 - (endTime / videoInfo.duration) * 100}%`
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max={videoInfo.duration}
                        value={startTime}
                        onChange={(e) => setStartTime(Math.min(parseInt(e.target.value), endTime - 1))}
                        className="absolute w-full h-full left-0 top-0 appearance-none bg-transparent cursor-pointer z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:ring-4 [&::-webkit-slider-thumb]:ring-[#5865F2] [&::-webkit-slider-thumb]:rounded-full"
                      />
                      <input
                        type="range"
                        min="0"
                        max={videoInfo.duration}
                        value={endTime}
                        onChange={(e) => setEndTime(Math.max(parseInt(e.target.value), startTime + 1))}
                        className="absolute w-full h-full left-0 top-0 appearance-none bg-transparent cursor-pointer z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:ring-4 [&::-webkit-slider-thumb]:ring-[#FF0050] [&::-webkit-slider-thumb]:rounded-full"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Start Offset</label>
                        <div className="text-3xl font-black text-white">{formatSeconds(startTime)}</div>
                        <div className="w-full h-1 bg-white/5 rounded-full"><div className="h-full bg-[#5865F2] rounded-full" style={{ width: `${(startTime / videoInfo.duration) * 100}%` }} /></div>
                      </div>
                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">End Offset</label>
                        <div className="text-3xl font-black text-white">{formatSeconds(endTime)}</div>
                        <div className="w-full h-1 bg-white/5 rounded-full"><div className="h-full bg-[#FF0050] rounded-full" style={{ width: `${(endTime / videoInfo.duration) * 100}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Options & Actions */}
              <div className="space-y-10">
                <div className="glass rounded-[3rem] p-10 space-y-10">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                    <Settings className="w-6 h-6 text-[#5865F2]" />
                    Export
                  </h3>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Output Encoding</label>
                      <div className="flex gap-3">
                        {['mp4', 'mp3'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setFormat(f)}
                            className={cn(
                              "flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                              format === f ? "bg-white text-black shadow-xl scale-105" : "bg-white/5 text-zinc-500 hover:bg-white/10"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Resolution</label>
                      <div className="grid grid-cols-2 gap-3">
                        {videoInfo.availableQualities?.slice(0, 4).map((q: any) => (
                          <button
                            key={q.height}
                            onClick={() => setQuality(q.height.toString())}
                            className={cn(
                              "py-4 rounded-2xl font-black text-xs transition-all border",
                              quality === q.height.toString()
                                ? "bg-[#5865F2] border-[#5865F2] shadow-lg shadow-[#5865F2]/20"
                                : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/10"
                            )}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateClip}
                    disabled={isCreating}
                    className="w-full py-8 bg-[#5865F2] hover:bg-[#4752c4] disabled:bg-zinc-800 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 group relative overflow-hidden"
                  >
                    {isCreating ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : (
                      <span className="relative z-10 flex items-center justify-center gap-4">
                        <Scissors className="w-6 h-6" />
                        Create Clip
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                  </button>
                </div>

                {/* Job Tracking Card */}
                {jobId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-[3rem] p-10 border border-[#5865F2]/20 space-y-8"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-black text-sm uppercase tracking-widest">Pipeline Status</div>
                      <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        jobStatus?.status === 'COMPLETED' ? "bg-green-500/10 text-green-400" :
                          jobStatus?.status === 'FAILED' ? "bg-red-500/10 text-red-400" :
                            "bg-[#5865F2]/10 text-[#5865F2]"
                      )}>
                        {jobStatus?.status || 'INITIATING'}
                      </div>
                    </div>

                    <div className="space-y-8">
                      {jobStatus?.status === 'COMPLETED' ? (
                        <div className="space-y-6">
                          <div className="p-8 bg-green-500/5 rounded-[2.5rem] border border-green-500/10 flex flex-col items-center text-center">
                            <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                            <p className="font-black text-xl text-white">Clip Rendered</p>
                            <p className="text-zinc-500 text-sm font-medium mt-2">Ready for local distribution</p>
                          </div>
                          <a
                            href={jobStatus.downloadUrl}
                            target="_blank"
                            download
                            className="flex items-center justify-center gap-4 w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95"
                          >
                            <Download className="w-6 h-6" />
                            Download File
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-6 text-center">
                          <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#5865F2] to-[#FF0050]"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Encoding high-fidelity chunks...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Corporate Footer */}
      <footer className="container mx-auto px-6 pt-32 pb-16 text-center border-t border-white/5 mt-24">
        <div className="flex flex-wrap justify-center gap-12 mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          <a href="#" className="hover:text-white transition-colors">Architecture</a>
          <a href="#" className="hover:text-white transition-colors">API Keys</a>
          <a href="#" className="hover:text-white transition-colors">Security</a>
          <a href="#" className="hover:text-white transition-colors">Github</a>
        </div>
        <div className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
          SYSTEM STATUS: ALL SYSTEMS OPERATIONAL • © 2026 CLIPS CUTTER
        </div>
      </footer>

      <style jsx global>{`
        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #a5a5a5 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .glass {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
