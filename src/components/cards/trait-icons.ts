import {
  BadgeCheck,
  BookOpen,
  Dog,
  Dumbbell,
  Fish,
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

/** One icon per DRep Class (see lib/cards/classes.ts). */
export const CLASS_ICONS: Record<string, LucideIcon> = {
  whale_watcher: Fish,
  heavy_weight: Dumbbell,
  power_player: Zap,
  coalition_builder: Handshake,
  peoples_hero: HeartHandshake,
  freedom_fighter: Flag,
  rabble_rouser: Megaphone,
};

export const FALLBACK_ICON = Sparkles;
