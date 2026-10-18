import { Component, Prop, h, State, Method, EventEmitter, Event, Element, Watch, Host } from '@stencil/core';
import type { PaymentIntentResult, SetupIntentResult, StripeError } from '@stripe/stripe-js';
import { i18n } from '../../utils/i18n';
import { checkPlatform } from '../../utils/utils';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, IPaymentElementManager } from '../../services/interfaces';
import type { StripeLoadedEvent } from '../../interfaces';
import { confirmPaymentOrSetup } from '../stripe-payment-element/stripe-payment-element.helpers';
import { initialSheetState, transition } from './payment-sheet-state';
import type { PaymentSheetEventName, SheetEffect, SheetEvent, SheetState } from './payment-sheet-state';
import { isRecoverableConfirmError, toAppearance, toPaymentElementOptions, unsupportedOptionKeys } from './stripe-payment-sheet.helpers';
import type { PaymentSheetOptions, PaymentSheetPresentResult } from './stripe-payment-sheet.helpers';

/**
 * A payment sheet: the Payment Element in a modal, with the same events and results as the native PaymentSheet
 * of `@capacitor-community/stripe`. PaymentIntent and SetupIntent are told apart by the client secret prefix.
 */
@Component({
  tag: 'stripe-payment-sheet',
  styleUrl: 'stripe-payment-sheet.scss',
  shadow: false,
})
export class StripePaymentSheet {
  @Element() el: HTMLStripePaymentSheetElement;

  private stripeService: IStripeService;
  private paymentElementManager: IPaymentElementManager;

  /** Pending `present()` promise; at most one */
  private presentPromise?: Promise<PaymentSheetPresentResult>;
  private resolvePresent?: (result: PaymentSheetPresentResult) => void;

  /** Details for the next emitted event */
  private lastError?: unknown;
  private lastResult?: PaymentIntentResult | SetupIntentResult;

  private warnedUnsupportedOptions = false;

  /**
   * Your Stripe publishable API key.
   */
  @Prop() readonly publishableKey?: string;

  /**
   * The client secret of a PaymentIntent (`pi_..._secret_...`) or a SetupIntent (`seti_..._secret_...`).
   * The prefix decides whether `confirmPayment` or `confirmSetup` is used.
   */
  @Prop() readonly intentClientSecret?: string;

  /**
   * Optional. Making API calls for connected accounts
   * @info https://stripe.com/docs/connect/authentication
   */
  @Prop() readonly stripeAccount?: string;

  /**
   * Whether the sheet is shown. Setting it to false closes the sheet as canceled.
   */
  @Prop({ mutable: true, reflect: true }) open = false;

  /**
   * Sheet title. Translated automatically by this library.
   */
  @Prop() readonly sheetTitle: string = 'Add your payment information';

  /**
   * Submit button label. Translated automatically by this library.
   */
  @Prop() readonly buttonLabel: string = 'Pay';

  /**
   * Application name registered to Stripe.js, for wrapper libraries such as `@capacitor-community/stripe`.
   */
  @Prop() readonly applicationName: string = 'stripe-pwa-elements';

  /**
   * Options with the same keys as `CreatePaymentSheetOption` of `@capacitor-community/stripe`. JavaScript property only.
   */
  @Prop() readonly options?: PaymentSheetOptions;

  @State() sheet: SheetState = initialSheetState;

  @State() visible = false;

  @State() errorMessage = '';

  /**
   * Stripe.js and the Payment Element are ready
   */
  @Event() paymentSheetLoaded: EventEmitter<StripeLoadedEvent>;

  /**
   * Stripe.js or the Payment Element failed to load, or the client secret format is unknown
   */
  @Event() paymentSheetFailedToLoad: EventEmitter<unknown>;

  /**
   * The payment or setup succeeded
   */
  @Event() paymentSheetCompleted: EventEmitter<PaymentIntentResult | SetupIntentResult>;

  /**
   * The customer closed the sheet
   */
  @Event() paymentSheetCanceled: EventEmitter<void>;

  /**
   * The confirmation failed with an error the customer cannot fix in the sheet
   */
  @Event() paymentSheetFailed: EventEmitter<unknown>;

  /**
   * Show the sheet and wait for its result.
   * Calling it again while a result is pending returns the same promise.
   * @returns `{ paymentResult }`, where `paymentResult` is `paymentSheetCompleted`, `paymentSheetCanceled` or `paymentSheetFailed`
   * @example
   * ```
   * const sheet = document.querySelector('stripe-payment-sheet');
   * const { paymentResult } = await sheet.present();
   * ```
   */
  @Method()
  public async present(): Promise<PaymentSheetPresentResult> {
    if (this.presentPromise == null) {
      this.presentPromise = new Promise(resolve => {
        this.resolvePresent = resolve;
      });
    }

    const promise = this.presentPromise;

    this.dispatch({ type: 'presentRequested' });

    return promise;
  }

  @Watch('publishableKey')
  @Watch('intentClientSecret')
  @Watch('stripeAccount')
  handleSecretChange() {
    this.startLoading();
  }

  @Watch('open')
  handleOpenChange(open: boolean) {
    this.dispatch({ type: open ? 'openRequested' : 'closeRequested' });
  }

  constructor() {
    this.stripeService = serviceFactory.createStripeService();
    this.paymentElementManager = serviceFactory.createPaymentElementManager(this.stripeService);
  }

