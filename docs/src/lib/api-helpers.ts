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
];

/** Minimal env shape needed by API helpers. */
export interface ApiEnv {
  STRIPE_SECRET_KEY: string;
  ALLOWED_ORIGINS?: string;
}

/**
 * Returns the list of allowed CORS origins.
 * When ALLOWED_ORIGINS env var is set, it overrides the defaults (comma-separated list).
 */
export function getAllowedOrigins(env: ApiEnv): string[] {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/** Returns true if the given origin is allowed (including *.stackblitz.io suffix match). */
function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) {
    return true;
  }
  // Allow any *.stackblitz.io subdomain
  if (origin.endsWith('.stackblitz.io')) {
    return true;
  }
  return false;
}

/**
 * Returns CORS headers for the given Origin request header value.
 * Returns an empty object when the origin is not in the allowlist.
 */
export function corsHeaders(origin: string | null, env: ApiEnv): Record<string, string> {
  if (!origin) {
    return {};
  }
  const allowed = getAllowedOrigins(env);
  if (!isOriginAllowed(origin, allowed)) {
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
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

/**
 * Validates the secret key and returns a Stripe instance using the Fetch HTTP client,
 * which is required for Cloudflare Workers compatibility.
 * Throws an error (without leaking the key) if the key is missing or is a live key.
 */
export function getStripe(env: ApiEnv): Stripe {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!key.startsWith('sk_test_')) {
    throw new Error('Only Stripe test keys (sk_test_) are allowed.');
  }
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2026-05-27.dahlia',
  });
}
