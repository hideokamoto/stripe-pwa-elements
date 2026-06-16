---
name: stripe-pwa-elements
description: >-
  Use when integrating Stripe payments into a web app with the
  `stripe-pwa-elements` library — i.e. when the user mentions stripe-pwa-elements
  or uses its custom element tags (<stripe-card-element>, <stripe-payment-element>,
  <stripe-express-checkout-element>, <stripe-address-element>,
  <stripe-link-authentication-element>, <stripe-currency-selector>, <stripe-modal>,
  <stripe-card-element-modal>, <stripe-payment-request-button>). Covers install,
  choosing the right component, wiring the publishable key + intent/checkout client
  secret, lazy-load timing, and the submit/confirm flow. Works for plain HTML/JS,
  React, Vue, Angular, and Svelte.
license: MIT
---

# Integrating stripe-pwa-elements

`stripe-pwa-elements` is a framework-agnostic Web Component library (built with
Stencil) that wraps Stripe Elements. It works in plain HTML, React, Vue, Angular,
and Svelte. This skill helps you pick the right component and wire it up correctly.

## Install

```bash
npm install stripe-pwa-elements
```

Register the custom elements once at app startup (bundler/ESM):

```js
import { defineCustomElements } from 'stripe-pwa-elements/loader';
defineCustomElements();
```

Or load directly from a CDN (no build step):

```html
<script type="module" src="https://unpkg.com/stripe-pwa-elements/dist/wpkyoto/stripe-pwa-elements.esm.js"></script>
```

## Choose the right component

| You want to…                                                        | Use this tag                          |
| ------------------------------------------------------------------- | ------------------------------------- |
| One unified form for cards, wallets & local methods (**recommended**) | `<stripe-payment-element>`            |
| One-click Apple Pay / Google Pay / Link / PayPal                    | `<stripe-express-checkout-element>`   |
| Classic split card fields (number / expiry / CVC)                   | `<stripe-card-element>`               |
| Card fields presented inside a built-in modal                       | `<stripe-card-element-modal>`         |
| Collect a billing/shipping address                                  | `<stripe-address-element>`            |
| Collect email + offer Stripe Link                                   | `<stripe-link-authentication-element>`|
| Let the buyer choose a currency (Adaptive Pricing)                  | `<stripe-currency-selector>`          |
| A reusable modal wrapper around any of the above                    | `<stripe-modal>`                      |
| Low-level Payment Request button (Beta)                             | `<stripe-payment-request-button>`     |

When unsure, prefer `<stripe-payment-element>` — it adapts to the buyer's location
and the payment methods enabled in the Stripe Dashboard.

## Golden-path rules (always follow these)

1. **Secrets come from the server.** Create the PaymentIntent / SetupIntent /
   Checkout Session on your backend with your **secret** key, and pass only the
   *publishable* key (`pk_test_…` / `pk_live_…`) and the resulting *client secret*
   to the browser. Never put a secret key (`sk_…` / `rk_…`) in client code.

2. **Set the publishable key plus the correct secret prop** for the component:
   - `<stripe-payment-element>`, `<stripe-card-element>`, `<stripe-card-element-modal>` → `intent-client-secret` (`pi_…_secret_…` or `seti_…_secret_…`)
   - `<stripe-payment-element>` in Checkout Session mode → `checkout-session-client-secret` (or the `initStripeWithCheckoutSession()` method)
   - `<stripe-express-checkout-element>` → `client-secret`
   - `<stripe-currency-selector>` → `client-secret` (Checkout Session)
   - `<stripe-address-element>` / `<stripe-link-authentication-element>` → publishable key only

3. **Wait for the element before scripting it.** Components lazy-load Stripe.js, so
   guard with `await customElements.whenDefined('<tag>')` and/or listen for the
   `stripeLoaded` event before calling any method.

4. **Attributes are kebab-case; events are camelCase `CustomEvent`s.** A prop like
   `intentClientSecret` is the HTML attribute `intent-client-secret`. Read event
   payloads from `event.detail`. In React use `onFormSubmit`; in Vue use
   `@formSubmit`.

5. **Default vs. manual submit.** By default the form components confirm the payment
   for you and emit the result on `defaultFormSubmitResult` (or `defaultConfirmResult`
   for express checkout). To run your own logic instead, set
   `should-use-default-form-submit-action="false"` (express checkout:
   `should-use-default-confirm-action="false"`) and handle the `formSubmit` /
   `confirm` event yourself.

6. **Use test mode while developing** (`pk_test_…`). Generate a client secret fast
   with the Stripe CLI, e.g.
   `stripe payment_intents create --amount=1099 --currency=usd | jq -r .client_secret`.

## Shared API (most components)

- `initStripe(publishableKey, { stripeAccount? })` — load Stripe.js & mount.
- `updateProgress('' | 'loading' | 'success' | 'failure')` — drive the button state.
- `setErrorMessage(message)` — show an inline error.
- `stripeLoaded` event — fires with `{ stripe }` once Stripe.js is ready.

`applicationName` and `stripe-account` (Connect) props are available on every
Stripe-backed component. i18n (English, Japanese, Portuguese) is auto-detected from
the browser.

## Going deeper

- **Full props / events / methods for every component:** see [reference.md](reference.md).
- **Copy-paste, end-to-end recipes** (PaymentIntent, Checkout Session, Express
  Checkout, Address, Link, modal): see [examples.md](examples.md).

Always cross-check exact prop and event names against [reference.md](reference.md)
before generating code — do not guess attribute names.
