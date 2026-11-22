'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'adapolis:theme';

/** Runs in <head> before paint so a light-mode reader never sees a dark flash. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export function ThemeToggle() {
  const [light, setLight] = useState<boolean | null>(null);
  useEffect(() => setLight(document.documentElement.classList.contains('light')), []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('light');
    document.documentElement.classList.toggle('light', next);
    try {
      localStorage.setItem(KEY, next ? 'light' : 'dark');
    } catch {
      // Private mode: the choice lasts for this page view only.
    }
    setLight(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
      className="flex-shrink-0 rounded-md p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
    >
      {light ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
