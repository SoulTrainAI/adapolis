/** Every kind of notification, with how it's described in the settings. Shared by server and browser. */

export const NOTIFICATION_TYPES = {
  team_daily: { label: 'Your team today', blurb: 'Points gained or lost and rank changes, once a day.' },
  commentary: { label: 'Commentary about your DReps', blurb: 'The day’s calls about the DReps on your team.' },
  season_update: { label: 'Season update', blurb: 'A big-energy recap after every epoch.' },
  season_end: { label: 'Season end', blurb: 'The final whistle of each season.' },
  winners: { label: 'Winners announced', blurb: 'The winning DReps and teams.' },
  mint_open: { label: 'Mint window open', blurb: 'Your DRep All-Stars are ready to mint (48 hours after the season ends).' },
  mint_closing: { label: 'Mint window closing soon', blurb: 'A reminder one epoch before the window closes.' },
  mint_closed: { label: 'Mint window closed', blurb: 'The final minted totals.' },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export interface NotificationPref {
  inapp: boolean;
  email: boolean;
}

export type Prefs = Partial<Record<NotificationType, Partial<NotificationPref>>>;

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  url: string | null;
  created_at: string;
  read_at: string | null;
}

export function wantsInApp(prefs: Prefs, type: NotificationType): boolean {
  return prefs[type]?.inapp !== false;
}
