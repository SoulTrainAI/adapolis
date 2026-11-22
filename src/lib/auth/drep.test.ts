import { generateKeyPairSync, sign as edSign } from 'node:crypto';
import { describe, expect, it } from 'vitest';

process.env.AUTH_SECRET = 'x'.repeat(40);

// Minimal CBOR writer for building test signatures the way wallets do.
function head(major: number, n: number): Buffer {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  return Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
}
const bstr = (b: Buffer) => Buffer.concat([head(2, b.length), b]);
const tstr = (s: string) => Buffer.concat([head(3, Buffer.byteLength(s)), Buffer.from(s)]);

function walletSign(privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'], rawPub: Buffer, address: Buffer, payload: Buffer) {
  // protected = { 1: -8 (EdDSA), "address": bytes }
  const protectedRaw = Buffer.concat([head(5, 2), Buffer.from([0x01, 0x27]), tstr('address'), bstr(address)]);
  const toSign = Buffer.concat([head(4, 4), tstr('Signature1'), bstr(protectedRaw), bstr(Buffer.alloc(0)), bstr(payload)]);
  const sig = edSign(null, toSign, privateKey);
  // [protected, {hashed: false}, payload, signature]
  const signature = Buffer.concat([head(4, 4), bstr(protectedRaw), head(5, 1), tstr('hashed'), Buffer.from([0xf4]), bstr(payload), bstr(sig)]);
  // COSE_Key { 1: 1 (OKP), 3: -8, -1: 6 (Ed25519), -2: x }
  const key = Buffer.concat([head(5, 4), Buffer.from([0x01, 0x01, 0x03, 0x27, 0x20, 0x06, 0x21]), bstr(rawPub)]);
  return { signature: signature.toString('hex'), key: key.toString('hex') };
}

function keypair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(12);
  return { privateKey, raw: Buffer.from(raw) };
}

describe('DRep sign-in', () => {
  it('derives CIP-129 and CIP-105 DRep IDs from the key', async () => {
    const { drepIds } = await import('./drep');
    const ids = drepIds('00'.repeat(32));
    expect(ids.cip129).toMatch(/^drep1[02-9ac-hj-np-z]{53}$/);
    expect(ids.cip105).toMatch(/^drep1[02-9ac-hj-np-z]{51}$/);
    expect(ids.keyHash).toHaveLength(56);
  });

  it('accepts a real signature from the DRep key and rejects tampering', async () => {
    const { issueDrepChallenge, verifyDrepChallenge, createDrepSession, readDrepSession } = await import('./drep');
    const { privateKey, raw } = keypair();
    const ch = issueDrepChallenge(raw.toString('hex'));
    const good = walletSign(privateKey, raw, Buffer.from(ch.keyHash, 'hex'), Buffer.from(ch.message));
    const ok = verifyDrepChallenge({ token: ch.token, ...good });
    expect(ok).toEqual({ ok: true, drepId: ch.drepId });
    expect(readDrepSession(createDrepSession(ch.drepId))).toBe(ch.drepId);

    // Different message
    const wrongMsg = walletSign(privateKey, raw, Buffer.from(ch.keyHash, 'hex'), Buffer.from(ch.message + 'x'));
    expect(verifyDrepChallenge({ token: ch.token, ...wrongMsg }).ok).toBe(false);

    // Someone else's key signing a challenge issued for this key
    const other = keypair();
    const forged = walletSign(other.privateKey, other.raw, Buffer.from(ch.keyHash, 'hex'), Buffer.from(ch.message));
    expect(verifyDrepChallenge({ token: ch.token, ...forged }).ok).toBe(false);

    // Flipped signature byte
    const last = parseInt(good.signature.slice(-2), 16);
    const bad = { ...good, signature: good.signature.slice(0, -2) + (last ^ 1).toString(16).padStart(2, '0') };
    expect(verifyDrepChallenge({ token: ch.token, ...bad }).ok).toBe(false);

    // Tampered token
    const tampered = ch.token.slice(0, -1) + (ch.token.endsWith('A') ? 'B' : 'A');
    expect(verifyDrepChallenge({ token: tampered, ...good }).ok).toBe(false);
  });
});