  /**
   * Props are not yet populated inside the constructor with the custom-elements build,
   * so loading starts here.
   */
  componentWillLoad() {
    if (this.open) {
      this.dispatch({ type: 'openRequested' });
    }

    this.startLoading();
  }

  componentDidLoad() {
    this.el.classList.add(checkPlatform());
  }

  disconnectedCallback() {
    this.paymentElementManager.unmount();
  }

  private startLoading() {
    if (this.publishableKey == null || this.publishableKey === '' || this.intentClientSecret == null) {
      return;
    }

    this.dispatch({ type: 'secretChanged', clientSecret: this.intentClientSecret, source: 'intent' });
  }

  private dispatch(event: SheetEvent) {
    const { state, effects } = transition(this.sheet, event);

    this.sheet = state;
    effects.forEach(effect => this.perform(effect));
  }

  private perform(effect: SheetEffect) {
    switch (effect.type) {
      case 'load':
        this.load(effect.generation, effect.clientSecret);
        break;
      case 'show':
        this.visible = true;
        this.open = true;
        break;
      case 'hide':
        this.visible = false;
        this.open = false;
        break;
      case 'confirm':
        this.confirm(effect.generation, effect.intentKind);
        break;
      case 'showError':
        this.errorMessage = effect.message;
        break;
      case 'emit':
        this.emit(effect.event);
        break;
      case 'resolvePresent':
        this.resolvePresent?.({ paymentResult: effect.result });
        this.presentPromise = undefined;
        this.resolvePresent = undefined;
        break;
    }
  }

  private async load(generation: number, clientSecret: string) {
    this.warnUnsupportedOptions();

    try {
      await this.stripeService.initialize(this.publishableKey, {
        stripeAccount: this.stripeAccount,
        applicationName: this.applicationName,
        clientSecret,
      });

      if (generation !== this.sheet.generation) {
        return;
      }

      if (this.stripeService.state.loadStripeStatus !== 'success') {
        throw new Error('Failed to load Stripe.js');
      }

      const appearance = toAppearance(this.options?.style);

      if (appearance != null) {
        await this.stripeService.getElements().update({ appearance });
      }

      await this.paymentElementManager.initialize(this.el, toPaymentElementOptions(this.options));
      this.dispatch({ type: 'loadSucceeded', generation });
    } catch (e) {
      this.lastError = e;
      this.dispatch({ type: 'loadFailed', generation });
    }
  }

  private async confirm(generation: number, intentKind: 'payment' | 'setup') {
    try {
      const returnUrl = this.options?.returnURL ?? window.location.href;

      this.lastResult = await confirmPaymentOrSetup(this.stripeService.getStripe(), this.stripeService.getElements(), intentKind, returnUrl);
      this.dispatch({ type: 'confirmSucceeded', generation });
    } catch (e) {
      const message = (e as StripeError).message ?? String(e);

      if (isRecoverableConfirmError(e)) {
        this.dispatch({ type: 'confirmDeclined', generation, message });

        return;
      }

      this.lastError = e;
      this.dispatch({ type: 'confirmFailed', generation, message });
    }
  }

  private emit(event: PaymentSheetEventName) {
    switch (event) {
      case 'paymentSheetLoaded':
        this.paymentSheetLoaded.emit({ stripe: this.stripeService.getStripe() });
        break;
      case 'paymentSheetFailedToLoad':
        this.paymentSheetFailedToLoad.emit(this.lastError);
        break;
      case 'paymentSheetCompleted':
        this.paymentSheetCompleted.emit(this.lastResult);
        break;
      case 'paymentSheetCanceled':
        this.paymentSheetCanceled.emit();
        break;
      case 'paymentSheetFailed':
        this.paymentSheetFailed.emit(this.lastError);
        break;
    }
  }

  private warnUnsupportedOptions() {
    const keys = unsupportedOptionKeys(this.options);

    if (this.warnedUnsupportedOptions || keys.length === 0) {
      return;
    }

    this.warnedUnsupportedOptions = true;
    console.warn(`<stripe-payment-sheet>: these options have no effect on the web yet: ${keys.join(', ')}`);
  }

  private handleSubmit = (e: Event) => {
    e.preventDefault();
    this.errorMessage = '';
    this.dispatch({ type: 'submitted' });
  };

  /**
   * The modal closes itself on a backdrop or close button click. Keep it open when the sheet refuses to close (while confirming).
   */
  private handleModalClose = () => {
    this.dispatch({ type: 'closeRequested' });

    if (this.visible) {
      (this.el.querySelector('stripe-modal') as HTMLStripeModalElement | null)?.openModal();
    }
  };

  render() {
    const { phase } = this.sheet;
    const confirming = phase === 'confirming';

    return (
      <Host>
        <stripe-modal open={this.visible} showCloseButton={!confirming} onClose={this.handleModalClose}>
          {/* `stripe-payment-sheet-wrap` is shared with the other form components for styling */}
          <div class="stripe-payment-sheet-wrap">
            <form id="stripe-payment-sheet" onSubmit={this.handleSubmit}>
              <div class="stripe-heading">{i18n.t(this.sheetTitle)}</div>
              <div class="payment-info visible">
                <div id="payment-element" />
              </div>
              <div class="stripe-element-errors" role="alert">
                {this.errorMessage}
              </div>
              <div class="stripe-submit">
                <button type="submit" disabled={phase !== 'presented'}>
                  {confirming ? i18n.t('Loading') : i18n.t(this.buttonLabel)}
                </button>
              </div>
            </form>
          </div>
        </stripe-modal>
      </Host>
    );
  }
}
