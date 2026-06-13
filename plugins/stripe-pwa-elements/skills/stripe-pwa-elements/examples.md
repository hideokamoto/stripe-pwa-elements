# stripe-pwa-elements — Integration recipes

Copy-paste starting points. All use a publishable key (`pk_test_…`) and a client
secret created on your **server**. Replace the placeholder values. See
[reference.md](reference.md) for exact prop/event names.

> Loading: either `import { defineCustomElements } from 'stripe-pwa-elements/loader'; defineCustomElements();`
> in a bundled app, or add the unpkg `<script type="module">` tag (see SKILL.md) for plain HTML.

---

## 1. Payment Element — default submit (let the library confirm)

Simplest path. The component calls `stripe.confirmPayment()` and emits the result.

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
></stripe-payment-element>

<script>
  customElements.whenDefined('stripe-payment-element').then(() => {
    const el = document.querySelector('stripe-payment-element');
    el.addEventListener('defaultFormSubmitResult', ({ detail }) => {
      if (detail instanceof Error || detail.error) {
        el.updateProgress('failure');
        console.error('Payment failed', detail);
      } else {
        el.updateProgress('success');
        console.log('Payment succeeded', detail);
        // redirect to your success page, close modal, etc.
      }
    });
  });
</script>
```

To save a card instead of charging, set `intent-type="setup"` and pass a SetupIntent
client secret (`seti_…_secret_…`).

## 2. Payment Element — manual submit (your own confirm logic)

Set `should-use-default-form-submit-action="false"` and handle `formSubmit`.

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
  should-use-default-form-submit-action="false"
></stripe-payment-element>

<script>
  customElements.whenDefined('stripe-payment-element').then(() => {
    const el = document.querySelector('stripe-payment-element');
    el.addEventListener('formSubmit', async ({ detail: { stripe, elements } }) => {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: 'https://example.com/order/complete' },
        redirect: 'if_required',
      });
      if (result.error) {
        el.setErrorMessage(result.error.message);
        el.updateProgress('failure');
      } else {
        el.updateProgress('success');
      }
    });
  });
</script>
```

## 3. Payment Element — Checkout Session mode

Use a Checkout Session client secret (`cs_…_secret_…`) via the dedicated method.

```js
const el = document.querySelector('stripe-payment-element');
await customElements.whenDefined('stripe-payment-element');
await el.initStripeWithCheckoutSession('pk_test_xxxxx', 'cs_xxxxx_secret_xxxxx');

el.addEventListener('checkoutSessionConfirmResult', ({ detail }) => {
  if (detail instanceof Error || detail.type === 'error') {
    el.updateProgress('failure');
  } else {
    el.updateProgress('success'); // detail.session has the result
  }
});
```

You can also set the `checkout-session-client-secret` attribute declaratively
instead of calling the method.

## 4. Express Checkout (Apple Pay / Google Pay / Link)

```js
const el = document.createElement('stripe-express-checkout-element');
el.setAttribute('publishable-key', 'pk_test_xxxxx');
el.setAttribute('client-secret', 'pi_xxxxx_secret_xxxxx');
el.setAttribute('amount', '1099');      // minor units
el.setAttribute('currency', 'usd');
el.setAttribute('button-height', '48px');
document.getElementById('container').appendChild(el);

await customElements.whenDefined('stripe-express-checkout-element');

el.addEventListener('defaultConfirmResult', ({ detail }) => {
  console.log(detail instanceof Error ? 'failed' : 'succeeded', detail);
});

await el.initStripe('pk_test_xxxxx');
```

Buttons only appear when the browser/device supports the wallet. For custom
handling set `should-use-default-confirm-action="false"` and handle `confirm`.

## 5. Card Element inside a modal (manual flow)

```html
<stripe-modal open="true">
  <stripe-card-element
    publishable-key="pk_test_xxxxx"
    intent-client-secret="pi_xxxxx_secret_xxxxx"
    should-use-default-form-submit-action="false"
  ></stripe-card-element>
</stripe-modal>

<script>
  customElements.whenDefined('stripe-card-element').then(() => {
    const el = document.querySelector('stripe-card-element');
    el.addEventListener('formSubmit', async ({ detail }) => {
      const { stripe, cardNumberElement } = detail;
      const result = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement, // also: cardExpiryElement, cardCVCElement
      });
      // Send result.paymentMethod.id to your server to confirm the PaymentIntent.
      el.updateProgress(result.error ? 'failure' : 'success');
    });
  });
</script>
```

## 6. Address Element

```js
const el = document.querySelector('stripe-address-element'); // mode="shipping" / "billing"
await customElements.whenDefined('stripe-address-element');
el.addEventListener('formSubmit', ({ detail: { address } }) => {
  console.log(address.value, address.complete);
  el.updateProgress('success');
});
// Or read on demand:
const { value, complete } = await el.getValue();
```

## 7. Link Authentication Element

```js
const el = document.querySelector('stripe-link-authentication-element');
await customElements.whenDefined('stripe-link-authentication-element');
el.addEventListener('linkAuthenticationChange', ({ detail: { email } }) => {
  console.log('email', email);
});
const email = await el.getEmail();
```

---

## Framework notes

- **React**: register once with `defineCustomElements()`; bind events with the
  camelCase `on` prop, e.g. `onFormSubmit={handler}`. Set array/object props
  (like `allowedCountries`) via a `ref` since they aren't attributes.
- **Vue**: use `@formSubmit="handler"`; make sure custom elements are allowed in
  your compiler options.
- **Angular**: add `CUSTOM_ELEMENTS_SCHEMA`; bind with `(formSubmit)="handler($event)"`.
- **Plain HTML**: load the unpkg script tag and use `customElements.whenDefined`.

## Server side (create the secret)

Never expose your secret key in the browser. Create the intent server-side:

```js
// Node.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const intent = await stripe.paymentIntents.create({
  amount: 1099,
  currency: 'usd',
  automatic_payment_methods: { enabled: true },
});
// send intent.client_secret to the browser
```

For quick local testing, generate one with the Stripe CLI:

```bash
stripe payment_intents create --amount=1099 --currency=usd | jq -r .client_secret
```
