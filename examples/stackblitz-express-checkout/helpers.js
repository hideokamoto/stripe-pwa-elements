/**
 * helpers.js — Demo API client for stripe-pwa-elements StackBlitz demos.
 *
 * The demo server (stripe-pwa-elements-docs.workers.dev) runs in Stripe test
 * mode and has its own Stripe test account credentials. Its CORS policy allows
 * requests from stackblitz.com and *.stackblitz.io, so no additional setup is
 * needed when running demos from StackBlitz.
 *
 * Amount is fixed server-side. Only currency can be specified by the caller,
 * and it must be one of the values in ALLOWED_CURRENCIES.
 *
 * IMPORTANT: These helpers return a clientSecret that belongs to the demo
 * server's Stripe test account. To process a payment end-to-end you must use
 * the matching publishable key (see README.md). For address-only demos that do
 * not need a clientSecret, these helpers are not required.
 */

const DEMO_API_BASE = 'https://stripe-pwa-elements-docs.workers.dev/api';

/** Abort the demo API request after this many milliseconds so a hung network
 *  request rejects instead of leaving the demo form stuck. */
const REQUEST_TIMEOUT_MS = 10000;

/** @type {ReadonlyArray<string>} */
const ALLOWED_CURRENCIES = ['usd', 'jpy', 'eur', 'gbp', 'aud'];

/**
 * POST to a demo API endpoint and return its clientSecret, with an
 * AbortController-based timeout so a stalled request fails fast.
 *
 * @param {string} path     Endpoint path, e.g. '/create-payment-intent'.
 * @param {object} payload  JSON request body.
 * @param {string} label    Human-readable endpoint name for error messages.
 * @returns {Promise<string>}  The clientSecret from the response.
 */
async function postForClientSecret(path, payload, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${DEMO_API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${label} failed (HTTP ${res.status})${body ? ': ' + body : ''}`);
    }

    const { clientSecret } = await res.json();

    if (!clientSecret) {
      throw new Error(`${label} response did not include a clientSecret`);
    }

    return clientSecret;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`${label} timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a PaymentIntent clientSecret from the demo API.
 *
 * @param {string} publishableKey  Stripe publishable key used in this demo (pk_test_…).
 *   Passed to the server for logging/validation; must match the demo server's account.
 * @param {'usd'|'jpy'|'eur'|'gbp'|'aud'} [currency='usd']  Payment currency.
 * @returns {Promise<string>}  clientSecret for use with stripe-payment-element or
 *   stripe-express-checkout-element.
 */
export async function fetchPaymentIntentClientSecret(publishableKey, currency = 'usd') {
  if (!publishableKey || !publishableKey.startsWith('pk_test_')) {
    throw new Error('publishableKey must be a Stripe test publishable key (pk_test_…)');
  }
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency "${currency}". Use one of: ${ALLOWED_CURRENCIES.join(', ')}.`);
  }

  return postForClientSecret('/create-payment-intent', { currency, publishableKey }, 'create-payment-intent');
}

/**
 * Fetch a Checkout Session clientSecret from the demo API.
 *
 * Use this when mounting stripe-payment-element in Checkout Session mode.
 *
 * @param {string} publishableKey  Stripe publishable key used in this demo (pk_test_…).
 *   Must match the demo server's account.
 * @param {'usd'|'jpy'|'eur'|'gbp'|'aud'} [currency='usd']  Session currency.
 * @returns {Promise<string>}  clientSecret for use with stripe-payment-element
 *   (checkout session mode).
 */
export async function fetchCheckoutSessionClientSecret(publishableKey, currency = 'usd') {
  if (!publishableKey || !publishableKey.startsWith('pk_test_')) {
    throw new Error('publishableKey must be a Stripe test publishable key (pk_test_…)');
  }
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    throw new Error(`Unsupported currency "${currency}". Use one of: ${ALLOWED_CURRENCIES.join(', ')}.`);
  }

  return postForClientSecret('/create-checkout-session', { currency, publishableKey }, 'create-checkout-session');
}
