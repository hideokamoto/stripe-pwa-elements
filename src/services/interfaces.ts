import {
  Stripe,
  StripeElements,
  StripeCardNumberElement,
  StripeCardExpiryElement,
  StripeCardCvcElement,
  StripePaymentElement,
  StripeAddressElement,
  StripeLinkAuthenticationElement,
  StripeCurrencySelectorElement,
  StripeExpressCheckoutElement,
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementClickEvent,
  StripeExpressCheckoutElementShippingAddressChangeEvent,
  StripeExpressCheckoutElementShippingRateChangeEvent,
  StripeCheckoutElementsSdk,
  StripeCheckoutElementsOptions,
} from '@stripe/stripe-js';
import { ProgressStatus } from '../interfaces';

/**
 * Checkout session initialization options
 */
export type CheckoutSessionOptions = {
  elementsOptions?: StripeCheckoutElementsOptions;
};

/**
 * Stripe service state
 */
export type StripeServiceState = {
  publishableKey?: string;
  stripeAccount?: string;
  applicationName: string;
  loadStripeStatus: ProgressStatus;
  stripe?: Stripe;
  elements?: StripeElements;
  /**
   * Checkout instance for Checkout Session mode
   */
  checkout?: StripeCheckoutElementsSdk;
  /**
   * Whether the service is initialized with Checkout Session
   */
  isCheckoutSession?: boolean;
};

/**
 * Card element instances
 */
export type CardElementInstances = {
  cardNumber: StripeCardNumberElement;
  cardExpiry: StripeCardExpiryElement;
  cardCVC: StripeCardCvcElement;
};

/**
 * Card element state
 */
export type CardElementState = {
  errorMessage: string;
  errorSource?: 'cardNumber' | 'cardExpiry' | 'cardCvc';
};

/**
 * Payment element state
 */
export type PaymentElementState = {
  errorMessage: string;
};

/**
 * Address element state
 */
export type AddressElementState = {
  errorMessage: string;
  isComplete: boolean;
};

/**
 * Link Authentication element state
 */
export type LinkAuthenticationElementState = {
  errorMessage: string;
  email?: string;
};

/**
 * Core Stripe service interface
 * Manages Stripe.js initialization and Elements instance
 */
export interface IStripeService {
  /**
   * Get reactive state (for component rendering)
   */
  readonly state: StripeServiceState;

  /**
   * Initialize Stripe.js with Payment Intent mode
   */
  initialize(publishableKey: string, options?: { stripeAccount?: string; applicationName?: string }): Promise<void>;

  /**
   * Initialize Stripe.js with Checkout Session mode
   * @param publishableKey - Your Stripe publishable API key
   * @param checkoutSessionClientSecret - The client secret from Checkout Session
   * @param options - Optional configuration
   */
  initializeWithCheckoutSession(
    publishableKey: string,
    checkoutSessionClientSecret: string,
    options?: { stripeAccount?: string; applicationName?: string } & CheckoutSessionOptions
  ): Promise<void>;

  /**
   * Register state change listener
   */
  onChange<K extends keyof StripeServiceState>(key: K, callback: (newValue: StripeServiceState[K]) => void): () => void;

  /**
   * Get Stripe instance
   */
  getStripe(): Stripe | undefined;

  /**
   * Get Elements instance
   */
  getElements(): StripeElements | undefined;

  /**
   * Get Checkout instance (for Checkout Session mode)
   */
  getCheckout(): StripeCheckoutElementsSdk | undefined;

  /**
   * Reset service (for testing)
   */
  reset(): void;

  /**
   * Dispose service (cleanup)
   */
  dispose(): void;
}

/**
 * Card Element manager interface
 * Manages card number, expiry, and CVC elements
 */
export interface ICardElementManager {
  /**
   * Get card element state
   */
  getState(): CardElementState;

  /**
   * Initialize and mount card elements
   */
  initialize(containerElement: HTMLElement): Promise<CardElementInstances>;

  /**
   * Get mounted card elements
   */
  getElements(): CardElementInstances | undefined;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount all card elements
   */
  unmount(): void;
}

/**
 * Payment Element manager interface
 * Manages the unified Stripe Payment Element
 */
export interface IPaymentElementManager {
  /**
   * Get payment element state
   */
  getState(): PaymentElementState;

