# Static example pages

This directory receives a **copy of the built bundle** from:

```bash
pnpm run example:copy
pnpm run example:serve
```

**Do not treat these pages as the source of truth for new features.**

| Purpose | Location |
|---------|----------|
| Maintained demos (Vite, CodeSandbox) | [`examples/codesandbox`](../examples/codesandbox) |
| Agent verification map | [`docs/src/content/docs/guides/agent-verification-map.md`](../docs/src/content/docs/guides/agent-verification-map.md) |
| Copy-paste HTML after local build | This `example/` folder |

Legacy samples here may still reference deprecated components (for example
`stripe-payment-request-button`). Prefer Express Checkout in new work; see the
[migration guide](https://stripe-pwa-elements-docs.wp-kyoto.workers.dev/en/guides/migrate-payment-request-button-to-express-checkout/).