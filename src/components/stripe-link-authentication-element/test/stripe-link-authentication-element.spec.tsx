import { newSpecPage } from '@stencil/core/testing';
import { StripeLinkAuthenticationElement } from '../stripe-link-authentication-element';
import type { IStripeService, ILinkAuthenticationElementManager } from '../../../services/interfaces';
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
 * Component tests for StripeLinkAuthenticationElement
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-link-authentication-element.unit.spec.ts
 */
describe('stripe-link-authentication-element component tests', () => {
  // Mock service implementations
  let mockStripeService: Mocked<IStripeService>;
  let mockLinkAuthenticationElementManager: Mocked<ILinkAuthenticationElementManager>;

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

  describe('Rendering', () => {
    it('with the api key', async () => {
      const page = await newSpecPage({
        components: [StripeLinkAuthenticationElement],
        html: `<stripe-link-authentication-element publishable-key='pk_test_xxx'></stripe-link-authentication-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('with default email', async () => {
      const page = await newSpecPage({
        components: [StripeLinkAuthenticationElement],
        html: `<stripe-link-authentication-element publishable-key='pk_test_xxx' default-email='test@example.com'></stripe-link-authentication-element>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it('should load stripe after setting the publishable-key', async () => {
      const page = await newSpecPage({
        components: [StripeLinkAuthenticationElement],
        html: `<stripe-link-authentication-element></stripe-link-authentication-element>`,
      });

      page.root.setAttribute('publishable-key', 'pk_test_yyyy');
      await page.waitForChanges();
      expect(page.root.querySelector('.stripe-link-authentication-wrap')).toBeTruthy();
    });
  });
});
