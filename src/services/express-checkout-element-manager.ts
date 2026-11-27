import type {
  StripeElementsUpdateOptions,
  StripeExpressCheckoutElement,
  StripeExpressCheckoutElementOptions,
  StripeExpressCheckoutElementUpdateOptions,
} from '@stripe/stripe-js';
import type { IExpressCheckoutElementManager, IStripeService, ExpressCheckoutElementOptions, ExpressCheckoutElementState, ExpressCheckoutElementEventHandlers } from './interfaces';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';

const parseButtonHeight = (buttonHeight: string | number | undefined): number | undefined => {
  if (buttonHeight == null) {
    return undefined;
  }

  if (typeof buttonHeight === 'number') {
    return buttonHeight;
  }

  const height = parseInt(buttonHeight.replace('px', ''), 10);

  return Number.isNaN(height) ? undefined : height;
};

const toExpressCheckoutCreateOptions = (options: ExpressCheckoutElementOptions): StripeExpressCheckoutElementOptions => {
  const { mode: _mode, amount: _amount, currency: _currency, buttonHeight, ...rest } = options;
  const parsedHeight = parseButtonHeight(buttonHeight);

  return {
    ...rest,
    ...(parsedHeight !== undefined ? { buttonHeight: parsedHeight } : {}),
  } as StripeExpressCheckoutElementOptions;
};

const toExpressCheckoutUpdateOptions = (
  elementOptions: Partial<Omit<ExpressCheckoutElementOptions, 'mode' | 'amount' | 'currency'>>,
): StripeExpressCheckoutElementUpdateOptions | null => {
  const { buttonHeight, ...rest } = elementOptions;
  const parsedHeight = parseButtonHeight(buttonHeight);
  const update: StripeExpressCheckoutElementUpdateOptions = { ...rest };

  if (parsedHeight !== undefined) {
    update.buttonHeight = parsedHeight;
  }

  return Object.keys(update).length > 0 ? update : null;
};

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

    if (this.expressCheckoutElement != null) {
      this.unmount();
    }

    const createOptions = toExpressCheckoutCreateOptions(options);
    const expressCheckout = elements.create('expressCheckout', createOptions);

    const mountPoint = await findElement(containerElement, '#express-checkout-element');

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

    expressCheckout.on('ready', () => {
      this.store.set('isReady', true);
    });

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

    const { mode, amount, currency, ...elementOptions } = options;
    const groupOptions: StripeElementsUpdateOptions = {};

    if (mode !== undefined) {
      groupOptions.mode = mode;
    }

    if (amount !== undefined) {
      groupOptions.amount = amount;
    }

    if (currency !== undefined) {
      groupOptions.currency = currency;
    }

    if (Object.keys(groupOptions).length > 0) {
      this.stripeService.getElements()?.update(groupOptions);
    }

    const updateOptions = toExpressCheckoutUpdateOptions(elementOptions);

    if (updateOptions == null) {
      return;
    }

    this.expressCheckoutElement.update(updateOptions);
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