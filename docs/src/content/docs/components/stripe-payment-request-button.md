---
title: <stripe-payment-request-button>
description: Component API reference.
---

> このページは `src/components/stripe-payment-request-button/readme.md` から自動生成されています。

## 使用例

### paymentMethodEventHandler

Set handler of the `paymentRequest.on('paymentmethod'` event.

```js
element.setPaymentMethodEventHandler(async (event, stripe) => {
// Confirm the PaymentIntent with the payment method returned from the payment request.
  const {error} = await stripe.confirmCardPayment(
    paymentIntent.client_secret,
    {
     payment_method: event.paymentMethod.id,
     shipping: {
       name: event.shippingAddress.recipient,
       phone: event.shippingAddress.phone,
       address: {
         line1: event.shippingAddress.addressLine[0],
         city: event.shippingAddress.city,
         postal_code: event.shippingAddress.postalCode,
         state: event.shippingAddress.region,
         country: event.shippingAddress.country,
       },
     },
   },
   {handleActions: false}
 );
```

### shippingOptionEventHandler

Set handler of the `paymentRequest.on('shippingoptionchange')` event

```js
element.setPaymentRequestShippingOptionEventHandler(async (event, stripe) => {
  event.updateWith({status: 'success'});
 })
```

### shippingAddressEventHandler

Set handler of the `paymentRequest.on('shippingaddresschange')` event

```js
element.setPaymentRequestShippingAddressEventHandler(async (event, stripe) => {
  const response = await store.updatePaymentIntentWithShippingCost(
    paymentIntent.id,
    store.getLineItems(),
    event.shippingOption
  );
 })
```

### stripeLoaded

Stripe Client loaded event

```js
stripeElement
 .addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
  stripe
    .createSource({
      type: 'ideal',
      amount: 1099,
      currency: 'eur',
      owner: {
        name: 'Jenny Rosen',
      },
      redirect: {
        return_url: 'https://shop.example.com/crtA6B28E1',
      },
    })
    .then(function(result) {
      // Handle result.error or result.source
    });
  });
```

> **⚠️ DEPRECATED:** This component is deprecated. `stripe.paymentRequest()` is being removed in Stripe.js 9.x (deprecated 2025-09-30 / removed 2026-03-25). Please migrate to [`<stripe-express-checkout-element>`](../stripe-express-checkout-element/) which supports Apple Pay, Google Pay, Link, PayPal, and more. See the [migration guide](../../docs/guides/migrate-payment-request-button-to-express-checkout.md).

<!-- Auto Generated Below -->


## Properties

| Property                      | Attribute          | Description                                                                         | Type                                                                           | Default                 |
| ----------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| `applicationName`             | `application-name` | Overwrite the application name that registered For wrapper library (like Capacitor) | `string`                                                                       | `'stripe-pwa-elements'` |
| `paymentMethodEventHandler`   | --                 | Set handler of the `paymentRequest.on('paymentmethod'` event.                       | `(event: PaymentRequestPaymentMethodEvent, stripe: Stripe) => Promise<void>`   | `undefined`             |
| `publishableKey`              | `publishable-key`  | Your Stripe publishable API key.                                                    | `string`                                                                       | `undefined`             |
| `shippingAddressEventHandler` | --                 | Set handler of the `paymentRequest.on('shippingaddresschange')` event               | `(event: PaymentRequestShippingAddressEvent, stripe: Stripe) => Promise<void>` | `undefined`             |
| `shippingOptionEventHandler`  | --                 | Set handler of the `paymentRequest.on('shippingoptionchange')` event                | `(event: PaymentRequestShippingOptionEvent, stripe: Stripe) => Promise<void>`  | `undefined`             |
| `stripeAccount`               | `stripe-account`   | Optional. Making API calls for connected accounts                                   | `string`                                                                       | `undefined`             |
| `stripeDidLoaded`             | --                 | Stripe.js class loaded handler                                                      | `(event: StripeLoadedEvent) => Promise<void>`                                  | `undefined`             |


## Events

| Event          | Description                | Type                               |
| -------------- | -------------------------- | ---------------------------------- |
| `stripeLoaded` | Stripe Client loaded event | `CustomEvent<{ stripe: Stripe; }>` |


## Methods

### `initStripe(publishableKey: string, options?: { showButton?: boolean; stripeAccount?: string; }) => Promise<void>`

Get Stripe.js, and initialize elements

#### Parameters

| Name             | Type                                                | Description |
| ---------------- | --------------------------------------------------- | ----------- |
| `publishableKey` | `string`                                            |             |
| `options`        | `{ showButton?: boolean; stripeAccount?: string; }` |             |

#### Returns

Type: `Promise<void>`



### `isAvailable(type: "applePay" | "googlePay") => Promise<void>`

Check isAvailable ApplePay or GooglePay.
If you run this method, you should run before initStripe.

#### Parameters

| Name   | Type                        | Description |
| ------ | --------------------------- | ----------- |
| `type` | `"applePay" \| "googlePay"` |             |

#### Returns

Type: `Promise<void>`



### `setPaymentMethodEventHandler(handler: PaymentRequestPaymentMethodEventHandler) => Promise<void>`

Register event handler for `paymentRequest.on('paymentmethod'` event.

#### Parameters

| Name      | Type                                                                         | Description |
| --------- | ---------------------------------------------------------------------------- | ----------- |
| `handler` | `(event: PaymentRequestPaymentMethodEvent, stripe: Stripe) => Promise<void>` |             |

#### Returns

Type: `Promise<void>`



### `setPaymentRequestOption(option: PaymentRequestOptions) => Promise<this>`



#### Parameters

| Name     | Type                    | Description |
| -------- | ----------------------- | ----------- |
| `option` | `PaymentRequestOptions` |             |

#### Returns

Type: `Promise<this>`



### `setPaymentRequestShippingAddressEventHandler(handler: PaymentRequestShippingAddressEventHandler) => Promise<void>`

Register event handler for `paymentRequest.on('shippingaddresschange'` event.

#### Parameters

| Name      | Type                                                                           | Description |
| --------- | ------------------------------------------------------------------------------ | ----------- |
| `handler` | `(event: PaymentRequestShippingAddressEvent, stripe: Stripe) => Promise<void>` |             |

#### Returns

Type: `Promise<void>`



### `setPaymentRequestShippingOptionEventHandler(handler: PaymentRequestShippingOptionEventHandler) => Promise<void>`

Register event handler for `paymentRequest.on('shippingoptionchange'` event.

#### Parameters

| Name      | Type                                                                          | Description |
| --------- | ----------------------------------------------------------------------------- | ----------- |
| `handler` | `(event: PaymentRequestShippingOptionEvent, stripe: Stripe) => Promise<void>` |             |

#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [stripe-card-element](../stripe-card-element)

### Graph
```mermaid
graph TD;
  stripe-card-element --> stripe-payment-request-button
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
