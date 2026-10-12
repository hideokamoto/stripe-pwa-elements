import { Component, Prop, h, State, Method, EventEmitter, Event, Element, Watch } from '@stencil/core';
import { checkPlatform } from '../../utils/utils';
import { StripeDidLoadedHandler, StripeLoadedEvent, ProgressStatus, InitStripeOptions, LinkAuthenticationElementChangeEvent, LinkAuthenticationElementChangeHandler } from '../../interfaces';
import { i18n } from '../../utils/i18n';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, ILinkAuthenticationElementManager } from '../../services/interfaces';
import type { StripeLinkAuthenticationElementOptions } from '@stripe/stripe-js';

@Component({
  tag: 'stripe-link-authentication-element',
  styleUrl: 'stripe-link-authentication-element.scss',
  shadow: false,
})
export class StripeLinkAuthenticationElement {
  @Element() el: HTMLStripeLinkAuthenticationElementElement;

  // Injected dependencies
  private stripeService: IStripeService;
  private linkAuthenticationElementManager: ILinkAuthenticationElementManager;

  /**
   * Your Stripe publishable API key.
   */
  @Prop() publishableKey: string;

  @Watch('publishableKey')
  updatePublishableKey(publishableKey: string) {
    const options: InitStripeOptions = {};

    if (this.stripeAccount) {
      options.stripeAccount = this.stripeAccount;
    }

    this.initStripe(publishableKey, Object.keys(options).length ? options : undefined);
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
   * Default email value to prefill the element
   */
  @Prop() defaultEmail?: string;

  /**
   * The progress status
   */
  @State() progress: ProgressStatus = '';

  /**
   * Link Authentication Element change handler
   */
  @Prop({
    mutable: true,
  })
  handleChange?: LinkAuthenticationElementChangeHandler;

  /**
   * Stripe.js class loaded handler
   */
  @Prop({
    mutable: true,
  })
  stripeDidLoaded?: StripeDidLoadedHandler;

  /**
   * Get Stripe.js, and initialize elements
   * @param publishableKey
   * @param options
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
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
   * Update the progress status
   * @param progress
   * @returns
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
   *  .then(() => {
   *    stripeElement.updateProgress('success')
   *  })
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
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
   *  .then(() => {
   *    stripeElement.setErrorMessage('Invalid email address')
   *  })
   * ```
   */
  @Method()
  public async setErrorMessage(errorMessage: string) {
    this.linkAuthenticationElementManager.setError(errorMessage);
    return this;
  }

  /**
   * Get the current email value from the element
   * @returns {Promise<string | undefined>} The current email value or undefined
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
   *  .then(async () => {
   *    const email = await stripeElement.getEmail();
   *    console.log(email);
   *  })
   * ```
   */
  @Method()
  public async getEmail(): Promise<string | undefined> {
    return this.linkAuthenticationElementManager.getState().email;
  }

  /**
   * Stripe Client loaded event
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
   *  .then(() => {
   *     stripeElement
   *      .addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
   *        console.log('Stripe loaded:', stripe);
   *      });
   *   })
   * ```
   */
  @Event() stripeLoaded: EventEmitter<StripeLoadedEvent>;

  private stripeLoadedEventHandler() {
    const stripe = this.stripeService.getStripe();

    if (!stripe) {
      console.error('Stripe instance is not available');
      return;
    }

    const event: StripeLoadedEvent = {
      stripe,
    };

    if (this.stripeDidLoaded) {
      this.stripeDidLoaded(event);
    }

    this.stripeLoaded.emit(event);
  }

  /**
   * Link Authentication Element change event
   * Emitted when the email value changes
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-link-authentication-element');
   * customElements
   *  .whenDefined('stripe-link-authentication-element')
   *  .then(() => {
   *     stripeElement
   *       .addEventListener('linkAuthenticationChange', async ({ detail }) => {
   *         console.log('Email changed:', detail.email);
   *       })
   *   })
   * ```
   */
  @Event() linkAuthenticationChange: EventEmitter<LinkAuthenticationElementChangeEvent>;

  private linkAuthenticationChangeEventHandler(email?: string) {
    const linkAuthenticationElement = this.linkAuthenticationElementManager.getElement();
    const stripe = this.stripeService.getStripe();

    if (!linkAuthenticationElement || !stripe) {
      console.error('Link Authentication Element not initialized');
      return;
    }

    const event: LinkAuthenticationElementChangeEvent = {
      stripe,
      linkAuthenticationElement,
      email,
    };

    if (this.handleChange) {
      this.handleChange(event);
    }

    this.linkAuthenticationChange.emit(event);
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
    this.linkAuthenticationElementManager = serviceFactory.createLinkAuthenticationElementManager(this.stripeService);
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
   * Initialize Component using Stripe Element
   */
  private async initElement() {
    const options: StripeLinkAuthenticationElementOptions = {};

    if (this.defaultEmail) {
      options.defaultValues = {
        email: this.defaultEmail,
      };
    }

    // Initialize link authentication element
    await this.linkAuthenticationElementManager.initialize(this.el, Object.keys(options).length ? options : undefined);

    // Listen for email changes from the manager's store
    this.linkAuthenticationElementManager.onChange('email', email => {
      this.linkAuthenticationChangeEventHandler(email);
    });
  }

  componentDidLoad() {
    const platform = checkPlatform();

    if (platform) {
      this.el.classList.add(platform);
    }
  }

  disconnectedCallback() {
    this.linkAuthenticationElementManager.unmount();
  }

  render() {
    const { loadStripeStatus } = this.stripeService.state;
    const { errorMessage } = this.linkAuthenticationElementManager.getState();

    if (loadStripeStatus === 'failure') {
      return <p>{i18n.t('Failed to load Stripe')}</p>;
    }

    return (
      <div class="stripe-link-authentication-wrap">
        <div class="stripe-link-authentication-container">
          <div id="link-authentication-element" />
          <div id="link-authentication-errors" class="stripe-element-errors">
            {errorMessage}
          </div>
        </div>
      </div>
    );
  }
}
