---
title: Migrating from stripe-payment-request-button to stripe-express-checkout-element
description: Migration guide for the removal of stripe.paymentRequest().
---

## Why migrate

Stripe is **removing the `stripe.paymentRequest()` API in Stripe.js 9.x** (deprecation announced 2025-09-30, removal planned for 2026-03-25).
`<stripe-payment-request-button>` depends on this API, so it is now **deprecated**.

Use `<stripe-express-checkout-element>` instead. It is built on the modern Express Checkout Element API and supports many payment methods, including Apple Pay, Google Pay, Link, PayPal, and Amazon Pay.

## Before and after

### Before: `<stripe-payment-request-button>`

```html
<stripe-payment-request-button
  publishable-key="pk_test_xxxxx"
  stripe-account="acct_xxxxx"
></stripe-payment-request-button>
```

```js
const element = document.querySelector('stripe-payment-request-button');

// Set the PaymentRequest options
await element.setPaymentRequestOption({
  country: 'US',
  currency: 'usd',
  total: {
    label: 'Total',
    amount: 1099,
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

// Initialize Stripe
await element.initStripe('pk_test_xxxxx');

// Handle the payment method event
await element.setPaymentMethodEventHandler(async (event, stripe) => {
  const { error } = await stripe.confirmCardPayment(
    paymentIntent.client_secret,
    {
      payment_method: event.paymentMethod.id,
    },
    { handleActions: false },
  );

  if (error) {
    event.complete('fail');
  } else {
    event.complete('success');
  }
});
```

### After: `<stripe-express-checkout-element>`

```html
<stripe-express-checkout-element
  publishable-key="pk_test_xxxxx"
  client-secret="pi_xxxxx_secret_xxxxx"
  amount="1099"
  currency="usd"
  stripe-account="acct_xxxxx"
></stripe-express-checkout-element>
```

```js
const element = document.querySelector('stripe-express-checkout-element');

// Initialize Stripe
await element.initStripe('pk_test_xxxxx');

// Handle the confirm event (only when you need custom behavior)
element.addEventListener('confirm', async ({ detail }) => {
  const { error } = await detail.stripe.confirmPayment({
    elements: detail.elements,
    confirmParams: {
      return_url: 'https://example.com/success',
    },
  });

  if (error) {
    console.error(error);
  }
});

// To use the default confirm behavior (recommended), leave
// should-use-default-confirm-action="true" (the default) as it is
// and receive the result through the defaultConfirmResult event.
element.addEventListener('defaultConfirmResult', ({ detail }) => {
  if (detail instanceof Error) {
    console.error(detail);
  } else {
    console.log('Success:', detail);
  }
});
```

## Props / Events / Methods mapping

### Props

| stripe-payment-request-button | stripe-express-checkout-element | Notes |
| --- | --- | --- |
| `publishable-key` | `publishable-key` | Same |
| `stripe-account` | `stripe-account` | Same |
| `application-name` | `application-name` | Same |
| `stripeDidLoaded` | `stripeDidLoaded` | Same (JS property) |
| _(`total.amount` in PaymentRequestOptions)_ | `amount` | Set directly as an attribute |
| _(`currency` in PaymentRequestOptions)_ | `currency` | Set directly as an attribute |
| _(`country` in PaymentRequestOptions)_ | _(set automatically on Elements)_ | Inferred from `client-secret` |
| `paymentMethodEventHandler` | _(replaced by the `confirm` event)_ | Move to an event listener |
| `shippingAddressEventHandler` | _(replaced by `shippingaddresschange` on the Express Checkout Element)_ | Use Stripe.js directly |
| `shippingOptionEventHandler` | _(replaced by `shippingoptionchange` on the Express Checkout Element)_ | Use Stripe.js directly |

### Events

| stripe-payment-request-button | stripe-express-checkout-element | Notes |
| --- | --- | --- |
| `stripeLoaded` | `stripeLoaded` | Same |
| _(paymentmethod callback)_ | `confirm` | Fires when Express Checkout is confirmed |
| _(none)_ | `expressCheckoutClick` | Fires when the button is clicked |
| _(none)_ | `defaultConfirmResult` | Result of the default confirm behavior |
| _(none)_ | `cancel` | Fires when the user cancels |

### Methods

| stripe-payment-request-button | stripe-express-checkout-element | Notes |
| --- | --- | --- |
| `initStripe(key, options)` | `initStripe(key, options)` | Almost the same |
| `setPaymentRequestOption(options)` | _(replaced by the `amount` and `currency` attributes)_ | Set as attributes after migrating |
| `setPaymentMethodEventHandler(fn)` | _(replaced by the `confirm` event)_ | Move to an event listener |
| `setPaymentRequestShippingOptionEventHandler(fn)` | _(replaced by the Stripe Elements API)_ | A more flexible API |
| `setPaymentRequestShippingAddressEventHandler(fn)` | _(replaced by the Stripe Elements API)_ | A more flexible API |
| `isAvailable(type)` | _(Express Checkout controls button visibility automatically)_ | No explicit check needed |
| _(none)_ | `updateProgress(status)` | Control the loading state |
| _(none)_ | `setErrorMessage(msg)` | Show an error message |
| _(none)_ | `updateElementOptions(options)` | Update options dynamically |

## Related links

- [`<stripe-express-checkout-element>` component reference](/en/components/stripe-express-checkout-element/)
- [Stripe Express Checkout Element documentation](https://stripe.com/docs/elements/express-checkout-element)
- [Stripe.js Payment Request API reference](https://stripe.com/docs/js/appendix/payment_request)

## Next

- [Payment flows](/en/guides/payment-flows/)
- [Getting Started](/en/guides/getting-started/)
