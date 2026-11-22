import { createHash } from 'crypto';

function secret(): string | null {
  // Trimmed so a stray newline pasted into the Railway variable doesn't lock everyone out.
  const s = process.env.CRON_SECRET?.trim();
  return s ? s : null;
}

function provided(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`; used by admin endpoints. */
export function hasCronSecret(request: Request): boolean {
  const s = secret();
  return s !== null && provided(request) === s;
}

/**
 * Explains a rejected secret without revealing it: lengths plus the first 6
 * characters of each value's SHA-256, so you can compare against a local hash.
 */
export function cronSecretMismatch(request: Request): string {
  const s = secret();
  const p = provided(request);
  if (!s) return 'CRON_SECRET is not set on the server. Add it in Railway variables.';
  if (p === null) return 'Send the header: Authorization: Bearer <CRON_SECRET>.';
  const fp = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 6);
  return `CRON_SECRET doesn't match: you sent ${p.length} characters (sha256 ${fp(p)}…), the server expects ${s.length} (sha256 ${fp(s)}…).`;
}
