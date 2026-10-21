import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { StripePaymentSheet } from '../stripe-payment-sheet';
import { StripeModal } from '../../stripe-modal/stripe-modal';
import type { IStripeService, IPaymentElementManager, IAddressElementManager, ILinkAuthenticationElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';
import { i18n } from '../../../utils/i18n';

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(),
}));

jest.mock('../../../utils/i18n', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

const PI_SECRET = 'pi_3Mtw_secret_abc';
const SETI_SECRET = 'seti_1Mm8_secret_xyz';

const flush = async (page: SpecPage) => {
  for (let i = 0; i < 5; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
    await page.waitForChanges();
  }
};

describe('stripe-payment-sheet', () => {
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockPaymentElementManager: jest.Mocked<IPaymentElementManager>;
  let stripe: { confirmPayment: jest.Mock; confirmSetup: jest.Mock };
  let elements: { update: jest.Mock; submit: jest.Mock };
  let addressManagers: jest.Mocked<IAddressElementManager>[];
  let addressValue: { complete: boolean; isNewAddress: boolean; value: object };
  let mockLinkAuthenticationManager: jest.Mocked<ILinkAuthenticationElementManager>;

  /** The Address Element manager that was initialized with the given mode */
  const addressManager = (mode: 'billing' | 'shipping') => addressManagers.find(m => m.initialize.mock.calls.some(([, options]) => options?.mode === mode));

  beforeEach(() => {
    jest.spyOn(i18n, 't');
    addressValue = {
      complete: true,
      isNewAddress: true,
      value: {
        name: 'Jenny Rosen',
        phone: '+15555555555',
        address: { line1: '1 Main St', line2: null, city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
      },
    };
    addressManagers = [];
    jest.spyOn(factoryModule.serviceFactory, 'createAddressElementManager').mockImplementation(() => {
      const manager = {
        getState: jest.fn().mockReturnValue({ errorMessage: '', isComplete: false }),
        initialize: jest.fn().mockResolvedValue({}),
        getElement: jest.fn(() => ({ getValue: jest.fn().mockResolvedValue(addressValue) })),
        setError: jest.fn(),
        clearError: jest.fn(),
        unmount: jest.fn(),
      } as any;

      addressManagers.push(manager);

      return manager;
    });
    mockLinkAuthenticationManager = {
      getState: jest.fn().mockReturnValue({ errorMessage: '', email: 'jenny@example.com' }),
      onChange: jest.fn().mockReturnValue(jest.fn()),
      initialize: jest.fn().mockResolvedValue({}),
      getElement: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      unmount: jest.fn(),
    } as any;
    jest.spyOn(factoryModule.serviceFactory, 'createLinkAuthenticationElementManager').mockReturnValue(mockLinkAuthenticationManager);

    stripe = {
      confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_3Mtw', status: 'succeeded' } }),
      confirmSetup: jest.fn().mockResolvedValue({ setupIntent: { id: 'seti_1Mm8', status: 'succeeded' } }),
    };
    elements = { update: jest.fn().mockResolvedValue(undefined), submit: jest.fn().mockResolvedValue({ selectedPaymentMethod: 'card' }) };
    mockStripeService = {
      state: { loadStripeStatus: '', applicationName: 'stripe-pwa-elements' },
      initialize: jest.fn().mockImplementation(async () => {
        mockStripeService.state.loadStripeStatus = 'success';
      }),
      initializeWithCheckoutSession: jest.fn(),
      onChange: jest.fn().mockReturnValue(jest.fn()),
      getStripe: jest.fn(() => stripe),
      getElements: jest.fn(() => elements),
      getCheckout: jest.fn(),
      reset: jest.fn(),
      dispose: jest.fn(),
    } as any;
    mockPaymentElementManager = {
      getState: jest.fn().mockReturnValue({ errorMessage: '' }),
      initialize: jest.fn().mockResolvedValue({}),
      getElement: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      unmount: jest.fn(),
    } as any;

    jest.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    jest.spyOn(factoryModule.serviceFactory, 'createPaymentElementManager').mockReturnValue(mockPaymentElementManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Render the sheet, record its events, then set the attributes so that loading starts after the listeners are attached.
   */
  const setup = async (attributes: { secret?: string; open?: boolean } = {}, options?: object) => {
    const page = await newSpecPage({ components: [StripePaymentSheet, StripeModal], html: '<stripe-payment-sheet></stripe-payment-sheet>' });
    const sheet = page.root as HTMLStripePaymentSheetElement;
    const events: { type: string; detail: unknown }[] = [];

    ['paymentSheetLoaded', 'paymentSheetFailedToLoad', 'paymentSheetCompleted', 'paymentSheetCanceled', 'paymentSheetFailed'].forEach(type => {
      sheet.addEventListener(type, (e: CustomEvent) => events.push({ type, detail: e.detail }));
    });

    if (options != null) {
      sheet.options = options;
    }

    sheet.publishableKey = 'pk_test_123';
    sheet.intentClientSecret = attributes.secret ?? PI_SECRET;
    if (attributes.open) {
      sheet.open = true;
    }

    await flush(page);

    const modal = () => sheet.querySelector('stripe-modal') as HTMLStripeModalElement;
    const submit = async () => {
      sheet.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
      await flush(page);
    };

    return { page, sheet, events, modal, submit, eventTypes: () => events.map(e => e.type) };
  };

  describe('loading', () => {
    it('loads Stripe.js with the client secret and mounts the Payment Element with the mapped options', async () => {
      const { sheet, eventTypes } = await setup({}, { merchantDisplayName: 'Example Inc.', paymentMethodLayout: 'vertical' });

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_123', expect.objectContaining({ clientSecret: PI_SECRET }));
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(sheet, { business: { name: 'Example Inc.' }, layout: 'accordion' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('applies the style option to the Elements appearance', async () => {
      await setup({}, { style: 'alwaysDark' });

      expect(elements.update).toHaveBeenCalledWith({ appearance: { theme: 'night' } });
    });

    it('fails to load without calling Stripe.js when the secret format is unknown', async () => {
      const { sheet, eventTypes } = await setup({ secret: 'cs_test_a1_secret_zzz' });

      expect(mockStripeService.initialize).not.toHaveBeenCalled();
      expect(eventTypes()).toEqual(['paymentSheetFailedToLoad']);
      await expect(sheet.present()).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
    });

    it('emits paymentSheetFailedToLoad when Stripe.js fails to load', async () => {
      mockStripeService.initialize.mockImplementation(async () => {
        mockStripeService.state.loadStripeStatus = 'failure';
      });
      const { eventTypes } = await setup();

      expect(eventTypes()).toEqual(['paymentSheetFailedToLoad']);
    });

    it('mounts and emits only for the latest load when the inputs change while an earlier load is in flight', async () => {
      let finishFirstUpdate: () => void;

      elements.update.mockReturnValueOnce(new Promise<void>(resolve => (finishFirstUpdate = resolve)));
      const { page, sheet, eventTypes } = await setup({}, { style: 'alwaysDark', billingDetailsCollectionConfiguration: { email: 'always' } });

      // The first load waits on elements.update; a new secret starts a second load that finishes first
      sheet.intentClientSecret = SETI_SECRET;
      await flush(page);

      expect(mockPaymentElementManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockLinkAuthenticationManager.initialize).toHaveBeenCalledTimes(1);
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);

      finishFirstUpdate();
      await flush(page);

      expect(mockPaymentElementManager.initialize).toHaveBeenCalledTimes(1);
      expect(mockLinkAuthenticationManager.initialize).toHaveBeenCalledTimes(1);
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('warns once about options that have no effect on the web', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      await setup({}, { merchantDisplayName: 'Example', enableApplePay: true, customerId: 'cus_123', withZipCode: true });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('customerId, withZipCode');
      expect(warn.mock.calls[0][0]).not.toContain('enableApplePay');
    });
  });

  describe('billing details collection', () => {
    /** Present the sheet and submit it */
    const presentAndSubmit = async (attributes: { secret?: string } = {}, options?: object) => {
      const context = await setup(attributes, options);
      const result = context.sheet.present();

      await flush(context.page);
      await context.submit();

      return { ...context, result };
    };

    it('passes the Apple Pay and Google Pay flags to the Payment Element wallets', async () => {
      const { sheet } = await setup({}, { enableApplePay: false, enableGooglePay: true });

      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(sheet, { wallets: { applePay: 'never', googlePay: 'auto' } });
    });

    it('passes the defaultBillingDetails value of a never field at confirm, for a PaymentIntent and a SetupIntent', async () => {
      const options = { billingDetailsCollectionConfiguration: { email: 'never' }, defaultBillingDetails: { email: 'jenny@example.com' } };
      const payment = await presentAndSubmit({}, options);

      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(payment.sheet, expect.objectContaining({ fields: { billingDetails: { email: 'never' } } }));
      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({ confirmParams: expect.objectContaining({ payment_method_data: { billing_details: { email: 'jenny@example.com' } } }) }),
      );
      await expect(payment.result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });

      await presentAndSubmit({ secret: SETI_SECRET }, options);

      expect(stripe.confirmSetup).toHaveBeenCalledWith(
        expect.objectContaining({ confirmParams: expect.objectContaining({ payment_method_data: { billing_details: { email: 'jenny@example.com' } } }) }),
      );
    });

    it('does not pass payment_method_data when nothing has to be passed', async () => {
      await presentAndSubmit({}, { merchantDisplayName: 'Example' });

      expect(stripe.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ confirmParams: { return_url: expect.any(String) } }));
    });

    it('fails to load with a clear error when a never field has no default value', async () => {
      const { sheet, events, eventTypes } = await setup({}, { billingDetailsCollectionConfiguration: { phone: 'never' } });

      expect(eventTypes()).toEqual(['paymentSheetFailedToLoad']);
      expect(events[0].detail).toBeInstanceOf(Error);
      expect((events[0].detail as Error).message).toContain('billingDetailsCollectionConfiguration.phone');
      expect(mockPaymentElementManager.initialize).not.toHaveBeenCalled();
      await expect(sheet.present()).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
    });

    it('shows a billing Address Element for address full and passes its value at confirm', async () => {
      const { sheet, result } = await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { address: 'full' } });
      const billing = addressManager('billing');

      expect(billing).toBeDefined();
      expect(billing.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), { mode: 'billing', defaultValues: {} });
      expect(billing.initialize.mock.calls[0][0].querySelector('#address-element')).not.toBeNull();
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(sheet, expect.objectContaining({ fields: { billingDetails: { address: 'never' } } }));
      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmParams: expect.objectContaining({
            payment_method_data: {
              billing_details: {
                name: 'Jenny Rosen',
                address: { line1: '1 Main St', line2: null, city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
              },
            },
          }),
        }),
      );
      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
    });

    it('passes the Address Element phone for phone always with address full', async () => {
      await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { address: 'full', phone: 'always' } });

      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmParams: expect.objectContaining({ payment_method_data: { billing_details: expect.objectContaining({ phone: '+15555555555' }) } }),
        }),
      );
    });

    it('keeps the sheet open without confirming while the billing address is incomplete', async () => {
      addressValue.complete = false;
      const { sheet, modal, eventTypes } = await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { address: 'full' } });

      expect(stripe.confirmPayment).not.toHaveBeenCalled();
      expect(modal().open).toBe(true);
      expect(sheet.querySelector('.stripe-element-errors').textContent).not.toBe('');
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('shows the email element for email always and passes the collected email at confirm', async () => {
      const { sheet } = await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { email: 'always' } });

      expect(mockLinkAuthenticationManager.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), {});
      expect(mockLinkAuthenticationManager.initialize.mock.calls[0][0].querySelector('#link-authentication-element')).not.toBeNull();
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(sheet, expect.objectContaining({ fields: { billingDetails: { email: 'never' } } }));
      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({ confirmParams: expect.objectContaining({ payment_method_data: { billing_details: { email: 'jenny@example.com' } } }) }),
      );
    });

    it('keeps the sheet open without confirming when the email is not valid', async () => {
      mockLinkAuthenticationManager.getState.mockReturnValue({ errorMessage: '', email: 'foo', complete: false });
      const { sheet, modal, eventTypes } = await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { email: 'always' } });

      expect(stripe.confirmPayment).not.toHaveBeenCalled();
      expect(modal().open).toBe(true);
      expect(sheet.querySelector('.stripe-element-errors').textContent).toBe('Please enter a valid email address.');
      expect(i18n.t).toHaveBeenCalledWith('Please enter a valid email address.');
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('passes the prefilled email at confirm when the customer does not edit it', async () => {
      mockLinkAuthenticationManager.getState.mockReturnValue({ errorMessage: '', email: undefined });
      await presentAndSubmit({}, { billingDetailsCollectionConfiguration: { email: 'always' }, defaultBillingDetails: { email: 'jenny@example.com' } });

      expect(mockLinkAuthenticationManager.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), { defaultValues: { email: 'jenny@example.com' } });
      expect(stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({ confirmParams: expect.objectContaining({ payment_method_data: { billing_details: { email: 'jenny@example.com' } } }) }),
      );
    });

    it('calls elements.submit() synchronously in the submit handler, before reading the extra elements and confirming', async () => {
      const context = await setup({}, { billingDetailsCollectionConfiguration: { address: 'full' } });

      context.sheet.present();
      await flush(context.page);

      const getValue = jest.fn().mockResolvedValue(addressValue);

      addressManager('billing').getElement.mockReturnValue({ getValue } as any);

      // Nothing is awaited before elements.submit(), so the customer's click still counts as a user activation for wallets
      context.sheet.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
      expect(elements.submit).toHaveBeenCalledTimes(1);
      expect(getValue).not.toHaveBeenCalled();

      await flush(context.page);

      expect(stripe.confirmPayment).toHaveBeenCalledTimes(1);
      expect(elements.submit.mock.invocationCallOrder[0]).toBeLessThan(getValue.mock.invocationCallOrder[0]);
      expect(getValue.mock.invocationCallOrder[0]).toBeLessThan(stripe.confirmPayment.mock.invocationCallOrder[0]);
    });

    it('keeps the sheet open without confirming when elements.submit() reports a validation error', async () => {
      elements.submit.mockResolvedValueOnce({ error: { type: 'validation_error', message: 'Your card number is incomplete.' } });
      const { sheet, modal, eventTypes } = await presentAndSubmit();

      expect(stripe.confirmPayment).not.toHaveBeenCalled();
      expect(modal().open).toBe(true);
      expect(sheet.querySelector('.stripe-element-errors').textContent).toBe('Your card number is incomplete.');
      // Stripe's messages are already localized
      expect(i18n.t).not.toHaveBeenCalledWith('Your card number is incomplete.');
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('shows a shipping Address Element prefilled from shippingDetails for a PaymentIntent, in its own container', async () => {
      await setup({}, { billingDetailsCollectionConfiguration: { address: 'full' }, shippingDetails: { name: 'Jenny Rosen', address: { country: 'JP' } } });
      const billing = addressManager('billing');
      const shipping = addressManager('shipping');

      expect(shipping.initialize).toHaveBeenCalledWith(expect.any(HTMLElement), { mode: 'shipping', defaultValues: { name: 'Jenny Rosen', address: { country: 'JP' } } });
      expect(shipping.initialize.mock.calls[0][0].querySelector('#address-element')).not.toBeNull();
      expect(shipping.initialize.mock.calls[0][0]).not.toBe(billing.initialize.mock.calls[0][0]);
    });

    it('does not show a shipping Address Element for a SetupIntent', async () => {
      const { eventTypes } = await setup({ secret: SETI_SECRET }, { shippingDetails: { name: 'Jenny Rosen' } });

      expect(addressManager('shipping')).toBeUndefined();
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('unmounts the extra elements when removed', async () => {
      const { page } = await setup({}, { billingDetailsCollectionConfiguration: { address: 'full', email: 'always' } });

      page.root.remove();
      await page.waitForChanges();

      expect(addressManager('billing').unmount).toHaveBeenCalled();
      expect(mockLinkAuthenticationManager.unmount).toHaveBeenCalled();
    });
  });

  describe('present()', () => {
    it('opens the sheet and resolves with paymentSheetCompleted after a successful payment', async () => {
      const { page, sheet, modal, submit, events, eventTypes } = await setup();
      const result = sheet.present();

      await flush(page);
      expect(modal().open).toBe(true);
      expect(sheet.open).toBe(true);

      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(stripe.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ elements, redirect: 'if_required' }));
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
      expect(events[1].detail).toEqual({ paymentIntent: { id: 'pi_3Mtw', status: 'succeeded' } });
      expect(modal().open).toBe(false);
      expect(sheet.open).toBe(false);
    });

    it('confirms a SetupIntent with confirmSetup', async () => {
      const { page, sheet, submit } = await setup({ secret: SETI_SECRET });
      const result = sheet.present();

      await flush(page);
      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(stripe.confirmSetup).toHaveBeenCalled();
      expect(stripe.confirmPayment).not.toHaveBeenCalled();
    });

    it('uses returnURL for redirect-based payment methods', async () => {
      const { page, sheet, submit } = await setup({}, { returnURL: 'https://example.com/return' });

      sheet.present();
      await flush(page);
      await submit();

      expect(stripe.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ confirmParams: { return_url: 'https://example.com/return' } }));
    });

    it('keeps the sheet open and shows the message on a recoverable error', async () => {
      stripe.confirmPayment.mockResolvedValueOnce({ error: { type: 'card_error', message: 'Your card was declined.' } });
      const { page, sheet, modal, submit, eventTypes } = await setup();
      const result = sheet.present();
      let settled = false;

      result.then(() => (settled = true));
      await flush(page);
      await submit();

      expect(settled).toBe(false);
      expect(modal().open).toBe(true);
      expect(sheet.querySelector('.stripe-element-errors').textContent).toBe('Your card was declined.');

      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
    });

    it('resolves with paymentSheetFailed on an unrecoverable error', async () => {
      stripe.confirmPayment.mockResolvedValueOnce({ error: { type: 'invalid_request_error', message: 'This PaymentIntent has already succeeded.' } });
      const { page, sheet, modal, submit, eventTypes } = await setup();
      const result = sheet.present();

      await flush(page);
      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetFailed']);
      expect(modal().open).toBe(false);
    });

    it('resolves with paymentSheetCanceled when the customer closes the sheet', async () => {
      const { page, sheet, modal, eventTypes } = await setup();
      const result = sheet.present();

      await flush(page);
      await modal().closeModal();
      await flush(page);

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCanceled' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCanceled']);
      expect(sheet.open).toBe(false);
    });

    it('returns the same promise while a presentation is pending', async () => {
      const { page, sheet, modal } = await setup();
      const first = sheet.present();
      const second = sheet.present();

      await flush(page);
      await modal().closeModal();
      await flush(page);

      await expect(first).resolves.toEqual({ paymentResult: 'paymentSheetCanceled' });
      await expect(second).resolves.toEqual({ paymentResult: 'paymentSheetCanceled' });
    });

    it('cannot be closed while confirming', async () => {
      let finishConfirm: (value: unknown) => void;

      stripe.confirmPayment.mockReturnValueOnce(new Promise(resolve => (finishConfirm = resolve)));
      const { page, sheet, modal, submit, eventTypes } = await setup();
      const result = sheet.present();

      await flush(page);
      await submit();
      await modal().closeModal();
      await flush(page);

      expect(modal().open).toBe(true);
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);

      finishConfirm({ paymentIntent: { id: 'pi_3Mtw', status: 'succeeded' } });
      await flush(page);

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
    });
  });

  describe('attributes', () => {
    it('opens with the open attribute', async () => {
      const { modal } = await setup({ open: true });

      expect(modal().open).toBe(true);
    });

    it('cancels when the open attribute turns false', async () => {
      const { page, sheet, modal, eventTypes } = await setup({ open: true });

      sheet.open = false;
      await flush(page);

      expect(modal().open).toBe(false);
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCanceled']);
    });
  });
});
