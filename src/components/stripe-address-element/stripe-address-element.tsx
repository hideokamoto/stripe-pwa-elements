import { Component, Prop, h, State, Method, EventEmitter, Event, Element, Watch } from '@stencil/core';
import { checkPlatform } from '../../utils/utils';
import { StripeDidLoadedHandler, StripeLoadedEvent, ProgressStatus, InitStripeOptions } from '../../interfaces';
import { i18n } from '../../utils/i18n';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, IAddressElementManager } from '../../services/interfaces';

/**
 * Address form submit event data
 */
export type AddressSubmitEvent = {
  address: {
    value: import('@stripe/stripe-js').StripeAddressElementChangeEvent['value'];
    complete: boolean;
  };
};

/**
 * Address form submit handler
 */
export type AddressSubmitHandler = (event: Event, props: AddressSubmitEvent) => Promise<void>;

@Component({
  tag: 'stripe-address-element',
  styleUrl: 'stripe-address-element.scss',
  shadow: false,
})
export class StripeAddressElement {
  @Element() el: HTMLStripeAddressElementElement;

  // Injected dependencies
  private stripeService: IStripeService;
  private addressElementManager: IAddressElementManager;

  // Form submit listener reference for cleanup
  private formSubmitListener?: (event: Event) => void;

  /**
   * Address mode: 'shipping' or 'billing'
   * @default 'billing'
   */
  @Prop() mode: 'shipping' | 'billing' = 'billing';

  /**
   * Form title
   * By default we recommended to use these string
   * - 'Shipping address' for shipping mode
   * - 'Billing address' for billing mode
   * These strings will translated automatically by this library.
   */
  @Prop() sheetTitle = 'Billing address';

  /**
   * Submit button label
   * By default we recommended to use these string
   * - 'Save' or 'Continue'
   * These strings will translated automatically by this library.
   */
  @Prop() buttonLabel = 'Save';

  /**
   * Get Stripe.js, and initialize elements
   * @param publishableKey
   * @param options
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-address-element');
   * customElements
   *  .whenDefined('stripe-address-element')
   *  .then(() => {
   *    stripeElement.initStripe('pk_test_XXXXXXXXX')
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
   * The progress status of the submission process
   */
  @State() progress: ProgressStatus = '';

  /**
   * Update the form submit progress
   * @param progress
   * @returns
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-address-element');
   * customElements
   *  .whenDefined('stripe-address-element')
   *  .then(() => {
   *    stripeElement.addEventListener('formSubmit', async props => {
   *      const { detail: { address } } = props;
   *      console.log('Address:', address);
   *      stripeElement.updateProgress('success')
   *    });
   * })
   * ```
   */
  @Method()
  public async updateProgress(progress: ProgressStatus) {
    this.progress = progress;
    return this;
  }

  /**
   * Set error message
   * @param errorMessage string
   * @returns
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-address-element');
   * customElements
   *  .whenDefined('stripe-address-element')
   *  .then(() => {
   *    stripeElement.addEventListener('formSubmit', async props => {
   *      try {
   *        throw new Error('debug')
   *      } catch (e) {
   *        stripeElement.setErrorMessage(`Error: ${e.message}`)
   *        stripeElement.updateProgress('failure')
   *      }
   *   });
   * })
   * ```
   */
  @Method()
  public async setErrorMessage(errorMessage: string) {
    this.addressElementManager.setError(errorMessage);
    return this;
  }

  /**
   * Get the current address value
   * @returns Promise resolving to the address value
   * @example
   * ```
   * const stripeElement = document.querySelector('stripe-address-element');
   * const addressValue = await stripeElement.getValue();
   * console.log('Address:', addressValue);
   * ```
   */
  @Method()
  public async getValue(): Promise<{
    value: import('@stripe/stripe-js').StripeAddressElementChangeEvent['value'];
    complete: boolean;
  }> {
    const addressElement = this.addressElementManager.getElement();

    if (addressElement == null) {
      throw new Error('Address element not initialized');
    }

    const result = await addressElement.getValue();

    return result;
  }

  /**
   * Your Stripe publishable API key.
   */
  @Prop() publishableKey: string;

  @Watch('publishableKey')
  updatePublishableKey(publishableKey: string) {
    const options: InitStripeOptions = {};

    if (this.stripeAccount != null && this.stripeAccount !== '') {
      options.stripeAccount = this.stripeAccount;
    }

    this.initStripe(publishableKey, Object.keys(options).length > 0 ? options : undefined);
  }

  /**
   * Optional. Making API calls for connected accounts
   * @info https://stripe.com/docs/connect/authentication
   */
  @Prop() stripeAccount: string;

