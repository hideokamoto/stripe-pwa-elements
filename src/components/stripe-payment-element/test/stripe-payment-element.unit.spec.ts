import { StripePaymentElement } from '../stripe-payment-element';
import type { IStripeService, IPaymentElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';

// Mock loadStripe to avoid actual network calls
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() =>
    Promise.resolve({
      registerAppInfo: jest.fn(),
      elements: jest.fn(() => ({})),
    }),
  ),
}));

// Mock i18n
jest.mock('../../../utils/i18n', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

/**
 * Unit tests for StripePaymentElement component
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These are pure unit tests that test class logic in isolation
 * - No DOM rendering, no Stencil page context
 * - Fast, isolated, deterministic
 */
describe('stripe-payment-element unit tests', () => {
  // Mock service implementations
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockPaymentElementManager: jest.Mocked<IPaymentElementManager>;

  // Set up mocks before each test
  beforeEach(() => {
    // Create fresh mock implementations
    mockStripeService = {
      state: {
        loadStripeStatus: '',
        applicationName: 'stripe-pwa-elements',
        publishableKey: undefined,
        stripeAccount: undefined,
        stripe: undefined,
        elements: undefined,
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      onChange: jest.fn().mockReturnValue(jest.fn()),
      getStripe: jest.fn().mockReturnValue(undefined),
      getElements: jest.fn().mockReturnValue(undefined),
      reset: jest.fn(),
      dispose: jest.fn(),
    } as any;

    mockPaymentElementManager = {
      getState: jest.fn().mockReturnValue({
        errorMessage: '',
      }),
      initialize: jest.fn().mockResolvedValue({} as any),
      getElement: jest.fn().mockReturnValue(undefined),
      setError: jest.fn(),
      clearError: jest.fn(),
      unmount: jest.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    jest.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    jest.spyOn(factoryModule.serviceFactory, 'createPaymentElementManager').mockReturnValue(mockPaymentElementManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#componentWillRender', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
      element.initStripe = jest.fn();
    });

    it.each([['' as const], ['failure' as const]])('If the publishableKey is not provided, should not call initStripe method(status: %s)', async loadingStatus => {
      mockStripeService.state.loadStripeStatus = loadingStatus;
      element.componentWillRender();
      expect(element.initStripe).toHaveBeenCalledTimes(0);
    });

    it.each([['' as const], ['failure' as const]])('Should call initStripe method when the status is not a part of "success" or "loading" (status: %s)', async loadingStatus => {
      mockStripeService.state.publishableKey = 'pk_test_xxxx';
      mockStripeService.state.loadStripeStatus = loadingStatus;
      element.componentWillRender();
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxxx', {
        stripeAccount: undefined,
      });
    });

    it.each([['success' as const], ['loading' as const]])(
      'Should not call initStripe method when the status is a part of "success" or "loading" (status: %s)',
      async loadingStatus => {
        mockStripeService.state.publishableKey = 'pk_test_xxxx';
        mockStripeService.state.loadStripeStatus = loadingStatus;
        element.componentWillRender();
        expect(element.initStripe).toHaveBeenCalledTimes(0);
      },
    );
  });

  describe('#setErrorMessage', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
    });

    it('should set the certain error message', async () => {
      const message = 'Error message is here';

      await element.setErrorMessage(message);
      expect(mockPaymentElementManager.setError).toHaveBeenCalledWith(message);
    });
  });

  describe('#initStripe', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();

      // Mock element.el.querySelector for form submission listener
      const mockFormElement = {
        addEventListener: jest.fn(),
      };
      jest.spyOn(element.el, 'querySelector').mockReturnValue(mockFormElement as any);

      // Mock successful initialization
      mockStripeService.state.loadStripeStatus = 'success';
      mockStripeService.initialize.mockResolvedValue(undefined);
      mockPaymentElementManager.initialize.mockResolvedValue({} as any);
    });

    it('should call stripeService.initialize with correct parameters', async () => {
      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: undefined,
        applicationName: 'stripe-pwa-elements',
      });
    });

    it('should call stripeService.initialize with account id', async () => {
      await element.initStripe('pk_test_xxx', {
        stripeAccount: 'acct_xxx',
      });

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_xxx',
        applicationName: 'stripe-pwa-elements',
      });
    });
  });

  describe('intent client secret handling', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
      jest.spyOn(element.el, 'querySelector').mockReturnValue({ addEventListener: jest.fn() } as any);
      mockStripeService.state.loadStripeStatus = 'success';
    });

    it('#initStripe should pass intentClientSecret to stripeService.initialize', async () => {
      (element as any).intentClientSecret = 'pi_xxx_secret_xxx';
      await element.initStripe('pk_test_xxx');

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: undefined,
        applicationName: 'stripe-pwa-elements',
        clientSecret: 'pi_xxx_secret_xxx',
      });
    });

    it('#updateIntentClientSecret should re-initialize Elements with the new secret', async () => {
      mockStripeService.state.publishableKey = 'pk_test_xxx';
      (element as any).intentClientSecret = 'pi_new_secret_new';
      await element.updateIntentClientSecret();

      expect(mockStripeService.initialize).toHaveBeenCalledWith('pk_test_xxx', expect.objectContaining({ clientSecret: 'pi_new_secret_new' }));
      expect(mockPaymentElementManager.initialize).toHaveBeenCalled();
    });

    it('#updateIntentClientSecret should do nothing before the publishable key is known', async () => {
      await element.updateIntentClientSecret();

      expect(mockStripeService.initialize).not.toHaveBeenCalled();
    });
  });

  describe('startup mode', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
      element.initStripe = jest.fn();
      element.initStripeWithCheckoutSession = jest.fn();
      (element as any).publishableKey = 'pk_test_xxx';
    });

    it('uses Checkout Session mode when only checkout-session-client-secret is set', () => {
      (element as any).checkoutSessionClientSecret = 'cs_test_secret';
      (element as any).startStripe();

      expect(element.initStripeWithCheckoutSession).toHaveBeenCalledWith('pk_test_xxx', 'cs_test_secret', { stripeAccount: undefined });
      expect(element.initStripe).not.toHaveBeenCalled();
    });

    it('uses PaymentIntent mode otherwise', () => {
      (element as any).startStripe();

      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
      expect(element.initStripeWithCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe('#updateStripeAccountId', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
      element.initStripe = jest.fn();
      mockStripeService.state.publishableKey = 'pk_test_xxxx';
    });

    it('When call this, should call the #initStripe method only one time', async () => {
      await element.updateStripeAccountId('acct_xxx');
      expect(element.initStripe).toHaveBeenCalledTimes(1);
    });

    it('When call this, should call the #initStripe method with expected props', async () => {
      await element.updateStripeAccountId('acct_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxxx', {
        stripeAccount: 'acct_xxx',
      });
    });
  });

  describe('#updatePublishableKey', () => {
    let element: StripePaymentElement;

    beforeEach(() => {
      element = new StripePaymentElement();
      element.initStripe = jest.fn();
    });

    it('When call this, should call the #initStripe method only one time', async () => {
      await element.updatePublishableKey('pk_test_xxx');
      expect(element.initStripe).toHaveBeenCalledTimes(1);
    });

    it('When call this, should call the #initStripe method with expected props', async () => {
      await element.updatePublishableKey('pk_test_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', undefined);
    });

    it('When call this, should call the #initStripe method with expected props (with options)', async () => {
      mockStripeService.state.stripeAccount = 'acct_xxx';
      await element.updatePublishableKey('pk_test_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_xxx',
      });
    });
  });
});
