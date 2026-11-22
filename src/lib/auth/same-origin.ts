/**
 * CSRF guard for cookie-authenticated writes: the request must be JSON (which
 * a cross-site form can't send without a CORS preflight) and its Origin must
 * be this site.
 */
export function isSameOriginJson(request: Request): boolean {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}
