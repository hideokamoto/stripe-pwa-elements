# Payment sheet model

[Quint](https://quint-lang.org/) models of the `<stripe-payment-sheet>` lifecycle.

| File | Contents |
|---|---|
| `sheet_v1.qnt` | The first interface draft, kept as a record. Its invariants fail; the counterexamples are covered by regression tests in `src/components/stripe-payment-sheet/test/payment-sheet-state.unit.spec.ts`. |
| `sheet_v2.qnt` | PaymentIntent / SetupIntent only, kept as a record. |
| `sheet_v3.qnt` | The current design: v2 plus Checkout Session secrets. `allProps` must hold. CI simulates this file. |

## Secrets (`sheet_v3.qnt`)

A secret comes from one or both attributes:

- `intent-client-secret`: told apart by its prefix. `pi_` is confirmed with `confirmPayment`, `seti_` with `confirmSetup`, anything else fails to load.
- `checkout-session-client-secret`: always a Checkout Session, confirmed through the Checkout actions. Its format is never inspected, because Stripe does not document it.

When both are set, `checkout-session-client-secret` wins (the same rule as `<stripe-payment-element>`).

The model holds attribute values, not only their kinds (`pi` and `pi2` are two different PaymentIntent secrets). A change that leaves the secret in use unchanged, such as a change to `intent-client-secret` while `checkout-session-client-secret` is set, only updates the attribute: nothing is reloaded and an open sheet stays open.

## Properties (`sheet_v3.qnt`)

- `noOrphanPromise`: a `present()` promise never loses its resolver.
- `pendingImpliesProgress`: a pending `present()` promise means the sheet is shown, confirming, or loading with a request to open.
- `successIsReported`: every confirmation that succeeds at Stripe is reported as `paymentSheetCompleted`.
- `methodMatchesSecret`: the confirmation method is the one the attributes call for: the Checkout actions when `checkout-session-client-secret` is set, otherwise `confirmPayment` for PaymentIntent secrets and `confirmSetup` for SetupIntent secrets. The expected method is written independently of the one the model uses, so letting the intent attribute win makes this property fail.
- `noCancelAfterComplete`: `paymentSheetCanceled` is never emitted after the same payment completed.
- `ignoredChangeIsNoop`: changing only `intent-client-secret` while `checkout-session-client-secret` is kept neither reloads nor cancels an open sheet. It is written in terms of the attributes, independently of the function that picks the secret in use, so reloading on every attribute change makes it fail.

`failedNeverEmitted` and `checkoutNeverCompleted` are reachability probes: they are expected to be violated, which shows that `paymentSheetFailed` can happen and that a Checkout Session can complete.

## Running

```bash
# Random simulation (Node.js only)
npx -y @informalsystems/quint@0.33.0 run spec/payment-sheet/sheet_v3.qnt --invariant=allProps --max-steps=15 --max-samples=10000

# Exhaustive bounded check with Apalache (needs Java 17+; Quint downloads Apalache on first use)
npx -y @informalsystems/quint@0.33.0 verify spec/payment-sheet/sheet_v3.qnt --invariant=allProps --max-steps=10
```

`verify` writes `_apalache-out/` and `tmp/` in the working directory; do not commit them.

## Differences from the implementation

The model is coarser than `src/components/stripe-payment-sheet/payment-sheet-state.ts`:

- A client secret change while confirming is not possible in the model. The implementation defers it until the confirmation finishes, keeping the attribute it came from.
- The model goes through `Loading` for an unknown intent secret prefix. The implementation fails to load right away.
- The model does not let `open=false` withdraw a request to open while loading.
- The model decides the attribute precedence itself. In the implementation the component picks the attribute and passes it as the `source` of `secretChanged`, and dispatches it only when the secret in use, the publishable key or the connected account changed; this is covered by the component tests.

The unit test `payment sheet properties over every event order` checks the same properties directly against the implementation, enumerating every event order up to seven steps with PaymentIntent, SetupIntent, unknown and Checkout Session secrets.
