import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { corsHeaders, isAllowedOrigin, json, getPublishableKey } from '../../lib/api-helpers';

export const prerender = false;

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin, env);
  return new Response(null, { status: 204, headers });
};

/**
 * Returns the demo account's Stripe publishable key so browser demos (e.g. StackBlitz embeds)
 * can render elements without hardcoding or asking the user to paste a key. The returned key
 * belongs to the same account as STRIPE_SECRET_KEY, so any clientSecret created by the
 * create-payment-intent / create-checkout-session endpoints is usable with it.
 */
export const GET: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);

  // Reject disallowed (or missing) origins before returning anything.
  if (!isAllowedOrigin(origin, env)) {
    return json({ error: 'Origin is not allowed.' }, 403, cors);
  }

  let publishableKey: string;
  try {
    publishableKey = getPublishableKey(env);
  } catch {
    return json({ error: 'Server configuration error.' }, 500, cors);
  }

  return json({ publishableKey }, 200, cors);
};
