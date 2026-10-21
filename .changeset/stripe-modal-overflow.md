---
'stripe-pwa-elements': patch
---

Let content taller than the viewport scroll inside `<stripe-modal>` (and so inside `<stripe-card-element-modal>` and `<stripe-payment-sheet>`). The modal panel is now capped at the viewport height and scrolls its own overflow, so the close button and the top of the form are no longer pushed off-screen.
