"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, AlertCircle, Zap, Search, Scissors, Download, Link2, Smile, FileVideo, Lock, Cloud, Sparkles, HandMetal, MonitorPlay, Plus, Minus } from 'lucide-react';
import { isValidYoutubeUrl, extractVideoId } from '@/utils/validateUrl';
import { VideoEditor } from '@/components/VideoEditor';
import Footer from '@/components/Footer';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeVideoId = searchParams.get('v');
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear input when navigating back to home
  useEffect(() => {
    if (!activeVideoId) {
      setUrl('');
      setError('');
    }
  }, [activeVideoId]);

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

      // Update URL to navigate
      router.push(`/?v=${videoId}`);
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch video details';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen bg-white flex flex-col items-center px-4 sm:px-6 lg:px-8 font-sans ${activeVideoId ? 'pt-8 pb-24' : 'pt-32'}`}>
      <div className="max-w-7xl w-full">
        {!activeVideoId ? (
          <div className="space-y-16 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="text-center space-y-6">
              <h1 className="text-7xl md:text-8xl font-black text-[#333333] tracking-tighter">
                YouTube Video Cutter
              </h1>
              <p className="max-w-2xl mx-auto text-2xl text-gray-500 leading-relaxed font-light">
                Skip the hassle of downloading full videos. Just get your favorite clip by
                entering a link and selecting your desired duration.
              </p>
            </div>

            {/* Pill Input Container */}
            <div className="max-w-4xl mx-auto w-full relative">
              <form onSubmit={handleFetchInfo} className="flex items-center bg-white rounded-full p-3 pl-10 shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:shadow-2xl ring-0 ring-white/50 focus-within:ring-4 focus-within:ring-blue-100">
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

            {/* Features / Info Section */}
            <div className="pt-24 space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Card 1 — Quick Processing (speed.png) */}
                    <div className="bg-white rounded-3xl p-6 pb-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100 group hover:-translate-y-1 transition-all duration-300">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-snug">Quick Processing</h3>
                        <p className="text-[13px] text-blue-400 font-medium mt-1 leading-relaxed">
                            Lightning fast processing for effortless clip cutting
                        </p>
                        <div className="mt-5 flex items-end gap-3 min-h-[180px]">
                            {/* Tooltip */}
                            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-4 flex-shrink-0 w-[45%] self-start">
                                <p className="text-[12px] text-gray-500 font-medium leading-[1.5]">
                                    Seamless cutting, instant results for your favorite clips
                                </p>
                            </div>
                            {/* Image */}
                            <div className="relative flex-1 h-[180px] rounded-2xl overflow-hidden">
                                <Image
                                    src="/images/speed.png"
                                    alt="Quick Processing"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2 — HD Quality (mp4.png) */}
                    <div className="bg-white rounded-3xl p-6 pb-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100 group hover:-translate-y-1 transition-all duration-300">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-snug">HD Quality</h3>
                        <p className="text-[13px] text-blue-400 font-medium mt-1 leading-relaxed">
                            Download your clips in pristine HD quality formats
                        </p>
                        <div className="mt-5 relative min-h-[180px]">
                            {/* Image */}
                            <div className="relative w-[60%] h-[180px] rounded-2xl overflow-hidden ml-auto">
                                <Image
                                    src="/images/mp4.png"
                                    alt="HD MP4 Export"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {/* Tooltip — overlapping bottom-left */}
                            <div className="absolute bottom-3 left-0 bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-4 w-[50%] z-10">
                                <p className="text-[12px] text-gray-500 font-medium leading-[1.5]">
                                    Get high definition downloads for your favorite clips
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Card 3 — MP3 Audio (mp3.png) */}
                    <div className="bg-white rounded-3xl p-6 pb-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-gray-100 group hover:-translate-y-1 transition-all duration-300">
                        <h3 className="text-[17px] font-bold text-gray-900 leading-snug">MP3 Audio</h3>
                        <p className="text-[13px] text-blue-400 font-medium mt-1 leading-relaxed">
                            Convert videos to high-fidelity audio tracks instantly
                        </p>
                        <div className="mt-5 relative min-h-[180px]">
                            {/* Image */}
                            <div className="relative w-[55%] h-[180px] rounded-2xl overflow-hidden">
                                <Image
                                    src="/images/mp3.png"
                                    alt="High Quality Audio"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {/* Tooltip — overlapping right */}
                            <div className="absolute top-4 right-0 bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.08)] border border-gray-100 p-4 w-[50%] z-10">
                                <p className="text-[12px] text-gray-500 font-medium leading-[1.5]">
                                    Crystal clear 320kbps audio extraction
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Showcase Section: Long Video to Short Video */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 pt-24 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                {/* Text Content */}
                <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
                    <h2 className="text-6xl sm:text-7xl font-black text-gray-900 leading-tight tracking-tight">
                        Long Video to <br />
                        Short Video - <br />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-indigo-600">Free Clip Maker</span>
                    </h2>
                    <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
                        Repurpose one long video into multiple short videos automatically. 
                        It&apos;s quick. It&apos;s free. It&apos;s the only video clip maker you&apos;ll need.
                    </p>
                    <button 
                        onClick={() => document.querySelector('input')?.focus()}
                        className="inline-flex items-center gap-2 bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white px-8 py-4 rounded-full font-black text-lg tracking-wide shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
                    >
                        Create Short Clips
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                    </button>
                </div>

                {/* Visual Representation - Using provided image */}
                <div className="lg:w-1/2 relative w-full max-w-2xl mx-auto group">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-30 transform scale-90 group-hover:opacity-50 transition-opacity duration-700"></div>
                    
                    <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-100 transform -rotate-1 hover:rotate-0 transition-all duration-700">
                        <Image 
                            src="/images/long_to_short.png" 
                            alt="Long Video to Short Video Showcase" 
                            width={1200}
                            height={800}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                </div>
            </div>
            {/* Why Use ClipsCutter Section */}
            <div className="py-24 space-y-16 bg-white w-full">
                <div className="text-center max-w-4xl mx-auto space-y-4">
                    <h2 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-tight">
                        Why use Magic Clip&apos;s <br />
                        <span className="text-teal-400">online video cutter?</span>
                    </h2>
                </div>

                <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    
                    {/* Left: Features List */}
                    <div className="w-full lg:w-1/2 space-y-10 order-2 lg:order-1">
                        {/* Feature 1 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <Smile className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">Quick and easy to use</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    Trim your video with only a few clicks, within a minute and with no previous video editing knowledge.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <FileVideo className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">Supports all video formats</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    We support all popular video formats like <span className="font-bold text-gray-700">MP4</span>, <span className="font-bold text-gray-700">WebM</span> and many others.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <Lock className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">Enterprise-grade security</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    <span className="font-bold text-gray-700">Being secure is what we do.</span> We protect your data with enterprise-grade security, which means that your videos are just for you to see.
                                </p>
                            </div>
                        </div>

                         {/* Feature 4 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <Cloud className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">Online</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    Our video trimmer works completely <span className="font-bold text-gray-700">online</span>, it is browser-based, and doesn&apos;t require any software to be downloaded.
                                </p>
                            </div>
                        </div>

                         {/* Feature 5 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <HandMetal className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">Completely free</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    With ClipsCutter quick tools you can perform simple video edits like cutting, trimming, and similar actions, with only a few clicks.
                                </p>
                            </div>
                        </div>

                         {/* Feature 6 */}
                        <div className="flex gap-6 group">
                            <div className="shrink-0 flex items-start pt-1">
                                <div className="relative">
                                    <MonitorPlay className="w-10 h-10 text-teal-400 stroke-[1.5]" />
                                    <Sparkles className="w-4 h-4 text-teal-400 absolute -top-1 -right-1 fill-current" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-800 mb-2 group-hover:text-teal-500 transition-colors">No watermark</h3>
                                <p className="text-gray-500 font-medium leading-relaxed text-lg">
                                    Your creations can be downloaded without a watermark, in full video resolution.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Editor Visual (Sticky on Scroll) */}
                    <div className="w-full lg:w-1/2 sticky top-32 self-start order-1 lg:order-2">
                        <SurferPreview 
                             imageSrc="/images/ocean_clips.png"
                             alt="Surfer video editor preview"
                             className="aspect-auto h-[500px] w-full"
                        />
                    </div>
                </div>

            </div>

            {/* How to cut a video Section */}
            <div className="py-24 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Left: Steps */}
                    <div className="w-full lg:w-1/2 space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tight">How to cut a video</h2>
                            <p className="text-xl text-gray-500 font-medium leading-relaxed">
                                Effortless video clipping made simple with just a few clicks.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {/* Step 1 */}
                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">1</div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900">Add your video</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        Click the &apos;Upload your video to cut&apos; button and select your file. We support all common video formats and files up to 800 MB.
                                    </p>
                                </div>
                            </div>
                            
                            {/* Step 2 */}
                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">2</div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900">Cut to desired length</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        Cut your video clip to the desired start and end points. For extra precision, you can manually enter in and out times.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-6">
                                <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">3</div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-gray-900">Download for free</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        Click the &apos;Done&apos; button when you are happy with the edits and download your watermark free video.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Surfer Visual */}
                    <div className="w-full lg:w-1/2">
                        <SurferPreview 
                            imageSrc="/images/cutter.png"
                            alt="How to cut a video preview"
                        />
                    </div>
                </div>
            </div>

            {/* Previous How It Works Section (Vertical) - Commented Out */}
            {false && (
            <div className="py-24 space-y-16">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <h2 className="text-5xl font-black text-gray-900 tracking-tight">How It Works</h2>
                    <p className="text-lg text-gray-500 font-medium">
                        Effortless video clipping made simple with just a few clicks
                    </p>
                </div>

                <div className="relative">
                    {/* Vertical Line (Desktop) */}
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-100 -translate-x-1/2"></div>

                    <div className="space-y-12 relative">
                        {/* Step 1: Add URL */}
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="md:w-1/2 flex justify-center md:justify-end">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100">
                                    <Link2 className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="md:w-1/2 text-center md:text-left space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">Add URL</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto md:mx-0">
                                    Simply insert your video URL to start cutting your clips
                                </p>
                            </div>
                        </div>

                        {/* Step 2: Select Clip */}
                         <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
                            <div className="md:w-1/2 flex justify-center md:justify-start">
                                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm border border-purple-100">
                                    <Scissors className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="md:w-1/2 text-center md:text-right space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">Select Clip</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto md:ml-auto md:mr-0">
                                    Choose your clip&apos;s time, quality, and preview with ease
                                </p>
                            </div>
                        </div>

                        {/* Step 3: Create */}
                        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="md:w-1/2 flex justify-center md:justify-end">
                                <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center shadow-sm border border-pink-100">
                                    <Zap className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="md:w-1/2 text-center md:text-left space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">Create</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto md:mx-0">
                                    Hit &apos;Create&apos; to finalize your clip and bring it to life
                                </p>
                            </div>
                        </div>

                        {/* Step 4: Download */}
                        <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16">
                            <div className="md:w-1/2 flex justify-center md:justify-start">
                                <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm border border-green-100">
                                    <Download className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="md:w-1/2 text-center md:text-right space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">Download</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto md:ml-auto md:mr-0">
                                    Click &apos;Download&apos; to instantly bring your clip to your device
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
            
            </div>
        ) : (
          <div className="bg-linear-to-br from-blue-50/50 via-white to-blue-50/50 p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-white">
            <VideoEditor 
              videoId={activeVideoId!} 
            />
          </div>
        )}

        {/* FAQ Section */}
        <div className="py-24 space-y-16 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-4">
                <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight">
                    Want to know more?
                </h2>
            </div>
            
            <div className="space-y-4">
                {[
                    {
                        question: "How to cut a video clip online?",
                        answer: "To cut a video online, simply upload your video file to ClipsCutter, select the portion you want to keep using the sliders or time inputs, and click 'Download'. It's fast, free, and no registration is required."
                    },
                    {
                        question: "What is the difference between cut video vs. trim vs. crop video?",
                        answer: "Cutting and trimming usually refer to removing unwanted parts from the beginning or end of a video (shortening its duration). Cropping refers to changing the visual dimensions of the video frame (e.g., changing from 16:9 to 1:1 square), removing parts of the image itself."
                    },
                    {
                        question: "What video file types can I export from Quick tools?",
                        answer: "You can currently export your videos in MP4 format, which is widely supported across all devices and platforms. We ensure high-quality output with optimized compression."
                    },
                    {
                        question: "How long should my video be?",
                        answer: "ClipsCutter supports video files up to 800MB. There is no strict time limit, but performance depends on your internet connection and device capabilities. Short to medium-length videos work best."
                    },
                    {
                        question: "How to trim a video on iPhone or Android?",
                        answer: "ClipsCutter is fully responsive and works great on mobile browsers. Just open clipscutter.com on your phone, upload your video, drag the sliders to trim, and save the result directly to your device."
                    }
                ].map((faq, index) => (
                    <FAQItem key={index} question={faq.question} answer={faq.answer} />
                ))}
            </div>
        </div>



      </div>
      <Footer />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0 border-t first:border-t-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 group text-left"
      >
        <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          {question}
        </span>
        <div className="shrink-0 ml-4 rounded-full border border-gray-200 p-1 group-hover:border-blue-200 transition-colors">
          {isOpen ? (
            <Minus className="w-5 h-5 text-blue-600" />
          ) : (
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          )}
        </div>
      </button>
      <div 
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0 pb-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-gray-500 font-medium leading-relaxed text-lg">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function SurferPreview({ imageSrc, alt, className }: { imageSrc: string; alt: string; className?: string }) {
  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 group border-4 border-white ring-1 ring-gray-100 transform rotate-2 hover:rotate-0 transition-all duration-700 ${className || 'aspect-video'}`}>
      <div className="absolute inset-0 bg-gray-900">
          <Image 
            src={imageSrc}
            alt={alt}
            fill
            className="object-cover"
          />
      </div>
    </div>
  );
}
