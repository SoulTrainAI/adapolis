/**
 * DRep sign-in: a DRep proves it controls its DRep key (CIP-95 signData with
 * the DRep ID), and gets a short session that lets it edit its own card art,
 * bio and links. Stats can never be edited. Server-only.
 *
 * Covers key-based DReps. Script-based DReps (multisig or contract) have no
 * single key to sign with and can't use this.
 */

import { randomBytes } from 'node:crypto';
import { blake2b } from 'blakejs';
import { bech32 } from 'bech32';
import { verifyDataSignature } from './cose';
import { sign, unsign } from './session';

export const DREP_COOKIE = 'adapolis_drep';
export const DREP_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** CIP-129 header byte for a key-hash DRep credential. */
const CIP129_KEY_HASH = 0x22;

export function drepIds(publicKeyHex: string): { keyHash: string; cip129: string; cip105: string } {
  if (!/^[0-9a-fA-F]{64}$/.test(publicKeyHex)) throw new Error('Expected a 32-byte DRep public key in hex.');
  const hash = Buffer.from(blake2b(Buffer.from(publicKeyHex, 'hex'), undefined, 28));
  return {
    keyHash: hash.toString('hex'),
    cip129: bech32.encode('drep', bech32.toWords(Buffer.concat([Buffer.from([CIP129_KEY_HASH]), hash])), 200),
    cip105: bech32.encode('drep', bech32.toWords(hash), 200),
  };
}

function message(drepId: string, issuedAt: number, nonce: string): string {
  return [
    'Edit my ADApolis DRep card',
    '',
    `DRep: ${drepId}`,
    `Issued: ${new Date(issuedAt).toISOString()}`,
    `Nonce: ${nonce}`,
    '',
    'This signature only proves you control this DRep key. It does not authorize any transaction or vote.',
  ].join('\n');
}

export function issueDrepChallenge(publicKeyHex: string): { message: string; token: string; drepId: string; keyHash: string; cip105: string } {
  const ids = drepIds(publicKeyHex);
  const issuedAt = Date.now();
  const nonce = randomBytes(16).toString('hex');
  return {
    message: message(ids.cip129, issuedAt, nonce),
    token: sign('drep-challenge', { pk: publicKeyHex.toLowerCase(), iat: issuedAt, n: nonce }),
    drepId: ids.cip129,
    keyHash: ids.keyHash,
    cip105: ids.cip105,
  };
}

export type DrepVerifyResult = { ok: true; drepId: string } | { ok: false; reason: string };

export function verifyDrepChallenge(input: { token: string; signature: string; key: string }): DrepVerifyResult {
  const claims = unsign('drep-challenge', input.token);
  if (typeof claims !== 'object' || claims === null || !('pk' in claims && 'iat' in claims && 'n' in claims)) {
    return { ok: false, reason: 'The DRep challenge is invalid. Start again.' };
  }
  const { pk, iat, n } = claims as { pk: unknown; iat: unknown; n: unknown };
  if (typeof pk !== 'string' || typeof iat !== 'number' || typeof n !== 'string') return { ok: false, reason: 'The DRep challenge is invalid. Start again.' };
  if (Date.now() - iat > CHALLENGE_TTL_MS) return { ok: false, reason: 'The DRep challenge expired (5 minute limit). Start again.' };

  const ids = drepIds(pk);
  let signed;
  try {
    signed = verifyDataSignature(input.signature, input.key);
  } catch (e) {
    return { ok: false, reason: `The wallet signature didn't verify: ${e instanceof Error ? e.message : String(e)}.` };
  }
  if (signed.publicKey.toString('hex') !== pk) return { ok: false, reason: 'The signature came from a different key than your wallet reported as its DRep key.' };
  // Rebuild the message from signed claims rather than trusting what the browser sent back.
  if (!signed.payload.equals(Buffer.from(message(ids.cip129, iat, n), 'utf8'))) return { ok: false, reason: 'The wallet signed a different message. Start again.' };
  if (signed.address) {
    const hash = Buffer.from(ids.keyHash, 'hex');
    const matches = signed.address.equals(hash) || signed.address.equals(Buffer.concat([Buffer.from([CIP129_KEY_HASH]), hash]));
    if (!matches) return { ok: false, reason: 'The wallet signed for a different DRep ID.' };
  }
  return { ok: true, drepId: ids.cip129 };
}

export function createDrepSession(drepId: string): string {
  return sign('drep-session', { d: drepId, iat: Date.now() });
}

export function readDrepSession(token: string | undefined): string | null {
  if (!token) return null;
  const claims = unsign('drep-session', token);
  if (typeof claims !== 'object' || claims === null || !('d' in claims && 'iat' in claims)) return null;
  const { d, iat } = claims as { d: unknown; iat: unknown };
  if (typeof d !== 'string' || typeof iat !== 'number') return null;
  if (Date.now() - iat > DREP_SESSION_TTL_SECONDS * 1000) return null;
  return d;
}
