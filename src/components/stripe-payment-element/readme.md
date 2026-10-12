# stripe-payment-element



<!-- Auto Generated Below -->


## Properties

| Property                           | Attribute                               | Description                                                                                                                                                                                                                                                | Type                                                                | Default                          |
| ---------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `applicationName`                  | `application-name`                      | Overwrite the application name that registered For wrapper library (like Capacitor)                                                                                                                                                                        | `string`                                                            | `'stripe-pwa-elements'`          |
| `buttonLabel`                      | `button-label`                          | Submit button label By default we recommended to use these string - 'Pay' -> PaymentSheet - 'Add' -> PaymentFlow(Android) - 'Add card' -> PaymentFlow(iOS) - 'Add a card' -> PaymentFlow(iOS) These strings will translated automatically by this library. | `string`                                                            | `'Pay'`                          |
| `checkoutSessionClientSecret`      | `checkout-session-client-secret`        | The client secret from checkout session response Use this for Checkout Session mode instead of intentClientSecret When this prop is set, the component will use Checkout Session API                                                                       | `string`                                                            | `undefined`                      |
| `handleSubmit`                     | --                                      | Form submit event handler                                                                                                                                                                                                                                  | `(event: Event, props: PaymentElementSubmitEvent) => Promise<void>` | `undefined`                      |
| `intentClientSecret`               | `intent-client-secret`                  | The client secret from paymentIntent.create or setupIntent.create response Use this for Payment Intent / Setup Intent mode                                                                                                                                 | `string`                                                            | `undefined`                      |
| `intentType`                       | `intent-type`                           | Default submit handle type. If you want to use `setupIntent`, should update this attribute.                                                                                                                                                                | `"payment" \| "setup"`                                              | `'payment'`                      |
| `publishableKey`                   | `publishable-key`                       | Your Stripe publishable API key.                                                                                                                                                                                                                           | `string`                                                            | `undefined`                      |
| `sheetTitle`                       | `sheet-title`                           | Payment sheet title By default we recommended to use these string - 'Add your payment information' -> PaymentSheet / PaymentFlow(Android) - 'Add a card' -> PaymentFlow(iOS) These strings will translated automatically by this library.                  | `string`                                                            | `'Add your payment information'` |
| `shouldUseDefaultFormSubmitAction` | `should-use-default-form-submit-action` | The component will provide a function to call the `stripe.confirmPayment` API. If you want to customize the behavior, should set false. And listen the 'formSubmit' event on the element                                                                   | `boolean`                                                           | `true`                           |
| `stripeAccount`                    | `stripe-account`                        | Optional. Making API calls for connected accounts                                                                                                                                                                                                          | `string`                                                            | `undefined`                      |
| `stripeDidLoaded`                  | --                                      | Stripe.js class loaded handler                                                                                                                                                                                                                             | `(event: StripeLoadedEvent) => Promise<void>`                       | `undefined`                      |


## Events

| Event                          | Description                                                                                                       | Type                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `checkoutSessionConfirmResult` | Receive the result of checkout session confirm This event is emitted when using Checkout Session mode             | `CustomEvent<Error \| { type: "error"; error: ConfirmError; } \| { type: "success"; session: StripeCheckoutSession; }>`                                                                                                                    |
| `defaultFormSubmitResult`      | Receive the result of defaultFormSubmit event This event is emitted when using Payment Intent / Setup Intent mode | `CustomEvent<Error \| { paymentIntent: PaymentIntent; error?: undefined; } \| { paymentIntent?: undefined; error: StripeError; } \| { setupIntent: SetupIntent; error?: undefined; } \| { setupIntent?: undefined; error: StripeError; }>` |
| `formSubmit`                   | Form submit event                                                                                                 | `CustomEvent<{ stripe: Stripe; elements?: StripeElements; intentClientSecret?: string; checkout?: StripeCheckoutElementsSdk; checkoutSessionClientSecret?: string; }>`                                                                     |
| `stripeLoaded`                 | Stripe Client loaded event                                                                                        | `CustomEvent<{ stripe: Stripe; }>`                                                                                                                                                                                                         |


## Methods

### `initStripe(publishableKey: string, options?: InitStripeOptions) => Promise<void>`

Get Stripe.js, and initialize elements

#### Parameters

| Name             | Type                          | Description |
| ---------------- | ----------------------------- | ----------- |
| `publishableKey` | `string`                      |             |
| `options`        | `{ stripeAccount?: string; }` |             |

#### Returns

Type: `Promise<void>`



### `initStripeWithCheckoutSession(publishableKey: string, checkoutSessionClientSecret: string, options?: InitCheckoutSessionOptions) => Promise<void>`

Get Stripe.js and initialize with Checkout Session mode
Use this method when you have a Checkout Session client secret instead of Payment/Setup Intent

#### Parameters

| Name                          | Type                                         | Description                               |
| ----------------------------- | -------------------------------------------- | ----------------------------------------- |
| `publishableKey`              | `string`                                     | - Your Stripe publishable API key         |
| `checkoutSessionClientSecret` | `string`                                     | - The client secret from Checkout Session |
| `options`                     | `InitStripeOptions & CheckoutSessionOptions` | - Optional configuration                  |

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
