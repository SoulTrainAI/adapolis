'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletSignIn } from '@/components/auth/WalletSignIn';
import { Logo } from '@/components/brand/Logo';

const LINKS: Array<[string, string]> = [
  ['/scoreboard', 'Scoreboard'],
  ['/match', 'Find My DRep'],
  ['/hot-topics', 'Hot Topics'],
  ['/season', 'Season'],
  ['/draft', 'Draft'],
  ['/collection', 'Collection'],
  ['/about', 'About'],
  ['/methodology', 'Methodology'],
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 w-full bg-brand-navy/85 backdrop-blur-md">
      <div className="flex items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="ADApolis home" className="flex-shrink-0">
          <Logo size={38} />
        </Link>
        <div className="mx-auto flex items-center gap-1 overflow-x-auto overflow-y-hidden">
          {LINKS.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`relative whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition-colors ${
                  active ? 'text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
                {active && <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-brand-gold" />}
              </Link>
            );
          })}
        </div>
        <WalletSignIn />
      </div>
      <div className="brand-hairline h-px w-full opacity-70" />
    </nav>
  );
}
