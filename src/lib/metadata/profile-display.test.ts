import { describe, expect, it } from 'vitest';
import { embeddedImage, toDisplayProfile } from './profile-display';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

describe('profile images', () => {
  it('reads CIP-119 ImageObjects', () => {
    const p = toDisplayProfile({ givenName: 'A', image: { '@type': 'ImageObject', contentUrl: 'https://x.test/a.png' } }, 'ok', 'drep1abc');
    expect(p.image).toBe('https://x.test/a.png');
  });
  it('routes embedded data-URI images through the image endpoint', () => {
    const p = toDisplayProfile({ image: { contentUrl: PNG } }, 'ok', 'drep1abc');
    expect(p.image).toBe('/api/dreps/drep1abc/image');
    expect(embeddedImage({ image: { contentUrl: PNG } })?.type).toBe('image/png');
  });
  it('refuses SVG data URIs', () => {
    const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    expect(toDisplayProfile({ image: svg }, 'ok', 'drep1abc').image).toBeNull();
    expect(embeddedImage({ image: svg })).toBeNull();
  });
});
