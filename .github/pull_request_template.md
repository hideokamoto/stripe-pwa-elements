## Summary

<!-- What changed and why (plain language). -->

## Checklist

- [ ] `pnpm run lint` passes
- [ ] `pnpm exec tsc --noEmit` passes (if TypeScript sources changed)
- [ ] Relevant tests pass (`pnpm run test:unit`, `pnpm run test:component`, and/or `pnpm test` as appropriate)
- [ ] `pnpm run build` succeeds (if build or components changed)
- [ ] Component / public API change → updated `plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md` and `src/agent-skill.unit.spec.ts` still passes
- [ ] User-facing release → added a changeset (`pnpm changeset`)
- [ ] Same review comment happened twice before → added or proposed an ESLint rule / regression test ([lint ladder](https://github.com/hideokamoto/stripe-pwa-elements/blob/main/.github/CONTRIBUTING.md#lint-ladder-repeat-review--automate))

## Agent verification (optional)

If you used a coding agent, note what you ran (e.g. `pnpm run verify:agent`). See [AGENTS.md](https://github.com/hideokamoto/stripe-pwa-elements/blob/main/AGENTS.md).