import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { corsHeaders, isAllowedOrigin, DEMO_AMOUNTS, ALLOWED_CURRENCIES, json, getStripe } from '../../lib/api-helpers';

export const prerender = false;

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
  } catch (error) {
    // Logged to the Worker logs (not the response) to aid debugging configuration issues.
    console.error('Stripe configuration error:', error);
    return json({ error: 'Server configuration error.' }, 500, cors);
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: DEMO_AMOUNTS[currency],
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return json({ clientSecret: paymentIntent.client_secret }, 200, cors);
  } catch (error) {
    console.error('Failed to create PaymentIntent:', error);
    return json({ error: 'Failed to create PaymentIntent.' }, 500, cors);
  }
};
