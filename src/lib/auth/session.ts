/**
 * Wallet sign-in: stateless challenges and session cookies, both HMAC-signed
 * with AUTH_SECRET. Server-only.
 *
 * Identity is the wallet's stake (reward) address, proven with CIP-30
 * signData using the stake key. That is a message signature only: it can't
 * authorize a transaction or move funds.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { checkSignature } from '@meshsdk/core';

export const SESSION_COOKIE = 'adapolis_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// Mainnet key-hash stake addresses only: script stake credentials can't sign.
const STAKE_ADDRESS = /^stake1u[02-9ac-hj-np-z]{52}$/;

export function isStakeAddress(value: unknown): value is string {
  return typeof value === 'string' && STAKE_ADDRESS.test(value);
}

export class AuthConfigError extends Error {}

export function authConfigured(): boolean {
  const raw = process.env.AUTH_SECRET;
  return !!raw && raw.length >= 32;
}

function secret(): Buffer {
  const raw = process.env.AUTH_SECRET;
  if (!raw || !authConfigured()) {
    throw new AuthConfigError(
      'AUTH_SECRET is missing or shorter than 32 characters. Add a random value to the Railway service variables and redeploy.'
    );
  }
  return Buffer.from(raw, 'utf8');
}

function mac(purpose: string, body: string): string {
  return createHmac('sha256', secret()).update(`${purpose}.${body}`).digest('base64url');
}

function sign(purpose: string, data: object): string {
  const body = Buffer.from(JSON.stringify(data), 'utf8').toString('base64url');
  return `${body}.${mac(purpose, body)}`;
}

function unsign(purpose: string, token: string): unknown {
  const [body, tag, extra] = token.split('.');
  if (!body || !tag || extra !== undefined) return null;
  const expected = Buffer.from(mac(purpose, body));
  const given = Buffer.from(tag);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function challengeMessage(stakeAddress: string, issuedAt: number, nonce: string): string {
  return [
    'Sign in to ADApolis',
    '',
    `Stake address: ${stakeAddress}`,
    `Issued: ${new Date(issuedAt).toISOString()}`,
    `Nonce: ${nonce}`,
    '',
    'This signature only proves you control this wallet. It does not authorize any transaction.',
  ].join('\n');
}

export function issueChallenge(stakeAddress: string): { message: string; token: string } {
  const issuedAt = Date.now();
  const nonce = randomBytes(16).toString('hex');
  return {
    message: challengeMessage(stakeAddress, issuedAt, nonce),
    token: sign('challenge', { sa: stakeAddress, iat: issuedAt, n: nonce }),
  };
}

export type VerifyResult = { ok: true; stakeAddress: string } | { ok: false; reason: string };

export async function verifyChallenge(input: {
  token: string;
  signature: string;
  key: string;
}): Promise<VerifyResult> {
  const claims = unsign('challenge', input.token);
  if (
    typeof claims !== 'object' ||
    claims === null ||
    !('sa' in claims && 'iat' in claims && 'n' in claims) ||
    !isStakeAddress(claims.sa) ||
    typeof claims.iat !== 'number' ||
    typeof claims.n !== 'string'
  ) {
    return { ok: false, reason: 'Sign-in challenge is invalid. Start sign-in again.' };
  }
  if (Date.now() - claims.iat > CHALLENGE_TTL_MS) {
    return { ok: false, reason: 'Sign-in challenge expired (5 minute limit). Start sign-in again.' };
  }
  // Rebuild the message from signed claims rather than trusting client text.
  const message = challengeMessage(claims.sa, claims.iat, claims.n);
  let valid = false;
  try {
    valid = await checkSignature(message, { signature: input.signature, key: input.key }, claims.sa);
  } catch {
    valid = false;
  }
  if (!valid) {
    return {
      ok: false,
      reason: 'Wallet signature did not verify for this stake address. Make sure you signed with the same wallet account you connected.',
    };
  }
  return { ok: true, stakeAddress: claims.sa };
}

export function createSessionToken(stakeAddress: string): string {
  return sign('session', { sa: stakeAddress, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS });
}

/** Stake address for a session cookie value, or null if missing, forged or expired. */
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const claims = unsign('session', token);
  if (
    typeof claims !== 'object' ||
    claims === null ||
    !('sa' in claims && 'exp' in claims) ||
    !isStakeAddress(claims.sa) ||
    typeof claims.exp !== 'number' ||
    claims.exp < Date.now() / 1000
  ) {
    return null;
  }
  return claims.sa;
}
