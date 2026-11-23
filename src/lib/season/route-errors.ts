import { NextResponse } from 'next/server';
import { DraftError } from './fantasy';

/** Turns a thrown error into a JSON response: player-facing DraftErrors keep their status. */
export function errorResponse(error: unknown, event: string): NextResponse {
  if (error instanceof DraftError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, error: message }));
  return NextResponse.json({ error: `${message}. Try again in a minute; if it keeps failing, tell us in Discord.` }, { status: 500 });
}
