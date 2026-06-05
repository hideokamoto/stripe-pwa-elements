import type { ICurrencySelectorElementManager, IStripeService, CurrencySelectorElementState } from './interfaces';
import { StripeCurrencySelectorElement } from '@stripe/stripe-js';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';

/**
 * Currency Selector Element Manager
 * Manages Stripe Currency Selector Element
 * with dependency injection of StripeService
 */
export class CurrencySelectorElementManager implements ICurrencySelectorElementManager {
  private currencySelectorElement?: StripeCurrencySelectorElement;
  private store = createStore<CurrencySelectorElementState>({
    errorMessage: '',
    selectedCurrency: undefined,
  });

  /**
   * Constructor with dependency injection
   * @param stripeService - Injected Stripe service instance
   */
  constructor(private stripeService: IStripeService) {}

  /**
   * Get current currency selector element state (reactive)
   */
  getState(): CurrencySelectorElementState {
    return this.store.state;
  }

  /**
   * Initialize and mount currency selector element to DOM
   * @param containerElement - Parent element containing mount point
   * @param options - Currency selector element options
   * @returns Promise resolving to currency selector element instance
   * Note: StripeCurrencySelectorElementOptions is not yet exported in @stripe/stripe-js v8.6.0
   */
  async initialize(containerElement: HTMLElement, options?: any): Promise<StripeCurrencySelectorElement> {
    const elements = this.stripeService.getElements();

    if (elements == null) {
      throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
    }

    // Unmount if already initialized
    if (this.currencySelectorElement != null) {
      this.unmount();
    }

    // Find mount point first to avoid element leak if findElement throws
    const currencySelectorElementContainer = await findElement(containerElement, '#currency-selector');

    // Create and mount currency selector element
    // Note: 'currencySelector' type is not yet in @stripe/stripe-js v8.6.0 type definitions
    // but is documented in Stripe's Currency Selector Element documentation
    this.currencySelectorElement = (elements as any).create('currencySelector', options || {}) as StripeCurrencySelectorElement;

    this.currencySelectorElement.mount(currencySelectorElementContainer);

    // Listen for changes
    // Note: The 'change' event type is not yet in @stripe/stripe-js type definitions
    // but is documented in Stripe's Currency Selector Element documentation
    (this.currencySelectorElement as any).on('change', (event: any) => {
      // Clear error on change
      this.store.set('errorMessage', '');

      // Update selected currency if available
      if (event?.value?.currency) {
        this.store.set('selectedCurrency', event.value.currency);
      }
    });

    return this.currencySelectorElement;
  }

  /**
   * Get mounted currency selector element instance
   */
  getElement(): StripeCurrencySelectorElement | undefined {
    return this.currencySelectorElement;
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
   * Unmount currency selector element
   */
  unmount(): void {
    if (this.currencySelectorElement == null) {
      return;
    }

    this.currencySelectorElement.unmount();
    this.currencySelectorElement = undefined;
  }
}
