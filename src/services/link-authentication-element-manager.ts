import type { ILinkAuthenticationElementManager, IStripeService, LinkAuthenticationElementState } from './interfaces';
import type { StripeLinkAuthenticationElement, StripeLinkAuthenticationElementOptions } from '@stripe/stripe-js';
import { createStore } from '@stencil/store';
import { findElement } from '../utils/element-finder';

/**
 * Link Authentication Element Manager
 * Manages Stripe Link Authentication Element for email collection and Link authentication
 * with dependency injection of StripeService
 */
export class LinkAuthenticationElementManager implements ILinkAuthenticationElementManager {
  private linkAuthenticationElement?: StripeLinkAuthenticationElement;
  private store = createStore<LinkAuthenticationElementState>({
    errorMessage: '',
    email: undefined,
  });

  /**
   * Constructor with dependency injection
   * @param stripeService - Injected Stripe service instance
   */
  constructor(private stripeService: IStripeService) {}

  /**
   * Get current link authentication element state (reactive)
   */
  getState(): LinkAuthenticationElementState {
    return this.store.state;
  }

  /**
   * Register state change listener
   * @param key - State property to watch
   * @param callback - Callback function invoked when property changes
   * @returns Unsubscribe function
   */
  onChange<K extends keyof LinkAuthenticationElementState>(key: K, callback: (newValue: LinkAuthenticationElementState[K]) => void): () => void {
    return this.store.onChange(key, callback);
  }

  /**
   * Initialize and mount link authentication element to DOM
   * @param containerElement - Parent element containing mount point
   * @param options - Optional configuration for Link Authentication Element
   * @returns Promise resolving to link authentication element instance
   */
  async initialize(containerElement: HTMLElement, options?: StripeLinkAuthenticationElementOptions): Promise<StripeLinkAuthenticationElement> {
    const elements = this.stripeService.getElements();

    if (elements == null) {
      throw new Error('StripeService not initialized. Call StripeService.initialize() first.');
    }

    // Unmount if already initialized
    if (this.linkAuthenticationElement != null) {
      this.unmount();
    }

    // Create link authentication element
    const linkAuthentication = elements.create('linkAuthentication', options);
    const linkAuthenticationElementDiv = await findElement(containerElement, '#link-authentication-element');

    linkAuthentication.mount(linkAuthenticationElementDiv);

    // Listen for change events
    linkAuthentication.on('change', event => {
      // Unconditionally set email from event.value.email
      // This handles all cases: valid email, empty string, or undefined
      this.store.set('email', event.value?.email);
    });

    this.linkAuthenticationElement = linkAuthentication;

    return this.linkAuthenticationElement;
  }

  /**
   * Get mounted link authentication element instance
   */
  getElement(): StripeLinkAuthenticationElement | undefined {
    return this.linkAuthenticationElement;
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
   * Unmount link authentication element
   */
  unmount(): void {
    if (this.linkAuthenticationElement == null) {
      return;
    }

    this.linkAuthenticationElement.unmount();
    this.linkAuthenticationElement = undefined;
  }
}
