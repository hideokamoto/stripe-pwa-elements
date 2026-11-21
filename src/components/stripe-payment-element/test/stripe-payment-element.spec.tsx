import { newSpecPage } from '@stencil/core/testing';
import { StripePaymentElement } from '../stripe-payment-element';
import type { IStripeService, IPaymentElementManager } from '../../../services/interfaces';
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
 * Component tests for StripePaymentElement
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-payment-element.unit.spec.ts
 */
describe('stripe-payment-element component tests', () => {
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
      initialize: vi.fn().mockResolvedValue(undefined),
      onChange: vi.fn().mockReturnValue(vi.fn()),
      getStripe: vi.fn().mockReturnValue(undefined),
      getElements: vi.fn().mockReturnValue(undefined),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    mockPaymentElementManager = {
      getState: vi.fn().mockReturnValue({
        errorMessage: '',
      }),
      initialize: vi.fn().mockResolvedValue({} as any),
      getElement: vi.fn().mockReturnValue(undefined),
      setError: vi.fn(),
      clearError: vi.fn(),
      unmount: vi.fn(),
    } as any;

    // Spy on factory methods to return our mocks
    vi.spyOn(factoryModule.serviceFactory, 'createStripeService').mockReturnValue(mockStripeService);
    vi.spyOn(factoryModule.serviceFactory, 'createPaymentElementManager').mockReturnValue(mockPaymentElementManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('with the api key and client secret', async () => {
      const page = await newSpecPage({
        components: [StripePaymentElement],
        html: `<stripe-payment-element publishable-key='pk_test_xxx' intent-client-secret='pi_xxx_secret_xxx'></stripe-payment-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('with only api key (button should be disabled)', async () => {
      const page = await newSpecPage({
        components: [StripePaymentElement],
        html: `<stripe-payment-element publishable-key='pk_test_xxx'></stripe-payment-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('disables the submit button after success and keeps it enabled after failure', async () => {
      const page = await newSpecPage({
        components: [StripePaymentElement],
        html: `<stripe-payment-element publishable-key='pk_test_xxx' intent-client-secret='pi_xxx_secret_xxx'></stripe-payment-element>`,
      });

      const getButton = () => page.root.querySelector('button') as HTMLButtonElement;
      expect(getButton().hasAttribute('disabled')).toBe(false);

      await page.rootInstance.updateProgress('success');
      await page.waitForChanges();
      expect(getButton().hasAttribute('disabled')).toBe(true);

      await page.rootInstance.updateProgress('failure');
      await page.waitForChanges();
      expect(getButton().hasAttribute('disabled')).toBe(false);
    });

    it('should load stripe after setting the publishable-key', async () => {
      const page = await newSpecPage({
        components: [StripePaymentElement],
        html: `<stripe-payment-element></stripe-payment-element>`,
      });

      // Without publishable-key, the form should still render (no failure state)
      expect(page.root.textContent).toContain('Add your payment information');
      page.root.setAttribute('publishable-key', 'pk_test_yyyy');
      await page.waitForChanges();
      expect(page.root.textContent).toContain('Add your payment information');
    });

    it('should load stripe after setting the publishable-key (snapshot)', async () => {
      const page = await newSpecPage({
        components: [StripePaymentElement],
        html: `<stripe-payment-element></stripe-payment-element>`,
      });

      page.root.setAttribute('publishable-key', 'pk_test_yyyy');
      await page.waitForChanges();

      expect(page.root).toMatchSnapshot();
    });
  });
});
