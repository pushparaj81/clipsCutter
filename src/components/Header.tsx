"use client";

import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group transition-all transform hover:scale-105">
          <div className="relative w-10 h-10 transition-transform group-hover:rotate-6">
            <Image 
              src="/logo.png" 
              alt="Magic Clips Logo" 
              fill
              className="object-contain"
            />
          </div>
          <span className="text-2xl font-black text-gray-900 tracking-tighter">
            Magic<span className="text-blue-500">Clips</span>
          </span>
        </Link>
        
        <nav className="hidden sm:flex items-center gap-8">
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-[#5875F5] transition-colors">Home</Link>
          <Link href="/clips" className="text-sm font-bold text-gray-500 hover:text-[#5875F5] transition-colors">Clips</Link>
          {/* <button className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-black hover:bg-gray-800 transition-all shadow-md">
            Get Pro
          </button> */}
        </nav>
      </div>
    </header>
  );
}
