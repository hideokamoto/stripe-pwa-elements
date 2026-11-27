---
"stripe-pwa-elements": patch
---

Express Checkout default confirmation now reports failures through `paymentFailed` instead of calling the removed `complete` API. Managers drop stale Stripe.js workaround comments and type casts where the installed SDK already defines the APIs.