import type {
  StripeCheckoutConfirmResult,
  StripeCheckoutElementsOptions,
  StripeCheckoutElementsSdk,
  StripeCheckoutPaymentElementOptions,
  StripeCheckoutStatus,
} from '@stripe/stripe-js';
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
 * Throw when the session can no longer be paid. Stripe documents an `expired` session as "No further processing will occur",
 * and a `complete` one is already paid or being paid, so confirming again cannot succeed.
 * @param status - `session.status` from `getSession()`; undefined when it cannot be read
 * @param message - Message of the confirm error, if any
 * @throws StripeAPIError of type `invalid_request_error` (unrecoverable), with the code `checkout_session_expired` or `checkout_session_complete`
 */
const assertSessionOpen = (status: StripeCheckoutStatus | undefined, message?: string) => {
  if (status == null || status.type === 'open') {
    return;
  }

  throw new StripeAPIError({
    type: 'invalid_request_error',
    code: `checkout_session_${status.type}`,
    message: message ?? `The Checkout Session is ${status.type} and can no longer be paid.`,
  });
};

/**
 * Confirm a Checkout Session from the payment sheet.
 *
 * Unlike the default of `confirm`, which always redirects to `returnUrl`, this passes `redirect: 'if_required'`
 * so that payment methods without a redirect finish in the page and can be reported as `paymentSheetCompleted`.
 *
 * Errors are thrown as `StripeAPIError` with a `type` that `isRecoverableConfirmError` understands.
 * A confirm error only carries `code: 'paymentFailed'` or `code: null` (`StripeCheckoutConfirmResult` in @stripe/stripe-js),
 * so whether the session can still be paid is read from `session.status`:
 * - session `expired` or `complete` (before confirming or after a failed confirm): `invalid_request_error`, which ends the sheet
 * - `paymentFailed` on an open session (a decline): `card_error`, which keeps the sheet open
 * - any other confirm error on an open session, or a failure to load the actions: `api_error`, which keeps the sheet open
 * @param checkout - The Checkout instance from `initCheckoutElementsSdk`
 * @param returnUrl - Where Stripe redirects after a redirect-based payment method
 * @param email - Customer email; needed when the session was created without `customer_email` or `customer`
 * @returns The confirmation result
 * @throws StripeAPIError when the actions cannot be loaded, the session can no longer be paid, or the confirmation fails
 */
export const confirmCheckoutSessionSheet = async (checkout: StripeCheckoutElementsSdk, returnUrl: string, email?: string): Promise<StripeCheckoutConfirmResult> => {
  const loadActionsResult = await checkout.loadActions();

  if (loadActionsResult.type === 'error') {
    throw new StripeAPIError({ type: 'api_error', code: 'checkout_session_error', message: loadActionsResult.error.message });
  }

  const { actions } = loadActionsResult;
  const sessionStatus = () => actions.getSession?.()?.status;

  assertSessionOpen(sessionStatus());

  const result = await actions.confirm({ returnUrl, redirect: 'if_required', ...(email != null && email !== '' ? { email } : {}) });

  if (result.type === 'error') {
    const { code, message } = result.error;

    assertSessionOpen(sessionStatus(), message);

    if (code === 'paymentFailed') {
      throw new StripeAPIError({ type: 'card_error', code, message });
    }

    throw new StripeAPIError({ type: 'api_error', code: 'checkout_session_error', message });
  }

  return result;
};
