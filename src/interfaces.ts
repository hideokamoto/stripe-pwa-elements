import {
  Stripe,
  StripeCardCvcElement,
  StripeCardExpiryElement,
  StripeCardNumberElement,
  StripeLinkAuthenticationElement,
  PaymentRequestPaymentMethodEvent,
  PaymentRequestShippingOptionEvent,
  PaymentRequestShippingAddressEvent,
  PaymentRequestOptions,
  PaymentIntentResult,
  SetupIntentResult,
} from '@stripe/stripe-js';

/**
 * Stripe.js types used in the components' public API (props, events, methods, state).
 * Components import them from this file, so the generated components.d.ts re-exports them
 * from './interfaces' with `export type`. Stencil re-exports anything imported straight from
 * '@stripe/stripe-js' without `type`, and tools that read the package on its own
 * (Are the Types Wrong?) then report them as missing named exports.
 */
export type {
  PaymentIntentResult,
  PaymentRequestOptions,
  PaymentRequestWallet,
  SetupIntentResult,
  StripeCheckoutConfirmResult,
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
} from '@stripe/stripe-js';

/**
 * Internal util types
 */
export type StringifyBoolean = 'true' | 'false';

/**
 * Event object of `formSubmit` event
 */
export type FormSubmitEvent = {
  stripe: Stripe;
  cardNumberElement: StripeCardNumberElement;
  cardExpiryElement: StripeCardExpiryElement;
  cardCVCElement: StripeCardCvcElement;
  intentClientSecret?: string;
  zipCode?: string;
};
/**
 * Handler function of the `formSubmit` event
 */
export type FormSubmitHandler = (event: Event, props: FormSubmitEvent) => Promise<void>;

/**
 * Event object of `stripeLoaded` event
 */
export type StripeLoadedEvent = {
  stripe: Stripe;
};
/**
 * Handler function of the `stripeLoaded` event
 */
export type StripeDidLoadedHandler = (event: StripeLoadedEvent) => Promise<void>;

/**
 * Activity progress status
 */
export type ProgressStatus = '' | 'loading' | 'success' | 'failure';

/**
 * PaymentRequest Button API handlers
 */
export type PaymentRequestPaymentMethodEventHandler = (event: PaymentRequestPaymentMethodEvent, stripe: Stripe) => Promise<void>;
export type PaymentRequestShippingOptionEventHandler = (event: PaymentRequestShippingOptionEvent, stripe: Stripe) => Promise<void>;
export type PaymentRequestShippingAddressEventHandler = (event: PaymentRequestShippingAddressEvent, stripe: Stripe) => Promise<void>;

/**
 * PaymentRequest Button options
 */
export type PaymentRequestButtonOption = PaymentRequestOptions & {
  paymentRequestPaymentMethodHandler?: PaymentRequestPaymentMethodEventHandler;
  paymentRequestShippingAddressChangeHandler?: PaymentRequestShippingAddressEventHandler;
  paymentRequestShippingOptionChangeHandler?: PaymentRequestShippingOptionEventHandler;
};

/**
 * Stripe XXXIntent types
 */
export type IntentType = 'setup' | 'payment';
export type DefaultFormSubmitResult = Error | PaymentIntentResult | SetupIntentResult;

/**
 * Stripe.js client options
 * @see https://stripe.com/docs/js/initializing#init_stripe_js-options
 */
export type InitStripeOptions = {
  stripeAccount?: string;
};

/**
 * Event object of Link Authentication Element 'change' event
 */
export type LinkAuthenticationElementChangeEvent = {
  stripe: Stripe;
  linkAuthenticationElement: StripeLinkAuthenticationElement;
  email?: string;
};

/**
 * Handler function of the Link Authentication Element 'change' event
 */
export type LinkAuthenticationElementChangeHandler = (event: LinkAuthenticationElementChangeEvent) => Promise<void> | void;

/**
 * Currency Selector Element change event data
 */
export type CurrencySelectorChangeEvent = {
  currency: string;
};

/**
 * Currency Selector Element change handler
 */
export type CurrencySelectorChangeHandler = (props: CurrencySelectorChangeEvent) => Promise<void>;
