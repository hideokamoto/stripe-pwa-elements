import { newSpecPage, SpecPage } from '@stencil/core/testing';
import { StripePaymentSheet } from '../stripe-payment-sheet';
import { StripeModal } from '../../stripe-modal/stripe-modal';
import type { IStripeService, IPaymentElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';

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
  let elements: { update: jest.Mock };

  beforeEach(() => {
    stripe = {
      confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_3Mtw', status: 'succeeded' } }),
      confirmSetup: jest.fn().mockResolvedValue({ setupIntent: { id: 'seti_1Mm8', status: 'succeeded' } }),
    };
    elements = { update: jest.fn().mockResolvedValue(undefined) };
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

    it('warns once about options that have no effect on the web', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      await setup({}, { merchantDisplayName: 'Example', enableApplePay: true, customerId: 'cus_123' });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('customerId, enableApplePay');
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
    it('does not reload when the Checkout Session attribute is set to an empty value', async () => {
      const { page, sheet } = await setup();

      sheet.checkoutSessionClientSecret = '';
      await flush(page);

      expect(mockStripeService.initialize).toHaveBeenCalledTimes(1);
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledTimes(1);
    });

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

  describe('Checkout Session', () => {
    // Stripe does not document the format of a Checkout Session client secret; the sheet must not depend on it
    const CHECKOUT_SECRET = 'cs_test_a1_secret_zzz';
    const SESSION_RESULT = { type: 'success', session: { id: 'cs_test_a1' } };
    let checkoutConfirm: jest.Mock;
    let checkout: { loadActions: jest.Mock };

    beforeEach(() => {
      checkoutConfirm = jest.fn().mockResolvedValue(SESSION_RESULT);
      checkout = { loadActions: jest.fn().mockResolvedValue({ type: 'success', actions: { confirm: checkoutConfirm } }) };
      mockStripeService.initializeWithCheckoutSession.mockImplementation(async () => {
        mockStripeService.state.loadStripeStatus = 'success';
      });
      mockStripeService.getCheckout.mockReturnValue(checkout as any);
    });

    /**
     * Render the sheet with a Checkout Session secret, recording its events.
     */
    const setupCheckout = async (options?: object) => {
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
      sheet.checkoutSessionClientSecret = CHECKOUT_SECRET;
      await flush(page);

      const modal = () => sheet.querySelector('stripe-modal') as HTMLStripeModalElement;
      const submit = async () => {
        sheet.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
        await flush(page);
      };

      return { page, sheet, events, modal, submit, eventTypes: () => events.map(e => e.type) };
    };

    it('loads the Checkout Session and mounts the Payment Element with the options it supports', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { sheet, eventTypes } = await setupCheckout({ merchantDisplayName: 'Example Inc.', paymentMethodLayout: 'vertical', style: 'alwaysDark' });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('no effect with a Checkout Session: merchantDisplayName');
      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledWith(
        'pk_test_123',
        CHECKOUT_SECRET,
        expect.objectContaining({ applicationName: 'stripe-pwa-elements', elementsOptions: { appearance: { theme: 'night' } } }),
      );
      expect(mockStripeService.initialize).not.toHaveBeenCalled();
      expect(elements.update).not.toHaveBeenCalled();
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledWith(sheet, { layout: 'accordion' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('uses the Checkout Session when both attributes are set', async () => {
      await newSpecPage({
        components: [StripePaymentSheet, StripeModal],
        html: `<stripe-payment-sheet publishable-key="pk_test_123" intent-client-secret="${PI_SECRET}" checkout-session-client-secret="${CHECKOUT_SECRET}"></stripe-payment-sheet>`,
      });

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledWith('pk_test_123', CHECKOUT_SECRET, expect.anything());
      expect(mockStripeService.initialize).not.toHaveBeenCalled();
    });

    it('keeps the Checkout Session when the intent attribute is set afterwards', async () => {
      const { page, sheet, submit } = await setupCheckout();

      sheet.intentClientSecret = PI_SECRET;
      await flush(page);
      sheet.present();
      await flush(page);
      await submit();

      expect(mockStripeService.initialize).not.toHaveBeenCalled();
      expect(checkoutConfirm).toHaveBeenCalled();
      expect(stripe.confirmPayment).not.toHaveBeenCalled();
    });

    it('ignores a change to the intent attribute while the Checkout Session is shown', async () => {
      const { page, sheet, modal, submit, eventTypes } = await setupCheckout();
      const result = sheet.present();

      await flush(page);
      sheet.intentClientSecret = PI_SECRET;
      await flush(page);

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledTimes(1);
      expect(mockPaymentElementManager.initialize).toHaveBeenCalledTimes(1);
      expect(modal().open).toBe(true);

      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
    });

    it('ignores a change to the intent attribute while confirming the Checkout Session', async () => {
      let settle: (value: unknown) => void;

      checkoutConfirm.mockReturnValueOnce(new Promise(resolve => (settle = resolve)));
      const { page, sheet, modal, submit, eventTypes } = await setupCheckout();

      sheet.present();
      await flush(page);
      await submit();
      sheet.intentClientSecret = PI_SECRET;
      await flush(page);
      settle({ type: 'error', error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'generic_decline' } } });
      await flush(page);

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledTimes(1);
      expect(modal().open).toBe(true);
      expect(eventTypes()).toEqual(['paymentSheetLoaded']);
    });

    it('does not reload when only the intent attribute is cleared', async () => {
      const { page, sheet } = await setupCheckout();

      sheet.intentClientSecret = PI_SECRET;
      await flush(page);
      sheet.intentClientSecret = '';
      await flush(page);

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('reloads the Checkout Session when the publishable key changes', async () => {
      const { page, sheet } = await setupCheckout();

      sheet.publishableKey = 'pk_test_456';
      await flush(page);

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledTimes(2);
      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenLastCalledWith('pk_test_456', CHECKOUT_SECRET, expect.anything());
    });

    it('does not reload the Checkout Session when the stripe account changes between unset values', async () => {
      const { page, sheet } = await setupCheckout();

      sheet.stripeAccount = '';
      await flush(page);

      expect(mockStripeService.initializeWithCheckoutSession).toHaveBeenCalledTimes(1);
    });

    it('switches to the intent when the Checkout Session attribute is cleared', async () => {
      const { page, sheet } = await setupCheckout();

      sheet.intentClientSecret = PI_SECRET;
      sheet.checkoutSessionClientSecret = undefined;
      await flush(page);

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_123', expect.objectContaining({ clientSecret: PI_SECRET }));
    });

    it('confirms through the Checkout actions and resolves with paymentSheetCompleted', async () => {
      const { page, sheet, modal, submit, events, eventTypes } = await setupCheckout();
      const result = sheet.present();

      await flush(page);
      expect(modal().open).toBe(true);
      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(checkout.loadActions).toHaveBeenCalled();
      expect(checkoutConfirm).toHaveBeenCalledWith({ returnUrl: window.location.href, redirect: 'if_required' });
      expect(stripe.confirmPayment).not.toHaveBeenCalled();
      expect(stripe.confirmSetup).not.toHaveBeenCalled();
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
      expect(events[1].detail).toEqual(SESSION_RESULT);
      expect(modal().open).toBe(false);
    });

    it('passes returnURL and the default billing email to confirm', async () => {
      const { page, sheet, submit } = await setupCheckout({ returnURL: 'https://example.com/return', defaultBillingDetails: { email: 'jenny@example.com', name: 'Jenny' } });

      sheet.present();
      await flush(page);
      await submit();

      expect(checkoutConfirm).toHaveBeenCalledWith({ returnUrl: 'https://example.com/return', redirect: 'if_required', email: 'jenny@example.com' });
    });

    it('keeps the sheet open and shows the message when the payment fails', async () => {
      checkoutConfirm.mockResolvedValueOnce({
        type: 'error',
        error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'generic_decline' } },
      });
      const { page, sheet, modal, submit, eventTypes } = await setupCheckout();
      const result = sheet.present();

      await flush(page);
      await submit();

      expect(modal().open).toBe(true);
      expect(sheet.querySelector('.stripe-element-errors').textContent).toBe('Your card was declined.');

      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetCompleted' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
    });

    it('resolves with paymentSheetFailed when the session expired', async () => {
      let status: object = { type: 'open' };

      checkoutConfirm.mockImplementationOnce(async () => {
        status = { type: 'expired' };

        return { type: 'error', error: { code: null, message: 'This Checkout Session is no longer active.' } };
      });
      checkout.loadActions.mockResolvedValue({ type: 'success', actions: { confirm: checkoutConfirm, getSession: () => ({ id: 'cs_test_a1', status }) } });
      const { page, sheet, modal, submit, events, eventTypes } = await setupCheckout();
      const result = sheet.present();

      await flush(page);
      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetFailed']);
      expect(events[1].detail).toMatchObject({ type: 'invalid_request_error', code: 'checkout_session_expired' });
      expect(modal().open).toBe(false);
    });

    it('resolves with paymentSheetFailed when confirming throws an unexpected error', async () => {
      checkoutConfirm.mockRejectedValueOnce(new Error('boom'));
      const { page, sheet, modal, submit, eventTypes } = await setupCheckout();
      const result = sheet.present();

      await flush(page);
      await submit();

      await expect(result).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
      expect(eventTypes()).toEqual(['paymentSheetLoaded', 'paymentSheetFailed']);
      expect(modal().open).toBe(false);
    });

    it('emits paymentSheetFailedToLoad when the Checkout Session fails to load', async () => {
      mockStripeService.initializeWithCheckoutSession.mockImplementation(async () => {
        mockStripeService.state.loadStripeStatus = 'failure';
      });
      const { sheet, eventTypes } = await setupCheckout();

      expect(eventTypes()).toEqual(['paymentSheetFailedToLoad']);
      expect(mockPaymentElementManager.initialize).not.toHaveBeenCalled();
      await expect(sheet.present()).resolves.toEqual({ paymentResult: 'paymentSheetFailed' });
    });
  });
});
