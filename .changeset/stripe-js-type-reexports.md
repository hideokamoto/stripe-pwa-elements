---
'stripe-pwa-elements': patch
---

Re-export the Stripe.js types used in the components' public API (`PaymentIntentResult`, `SetupIntentResult`, `StripeCheckoutConfirmResult`, `PaymentRequestOptions`, `PaymentRequestWallet`, `StripeExpressCheckoutElementClickEvent`, `StripeExpressCheckoutElementConfirmEvent`) as type-only exports, so the published typings no longer look like runtime named exports that the CommonJS entry does not provide. The set of exported names is unchanged.
