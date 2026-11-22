'use client';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-start w-full gap-12">
        <Link href="/" className="text-white font-bold text-xl">ADApolis</Link>
        <div className="flex items-center gap-8 mx-auto">
          <Link href="/scoreboard" className="text-slate-200 hover:text-white text-base transition-colors">Scoreboard</Link>
          <Link href="/match" className="text-slate-200 hover:text-white text-base transition-colors">Find My DRep</Link>
          <Link href="/season" className="text-slate-200 hover:text-white text-base transition-colors">Season</Link>
          <Link href="/about" className="text-slate-200 hover:text-white text-base transition-colors">About</Link>
          <Link href="/methodology" className="text-slate-200 hover:text-white text-base transition-colors">Methodology</Link>
          <span className="text-slate-200 text-base">Open Data</span>
          <span className="text-slate-200 text-base">API</span>
        </div>
      </div>
    </nav>
  );
}
