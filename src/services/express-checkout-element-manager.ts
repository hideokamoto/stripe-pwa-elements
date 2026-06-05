import type { IExpressCheckoutElementManager, IStripeService, ExpressCheckoutElementOptions, ExpressCheckoutElementState, ExpressCheckoutElementEventHandlers } from './interfaces';
import { StripeExpressCheckoutElement } from '@stripe/stripe-js';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';

/**
 * Express Checkout Element Manager
 * Manages Stripe Express Checkout Element
 * with dependency injection of StripeService
 */
export class ExpressCheckoutElementManager implements IExpressCheckoutElementManager {
  private expressCheckoutElement?: StripeExpressCheckoutElement;
  private store = createStore<ExpressCheckoutElementState>({
    errorMessage: '',
    isReady: false,
  });

  /**
   * Constructor with dependency injection
   * @param stripeService - Injected Stripe service instance
   */
  constructor(private stripeService: IStripeService) {}

  /**
   * Get current express checkout element state (reactive)
   */
  getState(): ExpressCheckoutElementState {
    return this.store.state;
  }

  /**
   * Initialize and mount express checkout element to DOM
   * @param containerElement - Parent element containing mount point
   * @param options - Express Checkout Element configuration options
   * @param eventHandlers - Event handlers for element events
   * @returns Promise resolving to express checkout element instance
   */
  async initialize(
    containerElement: HTMLElement,
    options: ExpressCheckoutElementOptions,
    eventHandlers?: ExpressCheckoutElementEventHandlers,
  ): Promise<StripeExpressCheckoutElement> {
    const elements = this.stripeService.getElements();

    if (elements == null) {
      throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
    }

    // Unmount if already initialized
    if (this.expressCheckoutElement != null) {
      this.unmount();
    }

    // Convert buttonHeight from string to number if present
    const createOptions: any = { ...options };

    if (createOptions.buttonHeight && typeof createOptions.buttonHeight === 'string') {
      const height = parseInt(createOptions.buttonHeight.replace('px', ''), 10);

      if (!isNaN(height)) {
        createOptions.buttonHeight = height;
      }
    }

    // Create express checkout element
    // Note: 'expressCheckout' is not yet in the official Stripe type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expressCheckout = elements.create('expressCheckout' as any, createOptions as any) as unknown as StripeExpressCheckoutElement;

    // Find the mount point
    const mountPoint = await findElement(containerElement, '#express-checkout-element');

    // Set up event handlers before mounting
    if (eventHandlers?.onConfirm != null) {
      expressCheckout.on('confirm', eventHandlers.onConfirm);
    }

    if (eventHandlers?.onClick != null) {
      expressCheckout.on('click', eventHandlers.onClick);
    }

    if (eventHandlers?.onCancel != null) {
      expressCheckout.on('cancel', eventHandlers.onCancel);
    }

    if (eventHandlers?.onShippingAddressChange != null) {
      expressCheckout.on('shippingaddresschange', eventHandlers.onShippingAddressChange);
    }

    if (eventHandlers?.onShippingRateChange != null) {
      expressCheckout.on('shippingratechange', eventHandlers.onShippingRateChange);
    }

    // Add ready event handler
    expressCheckout.on('ready', () => {
      this.store.set('isReady', true);
    });

    // Mount the element
    expressCheckout.mount(mountPoint);

    this.expressCheckoutElement = expressCheckout;

    return this.expressCheckoutElement;
  }

  /**
   * Get mounted express checkout element instance
   */
  getElement(): StripeExpressCheckoutElement | undefined {
    return this.expressCheckoutElement;
  }

  /**
   * Update element options dynamically
   * @param options - Partial options to update
   */
  update(options: Partial<ExpressCheckoutElementOptions>): void {
    if (this.expressCheckoutElement == null) {
      console.warn('Express Checkout Element not initialized. Cannot update options.');
      return;
    }

    // Convert buttonHeight from string to number if present
    const updateOptions: any = { ...options };

    if (updateOptions.buttonHeight && typeof updateOptions.buttonHeight === 'string') {
      const height = parseInt(updateOptions.buttonHeight.replace('px', ''), 10);

      if (!isNaN(height)) {
        updateOptions.buttonHeight = height;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.expressCheckoutElement.update(updateOptions as any);
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
   * Unmount express checkout element
   */
  unmount(): void {
    if (this.expressCheckoutElement == null) {
      return;
    }

    this.expressCheckoutElement.unmount();
    this.expressCheckoutElement = undefined;
    this.store.set('isReady', false);
  }
}
