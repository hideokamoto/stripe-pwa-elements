import { Component, Prop, h, State, Method, EventEmitter, Event, Host, Element } from '@stencil/core';
import { loadStripe, Stripe, PaymentRequestOptions, StripePaymentRequestButtonElement } from '@stripe/stripe-js';
import {
  StripeDidLoadedHandler,
  StripeLoadedEvent,
  PaymentRequestShippingAddressEventHandler,
  PaymentRequestPaymentMethodEventHandler,
  PaymentRequestShippingOptionEventHandler,
} from '../../interfaces';
import { PaymentRequestWallet } from '@stripe/stripe-js';

/**
 * @deprecated `stripe-payment-request-button` is deprecated and will be removed in a future release.
 * `stripe.paymentRequest()` is being removed in Stripe.js 9.x (deprecated as of 2025-09-30 / 2026-03-25).
 * Please migrate to `<stripe-express-checkout-element>` which supports Apple Pay, Google Pay, Link, PayPal,
 * and more via the modern Express Checkout Element API.
 * Migration guide: https://hideokamoto.github.io/stripe-pwa-elements/guides/migrate-payment-request-button-to-express-checkout/
 */
@Component({
  tag: 'stripe-payment-request-button',
  styleUrl: 'stripe-payment-request-button.css',
  shadow: false,
})
export class StripePaymentRequestButton {
  @Element() el: HTMLStripePaymentRequestButtonElement;
  @State() loadStripeStatus: '' | 'loading' | 'success' | 'failure' = '';

  @State() stripe: Stripe;

  @State() paymentRequestOption?: PaymentRequestOptions;

  /**
   * Store references for cleanup
   */
  private paymentRequestElement?: StripePaymentRequestButtonElement;

