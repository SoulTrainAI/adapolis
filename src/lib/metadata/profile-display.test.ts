import { describe, expect, it } from 'vitest';
import { toDisplayProfile, uniqueLinks } from './profile-display';

describe('profile links', () => {
  it('drops a link that repeats an earlier one', () => {
    const profile = toDisplayProfile(
      {
        references: [
          { label: 'x', uri: 'https://x.com/MrEdgarcross' },
          { label: 'x', uri: 'https://x.com/MrEdgarcross' },
          { label: 'Twitter', uri: 'https://twitter.com/mredgarcross/' },
          { label: 'Site', uri: 'https://www.mredgarcross.com/' },
          { label: 'Site again', uri: 'https://mredgarcross.com' },
        ],
      },
      'ok'
    );
    expect(profile.links.map((l) => l.url)).toEqual(['https://x.com/MrEdgarcross', 'https://www.mredgarcross.com/']);
  });

  it('keeps different pages on the same site', () => {
    expect(uniqueLinks([{ url: 'https://x.com/a' }, { url: 'https://x.com/b' }])).toHaveLength(2);
  });
});
