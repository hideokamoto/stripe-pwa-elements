import { useEffect, useState } from 'hono/jsx';
import { jsx } from 'hono/jsx/jsx-runtime';
import type {
  PaymentIntentResult,
  SetupIntentResult,
  Stripe,
  StripeAddressElementChangeEvent,
  StripeCardCvcElement,
  StripeCardExpiryElement,
  StripeCardNumberElement,
  StripeCheckoutConfirmResult,
  StripeCheckoutElementsSdk,
  StripeElements,
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementConfirmEvent,
  StripeLinkAuthenticationElement as StripeLinkAuthElement,
} from '@stripe/stripe-js';

// Event detail types mirrored from the component package's public types
// (src/interfaces.ts and each component file). Duplicated here so the
// emitted declarations stay self-contained for consumers of `stripe-pwa-elements/hono`.

export type IntentType = 'setup' | 'payment';

export type StripeLoadedEvent = {
  stripe: Stripe;
};

export type FormSubmitEvent = {
  stripe: Stripe;
  cardNumberElement: StripeCardNumberElement;
  cardExpiryElement: StripeCardExpiryElement;
  cardCVCElement: StripeCardCvcElement;
  intentClientSecret?: string;
  zipCode?: string;
};

export type DefaultFormSubmitResult = Error | PaymentIntentResult | SetupIntentResult;

export type PaymentElementSubmitEvent = {
  stripe: Stripe;
  elements?: StripeElements;
  intentClientSecret?: string;
  checkout?: StripeCheckoutElementsSdk;
  checkoutSessionClientSecret?: string;
};

export type CheckoutSessionFormSubmitResult = StripeCheckoutConfirmResult | Error;

export type AddressSubmitEvent = {
  address: {
    value: StripeAddressElementChangeEvent['value'];
    complete: boolean;
  };
};

export type LinkAuthenticationElementChangeEvent = {
  stripe: Stripe;
  linkAuthenticationElement: StripeLinkAuthElement;
  email?: string;
};

export type CurrencySelectorChangeEvent = {
  currency: string;
};

export type ExpressCheckoutElementOptions = {
  mode?: 'payment' | 'setup' | 'subscription';
  amount?: number;
  currency?: string;
  paymentMethods?: {
    applePay?: 'never' | 'always' | 'auto';
    googlePay?: 'never' | 'always' | 'auto';
    link?: 'never' | 'always' | 'auto';
    paypal?: 'never' | 'always' | 'auto';
    amazonPay?: 'never' | 'always' | 'auto';
  };
  buttonType?: {
    applePay?: 'buy' | 'donate' | 'plain' | 'book' | 'check-out' | 'subscribe';
    googlePay?: 'buy' | 'donate' | 'plain' | 'book' | 'checkout' | 'order' | 'pay' | 'subscribe';
  };
  buttonTheme?: {
    applePay?: 'black' | 'white' | 'white-outline';
    googlePay?: 'black' | 'white';
  };
  buttonHeight?: string | number;
  layout?: {
    maxColumns?: number;
    maxRows?: number;
    overflow?: 'auto' | 'never';
  };
};

const toKebab = (key: string): string => key.replace(/([A-Z])/g, '-$1').toLowerCase();

const isEventProp = (key: string, value: unknown): value is EventListener =>
  key.length > 2 && key.startsWith('on') && key[2] === key[2].toUpperCase() && typeof value === 'function';

const toEventName = (key: string): string => key[2].toLowerCase() + key.slice(3);

type ElementRef = { current: unknown } | ((el: HTMLElement | null) => void | (() => void));

/**
 * Common props every adapter component accepts on top of its element props.
 */
export type StripeElementBaseProps = {
  /**
   * Node rendered until the Web Component module is registered on the client.
   * During SSR and while the module loads, this is rendered instead of the element.
   */
  fallback?: unknown;
  /** Forwarded to the underlying element instance. */
  ref?: ElementRef;
};

