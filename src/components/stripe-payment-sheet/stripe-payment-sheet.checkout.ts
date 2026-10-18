import type { StripeCheckoutConfirmResult, StripeCheckoutElementsOptions, StripeCheckoutElementsSdk, StripeCheckoutPaymentElementOptions } from '@stripe/stripe-js';
import { StripeAPIError } from '../../utils/error';
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

/**
 * List the given options that a Checkout Session does not use, sorted by name.
 * Name, phone and address come from the session or from other Checkout elements; the email is passed to `confirm`.
 * @param options - Payment sheet options
 */
export const checkoutIgnoredOptionKeys = (options: PaymentSheetOptions | undefined): string[] => {
  if (options == null) {
    return [];
  }

  const { merchantDisplayName, defaultBillingDetails } = options;
  const keys = (['name', 'phone', 'address'] as const).filter(key => defaultBillingDetails?.[key] != null).map(key => `defaultBillingDetails.${key}`);

  if (merchantDisplayName != null) {
    keys.push('merchantDisplayName');
  }

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
 * Unlike the default of `confirm`, which always redirects to `returnUrl`, this passes `redirect: 'if_required'`
 * so that payment methods without a redirect finish in the page and can be reported as `paymentSheetCompleted`.
 *
 * Errors are thrown as `StripeAPIError` with a `type` that `isRecoverableConfirmError` understands.
 * The Checkout errors do not tell whether the session can still be paid, so all of them keep the sheet open:
 * `paymentFailed` becomes `card_error`, any other confirm error or a failure to load the actions becomes `api_error`.
 * @param checkout - The Checkout instance from `initCheckoutElementsSdk`
 * @param returnUrl - Where Stripe redirects after a redirect-based payment method
 * @param email - Customer email; needed when the session was created without `customer_email` or `customer`
 * @returns The confirmation result
 * @throws StripeAPIError when the actions cannot be loaded or the confirmation fails
 */
export const confirmCheckoutSessionSheet = async (checkout: StripeCheckoutElementsSdk, returnUrl: string, email?: string): Promise<StripeCheckoutConfirmResult> => {
  const loadActionsResult = await checkout.loadActions();

  if (loadActionsResult.type === 'error') {
    throw new StripeAPIError({ type: 'api_error', code: 'checkout_session_error', message: loadActionsResult.error.message });
  }

  const result = await loadActionsResult.actions.confirm({ returnUrl, redirect: 'if_required', ...(email != null && email !== '' ? { email } : {}) });

  if (result.type === 'error') {
    const { code, message } = result.error;

    if (code === 'paymentFailed') {
      throw new StripeAPIError({ type: 'card_error', code, message });
    }

    throw new StripeAPIError({ type: 'api_error', code: 'checkout_session_error', message });
  }

  return result;
};
