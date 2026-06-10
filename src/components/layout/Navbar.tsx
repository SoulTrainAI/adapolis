'use client';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between w-full">
        <Link href="/" className="text-white font-bold text-xl">ADApolis</Link>
        <div className="flex items-center gap-6">
          <Link href="/scoreboard" className="text-slate-300 hover:text-white text-sm">Scoreboard</Link>
          <Link href="/about" className="text-slate-300 hover:text-white text-sm">About</Link>
          <span className="text-slate-600 text-sm">Methodology</span>
          <span className="text-slate-600 text-sm">Open Data</span>
          <span className="text-slate-600 text-sm">API</span>
        </div>
      </div>
    </nav>
  );
}
