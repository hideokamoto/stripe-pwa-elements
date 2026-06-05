import { StripeCardElement } from '../stripe-card-element';
import type { IStripeService, ICardElementManager } from '../../../services/interfaces';
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
 * Unit tests for StripeCardElement component
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These are pure unit tests that test class logic in isolation
 * - No DOM rendering, no Stencil page context
 * - Fast, isolated, deterministic
 */
describe('stripe-card-element unit tests', () => {
  // Mock service implementations
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockCardElementManager: jest.Mocked<ICardElementManager>;

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

    mockCardElementManager = {
      getState: jest.fn().mockReturnValue({
        errorMessage: '',
        errorSource: undefined,
      }),
      initialize: jest.fn().mockResolvedValue({
        cardNumber: {} as any,
        cardExpiry: {} as any,
        cardCVC: {} as any,
      }),
      getElements: jest.fn().mockReturnValue(undefined),
      setError: jest.fn(),
      clearError: jest.fn(),
      unmount: jest.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    jest.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    jest.spyOn(factoryModule.serviceFactory, 'createCardElementManager').mockReturnValue(mockCardElementManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('#componentWillRender', () => {
    let element: StripeCardElement;

    beforeEach(() => {
      element = new StripeCardElement();
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
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxxx', undefined);
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
    let element: StripeCardElement;

    beforeEach(() => {
      element = new StripeCardElement();
    });

    it('should set the certain error message', async () => {
      const message = 'Error message is here';

      await element.setErrorMessage(message);
      expect(mockCardElementManager.setError).toHaveBeenCalledWith(message);
    });
  });

  describe('#initStripe', () => {
    let element: StripeCardElement;

    beforeEach(() => {
      element = new StripeCardElement();

      // Mock element.el.querySelector for form submission listener
      const mockFormElement = {
        addEventListener: jest.fn(),
      };
      jest.spyOn(element.el, 'querySelector').mockReturnValue(mockFormElement as any);

      // Mock successful initialization
      mockStripeService.state.loadStripeStatus = 'success';
      mockStripeService.initialize.mockResolvedValue(undefined);
      mockCardElementManager.initialize.mockResolvedValue({
        cardNumber: {} as any,
        cardExpiry: {} as any,
        cardCVC: {} as any,
      });
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

  describe('#updateStripeAccountId', () => {
    let element: StripeCardElement;

    beforeEach(() => {
      element = new StripeCardElement();
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

    it('Should not call initStripe when publishableKey is not set', async () => {
      mockStripeService.state.publishableKey = undefined;
      element.publishableKey = undefined;
      await element.updateStripeAccountId('acct_xxx');
      expect(element.initStripe).toHaveBeenCalledTimes(0);
    });

    it('Should fallback to publishableKey prop when service state is not initialized', async () => {
      mockStripeService.state.publishableKey = undefined;
      element.publishableKey = 'pk_prop_value';

      await element.updateStripeAccountId('acct_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_prop_value', {
        stripeAccount: 'acct_xxx',
      });
    });

    it('Should use prop value when publishableKey is set before service initialization', async () => {
      // Set publishableKey prop first
      element.publishableKey = 'pk_set_first';
      mockStripeService.state.publishableKey = undefined;

      // Then set stripeAccount
      await element.updateStripeAccountId('acct_xxx');

      // Should use the prop value, not the service state
      expect(element.initStripe).toHaveBeenCalledWith('pk_set_first', {
        stripeAccount: 'acct_xxx',
      });
    });
  });

  describe('#updatePublishableKey', () => {
    let element: StripeCardElement;

    beforeEach(() => {
      element = new StripeCardElement();
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
      element.stripeAccount = 'acct_xxx';
      await element.updatePublishableKey('pk_test_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_xxx',
      });
    });

    it('Should use stripeAccount prop value when service state is not yet initialized', async () => {
      // Simulate stripeAccount prop set before publishableKey
      element.stripeAccount = 'acct_prop_value';
      mockStripeService.state.stripeAccount = undefined; // Service state not initialized yet

      await element.updatePublishableKey('pk_test_xxx');
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_prop_value',
      });
    });

    it('Should honor stripeAccount prop even when set before publishableKey', async () => {
      // Set stripeAccount prop first
      element.stripeAccount = 'acct_set_first';
      mockStripeService.state.stripeAccount = undefined;

      // Then set publishableKey
      await element.updatePublishableKey('pk_test_xxx');

      // Should use the prop value, not the service state
      expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxx', {
        stripeAccount: 'acct_set_first',
      });
    });
  });
});