  /**
   * Initialize and mount payment element
   * Supports both Payment Intent mode and Checkout Session mode
   */
  initialize(containerElement: HTMLElement, options?: import('@stripe/stripe-js').StripePaymentElementOptions | import('@stripe/stripe-js').StripeCheckoutPaymentElementOptions): Promise<StripePaymentElement>;

  /**
   * Get mounted payment element
   */
  getElement(): StripePaymentElement | undefined;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount payment element
   */
  unmount(): void;
}

/**
 * Address Element manager interface
 * Manages Stripe Address Element
 */
export interface IAddressElementManager {
  /**
   * Get address element state
   */
  getState(): AddressElementState;

  /**
   * Initialize and mount address element
   */
  initialize(containerElement: HTMLElement, options?: import('@stripe/stripe-js').StripeAddressElementOptions): Promise<StripeAddressElement>;

  /**
   * Get mounted address element
   */
  getElement(): StripeAddressElement | undefined;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount address element
   */
  unmount(): void;
}

/**
 * Link Authentication Element manager interface
 * Manages Stripe Link Authentication Element for email collection and Link authentication
 */
export interface ILinkAuthenticationElementManager {
  /**
   * Get link authentication element state
   */
  getState(): LinkAuthenticationElementState;

  /**
   * Register state change listener
   */
  onChange<K extends keyof LinkAuthenticationElementState>(key: K, callback: (newValue: LinkAuthenticationElementState[K]) => void): () => void;

  /**
   * Initialize and mount link authentication element
   */
  initialize(containerElement: HTMLElement, options?: import('@stripe/stripe-js').StripeLinkAuthenticationElementOptions): Promise<StripeLinkAuthenticationElement>;

  /**
   * Get mounted link authentication element
   */
  getElement(): StripeLinkAuthenticationElement | undefined;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount link authentication element
   */
  unmount(): void;
}

/**
 * Currency Selector element state
 */
export type CurrencySelectorElementState = {
  errorMessage: string;
  selectedCurrency?: string;
};

/**
 * Currency Selector Element manager interface
 * Manages Stripe Currency Selector Element
 */
export interface ICurrencySelectorElementManager {
  /**
   * Get currency selector element state
   */
  getState(): CurrencySelectorElementState;

  /**
   * Initialize and mount currency selector element
   * Note: StripeCurrencySelectorElementOptions is not yet exported in @stripe/stripe-js v8.6.0
   */
  initialize(containerElement: HTMLElement, options?: any): Promise<StripeCurrencySelectorElement>;

  /**
   * Get mounted currency selector element
   */
  getElement(): StripeCurrencySelectorElement | undefined;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount currency selector element
   */
  unmount(): void;
}

/**
 * Express Checkout Element options
 */
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

/**
 * Express Checkout Element state
 */
export type ExpressCheckoutElementState = {
  errorMessage: string;
  isReady: boolean;
};

/**
 * Express Checkout Element event handlers
 */
export type ExpressCheckoutElementEventHandlers = {
  onConfirm?: (event: StripeExpressCheckoutElementConfirmEvent) => void | Promise<void>;
  onClick?: (event: StripeExpressCheckoutElementClickEvent) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onShippingAddressChange?: (event: StripeExpressCheckoutElementShippingAddressChangeEvent) => void | Promise<void>;
  onShippingRateChange?: (event: StripeExpressCheckoutElementShippingRateChangeEvent) => void | Promise<void>;
};

/**
 * Express Checkout Element manager interface
 * Manages Stripe Express Checkout Element
 */
export interface IExpressCheckoutElementManager {
  /**
   * Get express checkout element state
   */
  getState(): ExpressCheckoutElementState;

  /**
   * Initialize and mount express checkout element
   */
  initialize(containerElement: HTMLElement, options: ExpressCheckoutElementOptions, eventHandlers?: ExpressCheckoutElementEventHandlers): Promise<StripeExpressCheckoutElement>;

  /**
   * Get mounted express checkout element
   */
  getElement(): StripeExpressCheckoutElement | undefined;

  /**
   * Update element options
   */
  update(options: Partial<ExpressCheckoutElementOptions>): void;

  /**
   * Set error message
   */
  setError(message: string): void;

  /**
   * Clear error message
   */
  clearError(): void;

  /**
   * Unmount express checkout element
   */
  unmount(): void;
}
