import { StripeLinkAuthenticationElement } from '../stripe-link-authentication-element';
import type { IStripeService, ILinkAuthenticationElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';

// Mock loadStripe to avoid actual network calls
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() =>
    Promise.resolve({
      registerAppInfo: vi.fn(),
      elements: vi.fn(() => ({})),
    }),
  ),
}));

// Mock i18n
vi.mock('../../../utils/i18n', () => ({
  i18n: {
    t: (key: string) => key,
  },
}));

/**
 * Unit tests for StripeLinkAuthenticationElement component
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These are pure unit tests that test class logic in isolation
 * - No DOM rendering, no Stencil page context
 * - Fast, isolated, deterministic
 */
describe('stripe-link-authentication-element unit tests', () => {
  // Mock service implementations
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockLinkAuthenticationElementManager: jest.Mocked<ILinkAuthenticationElementManager>;

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
      initialize: vi.fn().mockResolvedValue(undefined),
      onChange: vi.fn().mockReturnValue(vi.fn()),
      getStripe: vi.fn().mockReturnValue(undefined),
      getElements: vi.fn().mockReturnValue(undefined),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    mockLinkAuthenticationElementManager = {
      getState: vi.fn().mockReturnValue({
        errorMessage: '',
        email: undefined,
      }),
      onChange: vi.fn().mockReturnValue(vi.fn()),
      initialize: vi.fn().mockResolvedValue({} as any),
      getElement: vi.fn().mockReturnValue(undefined),
      setError: vi.fn(),
      clearError: vi.fn(),
      unmount: vi.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    vi.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    vi.spyOn(factoryModule.serviceFactory, 'createLinkAuthenticationElementManager').mockReturnValue(mockLinkAuthenticationElementManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#componentWillRender', () => {
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();
      element.initStripe = vi.fn();
    });

    it.each([['' as const], ['failure' as const]])('If the publishableKey is not provided, should not call initStripe method(status: %s)', async loadingStatus => {
      mockStripeService.state.loadStripeStatus = loadingStatus;
      element.componentWillRender();
      expect(element.initStripe).toHaveBeenCalledTimes(0);
    });

    it.each([['' as const], ['failure' as const]])(
      'Should call initStripe method when the status is not a part of "success" or "loading" (status: %s)',
      async loadingStatus => {
        mockStripeService.state.publishableKey = 'pk_test_xxxx';
        mockStripeService.state.loadStripeStatus = loadingStatus;
        element.componentWillRender();
        expect(element.initStripe).toHaveBeenCalledWith('pk_test_xxxx', {
          stripeAccount: undefined,
        });
      },
    );

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
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();
    });

    it('should set the certain error message', async () => {
      const message = 'Error message is here';

      await element.setErrorMessage(message);
      expect(mockLinkAuthenticationElementManager.setError).toHaveBeenCalledWith(message);
    });
  });

  describe('#getEmail', () => {
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();
    });

    it('should return the current email value', async () => {
      mockLinkAuthenticationElementManager.getState.mockReturnValue({
        errorMessage: '',
        email: 'test@example.com',
      });

      const email = await element.getEmail();
      expect(email).toBe('test@example.com');
    });

    it('should return undefined when no email is set', async () => {
      mockLinkAuthenticationElementManager.getState.mockReturnValue({
        errorMessage: '',
        email: undefined,
      });

      const email = await element.getEmail();
      expect(email).toBeUndefined();
    });
  });

  describe('#initStripe', () => {
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();

      // Mock successful initialization
      mockStripeService.state.loadStripeStatus = 'success';
      mockStripeService.initialize.mockResolvedValue(undefined);
      mockLinkAuthenticationElementManager.initialize.mockResolvedValue({} as any);
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
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();
      element.initStripe = vi.fn();
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
  });

  describe('#updatePublishableKey', () => {
    let element: StripeLinkAuthenticationElement;

    beforeEach(() => {
      element = new StripeLinkAuthenticationElement();
      element.initStripe = vi.fn();
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
  });
});
