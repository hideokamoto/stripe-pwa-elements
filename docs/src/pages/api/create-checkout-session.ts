import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { corsHeaders, DEMO_AMOUNTS, ALLOWED_CURRENCIES, json, getStripe } from '../../lib/api-helpers';

export const prerender = false;

const PRODUCTION_RETURN_URL = 'https://stripe-pwa-elements-docs.workers.dev';

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin, env);
  return new Response(null, { status: 204, headers });
};

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);

  let currency = 'usd';
  try {
    const body = await request.json();
    if (body && typeof body === 'object' && 'currency' in body && typeof (body as Record<string, unknown>).currency === 'string') {
      currency = ((body as Record<string, unknown>).currency as string).toLowerCase();
    }
  } catch {
    // If body parsing fails, fall back to default currency
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
  } catch {
    return json({ error: 'Server configuration error.' }, 500, cors);
  }

  const returnUrl = origin ? `${origin}/` : PRODUCTION_RETURN_URL;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page',
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
      return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    });

    return json({ clientSecret: session.client_secret }, 200, cors);
  } catch {
    return json({ error: 'Failed to create Checkout Session.' }, 500, cors);
  }
};
