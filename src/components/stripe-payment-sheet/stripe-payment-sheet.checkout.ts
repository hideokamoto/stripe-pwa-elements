import type {
  StripeCheckoutAddress,
  StripeCheckoutConfirmResult,
  StripeCheckoutContact,
  StripeCheckoutElementsOptions,
  StripeCheckoutElementsSdk,
  StripeCheckoutElementsSdkOptions,
  StripeCheckoutPaymentElementOptions,
} from '@stripe/stripe-js';
import { confirmCheckoutActions } from '../../utils/checkout-confirm';
import { toAppearance, toPaymentElementOptions } from './stripe-payment-sheet.helpers';
import type { PaymentSheetOptions } from './stripe-payment-sheet.helpers';

/**
 * Build the Checkout Payment Element options from the payment sheet options.
 * The Checkout Payment Element takes fewer options than the regular one: `business` and `defaultValues` are not
 * available, so only the layout is passed.
 * @param options - Payment sheet options
 */
export const toCheckoutPaymentElementOptions = (options: PaymentSheetOptions | undefined): StripeCheckoutPaymentElementOptions => {
  const { layout } = toPaymentElementOptions(options);

  return layout == null ? {} : { layout };
};

type CheckoutDefaultValues = NonNullable<StripeCheckoutElementsSdkOptions['defaultValues']>;

/**
 * Drop keys whose value is undefined.
 */
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

/**
 * Build the `defaultValues` passed to `initCheckoutElementsSdk` from the payment sheet options.
 * The email and phone prefill the Checkout Elements; name and address are passed as `billingAddress`,
 * which Stripe only accepts with a country, so a name or address without `country` cannot be prefilled.
 * @param options - Payment sheet options
 */
export const toCheckoutDefaultValues = (options: PaymentSheetOptions | undefined): CheckoutDefaultValues | undefined => {
  const details = options?.defaultBillingDetails;

  if (details == null) {
    return undefined;
  }

  const values: CheckoutDefaultValues = {};

  if (details.email != null && details.email !== '') {
    values.email = details.email;
  }

  if (details.phone != null && details.phone !== '') {
    values.phoneNumber = details.phone;
  }

  const country = details.address?.country;

  if (country != null && country !== '') {
    const address = details.address;
    const checkoutAddress: StripeCheckoutAddress = compact({
      country,
      line1: address?.line1,
      line2: address?.line2,
      city: address?.city,
      postal_code: address?.postalCode,
      state: address?.state,
    });
    const contact: StripeCheckoutContact = { name: details.name ?? null, address: checkoutAddress };

    values.billingAddress = contact;
  }

  return Object.keys(values).length === 0 ? undefined : values;
};

/**
 * List the given options that a Checkout Session does not use, sorted by name.
 * Name and address are prefilled through `defaultValues`, which Stripe only accepts with a country, so they are
 * listed when they cannot be used. The email is passed to `confirm` and the phone prefilled through `defaultValues`.
 * @param options - Payment sheet options
 */
export const checkoutIgnoredOptionKeys = (options: PaymentSheetOptions | undefined): string[] => {
  if (options == null) {
    return [];
  }

  const { merchantDisplayName, defaultBillingDetails } = options;
  const keys: string[] = [];
  const country = defaultBillingDetails?.address?.country;

  if ((defaultBillingDetails?.name != null || defaultBillingDetails?.address != null) && (country == null || country === '')) {
    for (const key of ['name', 'address'] as const) {
      if (defaultBillingDetails?.[key] != null) {
        keys.push(`defaultBillingDetails.${key}`);
      }
    }
  }

  if (merchantDisplayName != null) {
    keys.push('merchantDisplayName');
  }

  // The extra billing elements and the wallet mapping are implemented for PaymentIntent / SetupIntent mode only
  (['billingDetailsCollectionConfiguration', 'shippingDetails', 'enableApplePay', 'enableGooglePay'] as const)
    .filter(key => options[key] !== undefined)
    .forEach(key => keys.push(key));

  return keys.sort();
};

/**
 * Build the `elementsOptions` passed to `initCheckoutElementsSdk` from the payment sheet options.
 * @param options - Payment sheet options
 */
export const toCheckoutElementsOptions = (options: PaymentSheetOptions | undefined): StripeCheckoutElementsOptions | undefined => {
  const appearance = toAppearance(options?.style);

  return appearance == null ? undefined : { appearance };
};

/**
 * Confirm a Checkout Session from the payment sheet.
 *
 * The shared implementation (see `confirmCheckoutActions`) retries without `returnUrl` when the session was
 * created with `return_url`, and passes `redirect: 'if_required'` so that payment methods without a redirect
 * finish in the page and can be reported as `paymentSheetCompleted`.
 *
 * Errors are thrown as `StripeAPIError` with a `type` that `isRecoverableConfirmError` understands:
 * an expired or complete session is an `invalid_request_error` (unrecoverable), a decline is a `card_error`,
 * and any other failure is an `api_error` (both recoverable).
 * @param checkout - The Checkout instance from `initCheckoutElementsSdk`
 * @param returnUrl - Where Stripe redirects after a redirect-based payment method, when the session has no `return_url`
 * @param email - Customer email; needed when the session was created without `customer_email` or `customer`
 * @returns The confirmation result
 * @throws StripeAPIError when the actions cannot be loaded, the session can no longer be paid, or the confirmation fails
 */
export const confirmCheckoutSessionSheet = async (checkout: StripeCheckoutElementsSdk, returnUrl: string, email?: string): Promise<StripeCheckoutConfirmResult> =>
  confirmCheckoutActions(checkout, returnUrl, email);
