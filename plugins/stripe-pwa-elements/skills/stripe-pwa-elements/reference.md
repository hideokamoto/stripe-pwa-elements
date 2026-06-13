# stripe-pwa-elements — Component API reference

Authoritative props, events, and public methods for every component. Attributes are
the kebab-case form of the prop name (e.g. prop `intentClientSecret` →
attribute `intent-client-secret`). Events are `CustomEvent`s; read data from
`event.detail`. All public methods are `async` (return Promises).

Common props on every Stripe-backed component:

- `publishable-key` (`string`) — your Stripe publishable key.
- `stripe-account` (`string`, optional) — Connect account id for API calls.
- `application-name` (`string`, default `'stripe-pwa-elements'`) — wrapper app id.

Common methods: `initStripe(publishableKey, { stripeAccount? })`,
`setErrorMessage(message)`. Common event: `stripeLoaded` → `{ stripe }`.

`ProgressStatus` = `'' | 'loading' | 'success' | 'failure'`.
`intent-type` = `'payment'` (default) | `'setup'`.

---

## `<stripe-card-element>`

Split card fields (number / expiry / CVC). Supports PaymentIntent and SetupIntent.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `intent-client-secret` | `string` | — | `pi_…_secret_…` or `seti_…_secret_…` |
| `intent-type` | `'payment' \| 'setup'` | `'payment'` | |
| `zip` | `boolean` | `true` | show ZIP field |
| `sheet-title` | `string` | `'Add your payment information'` | translated |
| `button-label` | `string` | `'Pay'` | translated |
| `show-label` | `boolean` | `false` | show field labels |
| `show-payment-request-button` | `boolean` | — | render the Payment Request button |
| `should-use-default-form-submit-action` | `boolean` | `true` | when `true`, calls `stripe.confirmCardPayment` for you |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `formSubmit` → `{ stripe, cardNumberElement, cardExpiryElement, cardCVCElement, intentClientSecret?, zipCode? }`
- `defaultFormSubmitResult` → `PaymentIntentResult | SetupIntentResult | Error`

**Methods**: `initStripe`, `setErrorMessage`, `updateProgress(progress)`,
`setPaymentRequestOption(option)`.

---

## `<stripe-payment-element>`

Unified payment form (cards, wallets, local methods). Two modes: Payment/Setup
Intent **or** Checkout Session.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `intent-client-secret` | `string` | — | Payment/Setup Intent mode |
| `checkout-session-client-secret` | `string` | — | Checkout Session mode (or use the method below) |
| `intent-type` | `'payment' \| 'setup'` | `'payment'` | |
| `sheet-title` | `string` | `'Add your payment information'` | translated |
| `button-label` | `string` | `'Pay'` | translated |
| `should-use-default-form-submit-action` | `boolean` | `true` | when `true`, calls `stripe.confirmPayment` for you |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `formSubmit` → `{ stripe, elements?, intentClientSecret?, checkout?, checkoutSessionClientSecret? }`
- `defaultFormSubmitResult` → `PaymentIntentResult | SetupIntentResult | Error` (Intent mode)
- `checkoutSessionConfirmResult` → `{ type: 'success'; session } | { type: 'error'; error } | Error` (Checkout Session mode)

**Methods**: `initStripe`, `initStripeWithCheckoutSession(publishableKey, checkoutSessionClientSecret, options?)`,
`setErrorMessage`, `updateProgress(progress)`.

---

## `<stripe-express-checkout-element>`

One-click wallets: Apple Pay, Google Pay, Link, PayPal, Amazon Pay.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `client-secret` | `string` | — | Payment/Setup Intent client secret |
| `intent-type` | `'payment' \| 'setup'` | `'payment'` | |
| `amount` | `number` | — | minor units, e.g. `1099` = $10.99 |
| `currency` | `string` | — | ISO code, e.g. `'usd'` |
| `button-height` | `string` | — | e.g. `'48px'` |
| `should-use-default-confirm-action` | `boolean` | `true` | when `true`, confirms the payment for you |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `expressCheckoutClick` — buyer clicked a wallet button
- `confirm` — buyer authorized the payment
- `cancel` — buyer dismissed the sheet
- `defaultConfirmResult` → `PaymentIntentResult | SetupIntentResult | Error`

