import { describe, expect, it } from 'vitest';
import { validItems } from './generate';

const sources = [{ index: 0, kind: 'rationale' as const, text: 'I believe treasury spending must be tied to clear milestones and public reporting.', url: null, proposal_id: 'p' }];

describe('validItems', () => {
  it('keeps items whose quote is verbatim', () => {
    const items = validItems([{ label: 'Milestone-based funding', quote: 'treasury spending must be tied to clear milestones', source_index: 0 }], sources, 5);
    expect(items).toHaveLength(1);
  });
  it('drops invented quotes, wrong sources and political labels', () => {
    const items = validItems(
      [
        { label: 'Fiscal hawk', quote: 'we must cut all treasury spending now', source_index: 0 },
        { label: 'Milestones', quote: 'treasury spending must be tied to clear milestones', source_index: 3 },
        { label: 'Conservative on spending', quote: 'treasury spending must be tied to clear milestones', source_index: 0 },
      ],
      sources,
      5
    );
    expect(items).toHaveLength(0);
  });
});
