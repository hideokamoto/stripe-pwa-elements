---
title: <stripe-address-element>
description: Component API reference.
---

> このページは `src/components/stripe-address-element/readme.md` から自動生成されています。

## 使用例

### initStripe

Get Stripe.js, and initialize elements

```js
const stripeElement = document.createElement('stripe-address-element');
customElements
 .whenDefined('stripe-address-element')
 .then(() => {
   stripeElement.initStripe('pk_test_XXXXXXXXX')
 })
```

### updateProgress

Update the form submit progress

```js
const stripeElement = document.createElement('stripe-address-element');
customElements
 .whenDefined('stripe-address-element')
 .then(() => {
   stripeElement.addEventListener('formSubmit', async props => {
     const { detail: { address } } = props;
     console.log('Address:', address);
     stripeElement.updateProgress('success')
   });
})
```

### setErrorMessage

Set error message

```js
const stripeElement = document.createElement('stripe-address-element');
customElements
 .whenDefined('stripe-address-element')
 .then(() => {
   stripeElement.addEventListener('formSubmit', async props => {
     try {
       throw new Error('debug')
     } catch (e) {
       stripeElement.setErrorMessage(`Error: ${e.message}`)
       stripeElement.updateProgress('failure')
     }
  });
})
```

### getValue

Get the current address value

```js
const stripeElement = document.querySelector('stripe-address-element');
const addressValue = await stripeElement.getValue();
console.log('Address:', addressValue);
```

### stripeLoaded

Stripe Client loaded event

```js
const stripeElement = document.createElement('stripe-address-element');
customElements
 .whenDefined('stripe-address-element')
 .then(() => {
    stripeElement
     .addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
       console.log('Stripe loaded:', stripe);
      });
  })
```

### formSubmit

Form submit event

```js
const stripeElement = document.createElement('stripe-address-element');
customElements
 .whenDefined('stripe-address-element')
 .then(() => {
    stripeElement
      .addEventListener('formSubmit', async props => {
        const { detail: { address } } = props;
        console.log('Address submitted:', address);
      })
  })
```

## Known console error

When this component is used on its own, the browser console shows:

```
Unable to select session. Make sure Elements is initialized with clientSecret
or use the nullableSessionSelector() instead.
```

The form still works: it renders, accepts input, and `formSubmit` is emitted with the entered address.

The message is logged by an iframe that Stripe.js adds when an Address Element is mounted (`elements-inner-easel`), not by the address form itself. Stripe.js logs it when the Elements group was created without a PaymentIntent / SetupIntent client secret or a `mode` / `currency`. This component creates its Elements group without them, because a standalone address form has no payment to describe, so the message cannot be avoided here and can be ignored. This was observed with the Stripe.js version loaded by `@stripe/stripe-js` 9.x.

<!-- Auto Generated Below -->


## Properties

| Property           | Attribute          | Description                                                                                                                                                                                       | Type                                                         | Default                 |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------- |
| `allowedCountries` | --                 | Allowed countries (array of country codes)                                                                                                                                                        | `string[]`                                                   | `undefined`             |
| `applicationName`  | `application-name` | Overwrite the application name that registered For wrapper library (like Capacitor)                                                                                                               | `string`                                                     | `'stripe-pwa-elements'` |
| `buttonLabel`      | `button-label`     | Submit button label By default we recommended to use these string - 'Save' or 'Continue' These strings will translated automatically by this library.                                             | `string`                                                     | `'Save'`                |
| `defaultCountry`   | `default-country`  | Default country code (e.g., 'US', 'JP', 'GB')                                                                                                                                                     | `string`                                                     | `undefined`             |
| `handleSubmit`     | --                 | Form submit event handler                                                                                                                                                                         | `(event: Event, props: AddressSubmitEvent) => Promise<void>` | `undefined`             |
| `mode`             | `mode`             | Address mode: 'shipping' or 'billing'                                                                                                                                                             | `"billing" \| "shipping"`                                    | `'billing'`             |
| `publishableKey`   | `publishable-key`  | Your Stripe publishable API key.                                                                                                                                                                  | `string`                                                     | `undefined`             |
| `sheetTitle`       | `sheet-title`      | Form title By default we recommended to use these string - 'Shipping address' for shipping mode - 'Billing address' for billing mode These strings will translated automatically by this library. | `string`                                                     | `'Billing address'`     |
| `showLabel`        | `show-label`       | Show the form label                                                                                                                                                                               | `boolean`                                                    | `false`                 |
| `stripeAccount`    | `stripe-account`   | Optional. Making API calls for connected accounts                                                                                                                                                 | `string`                                                     | `undefined`             |
| `stripeDidLoaded`  | --                 | Stripe.js class loaded handler                                                                                                                                                                    | `(event: StripeLoadedEvent) => Promise<void>`                | `undefined`             |


## Events

| Event          | Description                | Type                                                                                                                                                                                                                                                |
| -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formSubmit`   | Form submit event          | `CustomEvent<{ address: { value: { name: string; firstName?: string; lastName?: string; address: { line1: string; line2: string; city: string; state: string; postal_code: string; country: string; }; phone?: string; }; complete: boolean; }; }>` |
| `stripeLoaded` | Stripe Client loaded event | `CustomEvent<{ stripe: Stripe; }>`                                                                                                                                                                                                                  |


## Methods

### `getValue() => Promise<{ value: import("@stripe/stripe-js").StripeAddressElementChangeEvent["value"]; complete: boolean; }>`

Get the current address value

#### Returns

Type: `Promise<{ value: { name: string; firstName?: string; lastName?: string; address: { line1: string; line2: string; city: string; state: string; postal_code: string; country: string; }; phone?: string; }; complete: boolean; }>`

Promise resolving to the address value

### `initStripe(publishableKey: string, options?: InitStripeOptions) => Promise<void>`

Get Stripe.js, and initialize elements

#### Parameters

| Name             | Type                          | Description |
| ---------------- | ----------------------------- | ----------- |
| `publishableKey` | `string`                      |             |
| `options`        | `{ stripeAccount?: string; }` |             |

#### Returns

Type: `Promise<void>`



### `setErrorMessage(errorMessage: string) => Promise<this>`

Set error message

#### Parameters

| Name           | Type     | Description |
| -------------- | -------- | ----------- |
| `errorMessage` | `string` | string      |

#### Returns

Type: `Promise<this>`



### `updateProgress(progress: ProgressStatus) => Promise<this>`

Update the form submit progress

#### Parameters

| Name       | Type                                        | Description |
| ---------- | ------------------------------------------- | ----------- |
| `progress` | `"" \| "loading" \| "success" \| "failure"` |             |

#### Returns

Type: `Promise<this>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
