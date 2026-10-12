# stripe-pwa-elements — CodeSandbox demo

Interactive demo of [`<stripe-payment-element>`](https://github.com/hideokamoto/stripe-pwa-elements)
running a **real PaymentIntent flow** — a clientSecret is issued, the element collects
card details, and `confirmPayment` actually runs against a shared Stripe **test** account.

## Try it

Open in CodeSandbox:

```
https://codesandbox.io/s/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox
```

1. Wait for the sandbox to install dependencies and start Parcel.
2. Click **Render payment form**.
3. Fill the form with test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Click **Pay now** — the result appears in the log panel.

## What this demo exercises

The wiring in `index.js` is identical to a production bundler integration
(see `docs/guides/bundler-integration`):

```js
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

- `publishable-key` / `intent-client-secret` attributes — same as setting props
- `intent-type`, `button-label`, `sheet-title` — try editing them in `index.js`
- `stripeLoaded` / `formSubmit` / `defaultFormSubmitResult` events — logged live

## Where the keys come from

The demo server (`stripe-pwa-elements-docs.wp-kyoto.workers.dev`, Stripe **test mode**)
provides:

| Endpoint | Method | Returns |
|---|---|---|
| `/api/config` | GET | `{ publishableKey }` |
| `/api/create-payment-intent` | POST `{ currency }` | `{ clientSecret }` |

A clientSecret is bound to the account that created it, so both values must come from
the same account — that is why the demo fetches the publishable key rather than asking
you to paste your own `pk_test_`.

Supported currencies: `usd`, `jpy`, `eur`, `gbp`, `aud`. Amount is fixed server-side.
