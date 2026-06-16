---
title: Bundler Integration (Vite, webpack, Capacitor)
description: Import components directly from the custom-elements build to avoid runtime dynamic-import failures.
---

When you use a bundler such as Vite, webpack, or Rollup — including Capacitor
apps — prefer importing components directly from the **custom-elements build**
instead of the lazy `defineCustomElements()` loader.

## The problem with the lazy loader

The default install path registers every component through a lazy loader:

```javascript
import { defineCustomElements } from 'stripe-pwa-elements/loader';
defineCustomElements();
```

This loader fetches each component as a separate chunk at runtime via a dynamic
`import()`. In bundler-based setups the chunk URLs are resolved relative to the
package's own ESM output, which the bundler does not always serve correctly.
Under Vite (and Vite-powered Capacitor projects) this commonly surfaces as:

```text
TypeError: Failed to fetch dynamically imported module
```

## The fix: import from the custom-elements build

Import the component you need directly from `dist/components`. Each module
auto-registers its custom element on import, so a bare import is enough:

```javascript
// Registers <stripe-payment-element> — no defineCustomElements() needed
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

Because the import is static, your bundler includes the component in your app
bundle. There is no runtime dynamic `import()`, so the "Failed to fetch
dynamically imported module" error cannot occur.

Import only the components you actually use — each one is tree-shakeable:

```javascript
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
import 'stripe-pwa-elements/dist/components/stripe-express-checkout-element';
```

The element tag names are unchanged, so your markup stays the same:

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
></stripe-payment-element>
```

TypeScript types are still imported from the package root, not from
`dist/components`:

```ts
import type { DefaultFormSubmitResult, IntentType } from 'stripe-pwa-elements';
```

## Bundler-specific setup

### Vite

No special configuration is required — the static imports above work out of the
box. Add the imports once near your app entry point (e.g. `main.ts`):

```javascript
// main.ts
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

If you previously called `defineCustomElements()`, remove it to avoid
registering the components twice.

### webpack

webpack resolves the static imports directly; no extra loader configuration is
needed. Import the components from your entry module:

```javascript
// index.js
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

### Rollup

Rollup bundles the imported components statically. Make sure
`@rollup/plugin-node-resolve` is enabled so the bare package path resolves:

```javascript
// rollup.config.mjs
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  plugins: [nodeResolve()],
  // ...
};
```

```javascript
// index.js
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

## Capacitor + Vite (recommended setup)

Capacitor's web layer is typically built with Vite, so the lazy loader can hit
the dynamic-import error described above. Use the direct import instead:

```javascript
// src/main.ts
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
// add any other components you use
```

This is the recommended setup for Capacitor apps and for
[`@capacitor-community/stripe`](https://github.com/capacitor-community/stripe)'s
web implementation.

## When to use which

| Setup | Recommended import |
| --- | --- |
| Plain HTML / no build step | CDN `<script type="module">` |
| Vite, webpack, Rollup, Capacitor | `stripe-pwa-elements/dist/components/<tag>` |

Both approaches register the same components; only the loading strategy differs.
