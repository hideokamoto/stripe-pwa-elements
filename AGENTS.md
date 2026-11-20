# Agent guide (stripe-pwa-elements)

Short entry point for coding agents. Details live in [CLAUDE.md](CLAUDE.md) and the integration skill at `plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md`.

## Setup

```bash
pnpm install
```

Node.js 18+; CI uses 20 and 22. Package manager: pnpm (see `packageManager` in `package.json`).

## Commands

| Task | Command |
| ---- | ------- |
| Lint | `pnpm run lint` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Unit tests | `pnpm run test:unit` |
| Component tests | `pnpm run test:component` |
| Build | `pnpm run build` |
| Agent guardrails | `pnpm run check:agent` |
| Example bundles smoke | `pnpm run build && pnpm run example:copy && pnpm run check:example-smoke` |
| Serve demos | `pnpm run example:serve` (after `example:copy`) |

## Architecture shortcuts

- Stencil web components under `src/components/`; Stripe.js access goes through `src/services/` and `serviceFactory` in `connectedCallback`.
- Only `stripe-modal` uses `shadow: true` (enforced by `src/architecture/component-shadow-dom.unit.spec.ts`).
- Prop-dependent Stripe init belongs in `componentWillLoad`, not the constructor (`src/components/component-init-lifecycle.unit.spec.ts`).
- When you change public props, events, or tags, update `SKILL.md` in the same PR; `src/agent-skill.unit.spec.ts` enforces alignment.

## Verifying UI changes

See [`example/FEATURE_MAP.md`](example/FEATURE_MAP.md) for which HTML demo exercises each tag. Prefer screenshots in the PR as evidence.

## Recurring mistakes → code, not prose

If you fix the same agent mistake twice, add a check (`pnpm run check:agent`), a unit test, or an ESLint rule. Do not rely on long comments or new markdown rules.

## Public artifact safety

This is a public repository. Do not put private issue tracker URLs, internal project names, or secret keys in commits, PR text, or source files. Use `pk_test_…` placeholders in examples only.