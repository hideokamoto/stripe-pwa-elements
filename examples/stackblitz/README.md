# stripe-pwa-elements — StackBlitz demos

Interactive demos for [stripe-pwa-elements](https://github.com/hideokamoto/stripe-pwa-elements),
a web component library for Stripe payment UIs.

All demos use **Method A (static / CDN)**: the library is loaded directly from
unpkg — no npm install, no bundler, and no build step required.

---

## Quick start

### 1. Get a Stripe test publishable key

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Switch to **Test mode** (toggle in the top-left corner).
3. Go to **Developers → API keys**.
4. Copy the **Publishable key** — it starts with `pk_test_`.

> **Never use a live key (`pk_live_`) in these demos.** The demos are
> public; live keys must not appear in browser-visible code.

### 2. Open the demo in StackBlitz

Click the link below to open a pre-configured StackBlitz environment:

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz
```

> If you are working on a feature branch, replace `main` with the branch name.

### 3. Enter your key and click "Render"

Paste your `pk_test_` key into the input field and click **Render**.
The default template renders `<stripe-address-element>`, which does not
require a clientSecret.

---

## About clientSecrets (payment-element / express-checkout demos)

`stripe-payment-element` and `stripe-express-checkout-element` need a
**clientSecret** (from a PaymentIntent or a Checkout Session) before they can
render. The demo API server at `stripe-pwa-elements-docs.workers.dev` provides
two endpoints for this:

| Endpoint | Returns |
|---|---|
| `POST /api/create-payment-intent` | `{ clientSecret }` |
| `POST /api/create-checkout-session` | `{ clientSecret }` |

Request body (JSON): `{ "currency": "usd", "publishableKey": "pk_test_…" }` — supported currencies:
`usd`, `jpy`, `eur`, `gbp`, `aud`. Amount is fixed server-side.

The `helpers.js` module in this directory wraps both endpoints:

```js
import { fetchPaymentIntentClientSecret, fetchCheckoutSessionClientSecret } from './helpers.js';

const clientSecret = await fetchPaymentIntentClientSecret(publishableKey, 'usd');
```

> **Important:** The demo API server runs under the Stripe test account owned
> by this project. The `clientSecret` it returns belongs to that account.
> To confirm a payment end-to-end you must use the matching `pk_test_` key
> (the one from the project's own Stripe test account). If you are testing
> with your own Stripe account you need to run your own backend — the library
> itself is account-agnostic.

---

## Creating a new demo (fork procedure)

Follow these steps to build a demo for a specific element:

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
3. No `helpers.js` dependency needed.

### Payment element (needs clientSecret via PaymentIntent)

1. Copy `index.html` and `helpers.js` to a new folder
   (e.g. `examples/stackblitz-payment-element/`).
2. Replace `mountDemo()` with:
   ```js
   async function mountDemo(publishableKey, container) {
     const clientSecret = await fetchPaymentIntentClientSecret(publishableKey);

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
     const clientSecret = await fetchPaymentIntentClientSecret(publishableKey);

     const el = document.createElement('stripe-express-checkout-element');
     el.setAttribute('publishable-key', publishableKey);
     el.setAttribute('client-secret', clientSecret);
     el.setAttribute('amount', '1099');
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

| Demo | clientSecret needed | API call |
|---|---|---|
| address-element | No | — |
| payment-element (PaymentIntent) | Yes | `fetchPaymentIntentClientSecret` |
| payment-element (Checkout Session) | Yes | `fetchCheckoutSessionClientSecret` |
| express-checkout-element | Yes | `fetchPaymentIntentClientSecret` |

---

## CDN path reference

```html
<script
  type="module"
  src="https://unpkg.com/stripe-pwa-elements@3.2.0/dist/stripe-elements/stripe-elements.esm.js"
></script>
```

The correct path inside the package is `dist/stripe-elements/stripe-elements.esm.js`.
Any path containing `dist/wpkyoto/` is incorrect and will result in a 404.
