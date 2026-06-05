import type { Stripe, StripeElements, StripeCheckout, StripeCheckoutConfirmResult } from '@stripe/stripe-js';
import type { IntentType, ProgressStatus } from '../../interfaces';
import { StripeAPIError } from '../../utils/error';
import type { PaymentElementSubmitEvent } from './stripe-payment-element';

/**
 * Determine whether the submit button should be disabled.
 * For Checkout Session mode: the checkout is ready once Stripe finished loading.
 * For Payment Intent / Setup Intent mode: an intent client secret must be present.
 * @param params progress / loading state and the current mode information
 * @returns true when the submit button should be disabled
 */
export const isSubmitButtonDisabled = (params: {
  progress: ProgressStatus;
  isCheckoutSession: boolean;
  loadStripeStatus: ProgressStatus;
  intentClientSecret?: string;
}): boolean => {
  const { progress, isCheckoutSession, loadStripeStatus, intentClientSecret } = params;
  const hasValidSecret = isCheckoutSession ? loadStripeStatus === 'success' : intentClientSecret != null && intentClientSecret !== '';

  return progress === 'loading' || !hasValidSecret;
};

/**
 * Run the default Stripe confirmation flow for Payment Intent / Setup Intent mode.
 * Calls `confirmPayment` or `confirmSetup` depending on the intent type.
 * @param stripe the loaded Stripe.js instance
 * @param elements the Stripe Elements instance bound to the payment element
 * @param intentType the configured intent type
 * @param returnUrl the URL Stripe should redirect back to when required
 * @returns the confirmation result
 * @throws StripeAPIError when Stripe returns an error
 */
export const confirmPaymentOrSetup = async (stripe: Stripe, elements: StripeElements, intentType: IntentType, returnUrl: string) => {
  const result = await (() => {
    if (intentType === 'payment') {
      return stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });
    }

    return stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    });
  })();

  if (result.error) {
    throw new StripeAPIError(result.error);
  }

  return result;
};

/**
 * Confirm a Checkout Session payment using the checkout actions.
 * @param checkout the Stripe Checkout instance
 * @param returnUrl the URL Stripe should redirect back to when required
 * @returns the confirmation result
 * @throws StripeAPIError when loading actions or confirming fails
 */
export const confirmCheckoutSession = async (checkout: StripeCheckout, returnUrl: string): Promise<StripeCheckoutConfirmResult> => {
  // Load actions from the checkout session
  const loadActionsResult = await checkout.loadActions();

  if (loadActionsResult.type === 'error') {
    // Create a StripeError-compatible object from the Checkout Session error
    const stripeError = {
      type: 'api_error' as const,
      code: loadActionsResult.error.code || 'checkout_session_error',
      message: loadActionsResult.error.message,
    };

    throw new StripeAPIError(stripeError);
  }

  const { actions } = loadActionsResult;

  // Confirm the payment using checkout session actions
  const result = await actions.confirm({
    returnUrl,
    redirect: 'if_required',
  });

  if (result.type === 'error') {
    // Create a StripeError-compatible object from the confirm error
    const stripeError = {
      type: 'card_error' as const,
      code: result.error.code || 'payment_failed',
      message: result.error.message,
      decline_code: result.error.code === 'paymentFailed' ? (result.error as { paymentFailed?: { declineCode?: string } }).paymentFailed?.declineCode : undefined,
    };

    throw new StripeAPIError(stripeError);
  }

  return result;
};

/**
 * Resolve the mode-specific properties for a submit event.
 * Picks the Checkout or Elements payload depending on the active mode and
 * reports a descriptive error string when the required instance is missing.
 * @param params the resolved Stripe instances and client secrets for the current mode
 * @returns the submit event props, or an error message when an instance is missing
 */
export const buildSubmitEventProps = (params: {
  stripe: Stripe;
  isCheckoutSession: boolean;
  checkout?: StripeCheckout;
  checkoutSessionClientSecret?: string;
  elements?: StripeElements;
  intentClientSecret?: string;
}): { props: PaymentElementSubmitEvent } | { error: string } => {
  const { stripe, isCheckoutSession, checkout, checkoutSessionClientSecret, elements, intentClientSecret } = params;

  const props: PaymentElementSubmitEvent = {
    stripe,
  };

  if (isCheckoutSession) {
    // Checkout Session mode
    if (checkout == null) {
      return { error: 'Checkout not properly initialized' };
    }

    props.checkout = checkout;
    props.checkoutSessionClientSecret = checkoutSessionClientSecret;

    return { props };
  }

  // Payment Intent / Setup Intent mode
  if (elements == null) {
    return { error: 'Elements not properly initialized' };
  }

  props.elements = elements;
  props.intentClientSecret = intentClientSecret;

  return { props };
};
