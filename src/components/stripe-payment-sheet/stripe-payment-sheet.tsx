import { Component, Prop, h, State, Method, EventEmitter, Event, Element, Watch, Host } from '@stencil/core';
import type { PaymentIntentResult, SetupIntentResult, StripeCheckoutConfirmResult, StripeError } from '@stripe/stripe-js';
import { i18n } from '../../utils/i18n';
import { checkPlatform } from '../../utils/utils';
import { findElement } from '../../utils/element-finder';
import { serviceFactory } from '../../services/factory';
import type { IStripeService, IPaymentElementManager, IAddressElementManager, ILinkAuthenticationElementManager } from '../../services/interfaces';
import type { StripeLoadedEvent } from '../../interfaces';
import { confirmPaymentOrSetup } from '../stripe-payment-element/stripe-payment-element.helpers';
import { initialSheetState, transition } from './payment-sheet-state';
import type { IntentKind, PaymentSheetEventName, SecretSource, SheetEffect, SheetEvent, SheetState } from './payment-sheet-state';
import {
  collectedBillingDetails,
  isRecoverableConfirmError,
  isSheetValidationError,
  planBillingDetailsCollection,
  toAppearance,
  toPaymentElementOptions,
  unsupportedOptionKeys,
} from './stripe-payment-sheet.helpers';
import type { BillingDetailsCollectionPlan, PaymentSheetOptions, PaymentSheetPresentResult } from './stripe-payment-sheet.helpers';
import { checkoutIgnoredOptionKeys, confirmCheckoutSessionSheet, toCheckoutElementsOptions, toCheckoutPaymentElementOptions } from './stripe-payment-sheet.checkout';

const nonEmpty = (value: string | undefined): string | undefined => (value == null || value === '' ? undefined : value);

