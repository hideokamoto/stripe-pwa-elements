import type {
  Appearance,
  StripeAddressElementChangeEvent,
  StripeAddressElementOptions,
  StripeLinkAuthenticationElementOptions,
  StripePaymentElementOptions,
} from '@stripe/stripe-js';
import type { ExtraConfirmParams } from '../stripe-payment-element/stripe-payment-element.helpers';
import type { IntentKind, PaymentSheetResult } from './payment-sheet-state';

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
  /**
   * Which billing details are collected (PaymentIntent / SetupIntent).
   * `never` hides the field and sends the `defaultBillingDetails` value instead (loading fails when it is missing).
   * `email: 'always'` shows an email (Link Authentication) element, `address: 'full'` shows a billing Address Element,
   * `phone: 'always'` asks for the phone in that Address Element (no effect without `address: 'full'`),
   * `name: 'always'` has no effect on the web (it needs Stripe beta access).
   */
  billingDetailsCollectionConfiguration?: {
    email?: 'automatic' | 'always' | 'never';
    name?: 'automatic' | 'always' | 'never';
    phone?: 'automatic' | 'always' | 'never';
    address?: 'automatic' | 'full' | 'never';
  };
  /** Shows a shipping Address Element prefilled with these values (PaymentIntent only; no effect for a SetupIntent) */
  shippingDetails?: { name?: string; phone?: string; address?: PaymentSheetAddress };
  /** `true` shows Apple Pay when available, `false` hides it */
  enableApplePay?: boolean;
  /** `true` shows Google Pay when available, `false` hides it */
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

const SUPPORTED_OPTION_KEYS: ReadonlyArray<keyof PaymentSheetOptions> = [
  'merchantDisplayName',
  'paymentMethodLayout',
  'defaultBillingDetails',
  'returnURL',
  'style',
  'billingDetailsCollectionConfiguration',
  'shippingDetails',
  'enableApplePay',
  'enableGooglePay',
];

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
 * Convert a Capacitor address to the Stripe shape (`postalCode` → `postal_code`), dropping keys that are not given.
 */
const toStripeAddress = (address: PaymentSheetAddress) => {
  const { postalCode, ...rest } = address;

  return compact({ ...rest, postal_code: postalCode });
};

type BillingDetailsFields = Exclude<NonNullable<NonNullable<StripePaymentElementOptions['fields']>['billingDetails']>, string>;

/**
 * Payment Element billing fields to turn off: the `never` ones (passed from `defaultBillingDetails` at confirmation)
 * and the ones collected by a separate element (email element, billing Address Element).
 */
const toBillingDetailsFields = (config: PaymentSheetOptions['billingDetailsCollectionConfiguration']): BillingDetailsFields | undefined => {
  if (config == null) {
    return undefined;
  }

  const { email, name, phone, address } = config;
  const fields = compact<BillingDetailsFields>({
    email: email === 'never' || email === 'always' ? 'never' : undefined,
    name: name === 'never' ? 'never' : undefined,
    phone: phone === 'never' || (phone === 'always' && address === 'full') ? 'never' : undefined,
    address: address === 'never' || address === 'full' ? 'never' : undefined,
  });

  return Object.keys(fields).length === 0 ? undefined : fields;
};

/**
 * `true` → `auto` (shown when available), `false` → `never`, undefined → left to Stripe
 */
const toWalletOption = (enabled: boolean | undefined) => (enabled == null ? undefined : enabled ? ('auto' as const) : ('never' as const));

/**
 * Build the Payment Element options from the payment sheet options.
 * @param options - Payment sheet options
 */
