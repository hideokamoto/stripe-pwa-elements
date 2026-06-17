# stripe-express-checkout-element — StackBlitz demo

Interactive demo for [`<stripe-express-checkout-element>`](https://github.com/hideokamoto/stripe-pwa-elements),
the one-click wallet element (Apple Pay, Google Pay, and Stripe Link) from
[stripe-pwa-elements](https://github.com/hideokamoto/stripe-pwa-elements). The
library is loaded directly from unpkg (CDN) — no npm install, no bundler, and no
build step.

## What this demo shows

The Express Checkout Element renders **one-click payment wallets** — Apple Pay,
Google Pay, and Link — based on what the visitor's browser and device support.
It requires a PaymentIntent `clientSecret`, which the demo fetches from the
project's demo API server, and reports the outcome via `defaultConfirmResult`.

## Open in StackBlitz

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz-express-checkout
```

> If you are working on a feature branch, replace `main` with the branch name.

## How to use

1. Open the demo. It fetches the demo account's publishable key from
   `/api/config` automatically — **no key entry required** — and enables the
   **Render** button.
2. Click **Render**. The demo fetches a PaymentIntent `clientSecret` and mounts
   `<stripe-express-checkout-element>`. In test mode the available wallet
   buttons (most commonly **Link**) appear.

## Wallet buttons not showing?

The Express Checkout Element only renders wallets the current browser/device
actually supports, so it is normal to see only some — or none — of them:

- The page must be served over **HTTPS** (StackBlitz already is).
- **Apple Pay** appears only in **Safari** on a Mac/iOS device with a card in Wallet.
- **Google Pay** appears only in **Chrome** signed in to a Google account with a saved card.
- **Link** renders for most browsers in **test mode**, so it is usually visible first.
- In **live mode** some wallets require a verified domain in the Stripe Dashboard;
  **test mode** is lenient and does not require domain verification.

If no wallet is supported by your browser/device, the element renders nothing —
that is expected, not an error.

## Why the key comes from the server

A `clientSecret` is tied to the Stripe account that created it, and Stripe.js
only accepts a `clientSecret` together with a publishable key from the **same**
account. The demo server owns the secret key, so it also serves the matching
publishable key via `/api/config` (see `helpers.js`'s `fetchPublishableKey()`).
That is why the demo never asks you to paste your own key. To run the flow
against your own Stripe account, fork the demo and point `helpers.js` at your own
backend; the library itself is account-agnostic.

> **Never use a live key (`pk_live_`).** These demos are public and run in the
> browser; the demo server only ever serves a `pk_test_` key.
