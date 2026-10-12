# stripe-pwa-elements — CodeSandbox demos

Interactive demos of the [`stripe-pwa-elements`](https://github.com/hideokamoto/stripe-pwa-elements)
web components running **real Stripe test-mode flows** — a single Vite app serving
one page per element:

| Page | Element | What it does |
|---|---|---|
| `card.html` | `<stripe-card-element>` | Card number / expiry / CVC with a real PaymentIntent confirm flow |
| `address.html` | `<stripe-address-element>` | Billing address form — submit to see the `formSubmit` payload |
| `express-checkout.html` | `<stripe-express-checkout-element>` | Apple Pay / Google Pay / Link (device-dependent), PaymentIntent-backed |

## Try it

Open in CodeSandbox:

```
https://codesandbox.io/p/devbox/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox
```

1. Wait for the devbox to install dependencies (`npm install`) and start Vite
   (`npm start` on port 3000 — `vite.config.js` already allows the `*.csb.app` /
   `*.csb.run` preview hosts). The preview lives at
   `https://<sandbox-id>-3000.csb.app`.
2. The landing page links to each demo; open a page and click **Render …**.
3. Card demo: fill `4242 4242 4242 4242`, any future expiry, any CVC, **Pay now**.

## What these demos exercise

Each page's JS (`card.js`, `address.js`, `express-checkout.js`) shows the wiring a
production bundler integration uses (see `docs/guides/bundler-integration`):

```js
import 'stripe-pwa-elements/dist/stripe-elements/stripe-elements.esm.js';
```

- `publishable-key` / `intent-client-secret` / `client-secret` attributes
- `stripeLoaded`, `formSubmit`, `defaultFormSubmitResult`,
  `expressCheckoutClick`, `confirm`, `cancel` events — logged live in each page

> **Known limitation in v4.0.0:** `<stripe-payment-element>`'s
> `intent-client-secret` flow and the per-component `dist/components/*` imports
> render the component shell but never mount the inner Stripe element
> (`stripe.elements()` is created without a clientSecret). These demos therefore
> use the self-registering `stripe-elements.esm.js` bundle — the same file the
> `unpkg` field points at — and do not include a Payment Element page yet.

## Where the keys come from

The demo server (`stripe-pwa-elements-docs.wp-kyoto.workers.dev`, Stripe **test
mode**) provides:

| Endpoint | Method | Returns |
|---|---|---|
| `/api/config` | GET | `{ publishableKey }` |
| `/api/create-payment-intent` | POST `{ currency }` | `{ clientSecret }` |
| `/api/create-checkout-session` | POST `{ currency }` | `{ clientSecret }` |

A clientSecret is bound to the account that created it, so both values must come
from the same account — that is why the demos fetch the publishable key rather
than asking you to paste your own `pk_test_`.

Supported currencies: `usd`, `jpy`, `eur`, `gbp`, `aud`. Amount is fixed
server-side (1000 minor units).

## Express Checkout notes

Wallet buttons render only when the browser/device offers them (Apple Pay needs
Safari+TouchID or a capable device, Google Pay needs Chrome with a saved card,
Link needs Stripe Link eligibility). On a plain desktop browser the element may
mount with no buttons — `stripeLoaded` and the mount itself still verify the
integration.
