/**
 * Flavor text for cards whose DRep hasn't written a usable quote: a short,
 * light one-liner in the spirit of the italic text at the bottom of a
 * trading card. Written by ADApolis (never presented as the DRep's words)
 * and drawn only from the card's own record.
 *
 * Rules: kind, never about how a DRep votes or what it supports (Cardinal
 * Rule and neutrality), never about anything off-chain. A DRep replaces it by
 * claiming the card and writing a bio.
 */

import type { CardSummary } from './types';

const LINES: Record<string, string[]> = {
  workhorse3: [
    'Has opened more governance actions than most people have opened emails.',
    'Shows up. Reads it. Votes. Repeat until the chain stops.',
  ],
  ironclad: ['Has not missed a vote in a while. Nobody is quite sure they sleep.', 'Missed votes: rumoured, never confirmed.'],
  on_fire: ['On a streak. Please do not mention it, they might be listening.', 'Hot hand. Steady gavel.'],
  early_bird: ['Votes before the coffee is ready.', 'First in the booth, every time.'],
  scholar: ['Explains every vote. Probably footnotes their grocery list too.', 'Never votes without writing down why.'],
  veteran: ['Has been here since the first gavel fell.', 'Seen a few seasons. Still taking notes.'],
  underdog: ['Small stake. Big notebook.', 'Proof you don’t need a whale to make waves.'],
  rookie: ['New to the chamber. Already taking notes.', 'Fresh registration, sharpened pencil.'],
  steady: ['Quietly does the job, season after season.', 'No speeches. Just a long, tidy voting record.'],
  occasional: ['Picks their moments.', 'Rare sightings in the voting booth. Collectors take note.'],
  default: ['Registered, voting, and keeping their thoughts mostly on-chain.', 'A DRep of few words and several votes.', 'Governs quietly. Lets the record talk.'],
};

/** Stable choice per DRep, so a card's flavor text doesn't change on every load. */
function pick(options: string[], seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length];
}

export function flavorText(c: Pick<CardSummary, 'drep_id' | 'abilities' | 'participation' | 'votes_cast'>): string {
  const has = (id: string, tier = 1) => c.abilities.some((a) => a.id === id && (a.tier ?? 1) >= tier);
  const key = has('workhorse', 3)
    ? 'workhorse3'
    : has('ironclad', 2)
      ? 'ironclad'
      : has('on_fire', 2)
        ? 'on_fire'
        : has('early_bird', 2)
          ? 'early_bird'
          : has('scholar', 2)
            ? 'scholar'
            : has('rookie')
              ? 'rookie'
              : has('underdog')
                ? 'underdog'
                : has('veteran', 2)
                  ? 'veteran'
                  : c.participation !== null && c.participation >= 0.85
                    ? 'steady'
                    : c.participation !== null && c.participation < 0.4
                      ? 'occasional'
                      : 'default';
  return pick(LINES[key], c.drep_id);
}
