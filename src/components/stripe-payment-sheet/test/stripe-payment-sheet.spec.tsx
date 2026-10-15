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
