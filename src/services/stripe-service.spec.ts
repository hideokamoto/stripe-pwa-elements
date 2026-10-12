/**
 * Unit tests for StripeServiceClass
 *
 * Following Kent Beck's unit test philosophy:
 * - Test one thing per test
 * - Run in milliseconds
 * - Completely isolated with mocks
 *
 * Note: We mock @stencil/store to avoid its internal async behavior
 * that can cause test timeouts.
 */

// Mock @stencil/store before importing anything
const mockStoreState: Record<string, any> = {
  loadStripeStatus: '',
  applicationName: 'stripe-pwa-elements',
  isCheckoutSession: false,
};

const mockStore = {
  state: mockStoreState,
  onChange: jest.fn().mockReturnValue(jest.fn()),
  reset: jest.fn(() => {
    mockStoreState.loadStripeStatus = '';
    mockStoreState.applicationName = 'stripe-pwa-elements';
    mockStoreState.isCheckoutSession = false;
    mockStoreState.publishableKey = undefined;
    mockStoreState.stripeAccount = undefined;
    mockStoreState.stripe = undefined;
    mockStoreState.elements = undefined;
    mockStoreState.checkout = undefined;
  }),
  dispose: jest.fn(),
};

jest.mock('@stencil/store', () => ({
  createStore: jest.fn(() => mockStore),
}));

// Mock loadStripe from @stripe/stripe-js
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(),
}));

import { loadStripe } from '@stripe/stripe-js';
import { StripeServiceClass } from './stripe-service';

describe('StripeServiceClass', () => {
  let service: StripeServiceClass;
  let mockStripe: any;
  let mockElements: any;
  let mockCheckout: any;

  beforeEach(() => {
    // Reset store state
    mockStoreState.loadStripeStatus = '';
    mockStoreState.applicationName = 'stripe-pwa-elements';
    mockStoreState.isCheckoutSession = false;
    mockStoreState.publishableKey = undefined;
    mockStoreState.stripeAccount = undefined;
    mockStoreState.stripe = undefined;
    mockStoreState.elements = undefined;
    mockStoreState.checkout = undefined;

    jest.clearAllMocks();

    mockElements = { create: jest.fn() };

    mockCheckout = {
      createPaymentElement: jest.fn(),
      confirm: jest.fn(),
      session: jest.fn(),
    };

    mockStripe = {
      elements: jest.fn().mockReturnValue(mockElements),
      initCheckoutElementsSdk: jest.fn().mockReturnValue(mockCheckout),
      registerAppInfo: jest.fn(),
    };

    (loadStripe as jest.Mock).mockResolvedValue(mockStripe);

    service = new StripeServiceClass();
  });

  describe('initial state', () => {
    it('has empty loadStripeStatus', () => {
      expect(service.state.loadStripeStatus).toBe('');
    });

    it('has default application name', () => {
      expect(service.state.applicationName).toBe('stripe-pwa-elements');
    });

    it('has isCheckoutSession as false', () => {
      expect(service.state.isCheckoutSession).toBe(false);
    });

    it('has no stripe instance', () => {
      expect(service.getStripe()).toBeUndefined();
    });

    it('has no elements instance', () => {
      expect(service.getElements()).toBeUndefined();
    });

    it('has no checkout instance', () => {
      expect(service.getCheckout()).toBeUndefined();
    });
  });

  describe('initialize', () => {
    it('loads stripe with publishable key', async () => {
      await service.initialize('pk_test_xxx');

      expect(loadStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
    });

    it('loads stripe with stripe account', async () => {
      await service.initialize('pk_test_xxx', { stripeAccount: 'acct_xxx' });

      expect(loadStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: 'acct_xxx' });
    });

    it('sets loadStripeStatus to success', async () => {
      await service.initialize('pk_test_xxx');

      expect(service.state.loadStripeStatus).toBe('success');
    });

    it('stores publishable key', async () => {
      await service.initialize('pk_test_xxx');

      expect(service.state.publishableKey).toBe('pk_test_xxx');
    });

    it('stores stripe account', async () => {
      await service.initialize('pk_test_xxx', { stripeAccount: 'acct_xxx' });

      expect(service.state.stripeAccount).toBe('acct_xxx');
    });

    it('updates application name', async () => {
      await service.initialize('pk_test_xxx', { applicationName: 'custom-app' });

      expect(service.state.applicationName).toBe('custom-app');
    });

    it('registers app info', async () => {
      await service.initialize('pk_test_xxx');

      expect(mockStripe.registerAppInfo).toHaveBeenCalledWith({
        name: 'stripe-pwa-elements',
      });
    });

    it('creates elements instance', async () => {
      await service.initialize('pk_test_xxx');

      expect(mockStripe.elements).toHaveBeenCalled();
      expect(service.getElements()).toBe(mockElements);
    });

    it('stores stripe instance', async () => {
      await service.initialize('pk_test_xxx');

      expect(service.getStripe()).toBe(mockStripe);
    });

    it('sets isCheckoutSession to false', async () => {
      await service.initialize('pk_test_xxx');

      expect(service.state.isCheckoutSession).toBe(false);
    });

    it('clears checkout instance', async () => {
      await service.initialize('pk_test_xxx');

      expect(service.getCheckout()).toBeUndefined();
    });

    it('handles errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (loadStripe as jest.Mock).mockRejectedValue(new Error('Network error'));

      await service.initialize('pk_test_xxx');

      expect(service.state.loadStripeStatus).toBe('failure');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('skips re-initialization with same config', async () => {
      // First init
      await service.initialize('pk_test_xxx');
      // Simulate already loaded state
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx');

      expect(loadStripe).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeWithCheckoutSession', () => {
    it('loads stripe with publishable key', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(loadStripe).toHaveBeenCalledWith('pk_test_xxx', { stripeAccount: undefined });
    });

    it('sets isCheckoutSession to true', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.state.isCheckoutSession).toBe(true);
    });

    it('initializes checkout with client secret', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(mockStripe.initCheckoutElementsSdk).toHaveBeenCalledWith({
        clientSecret: 'cs_test_secret',
        elementsOptions: undefined,
      });
    });

    it('passes elementsOptions to initCheckoutElementsSdk', async () => {
      const elementsOptions = { appearance: { theme: 'stripe' as const } };

      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { elementsOptions });

      expect(mockStripe.initCheckoutElementsSdk).toHaveBeenCalledWith({
        clientSecret: 'cs_test_secret',
        elementsOptions,
      });
    });

    it('stores checkout instance', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.getCheckout()).toBe(mockCheckout);
    });

    it('clears elements instance', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.getElements()).toBeUndefined();
    });

    it('sets loadStripeStatus to success', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.state.loadStripeStatus).toBe('success');
    });

    it('handles errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (loadStripe as jest.Mock).mockRejectedValue(new Error('Network error'));

      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.state.loadStripeStatus).toBe('failure');
      consoleSpy.mockRestore();
    });
  });

  describe('onChange', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = service.onChange('loadStripeStatus', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('delegates to store.onChange', () => {
      const callback = jest.fn();
      service.onChange('loadStripeStatus', callback);

      expect(mockStore.onChange).toHaveBeenCalledWith('loadStripeStatus', callback);
    });
  });

  describe('reset', () => {
    it('resets state to initial values', async () => {
      await service.initialize('pk_test_xxx');

      service.reset();

      expect(mockStore.reset).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('does not throw', () => {
      expect(() => service.dispose()).not.toThrow();
    });

    it('disposes the store', () => {
      service.dispose();

      expect(mockStore.dispose).toHaveBeenCalled();
    });
  });
});
