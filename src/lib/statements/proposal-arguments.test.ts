import { describe, expect, it } from 'vitest';
import { isFullSentenceQuote } from './proposal-arguments';

const source = 'I support this budget. The team has delivered every milestone on time, and the audit was clean. However, the marketing line is too large.';

describe('isFullSentenceQuote', () => {
  it('accepts whole sentences copied exactly', () => {
    expect(isFullSentenceQuote('The team has delivered every milestone on time, and the audit was clean.', source)).toBe(true);
    expect(isFullSentenceQuote('The team has delivered every milestone on time, and the audit was clean. However, the marketing line is too large.', source)).toBe(true);
  });
  it('rejects fragments and paraphrases', () => {
    expect(isFullSentenceQuote('delivered every milestone on time, and the audit was clean.', source)).toBe(false);
    expect(isFullSentenceQuote('The team has delivered every milestone on time and', source)).toBe(false);
    expect(isFullSentenceQuote('The team delivered all milestones on time and passed the audit.', source)).toBe(false);
  });
});

import { cleanDebateSummary } from './proposal-arguments';

describe('cleanDebateSummary', () => {
  it('keeps a short neutral summary', () => {
    expect(cleanDebateSummary('The proposal asks for 600,000 ada to maintain the SDK. Supporters cite delivery; opponents question the budget size.')).not.toBeNull();
  });
  it('drops labels and predictions', () => {
    expect(cleanDebateSummary('Conservative DReps oppose the budget while others support the maintenance plan for the SDK.')).toBeNull();
    expect(cleanDebateSummary('The proposal asks for funding and it will pass easily given the support so far from DReps.')).toBeNull();
  });
});
