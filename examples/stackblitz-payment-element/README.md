# stripe-payment-element — PaymentIntent demo

An instant StackBlitz demo for [`<stripe-payment-element>`](https://github.com/hideokamoto/stripe-pwa-elements)
running in **PaymentIntent mode**. The library is loaded directly from unpkg
(CDN) — no npm install, no bundler, and no build step.

## What this demo shows

- Mounting `<stripe-payment-element>` with a PaymentIntent `clientSecret`.
- Stripe's unified Payment Element UI (cards, wallets, and other methods).
- The component's built-in Pay button, which calls `stripe.confirmPayment()`
  automatically (`should-use-default-form-submit-action` left at its default
  `true`).
- Handling the `defaultFormSubmitResult` event to show a success or error
  message.

## Open in StackBlitz

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz-payment-element
```

> If you are working on a feature branch, replace `main` with the branch name.

## How to use

1. Open the demo. It fetches the demo account's publishable key from
   `/api/config` automatically — **no key entry required** — and enables the
   **Render** button.
2. Click **Render**. The demo fetches a PaymentIntent `clientSecret` from the
   demo API and mounts the Payment Element.
3. Fill in the test card `4242 4242 4242 4242` — any future expiry date, any
   CVC, and any ZIP code.
4. Click **Pay**. The result (success JSON or error message) appears below the
   element.

## Why the key comes from the server

A `clientSecret` is tied to the Stripe account that created it, and Stripe.js
only accepts a `clientSecret` together with a publishable key from the **same**
account. The demo server owns the secret key, so it also serves the matching
publishable key via `/api/config` (see `helpers.js`'s `fetchPublishableKey()`).
That is why the demo never asks you to paste your own key — a key from a
different account could not confirm this `clientSecret`. To run the flow against
your own Stripe account, fork the demo and point `helpers.js` at your own
backend; the library itself is account-agnostic.

> **Never use a live key (`pk_live_`).** These demos are public and run in the
> browser; the demo server only ever serves a `pk_test_` key.
