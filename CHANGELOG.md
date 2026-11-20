# stripe-pwa-elements

## 4.1.2

### Patch Changes

- 7d5e05b: Add agent guardrail scripts, example feature map, AGENTS.md, and CI smoke checks (no public component API changes).

## 4.1.1

### Patch Changes

- ecb8a38: Document agent verification (`AGENTS.md`, verification map, `pnpm run verify:agent`), refresh contributing guidance, and narrow the Agent Skill away from deprecated payment-request-button patterns.

## 4.1.0

### Minor Changes

- fc33dbe: Improve Checkout Session mode for `<stripe-payment-element>` and `<stripe-payment-sheet>`
  - Fix the default submit for Checkout Sessions created with `return_url`: the confirmation is retried without `returnUrl` when Stripe rejects it, so Sessions work with or without `return_url` (previously every Session created with `return_url` failed with "You cannot provide `returnUrl` to confirm() when `return_url` was already provided when creating the Checkout Session.")
  - Add `checkout-session-return-url` and `checkout-session-email` attributes and the `checkoutSessionDefaultValues` property to `<stripe-payment-element>` (email is required when the Session has no `customer_email`/`customer`; default values prefill the Checkout Elements)
  - Prefill `options.defaultBillingDetails` through the Checkout Elements `defaultValues` in Checkout Session mode of `<stripe-payment-sheet>`, and pass `defaultValues` through `initializeWithCheckoutSession` of the Stripe service
  - Align `<stripe-payment-element>` Checkout Session error types with `<stripe-payment-sheet>`: declines are `card_error`, other failures are `api_error`, and expired or complete Sessions are `invalid_request_error`

## 4.0.5

### Patch Changes

- 5f4cca0: Fix the section heading above the postal code field in `<stripe-card-element>`: it read "Country or region" ("地域" in Japanese) even though the component only collects a postal code and has no country selector. It now reads "Postal Code" ("郵便番号"), and the unused `Country or region` translations were removed.
- f0c4741: Stop i18next from printing its one-time Locize promotional notice to the console on initialization by setting `showSupportNotice: false`.

## 4.0.4

### Patch Changes

- 80efc33: Disable the submit button after a successful payment in `<stripe-card-element>` and `<stripe-payment-element>`. A succeeded PaymentIntent/SetupIntent (or a completed Checkout Session) cannot be confirmed again, so the form no longer accepts a second submit; the button stays enabled after a failure so the user can retry with another card. `<stripe-payment-sheet>` already behaved this way.

## 4.0.3

### Patch Changes

- 72aa0d8: Let content taller than the viewport scroll inside `<stripe-modal>` (and so inside `<stripe-card-element-modal>` and `<stripe-payment-sheet>`). The modal panel is now capped at the viewport height and scrolls its own overflow, so the close button and the top of the form are no longer pushed off-screen.

## 4.0.2

### Patch Changes

- 02124f9: Document that `should-use-default-form-submit-action` on `<stripe-card-element>` and `<stripe-card-element-modal>` confirms with `stripe.confirmCardSetup` when `intent-type` is `setup`, not only `stripe.confirmCardPayment`.
