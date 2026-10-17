import type { Appearance, StripePaymentElementOptions } from '@stripe/stripe-js';
import type { PaymentSheetResult } from './payment-sheet-state';

/**
 * Value returned by `present()` (same shape as `presentPaymentSheet()` of `@capacitor-community/stripe`)
 */
export type PaymentSheetPresentResult = { paymentResult: PaymentSheetResult };

/**
 * Address in the shape of `@capacitor-community/stripe`
 */
export type PaymentSheetAddress = {
  country?: string;
  city?: string;
  line1?: string;
  line2?: string;
  postalCode?: string;
  state?: string;
};

/**
 * Options of `<stripe-payment-sheet>`, using the same keys as `CreatePaymentSheetOption` of `@capacitor-community/stripe`
 * (without the client secrets, which are passed as the `intent-client-secret` attribute).
 * Options marked "no effect on the web" are accepted so that the same object can be passed through, and are reported once with `console.warn`.
 */
export type PaymentSheetOptions = {
  /** Shown as the business name in the Payment Element */
  merchantDisplayName?: string;
  /** `horizontal` = tabs, `vertical` = accordion, `automatic` = auto */
  paymentMethodLayout?: 'horizontal' | 'vertical' | 'automatic';
  /** Prefilled billing details */
  defaultBillingDetails?: {
    email?: string;
    name?: string;
    phone?: string;
    address?: PaymentSheetAddress;
  };
  /** Where Stripe redirects after a redirect-based payment method. Defaults to the current page */
  returnURL?: string;
  /** `alwaysLight` = Stripe theme, `alwaysDark` = Night theme */
  style?: 'alwaysLight' | 'alwaysDark';
  /** Not supported yet on the web */
  billingDetailsCollectionConfiguration?: {
    email?: 'automatic' | 'always' | 'never';
    name?: 'automatic' | 'always' | 'never';
    phone?: 'automatic' | 'always' | 'never';
    address?: 'automatic' | 'full' | 'never';
  };
  /** Not supported yet on the web */
  shippingDetails?: { name?: string; phone?: string; address?: PaymentSheetAddress };
  /** Not supported yet on the web */
  enableApplePay?: boolean;
  /** Not supported yet on the web */
  enableGooglePay?: boolean;
  /** No effect on the web (the web uses CustomerSession instead) */
  customerId?: string;
  /** No effect on the web (the web uses CustomerSession instead) */
  customerEphemeralKeySecret?: string;
  /** No effect on the web */
  applePayMerchantId?: string;
  /** No effect on the web */
  GooglePayIsTesting?: boolean;
  /** No effect on the web */
  countryCode?: string;
  /** No effect on the web */
  currencyCode?: string;
  /** No effect on the web */
  withZipCode?: boolean;
  /** No effect on the web */
  allowsDelayedPaymentMethods?: boolean;
};

const SUPPORTED_OPTION_KEYS: ReadonlyArray<keyof PaymentSheetOptions> = ['merchantDisplayName', 'paymentMethodLayout', 'defaultBillingDetails', 'returnURL', 'style'];

const LAYOUTS = {
  horizontal: 'tabs',
  vertical: 'accordion',
  automatic: 'auto',
} as const;

const THEMES = {
  alwaysLight: 'stripe',
  alwaysDark: 'night',
} as const;

/**
 * Drop keys whose value is undefined.
 */
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

/**
 * Build the Payment Element options from the payment sheet options.
 * @param options - Payment sheet options
 */
export const toPaymentElementOptions = (options: PaymentSheetOptions | undefined): StripePaymentElementOptions => {
  if (options == null) {
    return {};
  }

  const { merchantDisplayName, paymentMethodLayout, defaultBillingDetails } = options;
  const elementOptions: StripePaymentElementOptions = {};

  if (merchantDisplayName != null) {
    elementOptions.business = { name: merchantDisplayName };
  }

  if (paymentMethodLayout != null) {
    elementOptions.layout = LAYOUTS[paymentMethodLayout];
  }

  if (defaultBillingDetails != null) {
    const { address, ...contact } = defaultBillingDetails;
    const billingDetails: NonNullable<NonNullable<StripePaymentElementOptions['defaultValues']>['billingDetails']> = compact(contact);

    if (address != null) {
      const { postalCode, ...rest } = address;

      billingDetails.address = compact({ ...rest, postal_code: postalCode });
    }

    elementOptions.defaultValues = { billingDetails };
  }

  return elementOptions;
};

/**
 * Build the Elements appearance from the payment sheet style.
 * @param style - `alwaysLight` or `alwaysDark`
 */
export const toAppearance = (style: PaymentSheetOptions['style']): Appearance | undefined => {
  if (style == null) {
    return undefined;
  }

  return { theme: THEMES[style] };
};

/**
 * List the given options that have no effect on the web (yet), sorted by name.
 * @param options - Payment sheet options
 */
export const unsupportedOptionKeys = (options: PaymentSheetOptions | undefined): string[] => {
  if (options == null) {
    return [];
  }

  return Object.entries(options)
    .filter(([key, value]) => value !== undefined && !SUPPORTED_OPTION_KEYS.includes(key as keyof PaymentSheetOptions))
    .map(([key]) => key)
    .sort();
};

/**
 * Stripe error types after which the customer can fix the input or simply try again.
 * Types are listed at https://docs.stripe.com/api/errors and in `StripeErrorType` of @stripe/stripe-js.
 */
const RECOVERABLE_ERROR_TYPES = ['card_error', 'validation_error', 'api_connection_error', 'rate_limit_error', 'api_error'];

/**
 * Tell whether a confirmation error lets the customer try again in the open sheet.
 * Other errors (for example `invalid_request_error` for an intent that already succeeded) end the sheet with `paymentSheetFailed`.
 * @param error - Error thrown while confirming
 */
export const isRecoverableConfirmError = (error: unknown): boolean => {
  const type = (error as { type?: unknown } | null)?.type;

  return typeof type === 'string' && RECOVERABLE_ERROR_TYPES.includes(type);
};
