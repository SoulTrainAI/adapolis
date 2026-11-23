import { describe, expect, it } from 'vitest';
import { cardQuote } from './quote';

describe('cardQuote', () => {
  it('drops leading list marks', () => {
    expect(cardQuote(['- Professional accountant and auditor for 12 years.'])).toBe('Professional accountant and auditor for 12 years.');
  });

  it('drops a leading language tag', () => {
    expect(cardQuote(['EN Blockchain tech only helps if it is truly decentralized.'])).toBe('Blockchain tech only helps if it is truly decentralized.');
    expect(cardQuote(['[ES] Transparencia en cada voto que emito.'])).toBe('Transparencia en cada voto que emito.');
  });

  it('keeps a short text whole', () => {
    expect(cardQuote(['Show up, explain every vote.'])).toBe('Show up, explain every vote.');
  });

  it('uses whole leading sentences, never a cut one', () => {
    const bio =
      'As a DRep, I strive to approach governance with reason, curiosity, and accountability. I aim to evaluate issues thoughtfully, remain open to new ideas and listen.';
    expect(cardQuote([bio])).toBe('As a DRep, I strive to approach governance with reason, curiosity, and accountability.');
  });

  it('finds a later sentence when the first is too long', () => {
    const long = `${'Very long opening clause '.repeat(8).trim()}. I vote on every single governance action.`;
    expect(cardQuote([long])).toBe('I vote on every single governance action.');
  });

  it('falls through to the next source, and returns null rather than truncating', () => {
    const tooLong = `${'word '.repeat(40).trim()}`;
    expect(cardQuote([tooLong, 'Transparency first, always and on every single vote.'])).toBe(
      'Transparency first, always and on every single vote.'
    );
    expect(cardQuote([tooLong])).toBeNull();
    expect(cardQuote(['Already cut off…'])).toBeNull();
  });
});
