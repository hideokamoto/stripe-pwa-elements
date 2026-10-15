import { StripeExpressCheckoutElement } from '../stripe-express-checkout-element';
import type { IStripeService, IExpressCheckoutElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';

/**
 * Unit tests for StripeExpressCheckoutElement
 *
 * Following Kent Beck's unit test philosophy:
 * - Test one thing per test
 * - Run in milliseconds (no newSpecPage)
 * - Completely isolated with mocks
 */

// Mock all external dependencies
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../../utils/i18n', () => ({
  i18n: { t: (key: string) => key },
}));

describe('StripeExpressCheckoutElement', () => {
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockExpressCheckoutManager: jest.Mocked<IExpressCheckoutElementManager>;

  beforeEach(() => {
    mockStripeService = {
      state: {
        loadStripeStatus: '',
        applicationName: 'stripe-pwa-elements',
        publishableKey: undefined,
        stripeAccount: undefined,
        stripe: undefined,
        elements: undefined,
        isCheckoutSession: false,
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      initializeWithCheckoutSession: jest.fn().mockResolvedValue(undefined),
      onChange: jest.fn().mockReturnValue(jest.fn()),
      getStripe: jest.fn().mockReturnValue(undefined),
      getElements: jest.fn().mockReturnValue(undefined),
      getCheckout: jest.fn().mockReturnValue(undefined),
      reset: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockExpressCheckoutManager = {
      getState: jest.fn().mockReturnValue({ errorMessage: '', isReady: false }),
      initialize: jest.fn().mockResolvedValue({} as any),
      getElement: jest.fn().mockReturnValue(undefined),
      update: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      unmount: jest.fn(),
    } as any;

    jest.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    jest.spyOn(factoryModule.serviceFactory, 'createExpressCheckoutElementManager').mockReturnValue(mockExpressCheckoutManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('default property values', () => {
    it('intentType defaults to payment', () => {
      const element = new StripeExpressCheckoutElement();
      expect(element.intentType).toBe('payment');
    });

    it('shouldUseDefaultConfirmAction defaults to true', () => {
      const element = new StripeExpressCheckoutElement();
      expect(element.shouldUseDefaultConfirmAction).toBe(true);
    });

    it('applicationName defaults to stripe-pwa-elements', () => {
      const element = new StripeExpressCheckoutElement();
      expect(element.applicationName).toBe('stripe-pwa-elements');
    });
  });

  describe('componentWillUpdate', () => {
    it('does not call initStripe when publishableKey is undefined', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = undefined;

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('does not call initStripe when status is success', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = 'success';

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('does not call initStripe when status is loading', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = 'loading';

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('calls initStripe when status is empty', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = '';

      element.componentWillUpdate();

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
    });

    it('calls initStripe when status is failure', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = 'failure';

      element.componentWillUpdate();

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
    });
  });

  describe('setErrorMessage', () => {
    it('delegates to manager.setError', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.setErrorMessage('Test error');

      expect(mockExpressCheckoutManager.setError).toHaveBeenCalledWith('Test error');
    });

    it('returns the element for chaining', async () => {
      const element = new StripeExpressCheckoutElement();

      const result = await element.setErrorMessage('error');

      expect(result).toBe(element);
    });
  });

  describe('updateProgress', () => {
    it('sets progress to loading', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.updateProgress('loading');

      expect((element as any).progress).toBe('loading');
    });

    it('sets progress to success', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.updateProgress('success');

      expect((element as any).progress).toBe('success');
    });

    it('sets progress to failure', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.updateProgress('failure');

      expect((element as any).progress).toBe('failure');
    });

    it('returns the element for chaining', async () => {
      const element = new StripeExpressCheckoutElement();

      const result = await element.updateProgress('loading');

      expect(result).toBe(element);
    });
  });

  describe('initStripe', () => {
    it('calls stripeService.initialize with key', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: undefined,
        applicationName: 'stripe-pwa-elements',
      });
    });

    it('passes clientSecret to initialize so Elements is created with it', async () => {
      const element = new StripeExpressCheckoutElement();

      (element as any).clientSecret = 'pi_xxx_secret_xxx';
      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', expect.objectContaining({ clientSecret: 'pi_xxx_secret_xxx' }));
    });

    it('passes mode, amount and currency to initialize as elementsOptions', async () => {
      const element = new StripeExpressCheckoutElement();

      (element as any).amount = 1099;
      (element as any).currency = 'usd';
      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', expect.objectContaining({ elementsOptions: { mode: 'payment', amount: 1099, currency: 'usd' } }));
    });

    it('uses setup mode in elementsOptions when intentType is setup', async () => {
      const element = new StripeExpressCheckoutElement();

      (element as any).intentType = 'setup';
      (element as any).currency = 'usd';
      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', expect.objectContaining({ elementsOptions: { mode: 'setup', currency: 'usd' } }));
    });

    it('omits elementsOptions when currency is missing', async () => {
      const element = new StripeExpressCheckoutElement();

      (element as any).amount = 1099;
      await element.initStripe('pk_test_xxx');

      const options = (mockStripeService.initialize as jest.Mock).mock.calls[0][1];

      expect(options.elementsOptions).toBeUndefined();
    });

    it('passes stripeAccount to initialize', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.initStripe('pk_test_xxx', { stripeAccount: 'acct_xxx' });

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_xxx',
        applicationName: 'stripe-pwa-elements',
      });
    });
  });

  describe('updateElementOptions', () => {
    it('delegates to manager.update', async () => {
      const element = new StripeExpressCheckoutElement();

      await element.updateElementOptions({ amount: 2000 });

      expect(mockExpressCheckoutManager.update).toHaveBeenCalledWith({ amount: 2000 });
    });

    it('returns the element for chaining', async () => {
      const element = new StripeExpressCheckoutElement();

      const result = await element.updateElementOptions({ amount: 2000 });

      expect(result).toBe(element);
    });
  });

  describe('updatePublishableKey', () => {
    it('calls initStripe with new key', async () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();

      await element.updatePublishableKey('pk_test_new');

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_new', undefined);
    });

    it('preserves existing stripeAccount', async () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.stripeAccount = 'acct_existing';

      await element.updatePublishableKey('pk_test_new');

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_new', { stripeAccount: 'acct_existing' });
    });
  });

  describe('updateStripeAccountId', () => {
    it('calls initStripe with new account', async () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';

      await element.updateStripeAccountId('acct_new');

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: 'acct_new' });
    });
  });

  describe('disconnectedCallback', () => {
    it('calls manager.unmount', () => {
      const element = new StripeExpressCheckoutElement();

      element.disconnectedCallback();

      expect(mockExpressCheckoutManager.unmount).toHaveBeenCalled();
    });
  });
});
