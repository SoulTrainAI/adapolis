import { describe, expect, it } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test';

describe('socialHandle', () => {
  it('finds an X or GitHub account among the links, skipping share links', async () => {
    const { socialHandle } = await import('./social-avatars');
    expect(socialHandle([{ url: 'https://www.youtube.com/@x' }, { url: 'https://x.com/MrEdgarcross' }])).toEqual({ source: 'x', handle: 'MrEdgarcross' });
    expect(socialHandle([{ url: 'https://twitter.com/intent/tweet?text=hi' }, { url: 'https://github.com/torvalds' }])).toEqual({ source: 'github', handle: 'torvalds' });
    expect(socialHandle([{ url: 'https://github.com/org/repo' }, { url: 'https://www.linkedin.com/in/someone' }])).toBeNull();
  });
});