/**
 * Creates a hono/jsx component that wraps a stripe-pwa-elements Web Component.
 *
 * - Lazily registers the custom element on the client (`import()` inside an
 *   effect), so it is safe in SSR contexts such as HonoX islands.
 * - camelCase props become kebab-case attributes (`buttonLabel` -> `button-label`).
 * - `onXxx` props subscribe the camelCase custom events the components emit
 *   (`onFormSubmit` -> `formSubmit`). They are bound synchronously when the
 *   element is created, so early events like `stripeLoaded` are not missed.
 * - function/array/object props are assigned as element properties
 *   (e.g. `handleSubmit`, `stripeDidLoaded`, `allowedCountries`).
 */
export function createStripeElementComponent<P extends StripeElementBaseProps>(tag: string, loader: () => Promise<unknown>) {
  return function StripeElement(props: P) {
    const [ready, setReady] = useState(false);
    const {
      fallback,
      ref: userRef,
      key: _key,
      children: _children,
      ...rest
    } = props as P & {
      key?: unknown;
      children?: unknown;
    };

    useEffect(() => {
      let alive = true;
      void loader().then(() => {
        if (alive) setReady(true);
      });
      return () => {
        alive = false;
      };
    }, []);

    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (value == null || typeof value === 'function' || typeof value === 'object') continue;
      attributes[toKebab(key)] = value === true ? '' : String(value);
    }

    if (!ready) return (fallback as ReturnType<typeof jsx>) ?? null;

    return jsx(tag, {
      // Bind listeners/properties synchronously when the element is created —
      // events like `stripeLoaded` can fire before effects would run.
      ref: (el: HTMLElement | null) => {
        if (el == null) return;
        if (typeof userRef === 'function') userRef(el);
        else if (userRef != null) userRef.current = el;

        const cleanups: (() => void)[] = [];
        for (const [key, value] of Object.entries(rest)) {
          if (isEventProp(key, value)) {
            const name = toEventName(key);
            el.addEventListener(name, value);
            cleanups.push(() => el.removeEventListener(name, value));
          } else if (value != null && (typeof value === 'function' || typeof value === 'object')) {
            (el as unknown as Record<string, unknown>)[key] = value;
          }
        }
        return () => {
          for (const cleanup of cleanups) cleanup();
          if (typeof userRef === 'function') userRef(null);
          else if (userRef != null) userRef.current = null;
        };
      },
      ...attributes,
    });
  };
}

type StripeCommonProps = {
  publishableKey?: string;
  stripeAccount?: string;
};

export type StripeCardElementProps = StripeElementBaseProps &
  StripeCommonProps & {
    intentClientSecret?: string;
    intentType?: IntentType;
    buttonLabel?: string;
    sheetTitle?: string;
    zip?: boolean;
    showLabel?: boolean;
    applicationName?: string;
    showPaymentRequestButton?: boolean;
    shouldUseDefaultFormSubmitAction?: boolean;
    handleSubmit?: (event: Event, props: FormSubmitEvent) => Promise<void>;
    stripeDidLoaded?: (event: StripeLoadedEvent) => Promise<void>;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onFormSubmit?: (event: CustomEvent<FormSubmitEvent>) => void;
    onDefaultFormSubmitResult?: (event: CustomEvent<DefaultFormSubmitResult>) => void;
  };

export type StripePaymentElementProps = StripeElementBaseProps &
  StripeCommonProps & {
    intentClientSecret?: string;
    checkoutSessionClientSecret?: string;
    intentType?: IntentType;
    buttonLabel?: string;
    sheetTitle?: string;
    applicationName?: string;
    shouldUseDefaultFormSubmitAction?: boolean;
    handleSubmit?: (event: Event, props: PaymentElementSubmitEvent) => Promise<void>;
    stripeDidLoaded?: (event: StripeLoadedEvent) => Promise<void>;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onFormSubmit?: (event: CustomEvent<PaymentElementSubmitEvent>) => void;
    onDefaultFormSubmitResult?: (event: CustomEvent<DefaultFormSubmitResult>) => void;
    onCheckoutSessionConfirmResult?: (event: CustomEvent<CheckoutSessionFormSubmitResult>) => void;
  };

