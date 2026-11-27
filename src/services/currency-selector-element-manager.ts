import type { StripeCurrencySelectorElement, StripeCurrencySelectorElementOptions } from '@stripe/stripe-js';
import type { ICurrencySelectorElementManager, IStripeService, CurrencySelectorElementState } from './interfaces';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';
import { onStripeCurrencySelectorChange } from '../utils/stripe-currency-selector-events';

type CurrencySelectorInitOptions = StripeCurrencySelectorElementOptions & {
  clientSecret?: string;
};

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
   * @param onCurrencyChange - Optional callback when the shopper picks a currency
   * @returns Promise resolving to currency selector element instance
   */
  async initialize(
    containerElement: HTMLElement,
    options?: CurrencySelectorInitOptions,
    onCurrencyChange?: (currency: string) => void,
  ): Promise<StripeCurrencySelectorElement> {
    const elements = this.stripeService.getElements();

    if (elements == null) {
      throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
    }

    if (this.currencySelectorElement != null) {
      this.unmount();
    }

    const currencySelectorElementContainer = await findElement(containerElement, '#currency-selector');

    this.currencySelectorElement = elements.create('currencySelector', options ?? {});

    this.currencySelectorElement.mount(currencySelectorElementContainer);

    onStripeCurrencySelectorChange(this.currencySelectorElement, event => {
      this.store.set('errorMessage', '');

      const currency = event.value?.currency;

      if (currency) {
        this.store.set('selectedCurrency', currency);
        onCurrencyChange?.(currency);
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