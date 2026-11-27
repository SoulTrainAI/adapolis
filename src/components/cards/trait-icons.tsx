import type { CSSProperties } from 'react';
import {
  BadgeCheck,
  BookOpen,
  Dog,
  Dumbbell,
  Flag,
  Flame,
  Hammer,
  Handshake,
  HeartHandshake,
  Medal,
  Megaphone,
  Shield,
  Sparkles,
  Sprout,
  Sunrise,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** One icon per badge, used on cards, in filters and on the Stats and Traits page. */
export const ABILITY_ICONS: Record<string, LucideIcon> = {
  scholar: BookOpen,
  early_bird: Sunrise,
  ironclad: Shield,
  workhorse: Hammer,
  on_fire: Flame,
  veteran: Medal,
  underdog: Dog,
  rookie: Sprout,
  identified: BadgeCheck,
};

/** A whale, drawn to match the lucide icons (24px grid, 2px round strokes); lucide has none. */
export function WhaleIcon({ className, style, ...rest }: { className?: string; style?: CSSProperties; 'aria-hidden'?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} width="24" height="24" {...rest}>
      <path d="M2 13.5C2 10 5.5 7.5 10 7.5c3.6 0 6.5 1.8 8 4.2l2.4-2.1c.6-.5 1.5 0 1.3.8l-.6 3.1c-.1.6-.6 1-1.2 1h-2C16.2 17.3 13.1 19 9.5 19 5.2 19 2 16.8 2 13.5Z" />
      <path d="M4.5 15.5c1.6.9 3.9 1.1 6 .4" />
      <path d="M9 7.5V4.5" />
      <path d="M6.8 3.8c.7.5 1.4.7 2.2.7s1.5-.2 2.2-.7" />
      <circle cx="6.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** One icon per DRep Class (see lib/cards/classes.ts). */
export type TraitIcon = LucideIcon | typeof WhaleIcon;

export const CLASS_ICONS: Record<string, TraitIcon> = {
  whale_watcher: WhaleIcon,
  heavy_weight: Dumbbell,
  power_player: Zap,
  coalition_builder: Handshake,
  peoples_hero: HeartHandshake,
  freedom_fighter: Flag,
  rabble_rouser: Megaphone,
};

export const FALLBACK_ICON = Sparkles;
