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

const { mockStore, mockStoreState } = vi.hoisted(() => {
  const mockStoreState: Record<string, any> = {
    loadStripeStatus: '',
    applicationName: 'stripe-pwa-elements',
    isCheckoutSession: false,
  };

  const mockStore = {
    state: mockStoreState,
    onChange: vi.fn().mockReturnValue(vi.fn()),
    reset: vi.fn(() => {
      mockStoreState.loadStripeStatus = '';
      mockStoreState.applicationName = 'stripe-pwa-elements';
      mockStoreState.isCheckoutSession = false;
      mockStoreState.publishableKey = undefined;
      mockStoreState.stripeAccount = undefined;
      mockStoreState.stripe = undefined;
      mockStoreState.elements = undefined;
      mockStoreState.checkout = undefined;
    }),
    dispose: vi.fn(),
  };

  return { mockStore, mockStoreState };
});

vi.mock('@stencil/store', () => ({
  createStore: vi.fn(() => mockStore),
}));

// Mock loadStripe from @stripe/stripe-js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
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

    vi.clearAllMocks();

    mockElements = { create: vi.fn() };

    mockCheckout = {
      createPaymentElement: vi.fn(),
      confirm: vi.fn(),
      session: vi.fn(),
    };

    mockStripe = {
      elements: vi.fn().mockReturnValue(mockElements),
      initCheckoutElementsSdk: vi.fn().mockReturnValue(mockCheckout),
      registerAppInfo: vi.fn(),
    };

    vi.mocked(loadStripe).mockResolvedValue(mockStripe);

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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(loadStripe).mockRejectedValue(new Error('Network error'));

      await service.initialize('pk_test_xxx');

      expect(service.state.loadStripeStatus).toBe('failure');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('creates elements without options when clientSecret is not given', async () => {
      await service.initialize('pk_test_xxx');

      expect(mockStripe.elements).toHaveBeenCalledWith();
    });

    it('passes clientSecret to stripe.elements()', async () => {
      await service.initialize('pk_test_xxx', { clientSecret: 'pi_xxx_secret_xxx' });

      expect(mockStripe.elements).toHaveBeenCalledWith({ clientSecret: 'pi_xxx_secret_xxx' });
    });

    it('passes elementsOptions to stripe.elements() when clientSecret is not given', async () => {
      const elementsOptions = { mode: 'payment' as const, amount: 1000, currency: 'usd' };

      await service.initialize('pk_test_xxx', { elementsOptions });

      expect(mockStripe.elements).toHaveBeenCalledWith(elementsOptions);
    });

    it('prefers clientSecret over elementsOptions', async () => {
      await service.initialize('pk_test_xxx', { clientSecret: 'pi_xxx_secret_xxx', elementsOptions: { mode: 'payment', amount: 1000, currency: 'usd' } });

      expect(mockStripe.elements).toHaveBeenCalledWith({ clientSecret: 'pi_xxx_secret_xxx' });
    });

    it('recreates elements when elementsOptions change', async () => {
      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 1000, currency: 'usd' } });
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 2000, currency: 'usd' } });

      expect(mockStripe.elements).toHaveBeenCalledTimes(2);
      expect(mockStripe.elements).toHaveBeenLastCalledWith({ mode: 'payment', amount: 2000, currency: 'usd' });
    });

    it('skips re-initialization when elementsOptions are unchanged', async () => {
      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 1000, currency: 'usd' } });
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 1000, currency: 'usd' } });

      expect(loadStripe).toHaveBeenCalledTimes(1);
    });

    it('recreates elements when clientSecret changes', async () => {
      await service.initialize('pk_test_xxx', { clientSecret: 'pi_1_secret_1' });
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx', { clientSecret: 'pi_2_secret_2' });

      expect(mockStripe.elements).toHaveBeenCalledTimes(2);
      expect(mockStripe.elements).toHaveBeenLastCalledWith({ clientSecret: 'pi_2_secret_2' });
    });

    it('skips re-initialization when clientSecret is unchanged', async () => {
      await service.initialize('pk_test_xxx', { clientSecret: 'pi_1_secret_1' });
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx', { clientSecret: 'pi_1_secret_1' });

      expect(loadStripe).toHaveBeenCalledTimes(1);
    });

    it('re-initializes elements when switching back from Checkout Session mode', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_xxx_secret_xxx');
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx', { clientSecret: 'pi_1_secret_1' });

      expect(mockStripe.elements).toHaveBeenCalledWith({ clientSecret: 'pi_1_secret_1' });
      expect(service.getElements()).toBe(mockElements);
    });

    it('ignores a stale initialize that finishes after a newer one', async () => {
      const staleElements = { stale: true };
      const freshElements = { fresh: true };
      let resolveStale: (v: any) => void = () => undefined;
      const staleStripe = { registerAppInfo: vi.fn(), elements: vi.fn(() => staleElements) };
      const freshStripe = { registerAppInfo: vi.fn(), elements: vi.fn(() => freshElements) };

      vi.mocked(loadStripe)
        .mockReturnValueOnce(new Promise(resolve => (resolveStale = resolve)))
        .mockResolvedValueOnce(freshStripe as any);

      const stale = service.initialize('pk_test_xxx', { clientSecret: 'pi_1_secret_1' });
      await service.initialize('pk_test_xxx', { clientSecret: 'pi_2_secret_2' });
      resolveStale(staleStripe);
      await stale;

      expect(freshStripe.elements).toHaveBeenCalledWith({ clientSecret: 'pi_2_secret_2' });
      expect(staleStripe.registerAppInfo).not.toHaveBeenCalled();
      expect(staleStripe.elements).not.toHaveBeenCalled();
      expect(service.getElements()).toBe(freshElements);
      expect(service.state.loadStripeStatus).toBe('success');
    });

    it('does not drop an in-flight initialize when it is called again with the same new config', async () => {
      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 1000, currency: 'usd' } });
      mockStoreState.stripe = mockStripe;

      const newElements = { next: true };
      let resolveLoad: (v: any) => void = () => undefined;
      const nextStripe = { registerAppInfo: vi.fn(), elements: vi.fn(() => newElements) };

      vi.mocked(loadStripe).mockReturnValueOnce(new Promise(resolve => (resolveLoad = resolve)));

      const first = service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 2000, currency: 'usd' } });
      await service.initialize('pk_test_xxx', { elementsOptions: { mode: 'payment', amount: 2000, currency: 'usd' } });
      resolveLoad(nextStripe);
      await first;

      expect(nextStripe.elements).toHaveBeenCalledWith({ mode: 'payment', amount: 2000, currency: 'usd' });
      expect(service.getElements()).toBe(newElements);
      expect(mockStoreState.loadStripeStatus).toBe('success');
    });

    it('skips re-initialization with same config', async () => {
      // First init
      await service.initialize('pk_test_xxx');
      // Simulate already loaded state
      mockStoreState.stripe = mockStripe;

      await service.initialize('pk_test_xxx');

      expect(loadStripe).toHaveBeenCalledTimes(1);
    });

    it('does not store an empty stripeAccount', async () => {
      await service.initialize('pk_test_xxx', { stripeAccount: '' });

      expect(service.state.stripeAccount).toBeUndefined();
    });

    it('does not replace the default application name with an empty string', async () => {
      await service.initialize('pk_test_xxx', { applicationName: '' });

      expect(service.state.applicationName).toBe('stripe-pwa-elements');
    });

    it('does not pass an empty clientSecret to stripe.elements()', async () => {
      await service.initialize('pk_test_xxx', { clientSecret: '' });

      expect(mockStripe.elements).toHaveBeenCalledWith();
    });

    it('keeps the previous checkout instance when creating elements throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');
      mockStripe.elements.mockImplementation(() => {
        throw new Error('elements failed');
      });

      await service.initialize('pk_test_xxx', { clientSecret: 'pi_secret' });

      expect(service.state.loadStripeStatus).toBe('failure');
      expect(service.state.isCheckoutSession).toBe(false);
      expect(service.getStripe()).toBe(mockStripe);
      expect(service.getCheckout()).toBe(mockCheckout);
      expect(service.getElements()).toBeUndefined();
      consoleSpy.mockRestore();
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

    it('passes defaultValues to initCheckoutElementsSdk', async () => {
      const defaultValues = { email: 'jenny@example.com', billingAddress: { name: 'Jenny', address: { country: 'JP' } } };

      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { defaultValues });

      expect(mockStripe.initCheckoutElementsSdk).toHaveBeenCalledWith({
        clientSecret: 'cs_test_secret',
        elementsOptions: undefined,
        defaultValues,
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(loadStripe).mockRejectedValue(new Error('Network error'));

      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.state.loadStripeStatus).toBe('failure');
      consoleSpy.mockRestore();
    });

    it('does not store an empty stripeAccount', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { stripeAccount: '' });

      expect(service.state.stripeAccount).toBeUndefined();
    });

    it('does not replace the default application name with an empty string', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { applicationName: '' });

      expect(service.state.applicationName).toBe('stripe-pwa-elements');
    });

    it('stores stripeAccount', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { stripeAccount: 'acct_xxx' });

      expect(service.state.stripeAccount).toBe('acct_xxx');
    });

    it('stores a custom application name', async () => {
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret', { applicationName: 'custom-app' });

      expect(service.state.applicationName).toBe('custom-app');
    });

    it('ignores a stale checkout initialize that finishes after a newer one', async () => {
      const staleCheckout = { stale: true };
      const freshCheckout = { fresh: true };
      let resolveStale: (v: typeof mockStripe) => void = () => undefined;
      const staleStripe = {
        registerAppInfo: vi.fn(),
        initCheckoutElementsSdk: vi.fn(() => staleCheckout),
      };
      const freshStripe = {
        registerAppInfo: vi.fn(),
        initCheckoutElementsSdk: vi.fn(() => freshCheckout),
      };

      vi.mocked(loadStripe)
        .mockReturnValueOnce(new Promise(resolve => (resolveStale = resolve)))
        .mockResolvedValueOnce(freshStripe as any);

      const stale = service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret_1');
      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret_2');
      resolveStale(staleStripe as any);
      await stale;

      expect(freshStripe.initCheckoutElementsSdk).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'cs_test_secret_2' }));
      expect(staleStripe.registerAppInfo).not.toHaveBeenCalled();
      expect(staleStripe.initCheckoutElementsSdk).not.toHaveBeenCalled();
      expect(service.getCheckout()).toBe(freshCheckout);
      expect(service.state.loadStripeStatus).toBe('success');
    });

    it('keeps the previous elements instance when creating checkout throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await service.initialize('pk_test_xxx');
      mockStripe.initCheckoutElementsSdk.mockImplementation(() => {
        throw new Error('checkout failed');
      });

      await service.initializeWithCheckoutSession('pk_test_xxx', 'cs_test_secret');

      expect(service.state.loadStripeStatus).toBe('failure');
      expect(service.state.isCheckoutSession).toBe(true);
      expect(service.getStripe()).toBe(mockStripe);
      expect(service.getElements()).toBe(mockElements);
      expect(service.getCheckout()).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe('onChange', () => {
    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = service.onChange('loadStripeStatus', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('delegates to store.onChange', () => {
      const callback = vi.fn();
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

    it('disposes onChange listeners registered with the store', () => {
      const disposeA = vi.fn();
      const disposeB = vi.fn();

      vi.mocked(mockStore.onChange).mockReturnValueOnce(disposeA).mockReturnValueOnce(disposeB);

      service.onChange('loadStripeStatus', vi.fn());
      service.onChange('publishableKey', vi.fn());

      service.dispose();

      expect(disposeA).toHaveBeenCalledTimes(1);
      expect(disposeB).toHaveBeenCalledTimes(1);
    });
  });
});
