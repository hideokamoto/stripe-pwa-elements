# Contributing to stripe-pwa-elements

Thank you for your interest in contributing. This is a public open-source project; please use English in PR descriptions and commit messages so maintainers and automated agents can review consistently.

## Environment

- **Node.js** 22.12+ required (`@stencil/vitest` / Vitest 5; CI tests on **22**)
- **Mutation testing** (`pnpm run test:mutation`) additionally needs **Node.js 24+** (`@mizchi/mutator`). It is not part of default CI.
- **[pnpm](https://pnpm.io/)** — version pinned in `package.json` (`packageManager` field)

On Node.js 22–24, enable [Corepack](https://nodejs.org/api/corepack.html) before the first `pnpm install`:

```bash
corepack enable
```

Node.js 25+ does not ship Corepack. Install it explicitly (`npm install -g corepack`) or follow [pnpm installation](https://pnpm.io/installation) without Corepack.

## Setup

```bash
git clone https://github.com/hideokamoto/stripe-pwa-elements.git
cd stripe-pwa-elements
pnpm install
```

### Common commands

| Task | Command |
|------|---------|
| Dev server (watch) | `pnpm start` |
| Lint | `pnpm run lint` |
| Type check | `pnpm exec tsc --noEmit` |
| Unit tests | `pnpm run test:unit` |
| Component tests | `pnpm run test:component` |
| All Vitest specs | `pnpm test` |
| Mutation testing (Node 24+) | `pnpm run test:mutation` |
| Production build | `pnpm run build` |
| Default agent gate (not full CI) | `pnpm run verify:agent` |

`verify:agent` runs lint, type-check, unit tests, component tests, and build. It does **not** run CircleCI’s Quint `model-check` job. After changing [`spec/payment-sheet/`](../spec/payment-sheet/), run the simulation from [`spec/payment-sheet/README.md`](../spec/payment-sheet/README.md) (for example `npx -y @informalsystems/quint@0.33.0 run spec/payment-sheet/sheet_v3.qnt --invariant=allProps --max-steps=15 --max-samples=10000 --seed=1`).

**Canonical interactive demo:** [`examples/codesandbox`](../examples/codesandbox) (also linked from the root README). The [`example/`](../example/) folder is updated via `pnpm run example:copy` for static previews.

## Pull request workflow

1. Fork the repository and create a feature branch from `main`.
2. Make your changes; follow existing patterns in `src/`.
3. Run `pnpm run verify:agent` (or at minimum lint + relevant tests + build).
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages (see examples at the end of this file).
5. Open a PR against `main` and fill out the PR template checklist.

### Lint ladder (repeat review → automate)

If reviewers correct the **same class of mistake twice**, add a **deterministic guard** in the same or a follow-up PR:

- An ESLint rule in [`eslint.config.js`](../eslint.config.js), or
- A unit/architecture test under `src/`.

Prefer fixing the root cause (API or structure) over comments or long prose rules.

### User-facing changes

- Add a **changeset** when the change should appear in release notes: `pnpm changeset` (see [`RELEASE.md`](../RELEASE.md)).

### Component or Agent Skill changes

When you add, rename, or remove a component, or change props, events, methods, or loading:

- Update [`plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md`](../plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md) in the **same PR**.
- `src/agent-skill.unit.spec.ts` enforces tag lists, CDN path, and i18n languages.

See [`AGENTS.md`](../AGENTS.md) for where agents and humans should look for authoritative guidance.

## Contributing with AI coding agents

Agents should read [`AGENTS.md`](../AGENTS.md) first (index of SKILL, verification map, and repo conventions). Integration instructions for end users also live in the docs site:

- English: [AI coding agents guide](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/en/guides/ai-agents/)
- Japanese: [AI コーディングエージェントで使う](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/guides/ai-agents/)

Do **not** include private issue tracker URLs or internal ticket IDs in PRs, commits, or branch names.

## Commit message format

The project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, or `BREAKING CHANGE` in the footer/body for major releases.

**Examples:**

```bash
feat(payment-element): support checkout session client secret

fix(services): call tryUpdateState before resolve

docs: refresh CONTRIBUTING for pnpm and CircleCI
```

## Questions

Open a [GitHub issue](https://github.com/hideokamoto/stripe-pwa-elements/issues) for bugs or feature discussions.