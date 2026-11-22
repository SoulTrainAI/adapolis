import { cookies } from 'next/headers';
import { DREP_COOKIE, readDrepSession } from './drep';

/** The DRep this browser proved control of (CIP-95 signature), or null. Server only. */
export function currentDrep(): string | null {
  try {
    return readDrepSession(cookies().get(DREP_COOKIE)?.value);
  } catch {
    return null;
  }
}
