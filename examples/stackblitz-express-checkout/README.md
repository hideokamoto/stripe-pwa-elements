# stripe-express-checkout-element — StackBlitz demo

Interactive demo for [`<stripe-express-checkout-element>`](https://github.com/hideokamoto/stripe-pwa-elements),
the one-click wallet element (Apple Pay, Google Pay, and Stripe Link) from
[stripe-pwa-elements](https://github.com/hideokamoto/stripe-pwa-elements).

This demo uses **Method A (static / CDN)**: the library is loaded directly from
unpkg — no npm install, no bundler, and no build step required.

---

## What this demo shows

The Express Checkout Element renders **one-click payment wallets** — Apple Pay,
Google Pay, and Link — based on what the visitor's browser and device support.
It requires a PaymentIntent `clientSecret`, which the demo fetches from the
project's demo API server.

---

## Open in StackBlitz

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz-express-checkout
```

> If you are working on a feature branch, replace `main` with the branch name.

---

## Usage

1. Get a Stripe **test** publishable key (starts with `pk_test_`) from the
   [Stripe Dashboard](https://dashboard.stripe.com) (**Test mode → Developers →
   API keys**). Any `pk_test_` key renders the wallet buttons; confirming a real
   payment requires the key that matches the demo account — see
   [About the demo clientSecret](#about-the-demo-clientsecret). Never use a live
   key (`pk_live_`) here.
2. Paste the `pk_test_` key into the input, pick a currency (USD, JPY, EUR, GBP,
   or AUD), and click **Render**.
3. The demo fetches a PaymentIntent `clientSecret` in the selected currency and
   mounts `<stripe-express-checkout-element>`. In test mode the available wallet
   buttons (most commonly **Link**) appear.

---

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

---

## About the demo clientSecret

The `clientSecret` is created by the demo API server
(`stripe-pwa-elements-docs.workers.dev`), which runs under **this project's own
Stripe test account**. To confirm a payment end-to-end you must use the matching
`pk_test_` key from that same account. With a publishable key from a different
Stripe account the wallet buttons still render, but confirmation will fail
because the key and the `clientSecret` belong to different accounts. To test with
your own account, run your own backend — the library itself is account-agnostic.

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