  @Watch('stripeAccount')
  updateStripeAccountId(stripeAccount: string) {
    const publishableKey = this.stripeService.state.publishableKey || this.publishableKey;

    if (publishableKey == null || publishableKey === '') {
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
   * Show the form label
   */
  @Prop() showLabel = false;

  /**
   * Default country code (e.g., 'US', 'JP', 'GB')
   */
  @Prop() defaultCountry?: string;

  /**
   * Allowed countries (array of country codes)
   */
  @Prop() allowedCountries?: string[];

  /**
   * Form submit event handler
   */
  @Prop({
    mutable: true,
  })
  handleSubmit: AddressSubmitHandler;

  /**
   * Stripe.js class loaded handler
   */
  @Prop({
    mutable: true,
  })
  stripeDidLoaded?: StripeDidLoadedHandler;

  /**
   * Stripe Client loaded event
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-address-element');
   * customElements
   *  .whenDefined('stripe-address-element')
   *  .then(() => {
   *     stripeElement
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

    if (this.stripeDidLoaded != null) {
      this.stripeDidLoaded(event);
    }

    this.stripeLoaded.emit(event);
  }

  /**
   * Form submit event
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-address-element');
   * customElements
   *  .whenDefined('stripe-address-element')
   *  .then(() => {
   *     stripeElement
   *       .addEventListener('formSubmit', async props => {
   *         const { detail: { address } } = props;
   *         console.log('Address submitted:', address);
   *       })
   *   })
   * ```
   */
  @Event() formSubmit: EventEmitter<AddressSubmitEvent>;

  private async formSubmitEventHandler() {
    const addressValue = await this.getValue();

    this.formSubmit.emit({
      address: addressValue,
    });
  }

  componentWillRender() {
    if (this.stripeService.state.publishableKey == null || this.stripeService.state.publishableKey === '') {
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
    this.addressElementManager = serviceFactory.createAddressElementManager(this.stripeService);

    if (this.publishableKey != null && this.publishableKey !== '') {
      this.initStripe(this.publishableKey, {
        stripeAccount: this.stripeAccount,
      });
    }
  }

  /**
   * Initialize Component using Stripe Address Element
   */
  private async initElement() {
    // Prepare address element options
    const addressOptions: import('@stripe/stripe-js').StripeAddressElementOptions = {
      mode: this.mode,
    };

    if (this.defaultCountry != null && this.defaultCountry !== '') {
      addressOptions.defaultValues = {
        address: {
          country: this.defaultCountry,
        },
      };
    }

    if (this.allowedCountries && this.allowedCountries.length > 0) {
      addressOptions.allowedCountries = this.allowedCountries;
    }

    // Initialize address element
    await this.addressElementManager.initialize(this.el, addressOptions);

    // Add form submit listener scoped to this component instance
    const formElement = this.el.querySelector('#stripe-address-element-form');

    if (formElement == null) {
      console.error('Form element #stripe-address-element-form not found');
      return;
    }

    // Remove previous listener if it exists to prevent duplicate submissions
    if (this.formSubmitListener != null) {
      formElement.removeEventListener('submit', this.formSubmitListener);
    }

    // Create and store the listener
    this.formSubmitListener = async (e: Event) => {
      e.preventDefault();

      const addressElement = this.addressElementManager.getElement();

      if (addressElement == null) {
        console.error('Address element not initialized');
        return;
      }

      this.progress = 'loading';

      try {
        const addressValue = await this.getValue();

        if (this.handleSubmit != null) {
          await this.handleSubmit(e, { address: addressValue });
        }

        await this.formSubmitEventHandler();

        if (this.handleSubmit != null) {
          this.progress = 'success';
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.addressElementManager.setError(errorMessage);
        this.progress = 'failure';
      }
    };

    formElement.addEventListener('submit', this.formSubmitListener);
  }

  componentDidLoad() {
    this.el.classList.add(checkPlatform());
  }

  disconnectedCallback() {
    // Remove form submit listener
    if (this.formSubmitListener != null) {
      const formElement = this.el.querySelector('#stripe-address-element-form');

      if (formElement != null) {
        formElement.removeEventListener('submit', this.formSubmitListener);
      }

      this.formSubmitListener = undefined;
    }

    this.addressElementManager.unmount();
  }

  render() {
    const { loadStripeStatus } = this.stripeService.state;
    const { errorMessage } = this.addressElementManager.getState();

    if (loadStripeStatus === 'failure') {
      return <p>{i18n.t('Failed to load Stripe')}</p>;
    }

    const disabled = this.progress === 'loading';

    // NOTE: `stripe-payment-sheet-wrap` below is a legacy CSS class kept for backward
    // compatibility (leftover from a former component name). It is part of the public
    // DOM contract — consumers may target it in their own stylesheets — so it must
    // remain in the rendered output. Do not remove it.
    return (
      <div class="stripe-payment-sheet-wrap">
        <form id="stripe-address-element-form">
          <div class="stripe-heading">{i18n.t(this.sheetTitle)}</div>
          <div class="payment-info address visible">
            <div id="address-element" />
          </div>
          <div id="address-errors" class="stripe-element-errors">
            {errorMessage}
          </div>
          <div class="submit-button-wrapper">
            <button type="submit" disabled={disabled}>
              {this.progress === 'loading' ? i18n.t('Loading') : i18n.t(this.buttonLabel)}
            </button>
          </div>
        </form>
      </div>
    );
  }
}
