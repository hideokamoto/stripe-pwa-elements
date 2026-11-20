---
title: Agent verification map
description: Canonical demos and verification commands for coding agents and contributors.
---

This page complements the [AI coding agents](../ai-agents) guide.

Run the default maintainer loop in one command:

```bash
pnpm run verify:agent
```

| User-facing capability | Canonical demo | Required commands | Optional |
| --- | --- | --- | --- |
| Split card fields + PaymentIntent | [`examples/codesandbox/card.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox/card.html) | `pnpm run test:component` (card), `pnpm run test:unit` | `pnpm run example:copy` + `example:serve` |
| Address collection | [`examples/codesandbox/address.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox) | address component/unit tests | CodeSandbox devbox |
| Express Checkout (wallets) | [`examples/codesandbox/express-checkout.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox) | express-checkout unit tests | Playwright (below) |
| Payment Element | `example/example3.html` (build copy) | payment-element tests | Payment Element codesandbox demo still TBD |
| Payment Sheet (not on npm yet) | component tests / `www/` dev | payment-sheet unit + component tests, CI `model-check` | [`spec/payment-sheet/`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/spec/payment-sheet) Quint models |
| Agent Skill drift | — | `agent-skill.unit.spec.ts` via `pnpm run test:unit` | skills-ref validate on `SKILL.md` |

### Playwright (real Stripe.js)

[`e2e/stripe/`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/e2e/stripe) is **not part of default CI** (needs `js.stripe.com` and the docs demo API). Locally:

```bash
pnpm run build
pnpm run test:e2e:stripe
```

Or `pnpm run verify:agent -- --stripe-e2e`.

### Formal checks (payment sheet)

CircleCI runs Quint simulation on `spec/payment-sheet/sheet_v3.qnt`. See [`spec/payment-sheet/README.md`](https://github.com/hideokamoto/stripe-pwa-elements/blob/main/spec/payment-sheet/README.md).