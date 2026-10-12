import { Component, Prop, h, Method, EventEmitter, Element, Watch, Event } from '@stencil/core';
import { checkPlatform } from '../../utils/utils';
import { StripeDidLoadedHandler, StripeLoadedEvent, InitStripeOptions, CurrencySelectorChangeEvent, CurrencySelectorChangeHandler } from '../../interfaces';
import { i18n } from '../../utils/i18n';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, ICurrencySelectorElementManager } from '../../services/interfaces';

/**
 * Stripe Currency Selector Element
 * Allows customers to select their preferred currency for Adaptive Pricing
 * @info https://docs.stripe.com/elements/currency-selector-element
 */
@Component({
  tag: 'stripe-currency-selector',
  styleUrl: 'stripe-currency-selector.scss',
  shadow: false,
})
export class StripeCurrencySelector {
  @Element() el: HTMLStripeCurrencySelectorElement;

  // Injected dependencies
  private stripeService: IStripeService;
  private currencySelectorElementManager: ICurrencySelectorElementManager;

  /**
   * Your Stripe publishable API key.
   */
  @Prop() publishableKey: string;

  @Watch('publishableKey')
  updatePublishableKey(publishableKey: string) {
    this.initStripe(publishableKey, {
      stripeAccount: this.stripeAccount,
    });
  }

  /**
   * Optional. Making API calls for connected accounts
   * @info https://stripe.com/docs/connect/authentication
   */
  @Prop() stripeAccount: string;

  @Watch('stripeAccount')
  updateStripeAccountId(stripeAccount: string) {
    const publishableKey = this.stripeService.state.publishableKey || this.publishableKey;

    if (!publishableKey) {
      return;
    }

    this.initStripe(publishableKey, {
      stripeAccount,
    });
  }

  /**
   * Overwrite the application name that registered
   * For wrapper library (like Capacitor)
   */
  @Prop() applicationName = 'stripe-pwa-elements';

  /**
   * The client secret from Checkout Session
   * Required for Currency Selector Element
   * @info https://docs.stripe.com/elements/currency-selector-element
   */
  @Prop() clientSecret?: string;

  /**
   * Currency change event handler
   */
  @Prop({
    mutable: true,
  })
  handleCurrencyChange?: CurrencySelectorChangeHandler;

  /**
   * Stripe.js class loaded handler
   */
  @Prop({
    mutable: true,
  })
  stripeDidLoaded?: StripeDidLoadedHandler;

  /**
   * Get Stripe.js, and initialize elements
   * @param publishableKey - Your Stripe publishable API key
   * @param options - Optional initialization options (e.g., stripeAccount)
   * @example
   * ```
   * const stripeCurrencySelector = document.createElement('stripe-currency-selector');
   * customElements
   *  .whenDefined('stripe-currency-selector')
   *  .then(() => {
   *    stripeCurrencySelector.initStripe('pk_test_XXXXXXXXX')
   *  })
   * ```
   */
  @Method()
  public async initStripe(publishableKey: string, options?: InitStripeOptions) {
    await this.stripeService.initialize(publishableKey, {
      stripeAccount: options?.stripeAccount,
      applicationName: this.applicationName,
    });

    // If already successfully loaded, initialize elements immediately
    if (this.stripeService.state.loadStripeStatus === 'success') {
      await this.initElement();
      this.stripeLoadedEventHandler();
    } else {
      // Otherwise, wait for successful load
      const unsubscribe = this.stripeService.onChange('loadStripeStatus', async newState => {
        if (newState !== 'success') {
          return;
        }

        await this.initElement();
        this.stripeLoadedEventHandler();
        unsubscribe(); // Clean up listener after first success
      });
    }
  }

  /**
   * Set error message
   * @param errorMessage - The error message to display
   * @returns Promise resolving to this instance for method chaining
   * @example
   * ```
   * const stripeCurrencySelector = document.createElement('stripe-currency-selector');
   * customElements
   *  .whenDefined('stripe-currency-selector')
   *  .then(() => {
   *    stripeCurrencySelector.setErrorMessage('Invalid currency selected');
   *   });
   * ```
   */
  @Method()
  public async setErrorMessage(errorMessage: string) {
    this.currencySelectorElementManager.setError(errorMessage);
    return this;
  }