**Methods**: `initStripe`, `setErrorMessage`, `updateProgress(progress)`,
`updateElementOptions(options)` — dynamically update `mode`, `amount`, `currency`,
`paymentMethods`, `buttonType`, `buttonTheme`, `buttonHeight`, `layout`.

---

## `<stripe-address-element>`

Billing or shipping address collection.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `mode` | `'billing' \| 'shipping'` | `'billing'` | |
| `default-country` | `string` | — | e.g. `'US'`, `'JP'` |
| `allowed-countries` (prop `allowedCountries`) | `string[]` | — | set via property, not attribute |
| `sheet-title` | `string` | `'Billing address'` | translated |
| `button-label` | `string` | `'Save'` | translated |
| `show-label` | `boolean` | `false` | |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `formSubmit` → `{ address: { value: { name, firstName?, lastName?, address: { line1, line2, city, state, postal_code, country }, phone? }, complete } }`

**Methods**: `initStripe`, `setErrorMessage`, `updateProgress(progress)`,
`getValue()` → `{ value, complete }`.

---

## `<stripe-link-authentication-element>`

Email field with Stripe Link.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `default-email` | `string` | — | prefill |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `linkAuthenticationChange` → `{ stripe, linkAuthenticationElement, email? }`

**Methods**: `initStripe`, `setErrorMessage`, `updateProgress(progress)`,
`getEmail()` → `string | undefined`.

---

## `<stripe-currency-selector>`

Currency picker for Stripe Adaptive Pricing (Checkout Session).

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `client-secret` | `string` | — | Checkout Session client secret (required) |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**

- `stripeLoaded` → `{ stripe }`
- `currencyChange` → `{ currency }`

**Methods**: `initStripe`, `setErrorMessage`, `getSelectedCurrency()` → `string | undefined`.

---

## `<stripe-modal>`

Reusable modal wrapper (the only component using shadow DOM). Put any payment
component inside it as a child.

**Props**

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `open` | `boolean` | `false` | open state |
| `show-close-button` | `boolean` | `true` | |

**Events**: `close`.

**Methods**: `openModal()`, `closeModal()`, `toggleModal()`.

---

## `<stripe-card-element-modal>`

Card Element pre-wrapped in a modal.

**Props**: all of `<stripe-card-element>`'s payment props
(`publishable-key`, `intent-client-secret`, `intent-type`, `zip`, `sheet-title`,
`button-label`, `show-label`, `should-use-default-form-submit-action`,
`stripe-account`, `application-name`) **plus** the modal props `open` and
`show-close-button`.

**Events**: `closed`.

**Methods**: `present()` (opens the modal; resolves on form submission),
`getStripeCardElementElement()` → inner `<stripe-card-element>`,
`updateProgress(progress)`, `setPaymentRequestButton(options)`, `destroy()`.

---

## `<stripe-payment-request-button>` (Beta)

Low-level Payment Request API button (Apple Pay / Google Pay). Prefer
`<stripe-express-checkout-element>` for most use cases.

**Props**

| Attribute / prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `publishable-key` | `string` | — | required |
| `paymentMethodEventHandler` | `(event, stripe) => Promise<void>` | — | property only |
| `shippingAddressEventHandler` | `(event, stripe) => Promise<void>` | — | property only |
| `shippingOptionEventHandler` | `(event, stripe) => Promise<void>` | — | property only |
| `stripe-account` | `string` | — | |
| `application-name` | `string` | `'stripe-pwa-elements'` | |

**Events**: `stripeLoaded` → `{ stripe }`.

**Methods**:
- `initStripe(publishableKey, { showButton?, stripeAccount? })`
- `isAvailable('applePay' | 'googlePay')` — call **before** `initStripe`
- `setPaymentRequestOption(option)` — `PaymentRequestOptions` (country, currency, total, etc.)
- `setPaymentMethodEventHandler(handler)`
- `setPaymentRequestShippingAddressEventHandler(handler)`
- `setPaymentRequestShippingOptionEventHandler(handler)`
