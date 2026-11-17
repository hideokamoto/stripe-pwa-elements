import type { StripeCheckoutConfirmResult, StripeCheckoutElementsSdk, StripeCheckoutStatus } from '@stripe/stripe-js';
import { StripeAPIError } from './error';

/**
 * Whether a confirm failure means the session was created with `return_url`, which rejects `returnUrl`.
 * Stripe raises this before any payment processing, so retrying without `returnUrl` is safe.
 * `actions.confirm()` reports it both as a thrown `IntegrationError` and as an error result depending on the SDK version.
 * @param error - Error thrown by `actions.confirm()` or the error of its result
 */
export const isCheckoutReturnUrlConflict = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : (error as { message?: string } | null | undefined)?.message;

  return typeof message === 'string' && message.includes('cannot provide `returnUrl`');
};

/**
 * Throw when the session can no longer be paid. Stripe documents an `expired` session as "No further processing will occur",
 * and a `complete` one is already paid or being paid, so confirming again cannot succeed.
 * @param status - `session.status` from `getSession()`; undefined when it cannot be read
 * @param message - Message of the confirm error, if any
 * @throws StripeAPIError of type `invalid_request_error` (unrecoverable), with the code `checkout_session_expired` or `checkout_session_complete`
 */
export const assertCheckoutSessionOpen = (status: StripeCheckoutStatus | undefined, message?: string) => {
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
 * Confirm a Checkout Session through the checkout actions.
 *
 * Stripe requires exactly one of `returnUrl` (confirm argument) or the session's `return_url`, and the client
 * cannot tell which one a session has (`getSession()` does not expose it). So the first attempt passes
 * `returnUrl`, and when Stripe rejects it because the session already has `return_url`, the confirmation is
 * retried without `returnUrl` (Stripe then redirects to the session's `return_url` automatically).
 *
 * Errors are thrown as `StripeAPIError`:
 * - session `expired` or `complete` (before confirming or after a failed confirm): `invalid_request_error`
 * - `paymentFailed` on an open session (a decline): `card_error`
 * - any other confirm error on an open session, or a failure to load the actions: `api_error`
 * @param checkout - The Checkout instance from `initCheckoutElementsSdk`
 * @param returnUrl - Where Stripe redirects after a redirect-based payment method, when the session has no `return_url`
 * @param email - Customer email; needed when the session was created without `customer_email` or `customer`
 * @returns The confirmation result
 * @throws StripeAPIError when the actions cannot be loaded, the session can no longer be paid, or the confirmation fails
 */
export const confirmCheckoutActions = async (checkout: StripeCheckoutElementsSdk, returnUrl: string, email?: string): Promise<StripeCheckoutConfirmResult> => {
  const loadActionsResult = await checkout.loadActions();

  if (loadActionsResult.type === 'error') {
    throw new StripeAPIError({
      type: 'api_error',
      code: 'checkout_session_error',
      message: loadActionsResult.error.message,
    });
  }

  const { actions } = loadActionsResult;
  const sessionStatus = () => actions.getSession?.()?.status;

  assertCheckoutSessionOpen(sessionStatus());

  const confirmWith = (withReturnUrl: boolean) =>
    actions.confirm({
      redirect: 'if_required',
      ...(withReturnUrl && returnUrl !== '' ? { returnUrl } : {}),
      ...(email != null && email !== '' ? { email } : {}),
    });

  // First attempt with returnUrl; a session created with `return_url` rejects it before processing.
  // The rejection can arrive either as a thrown error or as an error result, so both are retried without it.
  let result: StripeCheckoutConfirmResult;

  try {
    result = await confirmWith(true);

    if (result.type === 'error' && isCheckoutReturnUrlConflict(result.error)) {
      result = await confirmWith(false);
    }
  } catch (e) {
    if (!isCheckoutReturnUrlConflict(e)) {
      throw e;
    }

    result = await confirmWith(false);
  }

  if (result.type === 'error') {
    const { code, message } = result.error;

    assertCheckoutSessionOpen(sessionStatus(), message);

    if (code === 'paymentFailed') {
      throw new StripeAPIError({ type: 'card_error', code, message });
    }

    throw new StripeAPIError({ type: 'api_error', code: 'checkout_session_error', message });
  }

  return result;
};
