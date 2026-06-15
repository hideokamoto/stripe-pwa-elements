import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { corsHeaders, DEMO_AMOUNTS, ALLOWED_CURRENCIES, json, getStripe } from '../../lib/api-helpers';

export const prerender = false;

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

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: DEMO_AMOUNTS[currency],
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return json({ clientSecret: paymentIntent.client_secret }, 200, cors);
  } catch {
    return json({ error: 'Failed to create PaymentIntent.' }, 500, cors);
  }
};
