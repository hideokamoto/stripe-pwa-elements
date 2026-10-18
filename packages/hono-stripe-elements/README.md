# hono-stripe-elements

[hono/jsx](https://hono.dev/docs/guides/jsx) components that wrap the [`stripe-pwa-elements`](https://github.com/hideokamoto/stripe-pwa-elements) Web Components.
Use Stripe Card, Payment, Express Checkout, Address, Link Authentication and Currency Selector elements from Hono, HonoX islands and any other hono/jsx app.

## Installation

```bash
npm install hono-stripe-elements stripe-pwa-elements hono
```

`hono` (>= 4.0.0) and `stripe-pwa-elements` (>= 4.0.1) are peer dependencies.

## Usage

```tsx
import { StripePaymentElement } from 'hono-stripe-elements';

export default function Checkout({ clientSecret }: { clientSecret: string }) {
  return (
    <StripePaymentElement
      publishableKey="pk_test_..."
      intentClientSecret={clientSecret}
      intentType="payment"
      buttonLabel="Pay"
      onFormSubmit={event => console.log(event.detail)}
      fallback={<p>Loading payment form…</p>}
    />
  );
}
```

## Components

| Component                         | Web Component                          |
| --------------------------------- | -------------------------------------- |
| `StripeCardElement`               | `<stripe-card-element>`                |
| `StripePaymentElement`            | `<stripe-payment-element>`             |
| `StripeExpressCheckoutElement`    | `<stripe-express-checkout-element>`    |
| `StripeAddressElement`            | `<stripe-address-element>`             |
| `StripeLinkAuthenticationElement` | `<stripe-link-authentication-element>` |
| `StripeCurrencySelector`          | `<stripe-currency-selector>`           |

Each component accepts the props of the underlying Web Component. See the [stripe-pwa-elements documentation](https://github.com/hideokamoto/stripe-pwa-elements#readme) for the full list.

## How props are mapped

- **SSR safe**: the custom element is registered lazily on the client. Until then, the `fallback` node (or nothing) is rendered.
- **Attributes**: primitive props become kebab-case attributes (`buttonLabel` → `button-label`, `true` → empty attribute).
- **Events**: `onXxx` props subscribe to the camelCase custom events the element emits (`onFormSubmit` → `formSubmit`). Listeners are bound as soon as the element is created, so early events such as `stripeLoaded` are not missed.
- **Properties**: function, array and object props are assigned as element properties (for example `handleSubmit`, `stripeDidLoaded` and `allowedCountries`).
- **`ref`**: forwarded to the element instance (object ref or callback ref).

## Custom components

`createStripeElementComponent(tag, loader)` is exported for wrapping other elements with the same behaviour.

## License

MIT
