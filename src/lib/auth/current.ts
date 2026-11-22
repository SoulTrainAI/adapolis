import { cookies } from 'next/headers';
import { readSessionToken, SESSION_COOKIE } from './session';

/** Signed-in stake address for this request, or null. Server components and route handlers only. */
export function currentStakeAddress(): string | null {
  try {
    return readSessionToken(cookies().get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}
