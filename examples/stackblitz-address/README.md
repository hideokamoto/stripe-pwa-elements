# stripe-address-element — StackBlitz demo

Interactive demo for [`<stripe-address-element>`](https://github.com/hideokamoto/stripe-pwa-elements)
from [stripe-pwa-elements](https://github.com/hideokamoto/stripe-pwa-elements).
The library is loaded directly from unpkg (CDN) — no npm install, no bundler,
and no build step.

## What this demo shows

- Collecting a **billing** or **shipping** address (switchable via the mode
  selector) with Stripe's built-in address **autocomplete**.
- Reading the entered values from the `formSubmit` event and displaying them on
  the page.
- The **lightest** demo: it needs **no `clientSecret`** — only the demo
  account's publishable key, which is fetched automatically.

## Open in StackBlitz

```
https://stackblitz.com/github/hideokamoto/stripe-pwa-elements/tree/main/examples/stackblitz-address
```

> If you are working on a feature branch, replace `main` with the branch name.

## How to use

1. Open the demo. It fetches the demo account's publishable key from
   `/api/config` automatically — **no key entry required** — and enables the
   **Render** button.
2. Pick **Billing** or **Shipping** mode.
3. Click **Render** to mount `<stripe-address-element>`.
4. Fill in the address (autocomplete suggestions appear as you type) and click
   **Save**. The submitted values are shown below the form as JSON.

## Notes

The publishable key is fetched from the demo server (`/api/config`); the Address
Element does not require a `clientSecret`, so this key alone is enough to render
it. To run against your own Stripe account, just swap in your own `pk_test_`
key — no backend is required for this element.

> **Never use a live key (`pk_live_`).** These demos are public and run in the
> browser.
