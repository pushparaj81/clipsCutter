"use client";

import { useState } from 'react';
import { Loader2, AlertCircle, Video, Music, Zap, Search } from 'lucide-react';
import { isValidYoutubeUrl, extractVideoId } from '@/utils/validateUrl';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    if (!isValidYoutubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Could not extract Video ID from URL');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      // Successfully validated and fetched, store in session for instant load
      sessionStorage.setItem(`videoData_${videoId}`, JSON.stringify(data));

      // Redirect to the cutter page
      router.push(`/cutter/${videoId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch video details');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center pt-32 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl w-full space-y-16">
        {/* Header Section */}
        <div className="text-center space-y-6">
          <h1 className="text-7xl font-black text-[#333333] tracking-tighter">
            YouTube Video Cutter
          </h1>
          <p className="max-w-2xl mx-auto text-2xl text-gray-500 leading-relaxed font-light">
            Skip the hassle of downloading full videos. Just get your favorite clip by
            entering a link and selecting your desired duration.
          </p>
        </div>

        {/* Pill Input Container */}
        <div className="max-w-3xl mx-auto w-full relative">
          <form onSubmit={handleFetchInfo} className="flex items-center bg-white border-2 border-gray-50 rounded-full p-3 pl-10 shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:shadow-2xl">
            <input
              type="text"
              placeholder="Paste YouTube link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent border-none text-xl text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-0"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#5875F5] hover:bg-[#4763E4] text-white px-12 py-4 rounded-full font-black text-lg tracking-widest transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-6 w-6" />
                  {/* <span>Searching...</span> */}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </div>
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-8 bg-red-50 text-red-600 p-5 rounded-3xl flex items-center justify-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="h-6 w-6" />
              <span className="font-bold text-lg">{error}</span>
            </div>
          )}
        </div>

        {/* Features / Info Section (Optional Polish) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            {[
                { title: 'MP4', desc: 'High quality video exports', icon: Video },
                { title: 'MP3', desc: 'Direct MP3 conversion', icon: Music },
                { title: 'No Account', desc: 'Fast, free, and no registration', icon: Zap }
            ].map((feature, i) => (
                <div key={i} className="text-center p-8 rounded-3xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-2xl shadow-sm mb-6 text-[#5875F5]">
                        <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
                    <p className="text-gray-500 font-medium">{feature.desc}</p>
                </div>
            ))}
        </div>
      </div>
    </main>
  );
}
