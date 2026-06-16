import Stripe from 'stripe';

/** Fixed demo amounts in smallest currency unit (e.g. cents / yen). */
export const DEMO_AMOUNTS: Record<string, number> = {
  jpy: 1000,
  usd: 1000,
  eur: 1000,
  gbp: 1000,
  aud: 1000,
};

/** Currencies allowed for demo requests — derived from DEMO_AMOUNTS keys. */
export const ALLOWED_CURRENCIES = new Set(Object.keys(DEMO_AMOUNTS));

const PRODUCTION_DOCS_ORIGIN = 'https://stripe-pwa-elements-docs.workers.dev';

const DEFAULT_ALLOWED_ORIGINS = [
  PRODUCTION_DOCS_ORIGIN,
  'http://localhost:4321',
  'https://stackblitz.com',
  // Wildcard: any StackBlitz preview subdomain (e.g. https://abc123.stackblitz.io).
  // Entries beginning with `*.` are matched as a host suffix (see matchesOrigin).
  '*.stackblitz.io',
];

/** Minimal env shape needed by API helpers. */
export interface ApiEnv {
  STRIPE_SECRET_KEY: string;
  ALLOWED_ORIGINS?: string;
}

/**
 * Returns the list of allowed CORS origins.
 * When ALLOWED_ORIGINS env var is set, it fully overrides the defaults (comma-separated list).
 * Entries may be exact origins or `*.example.com` wildcards (matched as a host suffix).
 */
export function getAllowedOrigins(env: ApiEnv): string[] {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/** Matches a request origin against a single allowlist entry (exact or `*.suffix` wildcard). */
function matchesOrigin(origin: string, entry: string): boolean {
  if (entry.startsWith('*.')) {
    // `*.stackblitz.io` matches `https://abc.stackblitz.io` but not `https://stackblitz.io`.
    return origin.endsWith(entry.slice(1));
  }
  return origin === entry;
}

/**
 * Returns true if the given Origin request header value is allowed.
 * Only the resolved allowlist is honored — there is no hardcoded bypass, so a custom
 * ALLOWED_ORIGINS can fully restrict access (it will not implicitly trust StackBlitz).
 */
export function isAllowedOrigin(origin: string | null, env: ApiEnv): boolean {
  if (!origin) {
    return false;
  }
  return getAllowedOrigins(env).some(entry => matchesOrigin(origin, entry));
}

/**
 * Returns CORS headers for the given Origin request header value.
 * Always sets `Vary: Origin` (responses differ per origin); echoes the origin only when allowed.
 */
export function corsHeaders(origin: string | null, env: ApiEnv): Record<string, string> {
  if (!isAllowedOrigin(origin, env)) {
    return { Vary: 'Origin' };
  }
  return {
    'Access-Control-Allow-Origin': origin as string,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Creates a JSON Response with given status and extra headers. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/** Cached Stripe instance, reused across requests within the same Worker isolate. */
let cachedStripe: Stripe | null = null;

/**
 * Validates the secret key and returns a Stripe instance using the Fetch HTTP client,
 * which is required for Cloudflare Workers compatibility.
 * The instance is cached per isolate to avoid re-initializing it on every request.
 * Throws an error (without leaking the key) if the key is missing or is a live key.
 * Accepts both full test secret keys (`sk_test_`) and restricted test keys (`rk_test_`).
 */
export function getStripe(env: ApiEnv): Stripe {
  if (cachedStripe) {
    return cachedStripe;
  }
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('Only Stripe test keys (sk_test_ or rk_test_) are allowed.');
  }
  cachedStripe = new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
    // Pinned to the version bundled with stripe@22 (LatestApiVersion). The `.dahlia`
    // suffix is Stripe's current release-train versioning and is required by the SDK types.
    apiVersion: '2026-05-27.dahlia',
  });
  return cachedStripe;
}
