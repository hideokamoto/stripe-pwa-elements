import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { corsHeaders, isAllowedOrigin, DEMO_AMOUNTS, ALLOWED_CURRENCIES, json, getStripe } from '../../lib/api-helpers';

export const prerender = false;

const PRODUCTION_RETURN_URL = 'https://stripe-pwa-elements-docs.wp-kyoto.workers.dev';

/**
 * Checkout Session UI modes a caller may request.
 * - `embedded_page` (default, unchanged behavior): for Stripe.js embedded Checkout.
 * - `elements`: for Stripe.js Checkout elements (`initCheckout` / `initCheckoutElementsSdk`),
 *   used by `<stripe-payment-element>` in Checkout Session mode. Older API versions called this `custom`.
 */
const ALLOWED_UI_MODES = ['embedded_page', 'elements'] as const;
type DemoUiMode = (typeof ALLOWED_UI_MODES)[number];
const DEFAULT_UI_MODE: DemoUiMode = 'embedded_page';

function isAllowedUiMode(value: string): value is DemoUiMode {
  return (ALLOWED_UI_MODES as readonly string[]).includes(value);
}

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin, env);
  return new Response(null, { status: 204, headers });
};

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);

  // Reject disallowed (or missing) origins before doing any Stripe work.
  if (!isAllowedOrigin(origin, env)) {
    return json({ error: 'Origin is not allowed.' }, 403, cors);
  }

  let currency = 'usd';
  let requestedUiMode: unknown = undefined;
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      if (typeof record.currency === 'string') {
        currency = record.currency.toLowerCase();
      }
      requestedUiMode = record.uiMode;
    }
  } catch {
    // If body parsing fails, fall back to default currency and UI mode
  }

  let uiMode: DemoUiMode = DEFAULT_UI_MODE;
  if (requestedUiMode !== undefined && requestedUiMode !== null) {
    if (typeof requestedUiMode !== 'string' || !isAllowedUiMode(requestedUiMode)) {
      return json({ error: `uiMode is not supported. Allowed values: ${ALLOWED_UI_MODES.join(', ')}.` }, 400, cors);
    }
    uiMode = requestedUiMode;
  }

  if (!ALLOWED_CURRENCIES.has(currency)) {
    return json(
      { error: `Currency '${currency}' is not supported. Allowed currencies: ${[...ALLOWED_CURRENCIES].join(', ')}.` },
      400,
      cors,
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe(env);
  } catch (error) {
    // Logged to the Worker logs (not the response) to aid debugging configuration issues.
    console.error('Stripe configuration error:', error);
    return json({ error: 'Server configuration error.' }, 500, cors);
  }

  // Only trust the request origin for the post-checkout redirect when it passes the
  // allowlist; otherwise fall back to the production docs origin. This prevents a caller
  // from setting an arbitrary Origin header to point return_url at an unrelated site.
  const returnUrl = isAllowedOrigin(origin, env) ? `${origin}/` : `${PRODUCTION_RETURN_URL}/`;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: uiMode,
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: DEMO_AMOUNTS[currency],
            product_data: {
              name: 'Demo Payment',
            },
          },
        },
      ],
      // return_url is accepted by both `embedded_page` and `elements` (required for either when
      // redirect-based payment methods are enabled), so it is sent for both modes. Neither mode
      // allows success_url / cancel_url, and redirect_on_completion only applies to embedded_page,
      // so none of those are set.
      return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    });

    return json({ clientSecret: session.client_secret }, 200, cors);
  } catch (error) {
    console.error('Failed to create Checkout Session:', error);
    return json({ error: 'Failed to create Checkout Session.' }, 500, cors);
  }
};
