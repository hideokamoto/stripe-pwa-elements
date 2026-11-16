import { newSpecPage } from '@stencil/core/testing';
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
 * Component tests for StripeCardElement
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-card-element.unit.spec.ts
 */
describe('stripe-card-element component tests', () => {
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

  describe('Rendering', () => {
    it('with the api key', async () => {
      const page = await newSpecPage({
        components: [StripeCardElement],
        html: `<stripe-card-element publishable-key='pk_test_xxx'></stripe-card-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('api key and zip code props', async () => {
      const page = await newSpecPage({
        components: [StripeCardElement],
        html: `<stripe-card-element zip="false"  publishable-key='pk_test_xxx'></stripe-card-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('disables the submit button after success and keeps it enabled after failure', async () => {
      const page = await newSpecPage({
        components: [StripeCardElement],
        html: `<stripe-card-element publishable-key='pk_test_xxx'></stripe-card-element>`,
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
        components: [StripeCardElement],
        html: `<stripe-card-element></stripe-card-element>`,
      });

      // Without publishable-key, the form should still render (no failure state)
      expect(page.root.textContent).toContain('Add your payment information');
      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();
      expect(page.root.textContent).toContain('Add your payment information');
    });

    it('should load stripe after setting the publishable-key (snapshot)', async () => {
      const page = await newSpecPage({
        components: [StripeCardElement],
        html: `<stripe-card-element zip="false"'></stripe-card-element>`,
      });

      page.root.setAttribute('publishable-key', 'yyyy');
      await page.waitForChanges();

      expect(page.root).toMatchSnapshot();
    });
  });
});
