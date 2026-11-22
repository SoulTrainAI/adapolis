/** True when the request carries `Authorization: Bearer <CRON_SECRET>`; used by admin endpoints. */
export function hasCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('Authorization') === `Bearer ${secret}`;
}
