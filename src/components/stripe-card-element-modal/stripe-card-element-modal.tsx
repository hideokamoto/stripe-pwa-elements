import { Component, Prop, h, Method, Element, Event, EventEmitter } from '@stencil/core';
import { StripeDidLoadedHandler, FormSubmitHandler, ProgressStatus, PaymentRequestButtonOption, IntentType } from '../../interfaces';

@Component({
  tag: 'stripe-card-element-modal',
  styleUrl: 'stripe-card-element-modal.scss',
  shadow: false,
})
export class StripeCardElementModal {
  @Element() el: HTMLStripeCardElementModalElement;

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
  @Prop() applicationName: string;

  /**
   * Show the form label
   */
  @Prop() showLabel = false;

  /**
   * Payment sheet title
   * By default we recommended to use these string
   * - 'Add your payment information' -> PaymentSheet / PaymentFlow(Android)
   * - 'Add a card' -> PaymentFlow(iOS)
   * These strings will translated automatically by this library.
   */
  @Prop() sheetTitle: string;

  /**
   * Submit button label
   * By default we recommended to use these string
   * - 'Pay' -> PaymentSheet
   * - 'Add' -> PaymentFlow(Android)
   * - 'Add card' -> PaymentFlow(iOS)
   * - 'Add a card' -> PaymentFlow(iOS)
   * These strings will translated automatically by this library.
   *
   */
  @Prop() buttonLabel: string;

  /**
   * The client secret from paymentIntent.create response
   *
   * @example
   * ```
   * const stripeElement = document.createElement('stripe-card-element-modal');
   * customElements
   *  .whenDefined('stripe-card-element-modal')
   *  .then(() => {
   *     stripeElement.setAttribute('intent-client-secret', 'dummy')
   *   })
   * ```
   *
   * @example
   * ```
   * <stripe-card-element-modal intent-client-secret="dummy" />
   * ```
   */
  @Prop() intentClientSecret?: string;

  /**
   * The component will confirm the intent for you: `stripe.confirmCardPayment` when `intentType` is `'payment'`,
   * `stripe.confirmCardSetup` when it is `'setup'`.
   * If you want to customize the behavior, should set false.
   * And listen the 'formSubmit' event on the element
   */
  @Prop() shouldUseDefaultFormSubmitAction = true;

  /**
   * Default submit handle type.
   * If you want to use `setupIntent`, should update this attribute.
   * @example
   * ```
   * <stripe-card-element-modal intent-type="setup" />
   * ```
   */
  @Prop() intentType: IntentType = 'payment';

  /**
   * Form submit event handler
   */
  @Prop({
    mutable: true,
  })
  handleSubmit: FormSubmitHandler;

  /**
   * Stripe.js class loaded handler
   */
  @Prop({
    mutable: true,
  })
  stripeDidLoaded?: StripeDidLoadedHandler;

  /**
   * If true, the modal display close button
   */
  @Prop() showCloseButton = true;

  /**
   * If true, show zip code field
   */
  @Prop() zip = true;

  /**
   * Modal state.
   * If true, the modal will open
   */
  @Prop() open = false;

  /**
   *
   */
  @Event() closed: EventEmitter;

  componentDidLoad() {
    const modal = this.el.querySelector('stripe-modal');

    modal.addEventListener('close', () => {
      this.closed.emit();
    });
  }

  /**
   * Get the inner component
   */
  @Method()
  public async getStripeCardElementElement() {
    return this.el.querySelector('stripe-card-element');
  }

  /**
   * open modal
   */
  @Method()
  public async present() {
    this.open = true;

    return new Promise((resolve, reject) => {
      const cardElement = this.el.querySelector('stripe-card-element');

      cardElement.addEventListener('formSubmit', async props => {
        resolve(props);
      });
      this.el.addEventListener('closed', () => reject());
    });
  }

  /**
   * Update Stripe client loading process
   */
  @Method()
  public async updateProgress(progress: ProgressStatus) {
    const cardElement = this.el.querySelector('stripe-card-element');

    return cardElement.updateProgress(progress);
  }

  /**
   * Remove the modal
   */
  @Method()
  public async destroy() {
    const cardElement = this.el.querySelector('stripe-card-element');

    cardElement.remove();
    this.el.remove();
  }

  /**
   *
   * Add payment request button
   */
  @Method()
  public async setPaymentRequestButton(options: PaymentRequestButtonOption) {
    const elements = this.el.getElementsByTagName('stripe-card-element');

    if (elements.length < 1) {
      return;
    }

    const cardElement = elements[0];

    if (!cardElement) {
      return;
    }

    cardElement.setAttribute('show-payment-request-button', 'true');
    if (this.applicationName) {
      cardElement.setAttribute('application-name', this.applicationName);
    }

    cardElement.setPaymentRequestOption(options);
  }

  render() {
    return (
      <stripe-modal open={this.open} showCloseButton={this.showCloseButton}>
        <stripe-card-element
          showLabel={this.showLabel}
          publishableKey={this.publishableKey}
          intentClientSecret={this.intentClientSecret}
          shouldUseDefaultFormSubmitAction={this.shouldUseDefaultFormSubmitAction}
          handleSubmit={this.handleSubmit}
          stripeDidLoaded={this.stripeDidLoaded}
          intentType={this.intentType}
          zip={this.zip}
          buttonLabel={this.buttonLabel}
          sheetTitle={this.sheetTitle}
          applicationName={this.applicationName}
        ></stripe-card-element>
      </stripe-modal>
    );
  }
}
