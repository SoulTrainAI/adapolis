/**
 * Koios API HTTP Client
 * Handles rate limiting, retries, and typed responses
 * Base URL: https://api.koios.rest/api/v1
 */

import { z } from 'zod';

const KOIOS_BASE_URL = 'https://api.koios.rest/api/v1';
const RATE_LIMIT_DELAY_MS = 1000; // 1 request per second

let lastRequestTime = 0;

/**
 * Rate limiter: ensures max 1 request per second
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Makes a typed request to Koios API with rate limiting, retries, and error handling
 * @param endpoint - API endpoint path (e.g. '/drep_list')
 * @param options - Fetch options (method, body, headers)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Parsed JSON response
 * @throws Error with descriptive message on failure
 */
export async function koiosFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
  maxRetries: number = 3
): Promise<T> {
  const { method = 'POST', body, headers = {} } = options;

  // Add API key if available
  const apiKey = process.env.KOIOS_API_KEY;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (apiKey) {
    finalHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Rate limit before making request
      await rateLimit();

      const url = `${KOIOS_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Retry on rate limit (429) or server errors (5xx)
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(
          JSON.stringify({
            event: 'koios_retry',
            endpoint,
            attempt,
            status: response.status,
            backoffMs,
          })
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Koios API error: ${response.status} ${response.statusText} from ${endpoint}. Response: ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to fetch ${endpoint} after ${maxRetries} attempts: ${lastError.message}`
        );
      }
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError || new Error(`Unknown error fetching ${endpoint}`);
}

const KoiosTipSchema = z
  .array(z.object({ epoch_no: z.number().int().positive() }))
  .min(1);

/**
 * Current chain epoch from the Koios tip. Scoring must be keyed to the real
 * epoch: deriving it from the latest stored score never advances past the
 * first epoch ever scored.
 */
export async function fetchCurrentEpoch(): Promise<number> {
  const raw = await koiosFetch<unknown>('/tip', { method: 'GET' });
  const parsed = KoiosTipSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Koios /tip returned an unexpected shape: ${parsed.error.message}. Check https://api.koios.rest/ for API changes.`
    );
  }
  return parsed.data[0].epoch_no;
}

/**
 * Health check: verify Koios API is accessible
 * @returns true if API is reachable
 */
export async function checkKoiosHealth(): Promise<boolean> {
  try {
    // Use a simple endpoint that returns quickly
    await koiosFetch('/tip', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}
