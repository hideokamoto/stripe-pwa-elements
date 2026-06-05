import { Component, Prop, h, State, Method, EventEmitter, Event, Element, Watch } from '@stencil/core';
import { checkPlatform } from '../../utils/utils';
import { StripeDidLoadedHandler, StripeLoadedEvent, ProgressStatus, IntentType, DefaultFormSubmitResult, InitStripeOptions } from '../../interfaces';
import { i18n } from '../../utils/i18n';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, IExpressCheckoutElementManager, ExpressCheckoutElementOptions } from '../../services/interfaces';
import { StripeAPIError } from '../../utils/error';
import { StripeExpressCheckoutElementConfirmEvent, StripeExpressCheckoutElementClickEvent, PaymentIntentResult, SetupIntentResult } from '@stripe/stripe-js';

/**
 * Express Checkout Element Component
 * Provides one-click payment methods (Apple Pay, Google Pay, Link, PayPal, etc.)
 *
 * @example
 * ```html
 * <stripe-express-checkout-element
 *   publishable-key="pk_test_..."
 *   client-secret="pi_..."
 *   amount="1099"
 *   currency="usd"
 * />
 * ```
 */
@Component({
  tag: 'stripe-express-checkout-element',
  styleUrl: 'stripe-express-checkout-element.scss',
  shadow: false,
})
export class StripeExpressCheckoutElement {
  @Element() el: HTMLStripeExpressCheckoutElementElement;

  // Injected dependencies
  private stripeService: IStripeService;
  private expressCheckoutManager: IExpressCheckoutElementManager;

  /**
   * Default submit handle type.
   * If you want to use `setupIntent`, should update this attribute.
   */
  @Prop() intentType: IntentType = 'payment';

  /**
   * Your Stripe publishable API key.
   */
  @Prop() publishableKey: string;
  @Watch('publishableKey')
  updatePublishableKey(publishableKey: string) {
    const options: InitStripeOptions = {};

    options.stripeAccount = this.stripeService.state.stripeAccount;
    const hasOptionValue = Object.values(options).filter(Boolean).length > 0;

    this.initStripe(publishableKey, hasOptionValue ? options : undefined);
  }

  /**
   * Optional. Making API calls for connected accounts
   * @info https://stripe.com/docs/connect/authentication
   */
  @Prop() stripeAccount: string;
  @Watch('stripeAccount')
  updateStripeAccountId(stripeAccount: string) {
    this.initStripe(this.stripeService.state.publishableKey, {
      stripeAccount: stripeAccount,
    });
  }

  /**
   * Overwrite the application name that registered
   * For wrapper library (like Capacitor)
   */
  @Prop() applicationName = 'stripe-pwa-elements';

  /**
   * The client secret from paymentIntent.create or setupIntent.create response
   *
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *     element.setAttribute('client-secret', 'pi_xxx_secret_xxx')
   *   })
   * ```
   */
  @Prop() clientSecret?: string;

  /**
   * Payment amount in cents (e.g., 1099 for $10.99)
   */
  @Prop() amount?: number;

  /**
   * Three-letter ISO currency code (e.g., 'usd', 'eur')
   */
  @Prop() currency?: string;

  /**
   * Button height in pixels (e.g., '48px')
   */
  @Prop() buttonHeight?: string;

  /**
   * The component will provide a function to call the confirmation API.
   * If you want to customize the behavior, should set false.
   * And listen the 'confirm' event on the element
   */
  @Prop() shouldUseDefaultConfirmAction = true;

  /**
   * The progress status of the checkout process
   */
  @State() progress: ProgressStatus = '';

  /**
   * Update the progress status
   * @param progress
   * @returns
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *    element.updateProgress('success')
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
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *    element.setErrorMessage('Payment failed')
   *  })
   * ```
   */
  @Method()
  public async setErrorMessage(errorMessage: string) {
    this.expressCheckoutManager.setError(errorMessage);
    return this;
  }

