import type { Page, Request } from '@playwright/test';

/**
 * Helpers that look at what Stripe actually received or stored, for checks that go beyond the sheet's own result.
 * Keys and client secrets are never recorded or printed.
 */

/** Billing details as stored on a PaymentMethod */
export type StoredBillingDetails = {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: { line1: string | null; line2: string | null; city: string | null; state: string | null; postal_code: string | null; country: string | null } | null;
};

/** The parts of a PaymentIntent (retrieved with `expand[]=payment_method`) that the checks look at */
export type StoredPaymentIntent = {
  status: string;
  shipping: { name: string | null; phone: string | null; address: StoredBillingDetails['address'] } | null;
  paymentMethod: { type: string; billing_details: StoredBillingDetails } | null;
};

/**
 * Retrieve a PaymentIntent with the publishable key and its client secret, the way Stripe.js does on the client.
 * Client-side retrieval allows `expand[]=payment_method`, which exposes the billing details Stripe saved.
 */
export const retrievePaymentIntent = async (page: Page, publishableKey: string, clientSecret: string): Promise<StoredPaymentIntent> =>
  page.evaluate(
    async ({ pk, secret }) => {
      const id = secret.split('_secret_')[0];
      const res = await fetch(`https://api.stripe.com/v1/payment_intents/${id}?client_secret=${encodeURIComponent(secret)}&expand[]=payment_method`, {
        headers: { Authorization: `Bearer ${pk}` },
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(`retrieving the PaymentIntent failed: HTTP ${res.status} ${body.error?.message ?? ''}`);
      }

      const paymentMethod = typeof body.payment_method === 'object' && body.payment_method != null ? body.payment_method : null;

      return {
        status: body.status,
        shipping: body.shipping,
        paymentMethod: paymentMethod && { type: paymentMethod.type, billing_details: paymentMethod.billing_details },
      };
    },
    { pk: publishableKey, secret: clientSecret },
  );

/** Billing, shipping and payment method type params of one PaymentIntent confirm request, e.g. `payment_method_data[billing_details][email]` */
export type ConfirmParams = Record<string, string>;

/**
 * Record the params of every PaymentIntent confirm request that Stripe.js sends from the page.
 * Only `payment_method_data[billing_details]...`, `payment_method_data[type]` and `shipping...` are kept (never keys or secrets).
 * The returned array fills as requests are sent; an empty array means the sheet never confirmed.
 */
export const recordConfirmRequests = (page: Page): ConfirmParams[] => {
  const recorded: ConfirmParams[] = [];

  page.on('request', (request: Request) => {
    if (request.method() !== 'POST' || !/^https:\/\/api\.stripe\.com\/v1\/payment_intents\/pi_[^/]+\/confirm/.test(request.url())) {
      return;
    }

    const params: ConfirmParams = {};

    new URLSearchParams(request.postData() ?? '').forEach((value, key) => {
      if (key.startsWith('payment_method_data[billing_details]') || key === 'payment_method_data[type]' || key.startsWith('shipping')) {
        params[key] = value;
      }
    });
    recorded.push(params);
  });

  return recorded;
};
