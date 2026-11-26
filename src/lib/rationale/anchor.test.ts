import { describe, expect, it } from 'vitest';
import { blake2bHex } from 'blakejs';
import { candidateUrls, isSafeHttpsUrl, parseAnchorBytes } from './anchor';

describe('candidateUrls', () => {
  it('maps ipfs:// anchors onto public gateways', () => {
    const urls = candidateUrls('ipfs://bafkreiabc123');
    expect(urls[0]).toBe('https://ipfs.filebase.io/ipfs/bafkreiabc123');
    expect(urls.length).toBeGreaterThan(1);
  });
  it('keeps safe https anchors and drops everything else', () => {
    expect(candidateUrls('https://example.org/r.jsonld')).toEqual(['https://example.org/r.jsonld']);
    expect(candidateUrls('http://example.org/r.jsonld')).toEqual([]);
    expect(candidateUrls('file:///etc/passwd')).toEqual([]);
  });
});

describe('isSafeHttpsUrl', () => {
  it.each([
    'https://127.0.0.1/x',
    'https://localhost/x',
    'https://service.railway.internal/x',
    'https://[::1]/x',
    'https://user:pw@example.org/x',
    'https://example.org:8443/x',
    'https://intranet/x',
  ])('rejects %s', (u) => expect(isSafeHttpsUrl(u)).toBe(false));
  it('accepts an ordinary https host', () => expect(isSafeHttpsUrl('https://raw.githubusercontent.com/a/b.jsonld')).toBe(true));
});

describe('parseAnchorBytes', () => {
  const doc = JSON.stringify({ body: { comment: 'I voted yes because…' } });
  const bytes = new TextEncoder().encode(doc);
  it('parses JSON and checks the blake2b-256 hash', () => {
    const r = parseAnchorBytes(bytes, blake2bHex(bytes, undefined, 32));
    expect(r.hashMatches).toBe(true);
    expect((r.json as { body: { comment: string } }).body.comment).toContain('voted yes');
  });
  it('flags a hash mismatch', () => expect(parseAnchorBytes(bytes, '00'.repeat(32)).hashMatches).toBe(false));
  it('keeps plain text when the document is not JSON', () => {
    const r = parseAnchorBytes(new TextEncoder().encode('Plain rationale.'), null);
    expect(r.json).toBeNull();
    expect(r.text).toBe('Plain rationale.');
    expect(r.hashMatches).toBeNull();
  });
});
