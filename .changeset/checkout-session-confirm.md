---
'stripe-pwa-elements': minor
---

Improve Checkout Session mode for `<stripe-payment-element>` and `<stripe-payment-sheet>`

- Fix the default submit for Checkout Sessions created with `return_url`: the confirmation is retried without `returnUrl` when Stripe rejects it, so Sessions work with or without `return_url` (previously every Session created with `return_url` failed with "You cannot provide `returnUrl` to confirm() when `return_url` was already provided when creating the Checkout Session.")
- Add `checkout-session-return-url` and `checkout-session-email` attributes and the `checkoutSessionDefaultValues` property to `<stripe-payment-element>` (email is required when the Session has no `customer_email`/`customer`; default values prefill the Checkout Elements)
- Prefill `options.defaultBillingDetails` through the Checkout Elements `defaultValues` in Checkout Session mode of `<stripe-payment-sheet>`, and pass `defaultValues` through `initializeWithCheckoutSession` of the Stripe service
- Align `<stripe-payment-element>` Checkout Session error types with `<stripe-payment-sheet>`: declines are `card_error`, other failures are `api_error`, and expired or complete Sessions are `invalid_request_error`
