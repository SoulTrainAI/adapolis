import { describe, expect, it } from 'vitest';
import { imageSize, largestXAvatar } from './image-size';

function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}

function jpeg(w: number, h: number): Uint8Array {
  // SOI, an APP0 segment to skip, then SOF0 with the frame size.
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
}

describe('imageSize', () => {
  it('reads PNG', () => expect(imageSize(png(64, 64))).toEqual({ width: 64, height: 64 }));
  it('reads JPEG past other segments', () => expect(imageSize(jpeg(400, 300))).toEqual({ width: 400, height: 300 }));
  it('reads GIF', () => expect(imageSize(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 200, 0, 100, 0]))).toEqual({ width: 200, height: 100 }));
  it('returns null for unknown bytes', () => expect(imageSize(new Uint8Array([1, 2, 3, 4]))).toBeNull());
});

describe('largestXAvatar', () => {
  it('upsizes X avatar variants', () => {
    expect(largestXAvatar('https://pbs.twimg.com/profile_images/1/abc_normal.jpg')).toBe('https://pbs.twimg.com/profile_images/1/abc_400x400.jpg');
    expect(largestXAvatar('https://pbs.twimg.com/profile_images/1/abc_bigger.png')).toBe('https://pbs.twimg.com/profile_images/1/abc_400x400.png');
  });
  it('leaves other URLs alone', () => expect(largestXAvatar('https://github.com/x.png?size=400')).toBe('https://github.com/x.png?size=400'));
});
