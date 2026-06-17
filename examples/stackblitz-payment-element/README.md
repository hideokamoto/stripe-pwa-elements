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

1. Enter your Stripe test publishable key (starts with `pk_test_`), pick a
   currency (USD, JPY, EUR, GBP, or AUD), and click **Render**.
2. The demo fetches a PaymentIntent `clientSecret` in the selected currency from
   the demo API and mounts the Payment Element.
3. Fill in the test card `4242 4242 4242 4242` — any future expiry date, any
   CVC, and any ZIP code.
4. Click **Pay**. The result (success JSON or error message) appears below the
   form.

> **Never use a live key (`pk_live_`) in this demo.** It is public and runs in
> the browser.

## About the clientSecret

The `clientSecret` is created by the demo API server
(`stripe-pwa-elements-docs.workers.dev`), which runs under **this project's own
Stripe test account**. To confirm a payment end-to-end you must use the matching
`pk_test_` key from that same account. With a publishable key from a different
Stripe account the element still renders, but confirmation will fail because the
key and the `clientSecret` belong to different accounts. To test with your own
account, run your own backend — the library itself is account-agnostic.
