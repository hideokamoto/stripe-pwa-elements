# stripe-pwa-elements — StackBlitz demos

Interactive demos for [stripe-pwa-elements](https://github.com/hideokamoto/stripe-pwa-elements),
a web component library for Stripe payment UIs.

All demos use **Method A (static / CDN)**: the library is loaded directly from
unpkg — no npm install, no bundler, and no build step required.

---

## Quick start

### 1. Open the demo in StackBlitz

Click the link below to open a pre-configured StackBlitz environment:

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz
```

> If you are working on a feature branch, replace `main` with the branch name.

### 2. Click "Render"

You do **not** need to provide a Stripe key. On load the demo fetches the demo
account's publishable key from the demo server (`/api/config`) and renders the
element when you click **Render**. The default template renders
`<stripe-address-element>`, which does not require a clientSecret.

---

## Why the key comes from the server (important)

A `clientSecret` (PaymentIntent / Checkout Session) is tied to the Stripe account
that created it. **Stripe.js only accepts a `clientSecret` together with a publishable
key from the same account.** Because the demo server owns the secret key, it must
also serve the matching publishable key — otherwise payment/express-checkout demos
could never be confirmed.

That is why these demos fetch the key from `/api/config` instead of asking you to
paste your own `pk_test_` (which would belong to a different account and would be
rejected the moment a `clientSecret` is involved).

| Endpoint | Method | Returns |
|---|---|---|
| `/api/config` | `GET` | `{ publishableKey }` (demo account, `pk_test_…`) |
| `/api/create-payment-intent` | `POST` | `{ clientSecret }` |
| `/api/create-checkout-session` | `POST` | `{ clientSecret }` |

Request body for the two `POST` endpoints (JSON): `{ "currency": "usd" }` — supported
currencies: `usd`, `jpy`, `eur`, `gbp`, `aud`. Amount is fixed server-side.

The `helpers.js` module in this directory wraps all three endpoints:

```js
import { fetchPublishableKey, fetchPaymentIntentClientSecret, fetchCheckoutSessionClientSecret } from './helpers.js';

const publishableKey = await fetchPublishableKey();
const clientSecret = await fetchPaymentIntentClientSecret('usd');
```

> **Maintainers:** the demo server must have `STRIPE_PUBLISHABLE_KEY` configured with the
> `pk_test_` key from the **same** Stripe account as `STRIPE_SECRET_KEY`. See
> [`docs/README.md`](../../docs/README.md) → *Serverless API Endpoints*. Until it is set,
> `/api/config` returns a 500 and the demo shows a "Could not load the demo key" message.

---

## Creating a new demo (fork procedure)

Follow these steps to build a demo for a specific element. In every case
`mountDemo(publishableKey, container)` already receives the fetched key.

### Address element (no clientSecret)

1. Copy `index.html` to a new folder (e.g. `examples/stackblitz-address/`).
2. Replace the body of `mountDemo()` with:
   ```js
   async function mountDemo(publishableKey, container) {
     const el = document.createElement('stripe-address-element');
     el.setAttribute('publishable-key', publishableKey);
     el.setAttribute('mode', 'billing'); // or 'shipping'
     container.appendChild(el);
   }
   ```
3. No `helpers.js` clientSecret call needed (the key fetch is already wired in `index.html`).

### Payment element (needs clientSecret via PaymentIntent)

1. Copy `index.html` and `helpers.js` to a new folder
   (e.g. `examples/stackblitz-payment-element/`).
2. Replace `mountDemo()` with:
   ```js
   async function mountDemo(publishableKey, container) {
     const clientSecret = await fetchPaymentIntentClientSecret();

     const el = document.createElement('stripe-payment-element');
     el.setAttribute('publishable-key', publishableKey);
     el.setAttribute('intent-client-secret', clientSecret);
     container.appendChild(el);

     el.addEventListener('defaultFormSubmitResult', ({ detail }) => {
       if (detail instanceof Error) {
         console.error('Payment failed', detail);
       } else {
         console.log('Payment succeeded', detail);
       }
     });
   }
   ```

### Express Checkout element (needs clientSecret via PaymentIntent)

1. Copy `index.html` and `helpers.js` to a new folder
   (e.g. `examples/stackblitz-express-checkout/`).
2. Replace `mountDemo()` with:
   ```js
   async function mountDemo(publishableKey, container) {
     const clientSecret = await fetchPaymentIntentClientSecret();

     const el = document.createElement('stripe-express-checkout-element');
     el.setAttribute('publishable-key', publishableKey);
     el.setAttribute('client-secret', clientSecret);
     el.setAttribute('amount', '1000');
     el.setAttribute('currency', 'usd');
     container.appendChild(el);
     // publishable-key attribute triggers @Watch('publishableKey') → initStripe() automatically
   }
   ```

### Checkout Session mode (payment-element with Checkout Session)

Same as the payment-element procedure above, but call
`fetchCheckoutSessionClientSecret()` instead of
`fetchPaymentIntentClientSecret()`.

---

## Dependency summary

| Demo | clientSecret needed | API calls |
|---|---|---|
| address-element | No | `fetchPublishableKey` |
| payment-element (PaymentIntent) | Yes | `fetchPublishableKey` + `fetchPaymentIntentClientSecret` |
| payment-element (Checkout Session) | Yes | `fetchPublishableKey` + `fetchCheckoutSessionClientSecret` |
| express-checkout-element | Yes | `fetchPublishableKey` + `fetchPaymentIntentClientSecret` |

---

## CDN path reference

```html
<script
  type="module"
  src="https://unpkg.com/stripe-pwa-elements@3.2.0/dist/stripe-elements/stripe-elements.esm.js"
  crossorigin="anonymous"
></script>
```

The correct path inside the package is `dist/stripe-elements/stripe-elements.esm.js`.
Any path containing `dist/wpkyoto/` is incorrect and will result in a 404.

> **SRI note:** an `integrity` hash is intentionally **not** used here. The Stencil ESM
> entry is a loader that dynamically imports separately-hashed chunks, which an integrity
> hash on the entry tag would not cover — so it adds breakage risk without protecting the
> component code. The pinned `@3.2.0` version is the integrity anchor instead.