/**
 * A payment sheet: the Payment Element in a modal, with the same events and results as the native PaymentSheet
 * of `@capacitor-community/stripe`. PaymentIntent and SetupIntent are told apart by the client secret prefix;
 * a Checkout Session is used when `checkout-session-client-secret` is set.
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
  /** Extra elements, created from the same Elements instance as the Payment Element so that their values combine */
  private billingAddressElementManager: IAddressElementManager;
  private shippingAddressElementManager: IAddressElementManager;
  private emailElementManager: ILinkAuthenticationElementManager;

  /** Pending `present()` promise; at most one */
  private presentPromise?: Promise<PaymentSheetPresentResult>;
  private resolvePresent?: (result: PaymentSheetPresentResult) => void;

  /** Details for the next emitted event */
  private lastError?: unknown;
  private lastResult?: PaymentIntentResult | SetupIntentResult | StripeCheckoutConfirmResult;

  /** Key of the last requested load (see `loadTarget`), so that unchanged values do not reload */
  private lastLoadKey?: string;

  private warnedUnsupportedOptions = false;
  private warnedCheckoutIgnoredOptions = false;

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
   * The client secret of a Checkout Session created with `ui_mode: 'elements'` (named `custom` in older Stripe API versions). Its format is not inspected.
   * When it is set, it is used instead of `intent-client-secret` (the same rule as `stripe-payment-element`).
   * Create the session with `customer_email` or `customer`, or pass `options.defaultBillingDetails.email`, because the sheet has no email field.
   */
  @Prop() readonly checkoutSessionClientSecret?: string;

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

  /** Extra elements of the current load and the billing details passed at confirmation */
  @State() collection?: BillingDetailsCollectionPlan;

  /**
   * Stripe.js and the Payment Element are ready
   */
  @Event() paymentSheetLoaded: EventEmitter<StripeLoadedEvent>;

  /**
   * Stripe.js or the Payment Element failed to load, or the client secret format is unknown
   */
  @Event() paymentSheetFailedToLoad: EventEmitter<unknown>;

  /**
   * The payment or setup succeeded. In Checkout Session mode the detail is the result of `confirm` (`{ type: 'success', session }`)
   */
  @Event() paymentSheetCompleted: EventEmitter<PaymentIntentResult | SetupIntentResult | StripeCheckoutConfirmResult>;

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
  @Watch('checkoutSessionClientSecret')
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
    this.billingAddressElementManager = serviceFactory.createAddressElementManager(this.stripeService);
    this.shippingAddressElementManager = serviceFactory.createAddressElementManager(this.stripeService);
    this.emailElementManager = serviceFactory.createLinkAuthenticationElementManager(this.stripeService);
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
    this.unmountExtraElements();
  }

  private unmountExtraElements() {
    this.billingAddressElementManager.unmount();
    this.shippingAddressElementManager.unmount();
    this.emailElementManager.unmount();
  }

  /**
   * Decide what to load from the attributes and load it only when it differs from the last load.
   * A change that does not alter the result (the attribute that is not used, or an empty value that means unset)
   * must neither reload Stripe.js nor cancel an open sheet.
   */
  private startLoading() {
    const target = this.loadTarget();

    if (target == null || target.key === this.lastLoadKey) {
      return;
    }

    this.lastLoadKey = target.key;
    this.dispatch({ type: 'secretChanged', clientSecret: target.clientSecret, source: target.source });
  }

  /**
   * The secret to load and a key of everything the load depends on, or undefined when nothing can be loaded.
   * The Checkout Session wins when both secrets are set (the same rule as `stripe-payment-element`).
   */
  private loadTarget(): { key: string; clientSecret: string; source: SecretSource } | undefined {
    const publishableKey = nonEmpty(this.publishableKey);

    if (publishableKey == null) {
      return undefined;
    }

    const checkoutSessionClientSecret = nonEmpty(this.checkoutSessionClientSecret);
    const intentClientSecret = nonEmpty(this.intentClientSecret);
    const [clientSecret, source]: [string | undefined, SecretSource] =
      checkoutSessionClientSecret != null ? [checkoutSessionClientSecret, 'checkoutSession'] : [intentClientSecret, 'intent'];

    if (clientSecret == null) {
      return undefined;
    }

    return { key: JSON.stringify([publishableKey, nonEmpty(this.stripeAccount) ?? null, source, clientSecret]), clientSecret, source };
  }

  private dispatch(event: SheetEvent) {
    const { state, effects } = transition(this.sheet, event);

    this.sheet = state;
    effects.forEach(effect => this.perform(effect));
  }

  private perform(effect: SheetEffect) {
    switch (effect.type) {
      case 'load':
        if (effect.intentKind === 'checkoutSession') {
          this.loadCheckoutSession(effect.generation, effect.clientSecret);
        } else {
          this.load(effect.generation, effect.clientSecret, effect.intentKind);
        }

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
        if (effect.intentKind === 'checkoutSession') {
          this.confirmCheckoutSession(effect.generation);
        } else {
          this.confirm(effect.generation, effect.intentKind);
        }

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

  private async load(generation: number, clientSecret: string, intentKind: 'payment' | 'setup') {
    this.warnUnsupportedOptions(intentKind);

    // A newer load started while this one was waiting: stop before touching the elements, so that only the latest load mounts and emits
    const superseded = () => generation !== this.sheet.generation;

    try {
      // Fails before loading Stripe.js when a `never` field has no default value, so that Stripe never rejects the confirmation
      const collection = planBillingDetailsCollection(this.options, intentKind);

      await this.stripeService.initialize(this.publishableKey, {
        stripeAccount: this.stripeAccount,
        applicationName: this.applicationName,
        clientSecret,
      });

      if (superseded()) {
        return;
      }

      if (this.stripeService.state.loadStripeStatus !== 'success') {
        throw new Error('Failed to load Stripe.js');
      }

      const appearance = toAppearance(this.options?.style);

      if (appearance != null) {
        await this.stripeService.getElements().update({ appearance });

        if (superseded()) {
          return;
        }
      }

      if (!(await this.mountExtraElements(collection, superseded))) {
        return;
      }

      await this.paymentElementManager.initialize(this.el, toPaymentElementOptions(this.options));
      this.dispatch({ type: 'loadSucceeded', generation });
    } catch (e) {
      if (superseded()) {
        return;
      }

      this.lastError = e;
      this.dispatch({ type: 'loadFailed', generation });
    }
  }

  /**
   * Render the mount points of the plan's extra elements and mount them. Elements a previous load needed but this one does not are unmounted
   * (the managers unmount their previous element themselves when initialized again).
   */
  private async mountExtraElements(collection: BillingDetailsCollectionPlan, superseded: () => boolean): Promise<boolean> {
    this.collection = collection;

    const { emailElement, shippingAddressElement, billingAddressElement } = collection;
    const extraElements: { manager: { unmount(): void }; selector: string; mount?: (container: HTMLElement) => Promise<unknown> }[] = [
      {
        manager: this.emailElementManager,
        selector: '.stripe-payment-sheet-email',
        mount: emailElement && (container => this.emailElementManager.initialize(container, emailElement)),
      },
      {
        manager: this.shippingAddressElementManager,
        selector: '.stripe-payment-sheet-shipping-address',
        mount: shippingAddressElement && (container => this.shippingAddressElementManager.initialize(container, shippingAddressElement)),
      },
      {
        manager: this.billingAddressElementManager,
        selector: '.stripe-payment-sheet-billing-address',
        mount: billingAddressElement && (container => this.billingAddressElementManager.initialize(container, billingAddressElement)),
      },
    ];

    for (const { manager, selector, mount } of extraElements) {
      if (mount == null) {
        manager.unmount();
        continue;
      }

      // The container is looked up with findElement, which waits for it in case the sheet has not rendered yet
      const container = await findElement(this.el, selector);

      if (superseded()) {
        return false;
      }

      await mount(container);

      if (superseded()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Billing details read from the extra elements and the `never` fields, as extra confirm params
   */
  private async confirmParams() {
    const collection = this.collection;

    if (collection == null) {
      return undefined;
    }

    const billingAddress = collection.billingAddressElement != null ? await this.billingAddressElementManager.getElement()?.getValue() : undefined;
    const emailState = collection.emailElement != null ? this.emailElementManager.getState() : undefined;
    const billingDetails = collectedBillingDetails(collection, { billingAddress, email: emailState?.email, emailComplete: emailState?.complete });

    return billingDetails == null ? undefined : { payment_method_data: { billing_details: billingDetails } };
  }

  private confirm(generation: number, intentKind: 'payment' | 'setup') {
    return this.runConfirm(generation, async () => {
      const elements = this.stripeService.getElements();
      // elements.submit() comes first, with nothing awaited before it, as in Stripe's submit handler examples:
      // it validates the elements and collects what wallets (Apple Pay, Google Pay) need while the customer's click still counts,
      // and other asynchronous work may follow once it has resolved
      const { error: submitError } = await elements.submit();

      if (submitError != null) {
        throw submitError;
      }

      const returnUrl = this.options?.returnURL ?? window.location.href;
      const extraConfirmParams = await this.confirmParams();

      return confirmPaymentOrSetup(this.stripeService.getStripe(), elements, intentKind, returnUrl, extraConfirmParams);
    });
  }

  /**
   * Run a confirmation and report its result to the state machine.
   * `confirm` is called synchronously, so that its first step still runs inside the customer's submit event.
   * Errors the customer can fix or retry keep the sheet open; others end it with `paymentSheetFailed`.
   */
  private async runConfirm(generation: number, confirm: () => Promise<PaymentIntentResult | SetupIntentResult | StripeCheckoutConfirmResult>) {
    try {
      this.lastResult = await confirm();
      this.dispatch({ type: 'confirmSucceeded', generation });
    } catch (e) {
      const rawMessage = (e as StripeError).message ?? String(e);
      // Stripe's messages are already localized; the sheet's own validation messages are i18n keys
      const message = isSheetValidationError(e) ? i18n.t(rawMessage) : rawMessage;

      if (isRecoverableConfirmError(e)) {
        this.dispatch({ type: 'confirmDeclined', generation, message });

        return;
      }

      this.lastError = e;
      this.dispatch({ type: 'confirmFailed', generation, message });
    }
  }

  private async loadCheckoutSession(generation: number, clientSecret: string) {
    this.warnUnsupportedOptions('checkoutSession');
    this.warnCheckoutIgnoredOptions();

    // The extra billing elements belong to intent mode; remove those of an earlier intent load
    this.collection = undefined;
    this.unmountExtraElements();

    try {
      await this.stripeService.initializeWithCheckoutSession(this.publishableKey, clientSecret, {
        stripeAccount: this.stripeAccount,
        applicationName: this.applicationName,
        elementsOptions: toCheckoutElementsOptions(this.options),
      });

      if (generation !== this.sheet.generation) {
        return;
      }

      if (this.stripeService.state.loadStripeStatus !== 'success') {
        throw new Error('Failed to load Stripe.js');
      }

      await this.paymentElementManager.initialize(this.el, toCheckoutPaymentElementOptions(this.options));
      this.dispatch({ type: 'loadSucceeded', generation });
    } catch (e) {
      // An error of a load that a newer load replaced is not reported
      if (generation !== this.sheet.generation) {
        return;
      }

      this.lastError = e;
      this.dispatch({ type: 'loadFailed', generation });
    }
  }

  private confirmCheckoutSession(generation: number) {
    const returnUrl = this.options?.returnURL ?? window.location.href;

    return this.runConfirm(generation, async () => {
      const checkout = this.stripeService.getCheckout();

      if (checkout == null) {
        throw new Error('Checkout Session is not initialized');
      }

      return confirmCheckoutSessionSheet(checkout, returnUrl, this.options?.defaultBillingDetails?.email);
    });
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

  private warnUnsupportedOptions(intentKind: IntentKind) {
    const keys = unsupportedOptionKeys(this.options, intentKind);

    if (this.warnedUnsupportedOptions || keys.length === 0) {
      return;
    }

    this.warnedUnsupportedOptions = true;
    console.warn(`<stripe-payment-sheet>: these options have no effect on the web yet: ${keys.join(', ')}`);
  }

  private warnCheckoutIgnoredOptions() {
    const keys = checkoutIgnoredOptionKeys(this.options);

    if (this.warnedCheckoutIgnoredOptions || keys.length === 0) {
      return;
    }

    this.warnedCheckoutIgnoredOptions = true;
    console.warn(`<stripe-payment-sheet>: these options have no effect with a Checkout Session: ${keys.join(', ')}`);
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
                {/* Each extra element gets its own container because the managers look up a fixed id inside the given container */}
                <div class="stripe-payment-sheet-email">{this.collection?.emailElement != null && <div id="link-authentication-element" />}</div>
                <div class="stripe-payment-sheet-shipping-address">{this.collection?.shippingAddressElement != null && <div id="address-element" />}</div>
                <div class="stripe-payment-sheet-billing-address">{this.collection?.billingAddressElement != null && <div id="address-element" />}</div>
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
