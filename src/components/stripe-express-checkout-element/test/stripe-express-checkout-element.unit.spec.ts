import { StripeExpressCheckoutElement } from '../stripe-express-checkout-element';
import type { IStripeService, IExpressCheckoutElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';
import type { Mocked } from 'vitest';

/**
 * Unit tests for StripeExpressCheckoutElement
 *
 * Following Kent Beck's unit test philosophy:
 * - Test one thing per test
 * - Run in milliseconds (no newSpecPage)
 * - Completely isolated with mocks
 */

// Mock all external dependencies
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../utils/i18n', () => ({
  i18n: { t: (key: string) => key },
}));

describe('StripeExpressCheckoutElement', () => {
  let mockStripeService: Mocked<IStripeService>;
  let mockExpressCheckoutManager: Mocked<IExpressCheckoutElementManager>;

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
      initialize: vi.fn().mockResolvedValue(undefined),
      initializeWithCheckoutSession: vi.fn().mockResolvedValue(undefined),
      onChange: vi.fn().mockReturnValue(vi.fn()),
      getStripe: vi.fn().mockReturnValue(undefined),
      getElements: vi.fn().mockReturnValue(undefined),
      getCheckout: vi.fn().mockReturnValue(undefined),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    mockExpressCheckoutManager = {
      getState: vi.fn().mockReturnValue({ errorMessage: '', isReady: false }),
      initialize: vi.fn().mockResolvedValue({} as any),
      getElement: vi.fn().mockReturnValue(undefined),
      update: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
      unmount: vi.fn(),
    } as any;

    vi.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    vi.spyOn(factoryModule.serviceFactory, 'createExpressCheckoutElementManager').mockReturnValue(mockExpressCheckoutManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      element.initStripe = vi.fn();
      mockStripeService.state.publishableKey = undefined;

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('does not call initStripe when status is success', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = 'success';

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('does not call initStripe when status is loading', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = 'loading';

      element.componentWillUpdate();

      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('calls initStripe when status is empty', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      mockStripeService.state.loadStripeStatus = '';

      element.componentWillUpdate();

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
    });

    it('calls initStripe when status is failure', () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
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

      const options = mockStripeService.initialize.mock.calls[0][1];

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
      element.initStripe = vi.fn();

      await element.updatePublishableKey('pk_test_new');

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_new', undefined);
    });

    it('preserves existing stripeAccount', async () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
      mockStripeService.state.stripeAccount = 'acct_existing';

      await element.updatePublishableKey('pk_test_new');

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_new', { stripeAccount: 'acct_existing' });
    });
  });

  describe('updateStripeAccountId', () => {
    it('calls initStripe with new account', async () => {
      const element = new StripeExpressCheckoutElement();
      element.initStripe = vi.fn();
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
