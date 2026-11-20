# Feature map (examples)

Maps each public custom element to a demo page, how to run it, and what counts as “verified” for a change. See also the component table in `plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md`.

## Run the demos

```bash
pnpm run build
pnpm run example:copy
pnpm run example:serve
```

Default URL: `http://localhost:3000` (or the port shown by `serve`). Pages live under `example/*.html`.

| User-facing name | Custom element tag | Example page | Pass criteria |
| ---------------- | ------------------ | ------------ | ------------- |
| Unified payment form (recommended) | `stripe-payment-element` | `example3.html` | Bundle loads; element mounts; `stripeLoaded` fires with test keys |
| Apple Pay / Google Pay / wallets | `stripe-express-checkout-element` | `example-express-checkout.html` | Same; wallet UI may be empty without domain registration |
| Classic card fields | `stripe-card-element` | `index.html`, `example2.html` | Card iframes mount after `stripeLoaded` |
| Card + modal shell | `stripe-card-element-modal` | `index.html` | Modal opens; card fields inside |
| Address form | `stripe-address-element` | `address-example.html` | Address Element mounts |
| Link email field | `stripe-link-authentication-element` | `example4.html` | Link Authentication mounts |
| Checkout modal (composite) | `stripe-payment-sheet` | *(no example yet — use component tests)* | `stripe-payment-sheet.spec.tsx` |
| Currency selector | `stripe-currency-selector` | *(use `src/index.html` in dev)* | `stripe-currency-selector.spec.tsx` |
| Modal wrapper | `stripe-modal` | `example3.html` | Modal open/close events |
| Payment Request (deprecated) | `stripe-payment-request-button` | `index.html` only (legacy) | Prefer `stripe-express-checkout-element`; do not add new demos |

## Automated checks (no Stripe network)

```bash
pnpm run check:agent          # deprecated usage, secrets, StripeService DI
pnpm run check:example-smoke  # after example:copy — bundles + HTML script paths
pnpm run test:unit
pnpm run test:component
```

## Optional: real Stripe.js browser tests

Requires network access to Stripe. Not run in CI.

```bash
pnpm run test:e2e:stripe
```

## Evidence for pull requests

After changing a component row above, open its example page, exercise the flow, and attach a screenshot to the PR showing the mounted element or success state.