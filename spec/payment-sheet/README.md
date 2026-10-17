# Payment sheet model

[Quint](https://quint-lang.org/) models of the `<stripe-payment-sheet>` lifecycle.

| File | Contents |
|---|---|
| `sheet_v1.qnt` | The first interface draft, kept as a record. Its invariants fail; the counterexamples are covered by regression tests in `src/components/stripe-payment-sheet/test/payment-sheet-state.unit.spec.ts`. |
| `sheet_v2.qnt` | The current design. `allProps` must hold. |

## Properties (`sheet_v2.qnt`)

- `noOrphanPromise`: a `present()` promise never loses its resolver.
- `pendingImpliesProgress`: a pending `present()` promise means the sheet is shown, confirming, or loading with a request to open.
- `successIsReported`: every confirmation that succeeds at Stripe is reported as `paymentSheetCompleted`.
- `methodMatchesSecret`: `confirmPayment` is only used for PaymentIntent secrets and `confirmSetup` for SetupIntent secrets.
- `noCancelAfterComplete`: `paymentSheetCanceled` is never emitted after the same payment completed.

`failedNeverEmitted` is a reachability probe: it is expected to be violated, which shows that `paymentSheetFailed` can happen.

## Running

```bash
# Random simulation (Node.js only)
npx -y @informalsystems/quint@0.33.0 run spec/payment-sheet/sheet_v2.qnt --invariant=allProps --max-steps=15 --max-samples=10000

# Exhaustive bounded check with Apalache (needs Java 17+; Quint downloads Apalache on first use)
npx -y @informalsystems/quint@0.33.0 verify spec/payment-sheet/sheet_v2.qnt --invariant=allProps --max-steps=10
```

## Differences from the implementation

The model is coarser than `src/components/stripe-payment-sheet/payment-sheet-state.ts`:

- A client secret change while confirming is not possible in the model. The implementation defers it until the confirmation finishes.
- The model goes through `Loading` for an unknown secret prefix. The implementation fails to load right away.
- The model does not let `open=false` withdraw a request to open while loading.

The unit test `payment sheet properties over every event order` checks the same properties directly against the implementation, enumerating every event order up to seven steps.