  /**
   * Get Stripe.js, and initialize elements
   * @param publishableKey
   * @param options
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *    element.initStripe('pk_test_XXXXXXXXX')
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
   * Update element options dynamically
   * @param options - Partial options to update
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(async () => {
   *    await element.initStripe('pk_test_xxx')
   *    element.updateElementOptions({ amount: 2000 })
   *  })
   * ```
   */
  @Method()
  public async updateElementOptions(options: Partial<ExpressCheckoutElementOptions>) {
    this.expressCheckoutManager.update(options);
    return this;
  }

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
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *     element.addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
   *       console.log('Stripe loaded', stripe)
   *     });
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
   * Express Checkout confirm event
   * Fired when user completes the express checkout flow
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *     element.addEventListener('confirm', async ({ detail }) => {
   *       console.log('Payment confirmed', detail)
   *     })
   *   })
   * ```
   */
  @Event() confirm: EventEmitter<StripeExpressCheckoutElementConfirmEvent>;

  /**
   * Express Checkout click event
   * Fired when user clicks on an express checkout button
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *     element.addEventListener('expressCheckoutClick', async ({ detail }) => {
   *       console.log('Button clicked', detail)
   *     })
   *   })
   * ```
   */
  @Event() expressCheckoutClick: EventEmitter<StripeExpressCheckoutElementClickEvent>;

  /**
   * Express Checkout cancel event
   * Fired when user cancels the express checkout flow
   */
  @Event() cancel: EventEmitter<void>;

  /**
   * Receive the result of default confirm action
   * @example
   * ```
   * const element = document.createElement('stripe-express-checkout-element');
   * customElements
   *  .whenDefined('stripe-express-checkout-element')
   *  .then(() => {
   *     element.addEventListener('defaultConfirmResult', async ({detail}) => {
   *       if (detail instanceof Error) {
   *         console.error(detail)
   *       } else {
   *         console.log(detail)
   *       }
   *     })
   *   })
   * ```
   */
  @Event() defaultConfirmResult: EventEmitter<DefaultFormSubmitResult>;
  private async defaultConfirmResultHandler(result: DefaultFormSubmitResult) {
    this.defaultConfirmResult.emit(result);
  }

  constructor() {
    // Dependency Injection via factory
    this.stripeService = serviceFactory.createStripeService();
    this.expressCheckoutManager = serviceFactory.createExpressCheckoutElementManager(this.stripeService);

    if (this.publishableKey != null && this.publishableKey !== '') {
      this.initStripe(this.publishableKey, {
        stripeAccount: this.stripeAccount,
      });
    }
  }

  componentWillUpdate() {
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

  /**
   * Default confirm action
   * Confirms the payment or setup intent based on intentType
   * @param event
   */
  private async defaultConfirmAction(event: StripeExpressCheckoutElementConfirmEvent) {
    try {
      this.progress = 'loading';
      const stripe = this.stripeService.getStripe();
      const { intentType, clientSecret } = this;

      if (stripe == null) {
        throw new Error('Stripe not initialized');
      }

      if (clientSecret == null || clientSecret === '') {
        throw new Error('Client secret is required');
      }

      const result: PaymentIntentResult | SetupIntentResult = await (() => {
        if (intentType === 'payment') {
          return stripe.confirmPayment({
            elements: this.stripeService.getElements(),
            clientSecret,
            confirmParams: {
              return_url: `${window.location.origin}${window.location.pathname}`,
            },
            redirect: 'if_required',
          });
        }

        return stripe.confirmSetup({
          elements: this.stripeService.getElements(),
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}${window.location.pathname}`,
          },
          redirect: 'if_required',
        });
      })();

      if (result.error != null) {
        throw new StripeAPIError(result.error);
      }

      // Complete the payment in the Express Checkout Element
      // Note: complete() method exists at runtime but is not in type definitions yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event as any).complete('success');

      this.progress = 'success';
      this.defaultConfirmResultHandler(result);
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event as any).complete('fail');
      this.expressCheckoutManager.setError(e.message);
      this.progress = 'failure';
      this.defaultConfirmResultHandler(e);
    }
  }

  /**
   * Initialize Component using Express Checkout Element
   */
  private async initElement() {
    const elementOptions: ExpressCheckoutElementOptions = {
      mode: this.intentType === 'payment' ? 'payment' : 'setup',
    };

    if (this.amount !== undefined) {
      elementOptions.amount = this.amount;
    }

    if (this.currency != null && this.currency !== '') {
      elementOptions.currency = this.currency;
    }

    if (this.buttonHeight != null && this.buttonHeight !== '') {
      // Convert string like "48px" to number for Stripe API
      if (typeof this.buttonHeight === 'string') {
        const height = parseInt(this.buttonHeight.replace('px', ''), 10);

        if (!isNaN(height)) {
          elementOptions.buttonHeight = height;
        }
      } else {
        elementOptions.buttonHeight = this.buttonHeight;
      }
    }

    // Initialize express checkout element with event handlers
    await this.expressCheckoutManager.initialize(this.el, elementOptions, {
      onConfirm: async event => {
        this.confirm.emit(event);

        if (this.shouldUseDefaultConfirmAction && this.clientSecret != null && this.clientSecret !== '') {
          await this.defaultConfirmAction(event);
        }
      },
      onClick: event => {
        this.expressCheckoutClick.emit(event);
      },
      onCancel: () => {
        this.cancel.emit();
        this.progress = '';
      },
    });
  }

  componentDidLoad() {
    this.el.classList.add(checkPlatform());
  }

  disconnectedCallback() {
    this.expressCheckoutManager.unmount();
  }

  render() {
    const { loadStripeStatus } = this.stripeService.state;
    const { errorMessage, isReady } = this.expressCheckoutManager.getState();

    if (loadStripeStatus === 'failure') {
      return <p>{i18n.t('Failed to load Stripe')}</p>;
    }

    if (loadStripeStatus === 'loading') {
      return <p>{i18n.t('Loading')}</p>;
    }

    return (
      <div class="stripe-express-checkout-wrap">
        <div id="express-checkout-element" />
        {errorMessage && (
          <div id="express-checkout-errors" class="stripe-element-errors">
            {errorMessage}
          </div>
        )}
        {!isReady && loadStripeStatus === 'success' && <div class="stripe-express-checkout-loading">{i18n.t('Loading')}</div>}
      </div>
    );
  }
}
