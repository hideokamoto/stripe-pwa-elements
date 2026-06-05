import type { IPaymentElementManager, IStripeService, PaymentElementState } from './interfaces';
import { createStore } from '@stencil/store';
import type { StripePaymentElement, StripePaymentElementOptions, StripeCheckoutPaymentElementOptions } from '@stripe/stripe-js';
import { findElement } from '../utils/element-finder';

/**
 * Payment Element Manager
 * Manages Stripe Payment Element (unified payment form)
 * with dependency injection of StripeService
 * Supports both Payment Intent mode and Checkout Session mode
 */
export class PaymentElementManager implements IPaymentElementManager {
  private paymentElement?: StripePaymentElement;
  private store = createStore<PaymentElementState>({
    errorMessage: '',
  });

  /**
   * Constructor with dependency injection
   * @param stripeService - Injected Stripe service instance
   */
  constructor(private stripeService: IStripeService) {}

  /**
   * Get current payment element state (reactive)
   */
  getState(): PaymentElementState {
    return this.store.state;
  }

  /**
   * Initialize and mount payment element to DOM
   * Supports both Payment Intent mode and Checkout Session mode
   * @param containerElement - Parent element containing mount point
   * @param options - Optional payment element options
   * @returns Promise resolving to payment element instance
   */
  async initialize(containerElement: HTMLElement, options?: StripePaymentElementOptions | StripeCheckoutPaymentElementOptions): Promise<StripePaymentElement> {
    const isCheckoutSession = this.stripeService.state.isCheckoutSession;

    // Unmount if already initialized
    if (this.paymentElement != null) {
      this.unmount();
    }

    if (isCheckoutSession) {
      // Checkout Session mode: use checkout.createPaymentElement()
      const checkout = this.stripeService.getCheckout();

      if (checkout == null) {
        throw new Error('StripeService not initialized with Checkout Session. Call StripeService.initializeWithCheckoutSession() first.');
      }

      // Create payment element using Checkout instance
      this.paymentElement = checkout.createPaymentElement(options as StripeCheckoutPaymentElementOptions);
    } else {
      // Payment Intent mode: use elements.create('payment')
      const elements = this.stripeService.getElements();

      if (elements == null) {
        throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
      }

      // Create payment element with options
      const elementOptions: StripePaymentElementOptions = options as StripePaymentElementOptions || {};

      // Create the payment element
      this.paymentElement = elements.create('payment', elementOptions);
    }

    // Find mount point and mount
    const paymentElementContainer = await findElement(containerElement, '#payment-element');

    this.paymentElement.mount(paymentElementContainer);

    // Note: Payment Element errors are handled during submission
    // Use setError() method to manually set errors if needed

    return this.paymentElement;
  }

  /**
   * Get mounted payment element instance
   */
  getElement(): StripePaymentElement | undefined {
    return this.paymentElement;
  }

  /**
   * Set error message (triggers reactivity)
   */
  setError(message: string): void {
    this.store.set('errorMessage', message);
  }

  /**
   * Clear error message (triggers reactivity)
   */
  clearError(): void {
    this.store.set('errorMessage', '');
  }

  /**
   * Unmount payment element
   */
  unmount(): void {
    if (this.paymentElement == null) {
      return;
    }

    this.paymentElement.unmount();
    this.paymentElement = undefined;
  }
}