export type StripeExpressCheckoutElementProps = StripeElementBaseProps &
  StripeCommonProps & {
    clientSecret?: string;
    intentType?: IntentType;
    amount?: number;
    currency?: string;
    buttonHeight?: string;
    expressCheckoutOption?: ExpressCheckoutElementOptions;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onConfirm?: (event: CustomEvent<StripeExpressCheckoutElementConfirmEvent>) => void;
    onExpressCheckoutClick?: (event: CustomEvent<StripeExpressCheckoutElementClickEvent>) => void;
    onCancel?: (event: CustomEvent<void>) => void;
    onDefaultConfirmResult?: (event: CustomEvent<DefaultFormSubmitResult>) => void;
  };

export type StripeAddressElementProps = StripeElementBaseProps &
  StripeCommonProps & {
    mode?: 'shipping' | 'billing';
    defaultCountry?: string;
    allowedCountries?: string[];
    buttonLabel?: string;
    sheetTitle?: string;
    showLabel?: boolean;
    applicationName?: string;
    handleSubmit?: (event: AddressSubmitEvent) => Promise<void> | void;
    stripeDidLoaded?: (event: StripeLoadedEvent) => Promise<void>;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onFormSubmit?: (event: CustomEvent<AddressSubmitEvent>) => void;
  };

export type StripeLinkAuthenticationElementProps = StripeElementBaseProps &
  StripeCommonProps & {
    defaultEmail?: string;
    showLabel?: boolean;
    applicationName?: string;
    linkAuthenticationChangeHandler?: (event: LinkAuthenticationElementChangeEvent) => Promise<void> | void;
    stripeDidLoaded?: (event: StripeLoadedEvent) => Promise<void>;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onLinkAuthenticationChange?: (event: CustomEvent<LinkAuthenticationElementChangeEvent>) => void;
  };

export type StripeCurrencySelectorProps = StripeElementBaseProps &
  StripeCommonProps & {
    clientSecret?: string;
    showLabel?: boolean;
    applicationName?: string;
    currencyChangeHandler?: (props: CurrencySelectorChangeEvent) => Promise<void>;
    stripeDidLoaded?: (event: StripeLoadedEvent) => Promise<void>;
    onStripeLoaded?: (event: CustomEvent<StripeLoadedEvent>) => void;
    onCurrencyChange?: (event: CustomEvent<CurrencySelectorChangeEvent>) => void;
  };

export const StripeCardElement = createStripeElementComponent<StripeCardElementProps>(
  'stripe-card-element',
  () => import('stripe-pwa-elements/dist/components/stripe-card-element'),
);
export const StripePaymentElement = createStripeElementComponent<StripePaymentElementProps>(
  'stripe-payment-element',
  () => import('stripe-pwa-elements/dist/components/stripe-payment-element'),
);
export const StripeExpressCheckoutElement = createStripeElementComponent<StripeExpressCheckoutElementProps>(
  'stripe-express-checkout-element',
  () => import('stripe-pwa-elements/dist/components/stripe-express-checkout-element'),
);
export const StripeAddressElement = createStripeElementComponent<StripeAddressElementProps>(
  'stripe-address-element',
  () => import('stripe-pwa-elements/dist/components/stripe-address-element'),
);
export const StripeLinkAuthenticationElement = createStripeElementComponent<StripeLinkAuthenticationElementProps>(
  'stripe-link-authentication-element',
  () => import('stripe-pwa-elements/dist/components/stripe-link-authentication-element'),
);
export const StripeCurrencySelector = createStripeElementComponent<StripeCurrencySelectorProps>(
  'stripe-currency-selector',
  () => import('stripe-pwa-elements/dist/components/stripe-currency-selector'),
);