export const toPaymentElementOptions = (options: PaymentSheetOptions | undefined): StripePaymentElementOptions => {
  if (options == null) {
    return {};
  }

  const { merchantDisplayName, paymentMethodLayout, defaultBillingDetails, billingDetailsCollectionConfiguration, enableApplePay, enableGooglePay } = options;
  const elementOptions: StripePaymentElementOptions = {};
  const billingDetailsFields = toBillingDetailsFields(billingDetailsCollectionConfiguration);
  const wallets = compact({ applePay: toWalletOption(enableApplePay), googlePay: toWalletOption(enableGooglePay) });

  if (billingDetailsFields != null) {
    elementOptions.fields = { billingDetails: billingDetailsFields };
  }

  if (Object.keys(wallets).length > 0) {
    elementOptions.wallets = wallets;
  }

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
      billingDetails.address = toStripeAddress(address);
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
 * List the given options (or option values, as `option.key`) that have no effect on the web (yet), sorted by name.
 * @param options - Payment sheet options
 * @param intentKind - Kind of the intent, when known
 */
export const unsupportedOptionKeys = (options: PaymentSheetOptions | undefined, intentKind?: IntentKind): string[] => {
  if (options == null) {
    return [];
  }

  const keys = Object.entries(options)
    .filter(([key, value]) => value !== undefined && !SUPPORTED_OPTION_KEYS.includes(key as keyof PaymentSheetOptions))
    .map(([key]) => key);
  const config = options.billingDetailsCollectionConfiguration;

  // `fields.billingDetails.name: 'always'` of the Payment Element requires Stripe beta access, so it is not sent
  if (config?.name === 'always') {
    keys.push('billingDetailsCollectionConfiguration.name');
  }

  // The phone can only be required through the billing Address Element
  if (config?.phone === 'always' && config.address !== 'full') {
    keys.push('billingDetailsCollectionConfiguration.phone');
  }

  // A SetupIntent has no shipping details
  if (options.shippingDetails != null && intentKind === 'setup') {
    keys.push('shippingDetails');
  }

  return keys.sort();
};

/**
 * `payment_method_data.billing_details` passed to `confirmPayment` / `confirmSetup`
 */
export type ConfirmBillingDetails = NonNullable<NonNullable<ExtraConfirmParams['payment_method_data']>['billing_details']>;

/**
 * Extra elements to show next to the Payment Element, and the billing details to pass at confirmation
 */
export type BillingDetailsCollectionPlan = {
  /** Billing details whose Payment Element field is `never`, taken from `defaultBillingDetails` */
  fixedBillingDetails: ConfirmBillingDetails;
  /** Whether the phone typed into the billing Address Element is passed at confirmation */
  collectPhoneFromAddress: boolean;
  /** Options of the billing Address Element (`address: 'full'`) */
  billingAddressElement?: StripeAddressElementOptions;
  /** Options of the shipping Address Element (`shippingDetails`, PaymentIntent only) */
  shippingAddressElement?: StripeAddressElementOptions;
  /** Options of the email (Link Authentication) element (`email: 'always'`) */
  emailElement?: StripeLinkAuthenticationElementOptions;
};

/**
 * Values read from the extra elements right before confirmation
 */
export type CollectedDetails = {
  billingAddress?: Pick<StripeAddressElementChangeEvent, 'complete' | 'value'>;
  /** Email of the latest change event of the email element; undefined until it reports one */
  email?: string;
  /** `complete` of the latest change event of the email element; undefined until it reports one */
  emailComplete?: boolean;
};

type AddressDefaultValues = NonNullable<StripeAddressElementOptions['defaultValues']>;

/**
 * Prefill values of an Address Element. The address is left out without a country, which the Address Element requires.
 */
const toAddressDefaultValues = (details: { name?: string; phone?: string; address?: PaymentSheetAddress }): AddressDefaultValues => {
  const { name, phone, address } = details;
  const country = address?.country;

  return compact({ name, phone, address: country == null || country === '' ? undefined : { ...toStripeAddress(address), country } });
};

const isBlank = (value: string | undefined): value is '' | undefined => value == null || value === '';

/**
 * Loose email check, used only when the email element has not told whether its value is complete (a prefilled value nobody edited)
 */
const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * Error for a `never` field without a default value. Thrown while loading so that Stripe never rejects the confirmation.
 */
const missingDefaultError = (field: string, defaultKey: string) =>
  new Error(`<stripe-payment-sheet>: billingDetailsCollectionConfiguration.${field} is 'never', so defaultBillingDetails.${defaultKey} is required`);

/**
 * Error the customer can fix in the open sheet (handled like a Stripe `validation_error`).
 * Its message is an English i18n key, translated when it is shown (see `isSheetValidationError`).
 */
const validationError = (message: string) => Object.assign(new Error(message), { type: 'validation_error' as const, sheetValidation: true as const });

/**
 * Tell whether an error was raised by this sheet's own validation (its message is an i18n key), rather than by Stripe (already localized).
 * @param error - Error thrown while confirming
 */
export const isSheetValidationError = (error: unknown): boolean => (error as { sheetValidation?: unknown } | null)?.sheetValidation === true;

/**
 * Decide which extra elements to show and which billing details to pass at confirmation (PaymentIntent / SetupIntent mode).
 * @param options - Payment sheet options
 * @param intentKind - Kind of the intent being confirmed
 * @throws Error when a `never` field has no value in `defaultBillingDetails`
 */
export const planBillingDetailsCollection = (options: PaymentSheetOptions | undefined, intentKind: IntentKind): BillingDetailsCollectionPlan => {
  const config = options?.billingDetailsCollectionConfiguration ?? {};
  const defaults = options?.defaultBillingDetails ?? {};
  const fixedBillingDetails: ConfirmBillingDetails = {};

  (['email', 'name', 'phone'] as const).forEach(field => {
    if (config[field] !== 'never') {
      return;
    }

    if (isBlank(defaults[field])) {
      throw missingDefaultError(field, field);
    }

    fixedBillingDetails[field] = defaults[field];
  });

  if (config.address === 'never') {
    const address = defaults.address;

    if (address == null || isBlank(address.country)) {
      throw missingDefaultError('address', 'address.country');
    }

    // Every key is passed: the Payment Element does not collect any part of the address
    fixedBillingDetails.address = {
      line1: address.line1 ?? '',
      line2: address.line2 ?? '',
      city: address.city ?? '',
      state: address.state ?? '',
      postal_code: address.postalCode ?? '',
      country: address.country,
    };
  }

  const collectPhoneFromAddress = config.address === 'full' && config.phone === 'always';
  const plan: BillingDetailsCollectionPlan = { fixedBillingDetails, collectPhoneFromAddress };

  if (config.address === 'full') {
    const billingAddressElement: StripeAddressElementOptions = { mode: 'billing', defaultValues: toAddressDefaultValues(defaults) };

    if (collectPhoneFromAddress) {
      billingAddressElement.fields = { phone: 'always' };
      billingAddressElement.validation = { phone: { required: 'always' } };
    } else if (config.phone === 'never') {
      billingAddressElement.fields = { phone: 'never' };
    }

    plan.billingAddressElement = billingAddressElement;
  }

  if (config.email === 'always') {
    plan.emailElement = isBlank(defaults.email) ? {} : { defaultValues: { email: defaults.email } };
  }

  const shippingDetails = options?.shippingDetails;

  if (shippingDetails != null && intentKind === 'payment') {
    const shippingAddressElement: StripeAddressElementOptions = { mode: 'shipping', defaultValues: toAddressDefaultValues(shippingDetails) };

    // The Address Element hides the phone field by default; show it so that the given phone is kept and editable
    if (!isBlank(shippingDetails.phone)) {
      shippingAddressElement.fields = { phone: 'always' };
    }

    plan.shippingAddressElement = shippingAddressElement;
  }

  return plan;
};

/**
 * Build `payment_method_data.billing_details` for the confirmation.
 * Values fixed by a `never` field win over the values typed into the extra elements.
 * @param plan - Result of `planBillingDetailsCollection`
 * @param collected - Values read from the extra elements
 * @returns The billing details, or undefined when nothing has to be passed
 * @throws Error with `type: 'validation_error'` when an extra element is not complete
 */
export const collectedBillingDetails = (plan: BillingDetailsCollectionPlan, collected: CollectedDetails): ConfirmBillingDetails | undefined => {
  const details: ConfirmBillingDetails = {};

  if (plan.billingAddressElement != null) {
    const billingAddress = collected.billingAddress;

    if (billingAddress == null || !billingAddress.complete) {
      throw validationError('Please complete your billing address.');
    }

    details.name = billingAddress.value.name;
    details.address = billingAddress.value.address;

    if (plan.collectPhoneFromAddress) {
      details.phone = billingAddress.value.phone;
    }
  }

  if (plan.emailElement != null) {
    // Before any change event the element shows its prefilled value
    const email = collected.email ?? plan.emailElement.defaultValues?.email;

    if (isBlank(email)) {
      throw validationError('Please enter your email address.');
    }

    if (collected.emailComplete === false || (collected.emailComplete == null && !looksLikeEmail(email))) {
      throw validationError('Please enter a valid email address.');
    }

    details.email = email;
  }

  Object.assign(details, plan.fixedBillingDetails);

  return Object.keys(details).length === 0 ? undefined : details;
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