  /**
   * Get the selected currency
   * @returns Promise resolving to the selected currency code (e.g., 'USD', 'EUR')
   * @example
   * ```
   * const stripeCurrencySelector = document.querySelector('stripe-currency-selector');
   * const currency = await stripeCurrencySelector.getSelectedCurrency();
   * console.log('Selected currency:', currency);
   * ```
   */
  @Method()
  public async getSelectedCurrency(): Promise<string | undefined> {
    return this.currencySelectorElementManager.getState().selectedCurrency;
  }

  /**
   * Stripe Client loaded event
   * @example
   * ```
   * const stripeCurrencySelector = document.createElement('stripe-currency-selector');
   * customElements
   *  .whenDefined('stripe-currency-selector')
   *  .then(() => {
   *     stripeCurrencySelector
   *      .addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
   *        console.log('Stripe loaded:', stripe);
   *       });
   *   })
   * ```
   */
  @Event() stripeLoaded: EventEmitter<StripeLoadedEvent>;

  private stripeLoadedEventHandler() {
    const event: StripeLoadedEvent = {
      stripe: this.stripeService.getStripe(),
    };

    if (this.stripeDidLoaded) {
      this.stripeDidLoaded(event);
    }

    this.stripeLoaded.emit(event);
  }

  /**
   * Currency change event
   * @example
   * ```
   * const stripeCurrencySelector = document.createElement('stripe-currency-selector');
   * customElements
   *  .whenDefined('stripe-currency-selector')
   *  .then(() => {
   *     stripeCurrencySelector
   *       .addEventListener('currencyChange', async props => {
   *         const { detail: { currency } } = props;
   *         console.log('Currency changed:', currency);
   *       })
   *   })
   * ```
   */
  @Event() currencyChange: EventEmitter<CurrencySelectorChangeEvent>;

  private async currencyChangeEventHandler(currency: string) {
    const changeEvent: CurrencySelectorChangeEvent = {
      currency,
    };

    this.currencyChange.emit(changeEvent);

    if (this.handleCurrencyChange) {
      await this.handleCurrencyChange(changeEvent);
    }
  }

  componentWillRender() {
    if (!this.stripeService.state.publishableKey) {
      return;
    }

    if (['success', 'loading'].includes(this.stripeService.state.loadStripeStatus)) {
      return;
    }

    this.initStripe(this.stripeService.state.publishableKey, {
      stripeAccount: this.stripeService.state.stripeAccount,
    });
  }

  constructor() {
    // Dependency Injection via factory
    this.stripeService = serviceFactory.createStripeService();
    this.currencySelectorElementManager = serviceFactory.createCurrencySelectorElementManager(this.stripeService);
  }

  /**
   * Props are not yet populated inside the constructor when the component is registered via
   * the custom-elements build (`dist/components/*`), so initialization that depends on them
   * must run in `componentWillLoad`, where both the lazy and custom-elements builds have them set.
   */
  componentWillLoad() {
    if (this.publishableKey) {
      this.initStripe(this.publishableKey, {
        stripeAccount: this.stripeAccount,
      });
    }
  }

  /**
   * Initialize Component using Stripe Currency Selector Element
   */
  private async initElement() {
    // Prepare currency selector element options
    // Note: StripeCurrencySelectorElementOptions is not yet exported in @stripe/stripe-js v8.6.0
    const options: any = {};

    if (this.clientSecret) {
      options.clientSecret = this.clientSecret;
    }

    // Initialize currency selector element
    const currencySelectorElement = await this.currencySelectorElementManager.initialize(this.el, options);

    // Listen for currency changes
    // Note: The 'change' event type is not yet in @stripe/stripe-js type definitions
    // but is documented in Stripe's Currency Selector Element documentation
    (currencySelectorElement as any).on('change', (event: any) => {
      if (event?.value?.currency) {
        this.currencyChangeEventHandler(event.value.currency);
      }
    });
  }

  componentDidLoad() {
    const platform = checkPlatform();

    if (platform) {
      this.el.classList.add(platform);
    }
  }

  disconnectedCallback() {
    this.currencySelectorElementManager.unmount();
  }

  render() {
    const { loadStripeStatus } = this.stripeService.state;
    const { errorMessage } = this.currencySelectorElementManager.getState();

    if (loadStripeStatus === 'failure') {
      return <p>{i18n.t('Failed to load Stripe')}</p>;
    }

    return (
      <div class="stripe-currency-selector-wrap">
        <div id="currency-selector" />
        {errorMessage ? (
          <div id="currency-selector-errors" class="stripe-element-errors">
            {errorMessage}
          </div>
        ) : null}
      </div>
    );
  }
}
