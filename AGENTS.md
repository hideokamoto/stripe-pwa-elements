# Guidance for coding agents

Short index for **stripe-pwa-elements** (public OSS). Read this file first; do not duplicate long API lists here.

## Where truth lives

| Topic | Source |
| --- | --- |
| Component props, events, methods | Generated `dist/types/components.d.ts` after `pnpm run build`, and the [docs site](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/en/) |
| Integration, safety, component choice | [`plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md`](plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md) only (enforced by `src/agent-skill.unit.spec.ts`) |
| Repo development, CI, commits | [`CLAUDE.md`](CLAUDE.md) |
| Contributing for humans | [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) |
| After you change code | [`pnpm run verify:agent`](package.json) — see [Verification map](#verification-map) |
| Payment sheet state machine | [`spec/payment-sheet/`](spec/payment-sheet/) (Quint + unit tests) |

Japanese docs: [AI コーディングエージェント](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/guides/ai-agents/).

## Verification map

| Capability | Demo | Commands |
| --- | --- | --- |
| Default PR gate | — | `pnpm run verify:agent` (`lint`, `tsc`, `test:unit`, `test:component`, `build`) |
| Quick check | — | `pnpm run verify:agent -- --quick` |
| Canonical interactive demos | [`examples/codesandbox`](examples/codesandbox/) | `pnpm -C examples/codesandbox dev` |
| Static HTML copies | [`example/`](example/) via `example:copy` | Not the source of truth — see [`example/README.md`](example/README.md) |
| Real browser + Stripe.js | [`e2e/stripe/`](e2e/stripe/) | `pnpm run verify:agent -- --stripe-e2e` (optional, not in default CI) |

Full tables: [docs guide (EN)](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/en/guides/agent-verification-map/) · [docs guide (JA)](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/guides/agent-verification-map/).

## Architecture rules (enforced in code)

- Components that talk to Stripe use `serviceFactory.createStripeService()` in `connectedCallback` — not the deprecated `StripeService` singleton (`eslint` + `src/architecture.unit.spec.ts`).
- `shadow: true` only on `stripe-modal`.
- Prop-dependent Stripe init runs in `componentWillLoad`, not the constructor (`src/components/component-init-lifecycle.unit.spec.ts`).
- Do not add `stripe-payment-request-button` to new demos; it is deprecated — use `stripe-express-checkout-element`.

## Lint ladder

If the same mistake is corrected twice in review, add an ESLint rule or a regression test instead of a comment or a new markdown rule. See CONTRIBUTING.

## Payment sheet release checklist (when shipping on npm)

1. Update `SKILL.md` and remove `stripe-payment-sheet` from `tagsNotInSkill` in `src/agent-skill.unit.spec.ts`.
2. Extend the verification map and examples as needed.
3. Keep Quint model `sheet_v3.qnt` and CI `model-check` green.

## Stripe E2E in CI (optional, not enabled)

Playwright tests under `e2e/stripe/` require network access and use the public docs demo API for test keys. Default CircleCI workflows intentionally skip them so forks need no secrets. Maintainers may run them locally or add an optional CircleCI job with org secrets later — see [`MAINTAINERS.md`](MAINTAINERS.md).

## Do not commit

- Live API keys (`pk_live_`, `sk_live_`, `rk_live_`) — blocked by ESLint.
- Private issue tracker URLs or internal ticket IDs in commits, PRs, or branch names.