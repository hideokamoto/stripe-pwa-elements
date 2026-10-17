---
title: Getting Started
description: Install and minimal usage.
---

## Try it first

Before installing, you can try the live demo in CodeSandbox (Stripe test mode, no API keys needed).

[![Edit in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/devbox/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox)

The demo covers:

- `<stripe-card-element>` (card input with a PaymentIntent confirm flow)
- `<stripe-address-element>` (address form)
- `<stripe-express-checkout-element>` (Apple Pay / Google Pay / Link, device-dependent)

There is no `<stripe-payment-element>` demo yet.

## Install

```bash
npm i stripe-pwa-elements
```

## Usage (HTML)

> This example shows the minimal concept. In production, create a PaymentIntent/SetupIntent on your server and pass its `client_secret`.

```html
<stripe-card-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
  should-use-default-form-submit-action="false"
></stripe-card-element>
```

## Next

- Check `Components` for Props / Events / Methods
- Read `Guides` for intent flows and integration patterns

