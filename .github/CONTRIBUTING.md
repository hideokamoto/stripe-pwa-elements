# Contributing to stripe-pwa-elements

Thank you for your interest in contributing. This is a public open-source project; please use English in PR descriptions and commit messages so maintainers and automated agents can review consistently.

## Environment

- **Node.js** 18.x or newer (CI tests on **20** and **22**)
- **[pnpm](https://pnpm.io/)** — version pinned in `package.json` (`packageManager` field); enable via [Corepack](https://nodejs.org/api/corepack.html):

```bash
corepack enable
```

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
| All Jest specs | `pnpm test` |
| Production build | `pnpm run build` |
| Agent / CI parity check | `pnpm run verify:agent` |

**Canonical interactive demo:** [`examples/codesandbox`](examples/codesandbox) (also linked from the root README). The [`example/`](example/) folder is updated via `pnpm run example:copy` for static previews.

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