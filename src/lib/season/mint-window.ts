/**
 * The mint window (Jason, 2026-11-25): opens 48 hours after a season ends, so
 * the ADApolis team can test-mint and check every card, and closes 3 epochs
 * after the season ends. Unclaimed copies are never minted.
 */

export const MINT_OPENS_AFTER_MS = 48 * 3_600_000;
export const MINT_WINDOW_EPOCHS = 3;
const EPOCH_MS = 5 * 86_400_000;

export function mintWindow(seasonEndsAt: Date): { opens: Date; closingSoon: Date; closes: Date } {
  const end = seasonEndsAt.getTime();
  return {
    opens: new Date(end + MINT_OPENS_AFTER_MS),
    closingSoon: new Date(end + (MINT_WINDOW_EPOCHS - 1) * EPOCH_MS),
    closes: new Date(end + MINT_WINDOW_EPOCHS * EPOCH_MS),
  };
}

/** Works back from a stored claim deadline, which is all a claim row carries. */
export function windowFromClose(closesAt: Date): { opens: Date; closes: Date } {
  const end = closesAt.getTime() - MINT_WINDOW_EPOCHS * EPOCH_MS;
  return { opens: new Date(end + MINT_OPENS_AFTER_MS), closes: closesAt };
}
