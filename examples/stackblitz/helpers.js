/**
 * helpers.js — Demo API client for stripe-pwa-elements StackBlitz demos.
 *
 * The demo server (stripe-pwa-elements-docs.workers.dev) runs in Stripe test
 * mode and holds its own Stripe test account credentials. Its CORS policy allows
 * requests from stackblitz.com and *.stackblitz.io, so no additional setup is
 * needed when running demos from StackBlitz.
 *
 * Why the publishable key comes from the server:
 * A clientSecret (PaymentIntent / Checkout Session) is tied to the Stripe account
 * that created it. Stripe.js only accepts a clientSecret together with a publishable
 * key from the SAME account. Because the demo server owns the secret key, it must
 * also provide the matching publishable key — so demos fetch it via fetchPublishableKey()
 * instead of asking the user to paste one (which would belong to a different account).
 *
 * Amount is fixed server-side. Only currency can be specified by the caller,
 * and it must be one of the values in ALLOWED_CURRENCIES.
 */

const DEMO_API_BASE = 'https://stripe-pwa-elements-docs.workers.dev/api';

/** @type {ReadonlyArray<string>} */
const ALLOWED_CURRENCIES = ['usd', 'jpy', 'eur', 'gbp', 'aud'];

/**
 * Fetch the demo account's publishable key from the demo API.
 *
 * This is the key every demo should use: it matches the account that issues the
 * clientSecrets below, so payments can be confirmed end-to-end with Stripe test cards.
 *
 * @returns {Promise<string>}  A pk_test_… publishable key.
 */
export async function fetchPublishableKey() {
  const res = await fetch(`${DEMO_API_BASE}/config`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`config failed (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  const { publishableKey } = await res.json();

  if (!publishableKey || !publishableKey.startsWith('pk_test_')) {
    throw new Error('config response did not include a valid pk_test_ publishable key');
  }

  return publishableKey;
}

/**
 * Fetch a PaymentIntent clientSecret from the demo API.
 *
 * The PaymentIntent is created with the demo server's secret key, so pair the returned
 * clientSecret with the publishable key from fetchPublishableKey() (same account).
 *
 * @param {'usd'|'jpy'|'eur'|'gbp'|'aud'} [currency='usd']  Payment currency.
 * @returns {Promise<string>}  clientSecret for use with stripe-payment-element or
 *   stripe-express-checkout-element.
 */
export async function fetchPaymentIntentClientSecret(currency = 'usd') {
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency "${currency}". Use one of: ${ALLOWED_CURRENCIES.join(', ')}.`);
  }

  const res = await fetch(`${DEMO_API_BASE}/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`create-payment-intent failed (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  const { clientSecret } = await res.json();

  if (!clientSecret) {
    throw new Error('create-payment-intent response did not include a clientSecret');
  }

  return clientSecret;
}

/**
 * Fetch a Checkout Session clientSecret from the demo API.
 *
 * Use this when mounting stripe-payment-element in Checkout Session mode. Pair the returned
 * clientSecret with the publishable key from fetchPublishableKey() (same account).
 *
 * @param {'usd'|'jpy'|'eur'|'gbp'|'aud'} [currency='usd']  Session currency.
 * @returns {Promise<string>}  clientSecret for use with stripe-payment-element
 *   (checkout session mode).
 */
export async function fetchCheckoutSessionClientSecret(currency = 'usd') {
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency "${currency}". Use one of: ${ALLOWED_CURRENCIES.join(', ')}.`);
  }

  const res = await fetch(`${DEMO_API_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`create-checkout-session failed (HTTP ${res.status})${body ? ': ' + body : ''}`);
  }

  const { clientSecret } = await res.json();

  if (!clientSecret) {
    throw new Error('create-checkout-session response did not include a clientSecret');
  }

  return clientSecret;
}
