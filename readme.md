[![npm version](https://img.shields.io/npm/v/stripe-pwa-elements.svg)](https://www.npmjs.com/package/stripe-pwa-elements)
[![CI](https://github.com/wpkyoto/stripe-pwa-elements/actions/workflows/ci.yml/badge.svg)](https://github.com/wpkyoto/stripe-pwa-elements/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/wpkyoto/stripe-pwa-elements/branch/main/graph/badge.svg)](https://codecov.io/gh/wpkyoto/stripe-pwa-elements)
[![license](https://img.shields.io/npm/l/stripe-pwa-elements.svg)](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/LICENSE)
[![npm downloads](https://img.shields.io/npm/dm/stripe-pwa-elements.svg)](https://www.npmjs.com/package/stripe-pwa-elements)
![Built With Stencil](https://img.shields.io/badge/-Built%20With%20Stencil-16161d.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDE5LjIuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1MTIgNTEyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI%2BCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BCgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU%2BCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik00MjQuNywzNzMuOWMwLDM3LjYtNTUuMSw2OC42LTkyLjcsNjguNkgxODAuNGMtMzcuOSwwLTkyLjctMzAuNy05Mi43LTY4LjZ2LTMuNmgzMzYuOVYzNzMuOXoiLz4KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQyNC43LDI5Mi4xSDE4MC40Yy0zNy42LDAtOTIuNy0zMS05Mi43LTY4LjZ2LTMuNkgzMzJjMzcuNiwwLDkyLjcsMzEsOTIuNyw2OC42VjI5Mi4xeiIvPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDI0LjcsMTQxLjdIODcuN3YtMy42YzAtMzcuNiw1NC44LTY4LjYsOTIuNy02OC42SDMzMmMzNy45LDAsOTIuNywzMC43LDkyLjcsNjguNlYxNDEuN3oiLz4KPC9zdmc%2BCg%3D%3D&colorA=16161d&style=flat-square)

# stripe-pwa-elements

Framework-agnostic Stripe payment components built with Web Components. Works with any web framework — React, Vue, Angular, Svelte, or plain HTML.

> **Note:** The current npm package is **`stripe-pwa-elements`** (this repo).
> The old package `@stripe-elements/stripe-elements` (v2.0.2) is deprecated and superseded — please use `stripe-pwa-elements` instead.

## Used in production

[![capacitor-community/stripe](https://img.shields.io/badge/capacitor--community%2Fstripe-4000%2B%20weekly%20downloads-brightgreen)](https://github.com/capacitor-community/stripe)

This library powers the Web implementation of [`@capacitor-community/stripe`](https://github.com/capacitor-community/stripe), which receives 4,000+ weekly downloads. If you use Capacitor for cross-platform apps, `stripe-pwa-elements` handles all Stripe UI on the web layer.

> **Manual follow-up (external repo):** Add a reciprocal link in the [capacitor-community/stripe README](https://github.com/capacitor-community/stripe) pointing back to this package.

## Features

- **Framework-agnostic** — Standard Web Components that work everywhere
- **Full Stripe Elements coverage** — Card, Payment, Express Checkout, Address, and more
- **Multiple payment flows** — PaymentIntent, SetupIntent, and Checkout Session
- **Apple Pay / Google Pay** — Payment Request Button and Express Checkout support
- **Internationalization** — Built-in i18n support (English, Japanese, Portuguese)
- **Lightweight** — Minimal dependencies, lazy-loaded Stripe.js

## Installation

```bash
npm install stripe-pwa-elements
```

### Script tag

```html
<script type="module" src="https://unpkg.com/stripe-pwa-elements/dist/wpkyoto/stripe-pwa-elements.esm.js"></script>
```

### ES Module

```javascript
import { defineCustomElements } from 'stripe-pwa-elements/loader';
defineCustomElements();
```

## Components

### `<stripe-card-element>`

Stripe Card form with split fields (card number, expiry, CVC).

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-card-element/readme.md)

### `<stripe-payment-element>`

Unified payment form supporting multiple payment methods.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-payment-element/readme.md)

### `<stripe-express-checkout-element>`

Express Checkout with Apple Pay, Google Pay, Link, and more.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-express-checkout-element/readme.md)

### `<stripe-payment-request-button>`

(Beta) Payment Request API button (Apple Pay / Google Pay).

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-payment-request-button/readme.md)

### `<stripe-address-element>`

Address collection form with autocomplete.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-address-element/readme.md)

### `<stripe-link-authentication-element>`

Email collection with Stripe Link one-click checkout.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-link-authentication-element/readme.md)

### `<stripe-currency-selector>`

Currency selection component.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-currency-selector/readme.md)

### `<stripe-modal>`

Modal wrapper for payment components.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-modal/readme.md)

### `<stripe-card-element-modal>`

Combined Card Element with Modal wrapper.

[Documentation](https://github.com/wpkyoto/stripe-pwa-elements/blob/main/src/components/stripe-card-element-modal/readme.md)

## Quick Start

### HTML

```html
<stripe-card-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
></stripe-card-element>

<script type="module" src="https://unpkg.com/stripe-pwa-elements/dist/wpkyoto/stripe-pwa-elements.esm.js"></script>
<script>
  customElements.whenDefined('stripe-card-element').then(() => {
    const element = document.querySelector('stripe-card-element');
    element.addEventListener('formSubmit', async ({ detail }) => {
      const { stripe, cardNumber } = detail;
      const result = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumber,
      });
      console.log(result);
      element.updateProgress('success');
    });
  });
</script>
```

### React

```jsx
import { defineCustomElements } from 'stripe-pwa-elements/loader';

defineCustomElements();

function PaymentForm() {
  const handleFormSubmit = (e) => {
    const { stripe, cardNumber } = e.detail;
    stripe.createPaymentMethod({ type: 'card', card: cardNumber });
  };

  return (
    <stripe-card-element
      publishable-key="pk_test_xxxxx"
      intent-client-secret="pi_xxxxx_secret_xxxxx"
      onFormSubmit={handleFormSubmit}
    />
  );
}
```

### Vue

```vue
<template>
  <stripe-card-element
    publishable-key="pk_test_xxxxx"
    intent-client-secret="pi_xxxxx_secret_xxxxx"
    @formSubmit="handleFormSubmit"
  />
</template>

<script setup>
import { defineCustomElements } from 'stripe-pwa-elements/loader';

defineCustomElements();

const handleFormSubmit = (e) => {
  const { stripe, cardNumber } = e.detail;
  stripe.createPaymentMethod({ type: 'card', card: cardNumber });
};
</script>
```

## Examples

See the [example/](./example) directory for complete working examples:

- [Card Element (dynamic)](./example/index.html) — JavaScript-driven component creation
- [Card Element (static)](./example/example2.html) — Declarative HTML markup
- [Payment Element](./example/example3.html) — Unified payment form
- [Link Authentication](./example/example4.html) — Email + Link checkout
- [Address Element](./example/address-example.html) — Address collection
- [Express Checkout](./example/example-express-checkout.html) — Apple Pay, Google Pay, etc.

## Contribution

### Getting Started

```bash
npm install
npm start
```

To build the component for production, run:

```bash
npm run build
```

To run the unit tests for the components, run:

```bash
npm test
```

## Security & PCI DSS SAQ-A

Card data **never** passes through this library's DOM, JavaScript state, or network requests.
All sensitive input fields (card number, expiry, CVC) are rendered inside **Stripe-hosted iframes**,
meaning your page never has access to raw card data. This architecture keeps integrations
eligible for the lightest PCI DSS self-assessment questionnaire: **SAQ-A**.

### How iframe isolation works

```
Your page (your domain)
┌─────────────────────────────────────────────────────────┐
│  <stripe-card-element>                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  <iframe src="https://js.stripe.com/...">         │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  Card number  [____ ____ ____ ____]          │  │  │
│  │  │  Expiry       [MM/YY]  CVC  [___]            │  │  │
│  │  │                                              │  │  │
│  │  │  (Stripe's origin — cross-origin boundary)   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Your JS can call stripe.confirmPayment() but           │
│  CANNOT read card values from the iframe.               │
└─────────────────────────────────────────────────────────┘
```

- The browser's **same-origin policy** prevents any JavaScript on your page from reading
  input values inside Stripe's iframe.
- Card data travels directly from the iframe to **Stripe's servers over TLS** — it never
  touches your application server.
- This library only manages the mounting, styling, and event wiring of those iframes; it
  does not alter Stripe's security model.

For a complete explanation see [Stripe's SAQ-A documentation](https://stripe.com/docs/security/stripe#saq-a).

For the vulnerability reporting channel and supply-chain notes (npm provenance), see [SECURITY.md](./SECURITY.md).

---

## Sponsors

If stripe-pwa-elements saves you time, please consider sponsoring the lead maintainer:

[![Sponsor hideokamoto](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&style=flat-square)](https://github.com/sponsors/hideokamoto)

---

## Public API & TypeScript types

All user-facing TypeScript types are exported directly from the package root. Import them using the package name:

```ts
import type {
  FormSubmitEvent,
  FormSubmitHandler,
  StripeLoadedEvent,
  StripeDidLoadedHandler,
  ProgressStatus,
  IntentType,
  InitStripeOptions,
  LinkAuthenticationElementChangeEvent,
  LinkAuthenticationElementChangeHandler,
  CurrencySelectorChangeEvent,
  CurrencySelectorChangeHandler,
  DefaultFormSubmitResult,
} from 'stripe-pwa-elements';
```

**Do not** import from internal paths such as `dist/types/interfaces` or `dist-custom-elements/...`. Those paths are implementation details and are not part of the public API — they may change without notice across any release.

### Semver policy

All types exported from the package root (`stripe-pwa-elements`) are considered **public API** and follow [Semantic Versioning](https://semver.org/). Within the `^3.0.0` range:

- No breaking changes will be made to the shape of any publicly exported type.
- New optional fields may be added to event objects without a major bump.
- Removals or renames of exported types always require a new major version.

## Maintainers

| Maintainer | GitHub | Social |
| --- | --- | --- |
| Hidetaka Okamoto | [hideokamoto](https://github.com/hideokamoto) | [@hide__dev](https://twitter.com/hide__dev) |
| Masaki Hirano | [contiki9](https://github.com/contiki9) | [@maki_saki](https://twitter.com/maki_saki) |
| Masahiko Sakakibara | [rdlabo](https://github.com/rdlabo) | [@rdlabo](https://twitter.com/rdlabo) |

## License

MIT