  /**
   * Check isAvailable ApplePay or GooglePay.
   * If you run this method, you should run before initStripe.
   */
  @Method()
  public async isAvailable(type: 'applePay' | 'googlePay') {
    if (this.publishableKey === undefined) {
      throw new Error('You should set publishableKey before calling this method.');
    }

    const stripe = await loadStripe(this.publishableKey, {
      stripeAccount: this.stripeAccount,
    });
    const paymentRequest = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Demo total',
        amount: 1099,
      },
      disableWallets: ['applePay', 'googlePay', 'browserCard'].filter(method => method !== type) as PaymentRequestWallet[],
    });
    const paymentRequestSupport = await paymentRequest.canMakePayment();

    if (!paymentRequestSupport || (type === 'applePay' && !paymentRequestSupport[type]) || (type === 'googlePay' && !paymentRequestSupport[type])) {
      throw new Error(`This device cannot use ${type}.`);
    }
  }

  /**
   * Set handler of the `paymentRequest.on('paymentmethod'` event.
   * @example
   * ```
   *  element.setPaymentMethodEventHandler(async (event, stripe) => {
   * // Confirm the PaymentIntent with the payment method returned from the payment request.
   *   const {error} = await stripe.confirmCardPayment(
   *     paymentIntent.client_secret,
   *     {
   *      payment_method: event.paymentMethod.id,
   *      shipping: {
   *        name: event.shippingAddress.recipient,
   *        phone: event.shippingAddress.phone,
   *        address: {
   *          line1: event.shippingAddress.addressLine[0],
   *          city: event.shippingAddress.city,
   *          postal_code: event.shippingAddress.postalCode,
   *          state: event.shippingAddress.region,
   *          country: event.shippingAddress.country,
   *        },
   *      },
   *    },
   *    {handleActions: false}
   *  );
   * ```
   */
  @Prop() paymentMethodEventHandler?: PaymentRequestPaymentMethodEventHandler;

  /**
   * Register event handler for `paymentRequest.on('paymentmethod'` event.
   */
  @Method()
  public async setPaymentMethodEventHandler(handler: PaymentRequestPaymentMethodEventHandler) {
    this.paymentMethodEventHandler = handler;
  }

  /**
   * Set handler of the `paymentRequest.on('shippingoptionchange')` event
   * @example
   * ```
   *  element.setPaymentRequestShippingOptionEventHandler(async (event, stripe) => {
   *   event.updateWith({status: 'success'});
   *  })
   * ```
   */
  @Prop() shippingOptionEventHandler?: PaymentRequestShippingOptionEventHandler;

  /**
   * Register event handler for `paymentRequest.on('shippingoptionchange'` event.
   */
  @Method()
  public async setPaymentRequestShippingOptionEventHandler(handler: PaymentRequestShippingOptionEventHandler) {
    this.shippingOptionEventHandler = handler;
  }

  /**
   * Set handler of the `paymentRequest.on('shippingaddresschange')` event
   * @example
   * ```
   *  element.setPaymentRequestShippingAddressEventHandler(async (event, stripe) => {
   *   const response = await store.updatePaymentIntentWithShippingCost(
   *     paymentIntent.id,
   *     store.getLineItems(),
   *     event.shippingOption
   *   );
   *  })
   * ```
   */
  @Prop() shippingAddressEventHandler?: PaymentRequestShippingAddressEventHandler;

  /**
   * Register event handler for `paymentRequest.on('shippingaddresschange'` event.
   */
  @Method()
  public async setPaymentRequestShippingAddressEventHandler(handler: PaymentRequestShippingAddressEventHandler) {
    this.shippingAddressEventHandler = handler;
  }

  /**
   * Your Stripe publishable API key.
   */
  @Prop() publishableKey: string;

  /**
   * Optional. Making API calls for connected accounts
   * @info https://stripe.com/docs/connect/authentication
   */
  @Prop() stripeAccount: string;

  /**
   * Overwrite the application name that registered
   * For wrapper library (like Capacitor)
   */
  @Prop() applicationName = 'stripe-pwa-elements';

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
   * stripeElement
   *  .addEventListener('stripeLoaded', async ({ detail: {stripe} }) => {
   *   stripe
   *     .createSource({
   *       type: 'ideal',
   *       amount: 1099,
   *       currency: 'eur',
   *       owner: {
   *         name: 'Jenny Rosen',
   *       },
   *       redirect: {
   *         return_url: 'https://shop.example.com/crtA6B28E1',
   *       },
   *     })
   *     .then(function(result) {
   *       // Handle result.error or result.source
   *     });
   *   });
   * ```
   */
  @Event() stripeLoaded: EventEmitter<StripeLoadedEvent>;

  private stripeLoadedEventHandler() {
    const event: StripeLoadedEvent = {
      stripe: this.stripe,
    };

    if (this.stripeDidLoaded) {
      this.stripeDidLoaded(event);
    }

    this.stripeLoaded.emit(event);
  }

  constructor() {
    if (this.publishableKey !== undefined && this.paymentRequestOption !== undefined) {
      this.initStripe(this.publishableKey, {
        stripeAccount: this.stripeAccount,
      });
    } else {
      this.loadStripeStatus = 'failure';
    }
  }

  connectedCallback() {
    console.warn(
      '[stripe-pwa-elements] <stripe-payment-request-button> is deprecated. ' +
        'stripe.paymentRequest() is being removed in Stripe.js 9.x (deprecated 2025-09-30 / removed 2026-03-25). ' +
        'Please migrate to <stripe-express-checkout-element>, which supports Apple Pay, Google Pay, Link, PayPal, and more. ' +
        'Migration guide: https://hideokamoto.github.io/stripe-pwa-elements/guides/migrate-payment-request-button-to-express-checkout/',
    );
  }

  /**
   * @param option
   * @private
   */
  @Method()
  public async setPaymentRequestOption(option: PaymentRequestOptions) {
    this.paymentRequestOption = option;
    return this;
  }

  /**
   * Get Stripe.js, and initialize elements
   * @param publishableKey
   * @param options
   */
  @Method()
  public async initStripe(
    publishableKey: string,
    options: {
      showButton?: boolean;
      stripeAccount?: string;
    } = undefined,
  ) {
    this.loadStripeStatus = 'loading';
    loadStripe(publishableKey, {
      stripeAccount: options?.stripeAccount,
    })
      .then(stripe => {
        this.loadStripeStatus = 'success';
        stripe.registerAppInfo({
          name: this.applicationName,
        });
        this.stripe = stripe;
        return;
      })
      .catch(e => {
        console.log(e);
        this.loadStripeStatus = 'failure';
        return;
      })
      .then(() => {
        if (!this.stripe) {
          return;
        }

        // 後方互換のため、明確にfalseにしていないものはtrue扱い
        return this.initElement(!options?.showButton === false);
      })
      .then(() => {
        if (!this.stripe) {
          return;
        }

        this.stripeLoadedEventHandler();
      });
  }

  /**
   * Initialize Component using Stripe Element
   */
  private async initElement(showButton = true) {
    const paymentRequest = this.stripe.paymentRequest(this.paymentRequestOption);

    // Check if the Payment Request is available (or Apple Pay on the Web).
    const paymentRequestSupport = await paymentRequest.canMakePayment();

    if (!paymentRequestSupport) {
      throw new Error('Payment Request is not supported.');
    }

    if (this.paymentMethodEventHandler) {
      paymentRequest.on('paymentmethod', event => {
        this.paymentMethodEventHandler(event, this.stripe);
      });
    }

    if (this.shippingOptionEventHandler) {
      paymentRequest.on('shippingoptionchange', event => {
        this.shippingOptionEventHandler(event, this.stripe);
      });
    }

    if (this.shippingAddressEventHandler) {
      paymentRequest.on('shippingaddresschange', event => {
        this.shippingAddressEventHandler(event, this.stripe);
      });
    }

    if (showButton) {
      // Cleanup previous element if exists
      if (this.paymentRequestElement) {
        this.paymentRequestElement.unmount();
      }

      // Display the Pay button by mounting the Element in the DOM.
      const elements = this.stripe.elements();
      const paymentRequestButton = elements.create('paymentRequestButton', {
        paymentRequest,
      });

      // Store reference for cleanup
      this.paymentRequestElement = paymentRequestButton;

      const paymentRequestButtonElement: HTMLElement = this.el.querySelector('#payment-request-button');

      paymentRequestButton.mount(paymentRequestButtonElement);
      // Show the payment request section.
      this.el.querySelector('#payment-request').classList.add('visible');
    } else {
      /**
       * This method must be called as the result of a user interaction (for example, in a click handler).
       * https://stripe.com/docs/js/payment_request/show
       */
      paymentRequest.show();
    }
  }

  disconnectedCallback() {
    // Cleanup payment request element
    if (this.paymentRequestElement) {
      this.paymentRequestElement.unmount();
      this.paymentRequestElement = undefined;
    }

    // Clear stripe reference
    this.stripe = undefined;
  }

  render() {
    return (
      <Host>
        <div id="payment-request">
          <div id="payment-request-button"></div>
        </div>
        <slot></slot>
      </Host>
    );
  }
}
