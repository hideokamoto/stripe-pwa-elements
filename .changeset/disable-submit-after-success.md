---
'stripe-pwa-elements': patch
---

Disable the submit button after a successful payment in `<stripe-card-element>` and `<stripe-payment-element>`. A succeeded PaymentIntent/SetupIntent (or a completed Checkout Session) cannot be confirmed again, so the form no longer accepts a second submit; the button stays enabled after a failure so the user can retry with another card. `<stripe-payment-sheet>` already behaved this way.
