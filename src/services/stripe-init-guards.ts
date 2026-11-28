import type { StripeCheckoutElementsSdk, StripeElements } from '@stripe/stripe-js';
import type { IStripeService } from './interfaces';

export const STRIPE_ELEMENTS_NOT_INITIALIZED_MESSAGE = 'StripeService not initialized. Call StripeService.initialize() first.' as const;

export const STRIPE_CHECKOUT_NOT_INITIALIZED_MESSAGE =
  'StripeService not initialized with Checkout Session. Call StripeService.initializeWithCheckoutSession() first.' as const;

/**
 * Returns mounted Stripe Elements when the service finished Payment Intent (or Elements) initialization.
 * @throws When StripeService has no Elements instance yet.
 */
export function requireStripeElements(stripeService: IStripeService): StripeElements {
  const elements = stripeService.getElements();

  if (elements == null) {
    throw new Error(STRIPE_ELEMENTS_NOT_INITIALIZED_MESSAGE);
  }

  return elements;
}

/**
 * Returns Checkout Elements SDK when the service finished Checkout Session initialization.
 * @throws When StripeService has no Checkout instance yet.
 */
export function requireStripeCheckout(stripeService: IStripeService): StripeCheckoutElementsSdk {
  const checkout = stripeService.getCheckout();

  if (checkout == null) {
    throw new Error(STRIPE_CHECKOUT_NOT_INITIALIZED_MESSAGE);
  }

  return checkout;
}