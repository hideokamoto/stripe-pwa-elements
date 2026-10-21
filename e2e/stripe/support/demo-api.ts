import type { Page } from '@playwright/test';

/**
 * The repo's demo backend (docs/src/pages/api/). It runs in Stripe TEST mode, returns the
 * matching pk_test_ key and creates intents for a fixed amount. Same base URL as
 * examples/codesandbox/helpers.js.
 */
export const DEMO_API_BASE = 'https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/api';

export type DemoCurrency = 'usd' | 'jpy' | 'eur' | 'gbp' | 'aud';

/**
 * Call the demo API from inside the page, so the request carries the harness origin
 * (allowlisted by the demo API) and goes through the browser's network stack.
 */
const callDemoApi = async <T>(page: Page, path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> =>
  page.evaluate(
    async ({ url, method, body }) => {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`demo API ${method} ${url} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
      }

      return JSON.parse(text);
    },
    { url: `${DEMO_API_BASE}${path}`, method: init.method, body: init.body },
  );

/** pk_test_ key of the demo account (the account that creates the client secrets below). */
export const fetchPublishableKey = async (page: Page): Promise<string> => {
  const { publishableKey } = await callDemoApi<{ publishableKey?: string }>(page, '/config', { method: 'GET' });

  if (publishableKey == null || !publishableKey.startsWith('pk_test_')) {
    throw new Error('demo API /config did not return a pk_test_ key');
  }

  return publishableKey;
};

/** Client secret of a new TEST-mode PaymentIntent (fixed amount, automatic payment methods). */
export const createPaymentIntent = async (page: Page, currency: DemoCurrency = 'usd'): Promise<string> => {
  const { clientSecret } = await callDemoApi<{ clientSecret?: string }>(page, '/create-payment-intent', { method: 'POST', body: { currency } });

  if (clientSecret == null || !clientSecret.startsWith('pi_')) {
    throw new Error('demo API /create-payment-intent did not return a PaymentIntent client secret');
  }

  return clientSecret;
};

/** Client secret of a new TEST-mode embedded Checkout Session (for future Checkout Session scenarios). */
export const createCheckoutSession = async (page: Page, currency: DemoCurrency = 'usd'): Promise<string> => {
  const { clientSecret } = await callDemoApi<{ clientSecret?: string }>(page, '/create-checkout-session', { method: 'POST', body: { currency } });

  if (clientSecret == null) {
    throw new Error('demo API /create-checkout-session did not return a client secret');
  }

  return clientSecret;
};
