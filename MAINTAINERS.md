# Maintainer notes

## CI

- **CircleCI** workflow `ci`: lint, type-check, Quint `model-check`, unit tests (Node 20/22), component tests, build.
- Badge: https://circleci.com/gh/hideokamoto/stripe-pwa-elements/tree/main

## Agent trust metrics (informal)

Track occasionally (no automation required):

- CircleCI failure rate on `main`
- GitHub revert commits / reverted PRs (target: stay low as agent PR volume grows)
- Whether `example/` or codesandbox still reference deprecated tags

## Optional Stripe Playwright job (not in repo CI today)

`pnpm run test:e2e:stripe` hits `js.stripe.com` and the docs demo API. To run in CircleCI:

1. Add a **manual** or scheduled workflow (not on every fork PR).
2. Store only **test-mode** credentials in CircleCI project contexts if ever required; today the harness uses the public demo API.
3. Keep default fork CI secret-free — see [`AGENTS.md`](AGENTS.md).

## Future major cleanups

- Remove `stripe-payment-request-button` after Stripe.js removes `paymentRequest()` (migration guide exists).
- Remove deprecated `StripeService` singleton export in a major release after deprecation window.