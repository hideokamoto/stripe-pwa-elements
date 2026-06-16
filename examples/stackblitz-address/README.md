# stripe-address-element — StackBlitz demo

An interactive demo for [`<stripe-address-element>`](https://github.com/hideokamoto/stripe-pwa-elements),
the address-collection component from **stripe-pwa-elements**.

This is the **lightest** demo in the project: it needs **only** a Stripe test
publishable key (`pk_test_…`). There is **no backend** and **no clientSecret**
required.

## What it shows

- Collecting a complete address with Stripe's Address Element.
- Both **billing** and **shipping** modes (pick one before rendering).
- Built-in address **autocomplete**, provided automatically by Stripe.
- Surfacing the entered values: when you click **Save**, the demo listens to the
  `formSubmit` event and prints `detail.address` (`{ value, complete }`) on screen.

The library is loaded via **Method A (static / CDN)** from unpkg — no npm
install, no bundler, and no build step.

---

## Quick start

### 1. Get a Stripe test publishable key

1. Log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Switch to **Test mode** (toggle in the top-left corner).
3. Go to **Developers → API keys**.
4. Copy the **Publishable key** — it starts with `pk_test_`.

> **Never use a live key (`pk_live_`) in this demo.** The demo is public; live
> keys must not appear in browser-visible code.

### 2. Open the demo in StackBlitz

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz-address
```

> If you are working on a feature branch, replace `main` with the branch name.

### 3. Use the demo

1. Enter your `pk_test_` key.
2. Pick a mode — **Billing** (default) or **Shipping**.
3. Click **Render** to mount `<stripe-address-element>`.
4. Fill in the address form (autocomplete kicks in as you type).
5. Click **Save** — the submitted address values appear below the element.

---

## How it works

```js
const el = document.createElement('stripe-address-element');
el.setAttribute('publishable-key', publishableKey);
el.setAttribute('mode', 'billing'); // or 'shipping'
el.setAttribute('sheet-title', 'Billing address');
container.appendChild(el);

el.addEventListener('formSubmit', event => {
  const { address } = event.detail; // { value: {...}, complete: boolean }
  console.log(address);
});
```

Setting the `publishable-key` attribute triggers `@Watch('publishableKey')` →
`initStripe()` in the component, so the element initializes automatically.

## CDN path reference

```html
<script
  type="module"
  src="https://unpkg.com/stripe-pwa-elements@3.2.0/dist/stripe-elements/stripe-elements.esm.js"
></script>
```

The correct path inside the package is `dist/stripe-elements/stripe-elements.esm.js`.
Any path containing `dist/wpkyoto/` is incorrect and will result in a 404.
