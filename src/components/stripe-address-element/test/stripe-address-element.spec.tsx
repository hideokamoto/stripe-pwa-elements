import { newSpecPage } from '@stencil/core/testing';
import { StripeAddressElement } from '../stripe-address-element';
import type { IStripeService, IAddressElementManager } from '../../../services/interfaces';
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
 * Component tests for StripeAddressElement
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-address-element.unit.spec.ts
 */
describe('stripe-address-element component tests', () => {
  // Mock service implementations
  let mockStripeService: Mocked<IStripeService>;
  let mockAddressElementManager: Mocked<IAddressElementManager>;

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

    mockAddressElementManager = {
      getState: vi.fn().mockReturnValue({
        errorMessage: '',
        isComplete: false,
      }),
      initialize: vi.fn().mockResolvedValue({} as any),
      getElement: vi.fn().mockReturnValue(undefined),
      setError: vi.fn(),
      clearError: vi.fn(),
      unmount: vi.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    vi.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    vi.spyOn(factoryModule.serviceFactory, 'createAddressElementManager').mockReturnValue(mockAddressElementManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('with the api key', async () => {
      const page = await newSpecPage({
        components: [StripeAddressElement],
        html: `<stripe-address-element publishable-key='pk_test_xxx'></stripe-address-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('api key and mode props', async () => {
      const page = await newSpecPage({
        components: [StripeAddressElement],
        html: `<stripe-address-element mode="shipping" publishable-key='pk_test_xxx'></stripe-address-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('should load stripe after setting the publishable-key', async () => {
      const page = await newSpecPage({
        components: [StripeAddressElement],
        html: `<stripe-address-element></stripe-address-element>`,
      });

      // Without publishable-key, the form should still render (no failure state)
      expect(page.root.textContent).toContain('Billing address');
      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();
      expect(page.root.textContent).toContain('Billing address');
    });

    it('should load stripe after setting the publishable-key (snapshot)', async () => {
      const page = await newSpecPage({
        components: [StripeAddressElement],
        html: `<stripe-address-element></stripe-address-element>`,
      });

      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();

      expect(page.root).toMatchSnapshot();
    });
  });
});
