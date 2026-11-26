'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ExternalLink, Menu, X } from 'lucide-react';
import { WalletSignIn } from '@/components/auth/WalletSignIn';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NAV, isActive, type NavItem } from '@/lib/site/nav';

function ItemLink({ item, onPick, compact = false }: { item: NavItem; onPick: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const active = !item.external && isActive(pathname, item.href);
  const className = `flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-2 transition-colors ${
    active ? 'bg-violet-600/20 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
  }`;
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[15px] font-semibold">
        {item.label}
        {item.external && <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
      </span>
      {!compact && <span className="text-xs text-slate-400">{item.blurb}</span>}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onPick}>
      {body}
    </a>
  ) : (
    <Link href={item.href} aria-current={active ? 'page' : undefined} className={className} onClick={onPick}>
      {body}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpenGroup(null);
    setDrawer(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpenGroup(null);
      setDrawer(false);
    };
    const onClick = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    if (!drawer) return;
    setDrawerGroup(NAV.find((g) => g.items.some((i) => !i.external && isActive(pathname, i.href)))?.label ?? NAV[0].label);
  }, [drawer, pathname]);

  const hoverOpen = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenGroup(label);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpenGroup(null), 150);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-brand-navy/85 backdrop-blur-md" aria-label="Main">
      <div ref={bar} className="relative mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="ADApolis home" className="flex-shrink-0">
          <Logo size={38} />
        </Link>

        <ul className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV.map((group) => {
            const groupActive = group.items.some((i) => !i.external && isActive(pathname, i.href));
            const open = openGroup === group.label;
            return (
              <li key={group.label} className="relative" onMouseEnter={() => hoverOpen(group.label)} onMouseLeave={hoverClose}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-haspopup="true"
                  onClick={() => setOpenGroup(open ? null : group.label)}
                  className={`relative flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition-colors ${
                    groupActive || open ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {group.label}
                  <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                  {groupActive && <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-brand-gold" />}
                </button>
                {open && (
                  <div className="absolute left-1/2 top-full w-80 -translate-x-1/2 pt-2">
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                      {group.items.map((item) => (
                        <ItemLink key={item.href} item={item} onPick={() => setOpenGroup(null)} />
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:ml-0">
          <ThemeToggle />
          <NotificationBell />
          <WalletSignIn />
          <button
            type="button"
            onClick={() => setDrawer((d) => !d)}
            aria-expanded={drawer}
            aria-controls="mobile-menu"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-200 hover:bg-slate-800 lg:hidden"
          >
            {drawer ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {drawer && (
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-slate-800 bg-slate-950 px-3 pb-6 pt-2 shadow-2xl lg:hidden"
          >
            {NAV.map((group) => {
              const open = drawerGroup === group.label;
              return (
                <div key={group.label} className="border-b border-slate-800/80">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setDrawerGroup(open ? null : group.label)}
                    className="flex min-h-[52px] w-full items-center justify-between px-2 text-left text-base font-semibold text-white"
                  >
                    {group.label}
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {open && (
                    <div className="space-y-1 pb-3">
                      {group.items.map((item) => (
                        <ItemLink key={item.href} item={item} onPick={() => setDrawer(false)} compact />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="brand-hairline h-px w-full opacity-70" />
    </nav>
  );
}
