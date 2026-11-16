# stripe-pwa-elements

## 4.0.4

### Patch Changes

- 80efc33: Disable the submit button after a successful payment in `<stripe-card-element>` and `<stripe-payment-element>`. A succeeded PaymentIntent/SetupIntent (or a completed Checkout Session) cannot be confirmed again, so the form no longer accepts a second submit; the button stays enabled after a failure so the user can retry with another card. `<stripe-payment-sheet>` already behaved this way.

## 4.0.3

### Patch Changes

- 72aa0d8: Let content taller than the viewport scroll inside `<stripe-modal>` (and so inside `<stripe-card-element-modal>` and `<stripe-payment-sheet>`). The modal panel is now capped at the viewport height and scrolls its own overflow, so the close button and the top of the form are no longer pushed off-screen.

## 4.0.2

### Patch Changes

- 02124f9: Document that `should-use-default-form-submit-action` on `<stripe-card-element>` and `<stripe-card-element-modal>` confirms with `stripe.confirmCardSetup` when `intent-type` is `setup`, not only `stripe.confirmCardPayment`.
