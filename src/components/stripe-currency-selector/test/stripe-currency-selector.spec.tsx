import { newSpecPage } from '@stencil/core/testing';
import { StripeCurrencySelector } from '../stripe-currency-selector';
import type { IStripeService, ICurrencySelectorElementManager } from '../../../services/interfaces';
import * as factoryModule from '../../../services/factory';
import type { Mocked } from 'vitest';

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
 * Component tests for StripeCurrencySelector
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-currency-selector.unit.spec.ts
 */
describe('stripe-currency-selector component tests', () => {
  // Mock service implementations
  let mockStripeService: Mocked<IStripeService>;
  let mockCurrencySelectorElementManager: Mocked<ICurrencySelectorElementManager>;

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

    mockCurrencySelectorElementManager = {
      getState: vi.fn().mockReturnValue({
        errorMessage: '',
        selectedCurrency: undefined,
      }),
      initialize: vi.fn().mockResolvedValue({} as any),
      getElement: vi.fn().mockReturnValue(undefined),
      setError: vi.fn(),
      clearError: vi.fn(),
      unmount: vi.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    vi.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    vi.spyOn(factoryModule.serviceFactory, 'createCurrencySelectorElementManager').mockReturnValue(mockCurrencySelectorElementManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('with the api key', async () => {
      const page = await newSpecPage({
        components: [StripeCurrencySelector],
        html: `<stripe-currency-selector publishable-key='pk_test_xxx'></stripe-currency-selector>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('with client secret', async () => {
      const page = await newSpecPage({
        components: [StripeCurrencySelector],
        html: `<stripe-currency-selector publishable-key='pk_test_xxx' client-secret='cs_test_xxx'></stripe-currency-selector>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('should load stripe after setting the publishable-key', async () => {
      const page = await newSpecPage({
        components: [StripeCurrencySelector],
        html: `<stripe-currency-selector></stripe-currency-selector>`,
      });

      // Without publishable-key, the element should still render
      expect(page.root).toBeTruthy();
      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();
      expect(page.root).toBeTruthy();
    });

    it('should load stripe after setting the publishable-key (snapshot)', async () => {
      const page = await newSpecPage({
        components: [StripeCurrencySelector],
        html: `<stripe-currency-selector></stripe-currency-selector>`,
      });

      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();

      expect(page.root).toMatchSnapshot();
    });
  });
});
