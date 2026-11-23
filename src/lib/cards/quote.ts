/**
 * The quote printed on a card back. A collectible can't end in "…", so the
 * quote is always complete: the whole text when it fits, otherwise whole
 * sentences that do, otherwise nothing. The DRep can write a better one by
 * claiming the card.
 */

/** Two lines on the card back with room to spare for wide letters. */
export const CARD_QUOTE_MAX = 120;
const MIN_SENTENCE = 25;

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().replace(new RegExp('^[-–—•*·>#\\s]+'), '');
  return text || null;
}

/** Sentences ending in . ! or ? (a trailing fragment or "…" is dropped). */
function sentences(text: string): string[] {
  const found = text.match(new RegExp('[^.!?…]+[.!?]+["”’)]*(?=\\s|$)', 'g')) ?? [];
  return found.map((s) => s.trim().replace(new RegExp('^[-–—•*·>#\\s]+'), '')).filter(Boolean);
}

function fromText(text: string, max: number): string | null {
  if (text.length <= max && !text.endsWith('…') && !text.endsWith('...')) return text;
  const all = sentences(text);
  // Prefer the opening: as many leading sentences as fit.
  let lead = '';
  for (const s of all) {
    const next = lead ? `${lead} ${s}` : s;
    if (next.length > max) break;
    lead = next;
  }
  if (lead.length >= MIN_SENTENCE) return lead;
  // Otherwise the first complete sentence anywhere that fits.
  return all.find((s) => s.length >= MIN_SENTENCE && s.length <= max) ?? null;
}

/** First source (in order) that yields a complete quote that fits. */
export function cardQuote(sources: unknown[], max = CARD_QUOTE_MAX): string | null {
  for (const source of sources) {
    const text = clean(source);
    const quote = text ? fromText(text, max) : null;
    if (quote) return quote;
  }
  return null;
}

/** CIP-119 fields to draw a quote from, most card-like first. */
export function quoteSources(metadata: unknown): unknown[] {
  if (typeof metadata !== 'object' || metadata === null) return [];
  const m = metadata as Record<string, unknown>;
  return [m.objectives, m.motivations, m.qualifications];
}
