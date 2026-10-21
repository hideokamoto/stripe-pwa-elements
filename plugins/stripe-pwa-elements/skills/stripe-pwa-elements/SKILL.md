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

## Prerequisites

- A Stripe account. Develop against a sandbox: its keys start with `pk_test_`
  (publishable), `sk_test_` (secret) and `rk_test_` (restricted).
- A backend you control that creates the PaymentIntent / SetupIntent / Checkout
  Session with a secret or restricted key and hands the client secret to the page.
  The components only run in the browser; they never create these objects.
- `@stripe/stripe-js` is a regular dependency of `stripe-pwa-elements`, so installing
  the package installs it too. Do not add a second copy by hand.
- Optional: the [Stripe CLI](https://docs.stripe.com/stripe-cli) for creating test
  client secrets from a terminal.

## Safety rules

These steps change a real Stripe account, so treat them as external side effects:
creating objects (PaymentIntents, Customers, Checkout Sessions) with the Stripe CLI
or API, registering payment method domains, and changing Dashboard settings.

1. **Check before you run.** The Stripe CLI has no dry-run flag. Show the user the
   exact command first, and use read-only commands (`--help`, `list`, `retrieve`) to
   check the target account and parameters.
2. **Run only after the user approves.** Do not run a command that creates or changes
   anything until the user has seen it and said yes.
3. **Stay in the sandbox.** Stripe CLI resource commands make live requests only when
   given `--live`. Never add `--live`, and never use a `pk_live_` / `sk_live_` /
   `rk_live_` key, unless the user explicitly asks for live mode.
4. **Keep keys out of code.** Only the publishable key may appear in front-end code.
   Never write secret or restricted keys into client code or commit them.

## Stripe-side constraints

From the Stripe docs ([API keys](https://docs.stripe.com/keys),
[Express Checkout Element](https://docs.stripe.com/elements/express-checkout-element)):

- Only publishable keys are safe to expose outside your backend. For the server,
  Stripe recommends restricted keys with only the permissions the integration needs
  over unrestricted secret keys.
- Sandbox and live mode each have their own keys, and objects made in one mode are not
  accessible in the other. The publishable key and the client secret must come from
  the same mode.
- Wallets in `<stripe-express-checkout-element>` (Apple Pay, Google Pay, Link, …) need
  the domain [registered](https://docs.stripe.com/payments/payment-methods/pmd-registration)
  in both the sandbox and live mode, and some payment methods must be activated in the
  Dashboard before they appear.
- Inside an iframe, the iframe's origin must match the top-level page's origin for
  Express Checkout (Safari 17+ also works with `allow="payment"`).

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
<script type="module" src="https://unpkg.com/stripe-pwa-elements/dist/stripe-elements/stripe-elements.esm.js"></script>
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

## Exact props, events and methods

Do not guess attribute or event names. Look them up in the generated API, which always
matches the code:

- In the project: `node_modules/stripe-pwa-elements/dist/types/components.d.ts`
  (matches the installed version; each prop and event has its doc comment).
- Online: the component pages at https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/en/components/

## Recipes

Copy-paste starting points. Replace the placeholder values.

### 1. Payment Element — default submit (let the library confirm)

Simplest path. The component calls `stripe.confirmPayment()` and emits the result.

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
></stripe-payment-element>

<script>
  customElements.whenDefined('stripe-payment-element').then(() => {
    const el = document.querySelector('stripe-payment-element');
    el.addEventListener('defaultFormSubmitResult', ({ detail }) => {
      if (detail instanceof Error || detail.error) {
        el.updateProgress('failure');
        console.error('Payment failed', detail);
      } else {
        el.updateProgress('success');
        console.log('Payment succeeded', detail);
        // redirect to your success page, close modal, etc.
      }
    });
  });
</script>
```

To save a card instead of charging, set `intent-type="setup"` and pass a SetupIntent
client secret (`seti_…_secret_…`).

### 2. Payment Element — manual submit (your own confirm logic)

Set `should-use-default-form-submit-action="false"` and handle `formSubmit`.

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
  should-use-default-form-submit-action="false"
></stripe-payment-element>

<script>
  customElements.whenDefined('stripe-payment-element').then(() => {
    const el = document.querySelector('stripe-payment-element');
    el.addEventListener('formSubmit', async ({ detail: { stripe, elements } }) => {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: 'https://example.com/order/complete' },
        redirect: 'if_required',
      });
      if (result.error) {
        el.setErrorMessage(result.error.message);
        el.updateProgress('failure');
      } else {
        el.updateProgress('success');
      }
    });
  });
</script>
```

### 3. Payment Element — Checkout Session mode

Use a Checkout Session client secret (`cs_…_secret_…`) via the dedicated method.

```js
const el = document.querySelector('stripe-payment-element');
await customElements.whenDefined('stripe-payment-element');
await el.initStripeWithCheckoutSession('pk_test_xxxxx', 'cs_xxxxx_secret_xxxxx');

el.addEventListener('checkoutSessionConfirmResult', ({ detail }) => {
  if (detail instanceof Error) {
    el.setErrorMessage(detail.message);
    el.updateProgress('failure');
  } else if (detail.type === 'error') {
    el.setErrorMessage(detail.error.message);
    el.updateProgress('failure');
  } else {
    el.updateProgress('success'); // detail.session has the result
  }
});
```

You can also set the `checkout-session-client-secret` attribute declaratively
instead of calling the method.

### 4. Express Checkout (Apple Pay / Google Pay / Link)

```js
const el = document.createElement('stripe-express-checkout-element');
el.setAttribute('publishable-key', 'pk_test_xxxxx');
el.setAttribute('client-secret', 'pi_xxxxx_secret_xxxxx');
el.setAttribute('amount', '1099');      // minor units
el.setAttribute('currency', 'usd');
el.setAttribute('button-height', '48px');
document.getElementById('container').appendChild(el);

await customElements.whenDefined('stripe-express-checkout-element');

el.addEventListener('defaultConfirmResult', ({ detail }) => {
  if (detail instanceof Error || detail.error) {
    el.setErrorMessage(detail.error ? detail.error.message : detail.message);
    el.updateProgress('failure');
  } else {
    el.updateProgress('success');
  }
});

await el.initStripe('pk_test_xxxxx');
```

Buttons only appear when the browser/device supports the wallet. For custom
handling set `should-use-default-confirm-action="false"` and handle `confirm`.

### 5. Card Element inside a modal (manual flow)

```html
<stripe-modal open="true">
  <stripe-card-element
    publishable-key="pk_test_xxxxx"
    intent-client-secret="pi_xxxxx_secret_xxxxx"
    should-use-default-form-submit-action="false"
  ></stripe-card-element>
</stripe-modal>

<script>
  customElements.whenDefined('stripe-card-element').then(() => {
    const el = document.querySelector('stripe-card-element');
    el.addEventListener('formSubmit', async ({ detail }) => {
      const { stripe, cardNumberElement } = detail;
      const result = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement, // also: cardExpiryElement, cardCVCElement
      });
      if (result.error) {
        el.setErrorMessage(result.error.message);
        el.updateProgress('failure');
      } else {
        // Send result.paymentMethod.id to your server to confirm the PaymentIntent.
        el.updateProgress('success');
      }
    });
  });
</script>
```

### 6. Address Element

```js
const el = document.querySelector('stripe-address-element'); // mode="shipping" / "billing"
await customElements.whenDefined('stripe-address-element');
el.addEventListener('formSubmit', ({ detail: { address } }) => {
  console.log(address.value, address.complete);
  el.updateProgress('success');
});
// Or read on demand:
const { value, complete } = await el.getValue();
```

### 7. Link Authentication Element

```js
const el = document.querySelector('stripe-link-authentication-element');
await customElements.whenDefined('stripe-link-authentication-element');
el.addEventListener('linkAuthenticationChange', ({ detail: { email } }) => {
  console.log('email', email);
});
const email = await el.getEmail();
```

---

### Framework notes

- **React**: register once with `defineCustomElements()`; bind events with the
  camelCase `on` prop, e.g. `onFormSubmit={handler}`. Set array/object props
  (like `allowedCountries`) via a `ref` since they aren't attributes.
- **Vue**: use `@formSubmit="handler"`; make sure custom elements are allowed in
  your compiler options.
- **Angular**: add `CUSTOM_ELEMENTS_SCHEMA`; bind with `(formSubmit)="handler($event)"`.
- **Plain HTML**: load the unpkg script tag and use `customElements.whenDefined`.

### Server side (create the secret)

Never expose your secret key in the browser. Create the intent server-side:

```js
// Node.js — wrap in an async function (top-level await isn't valid in CommonJS)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createIntent() {
  const intent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
  });
  return intent.client_secret; // send this to the browser
}
```

For quick local testing, generate one with the Stripe CLI:

```bash
stripe payment_intents create --amount=1099 --currency=usd | jq -r .client_secret
```
