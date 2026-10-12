# stripe-pwa-elements — CodeSandbox demo (Express Checkout)

Interactive demo of [`<stripe-express-checkout-element>`](https://github.com/hideokamoto/stripe-pwa-elements)
running as a real Vite project inside a CodeSandbox **devbox**: the element
mounts Express Checkout buttons backed by a real test-mode PaymentIntent.

## Try it

Open in CodeSandbox:

```
https://codesandbox.io/p/devbox/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox-express-checkout
```

1. Wait for the devbox to install dependencies (`npm install`) and start Vite (`npm start` on port 3002 — `vite.config.js` already allows the `*.csb.app` / `*.csb.run` preview hosts).
   The preview lives at `https://<sandbox-id>-3002.csb.app`.
2. Click **Render express checkout**.
3. Wallet buttons (Apple Pay / Google Pay / Link) appear **only when your
   browser and device actually offer them** — on a plain desktop browser the
   area may stay empty; that is Stripe's intended behavior, not an error.
   The log panel still shows `stripeLoaded` and any `expressCheckoutClick` /
   `confirm` / `defaultConfirmResult` events.

The wiring in `index.js` is what a production bundler integration uses
(see `docs/guides/bundler-integration`), except it imports the self-registering
`stripe-elements.esm.js` bundle — the same file the `unpkg` field points at.

```js
import 'stripe-pwa-elements/dist/stripe-elements/stripe-elements.esm.js';
```

## How it works

```
GET  /api/config                 -> publishable key (pk_test_…)
POST /api/create-payment-intent  -> clientSecret for the PaymentIntent
                                   stripe-express-checkout-element renders
                                   wallet buttons (if available)
Wallet click / confirm           -> confirm + defaultConfirmResult events
```

The demo server runs in **test mode** — nothing is charged.
