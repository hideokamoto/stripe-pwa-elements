import type { IAddressElementManager, IStripeService, AddressElementState } from './interfaces';
import { StripeAddressElement } from '@stripe/stripe-js';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';

/**
 * Address Element Manager
 * Manages Stripe Address Element
 * with dependency injection of StripeService
 */
export class AddressElementManager implements IAddressElementManager {
  private addressElement?: StripeAddressElement;
  private store = createStore<AddressElementState>({
    errorMessage: '',
    isComplete: false,
  });

  /**
   * Constructor with dependency injection
   * @param stripeService - Injected Stripe service instance
   */
  constructor(private stripeService: IStripeService) {}

  /**
   * Get current address element state (reactive)
   */
  getState(): AddressElementState {
    return this.store.state;
  }

  /**
   * Initialize and mount address element to DOM
   * @param containerElement - Parent element containing mount point
   * @param options - Address element options
   * @returns Promise resolving to address element instance
   */
  async initialize(containerElement: HTMLElement, options?: import('@stripe/stripe-js').StripeAddressElementOptions): Promise<StripeAddressElement> {
    const elements = this.stripeService.getElements();

    if (elements == null) {
      throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
    }

    // Unmount if already initialized
    if (this.addressElement != null) {
      this.unmount();
    }

    // Create and mount address element
    this.addressElement = elements.create('address', options || { mode: 'billing' });

    const addressElementContainer = await findElement(containerElement, '#address-element');

    this.addressElement.mount(addressElementContainer);

    // Listen for changes
    this.addressElement.on('change', event => {
      // StripeAddressElementChangeEvent doesn't have an error property
      // Errors are handled through the complete property and validation
      this.store.set('errorMessage', '');
      this.store.set('isComplete', event.complete);
    });

    return this.addressElement;
  }

  /**
   * Get mounted address element instance
   */
  getElement(): StripeAddressElement | undefined {
    return this.addressElement;
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
   * Unmount address element
   */
  unmount(): void {
    if (this.addressElement == null) {
      return;
    }

    this.addressElement.unmount();
    this.addressElement = undefined;
  }
}
