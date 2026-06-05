import type { Stripe, StripeCardNumberElement, PaymentIntentResult, SetupIntentResult } from '@stripe/stripe-js';
import { IntentType, InitStripeOptions, PaymentRequestButtonOption } from '../../interfaces';

/**
 * Build the `InitStripeOptions` object from an optional connected-account id.
 * Returns `undefined` when no account is provided, mirroring the behavior
 * expected by `initStripe` (so the second argument can be omitted entirely).
 * @param stripeAccount Optional connected-account id
 * @returns InitStripeOptions when an account id exists, otherwise undefined
 */
export const buildInitStripeOptionsFromAccount = (stripeAccount?: string): InitStripeOptions | undefined => {
  const options: InitStripeOptions = {};

  if (stripeAccount != null && stripeAccount !== '') {
    options.stripeAccount = stripeAccount;
  }

  return Object.keys(options).length > 0 ? options : undefined;
};

/**
 * Confirm a Stripe card intent, dispatching to `confirmCardPayment` or
 * `confirmCardSetup` based on the configured intent type.
 * @param stripe The loaded Stripe.js instance
 * @param intentType Whether this is a payment or setup intent
 * @param intentClientSecret The client secret of the intent to confirm
 * @param cardNumberElement The Stripe card number element to confirm with
 * @returns The PaymentIntent or SetupIntent confirmation result
 */
export const confirmCardIntent = (
  stripe: Stripe,
  intentType: IntentType,
  intentClientSecret: string,
  cardNumberElement: StripeCardNumberElement,
): Promise<PaymentIntentResult | SetupIntentResult> => {
  if (intentType === 'payment') {
    return stripe.confirmCardPayment(intentClientSecret, {
      payment_method: {
        card: cardNumberElement,
      },
    });
  }

  return stripe.confirmCardSetup(intentClientSecret, {
    payment_method: {
      card: cardNumberElement,
    },
  });
};

/**
 * Wire up the optional payment-request handlers onto a freshly created
 * `<stripe-payment-request-button>` element. Only handlers that are provided
 * on the option object are attached, preserving the original behavior.
 * @param element The payment-request-button custom element instance
 * @param option The payment request button option (handlers + config)
 * @returns void
 */
export const attachPaymentRequestHandlers = (element: HTMLStripePaymentRequestButtonElement, option: PaymentRequestButtonOption): void => {
  const { paymentRequestPaymentMethodHandler, paymentRequestShippingOptionChangeHandler, paymentRequestShippingAddressChangeHandler } = option;

  element.setPaymentRequestOption(option);

  if (paymentRequestPaymentMethodHandler != null) {
    element.setPaymentMethodEventHandler(paymentRequestPaymentMethodHandler);
  }

  if (paymentRequestShippingOptionChangeHandler != null) {
    element.setPaymentRequestShippingOptionEventHandler(paymentRequestShippingOptionChangeHandler);
  }

  if (paymentRequestShippingAddressChangeHandler != null) {
    element.setPaymentRequestShippingAddressEventHandler(paymentRequestShippingAddressChangeHandler);
  }
};
