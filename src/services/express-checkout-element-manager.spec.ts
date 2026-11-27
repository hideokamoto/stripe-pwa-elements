import { ExpressCheckoutElementManager } from './express-checkout-element-manager';
import type { IStripeService, ExpressCheckoutElementEventHandlers } from './interfaces';
import type { StripeExpressCheckoutElement } from '@stripe/stripe-js';
import type { Mocked } from 'vitest';

describe('ExpressCheckoutElementManager', () => {
  let manager: ExpressCheckoutElementManager;
  let mockStripeService: Mocked<IStripeService>;
  let mockElements: any;
  let mockExpressCheckoutElement: Mocked<StripeExpressCheckoutElement>;

  beforeEach(() => {
    // Create mock express checkout element
    mockExpressCheckoutElement = {
      mount: vi.fn(),
      unmount: vi.fn(),
      on: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    } as any;

    // Create mock elements
    mockElements = {
      create: vi.fn().mockReturnValue(mockExpressCheckoutElement),
      update: vi.fn(),
    };

    // Create mock stripe service
    mockStripeService = {
      state: {
        loadStripeStatus: 'success',
        applicationName: 'stripe-pwa-elements',
        publishableKey: 'pk_test_xxx',
        stripeAccount: undefined,
        stripe: {} as any,
        elements: mockElements,
        isCheckoutSession: false,
      },
      initialize: vi.fn(),
      onChange: vi.fn(),
      getStripe: vi.fn(),
      getElements: vi.fn().mockReturnValue(mockElements),
      getCheckout: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    manager = new ExpressCheckoutElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty error message', () => {
      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });

    it('should initialize with isReady as false', () => {
      const state = manager.getState();

      expect(state.isReady).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return current state with errorMessage property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('errorMessage');
    });

    it('should return current state with isReady property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('isReady');
    });
  });

  describe('initialize', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="express-checkout-element"></div>';
    });

    it('should throw error when stripe service not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement, { mode: 'payment' })).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create express checkout element with provided options', async () => {
      const options = {
        buttonType: { googlePay: 'checkout' as const },
        layout: { maxColumns: 2 },
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('expressCheckout', options);
    });

    it('should not pass mode, amount and currency to elements.create (they belong to stripe.elements())', async () => {
      await manager.initialize(containerElement, { mode: 'payment', amount: 1099, currency: 'usd', buttonHeight: 48 });

      expect(mockElements.create).toHaveBeenCalledWith('expressCheckout', { buttonHeight: 48 });
    });

    it('should convert string buttonHeight to number', async () => {
      const options = {
        mode: 'payment' as const,
        buttonHeight: '48px',
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('expressCheckout', {
        buttonHeight: 48,
      });
    });

    it('should keep numeric buttonHeight as is', async () => {
      const options = {
        mode: 'payment' as const,
        buttonHeight: 56,
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('expressCheckout', {
        buttonHeight: 56,
      });
    });

    it('should mount express checkout element to DOM', async () => {
      await manager.initialize(containerElement, { mode: 'payment' });

      const targetElement = containerElement.querySelector('#express-checkout-element');

      expect(mockExpressCheckoutElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return express checkout element instance', async () => {
      const result = await manager.initialize(containerElement, { mode: 'payment' });

      expect(result).toBe(mockExpressCheckoutElement);
    });

    it('should set up ready event listener', async () => {
      await manager.initialize(containerElement, { mode: 'payment' });

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should update isReady state when ready event fires', async () => {
      let readyHandler: (() => void) | undefined;

      mockExpressCheckoutElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'ready') {
          readyHandler = handler;
        }
        return mockExpressCheckoutElement;
      });

      await manager.initialize(containerElement, { mode: 'payment' });

      expect(readyHandler).toBeDefined();

      readyHandler!();

      const state = manager.getState();

      expect(state.isReady).toBe(true);
    });

    it('should set up onConfirm event handler when provided', async () => {
      const onConfirm = vi.fn();
      const eventHandlers: ExpressCheckoutElementEventHandlers = { onConfirm };

      await manager.initialize(containerElement, { mode: 'payment' }, eventHandlers);

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('confirm', onConfirm);
    });

    it('should set up onClick event handler when provided', async () => {
      const onClick = vi.fn();
      const eventHandlers: ExpressCheckoutElementEventHandlers = { onClick };

      await manager.initialize(containerElement, { mode: 'payment' }, eventHandlers);

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('click', onClick);
    });

    it('should set up onCancel event handler when provided', async () => {
      const onCancel = vi.fn();
      const eventHandlers: ExpressCheckoutElementEventHandlers = { onCancel };

      await manager.initialize(containerElement, { mode: 'payment' }, eventHandlers);

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('cancel', onCancel);
    });

    it('should set up onShippingAddressChange event handler when provided', async () => {
      const onShippingAddressChange = vi.fn();
      const eventHandlers: ExpressCheckoutElementEventHandlers = { onShippingAddressChange };

      await manager.initialize(containerElement, { mode: 'payment' }, eventHandlers);

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('shippingaddresschange', onShippingAddressChange);
    });

    it('should set up onShippingRateChange event handler when provided', async () => {
      const onShippingRateChange = vi.fn();
      const eventHandlers: ExpressCheckoutElementEventHandlers = { onShippingRateChange };

      await manager.initialize(containerElement, { mode: 'payment' }, eventHandlers);

      expect(mockExpressCheckoutElement.on).toHaveBeenCalledWith('shippingratechange', onShippingRateChange);
    });

    it('should unmount previous element before initializing new one', async () => {
      await manager.initialize(containerElement, { mode: 'payment' });
      await manager.initialize(containerElement, { mode: 'setup' });

      expect(mockExpressCheckoutElement.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElement', () => {
    it('should return undefined when not initialized', () => {
      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should return express checkout element after initialization', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });

      const element = manager.getElement();

      expect(element).toBe(mockExpressCheckoutElement);
    });
  });

  describe('update', () => {
    it('should warn when element not initialized', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

      manager.update({ amount: 2000 });

      expect(consoleSpy).toHaveBeenCalledWith('Express Checkout Element not initialized. Cannot update options.');

      consoleSpy.mockRestore();
    });

    it('should update element with new options', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment', amount: 1000 });

      manager.update({ buttonType: { googlePay: 'checkout' } });

      expect(mockExpressCheckoutElement.update).toHaveBeenCalledWith({ buttonType: { googlePay: 'checkout' } });
    });

    it('should update mode, amount and currency on the Elements group, not on the element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment', amount: 1000, currency: 'usd' });

      manager.update({ amount: 2000, buttonHeight: 48 });

      expect(mockElements.update).toHaveBeenCalledWith({ amount: 2000 });
      expect(mockExpressCheckoutElement.update).toHaveBeenCalledWith({ buttonHeight: 48 });
    });

    it('should not call element.update when only Elements group options change', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment', amount: 1000, currency: 'usd' });

      manager.update({ amount: 2000 });

      expect(mockElements.update).toHaveBeenCalledWith({ amount: 2000 });
      expect(mockExpressCheckoutElement.update).not.toHaveBeenCalled();
    });

    it('should pass mode and currency to the Elements group when they are updated', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment', amount: 1000, currency: 'usd' });

      manager.update({ mode: 'setup', currency: 'eur' });

      expect(mockElements.update).toHaveBeenCalledWith({ mode: 'setup', currency: 'eur' });
      expect(mockExpressCheckoutElement.update).not.toHaveBeenCalled();
    });

    it('should omit an invalid string buttonHeight', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment', buttonHeight: 'tall' });

      expect(mockElements.create).toHaveBeenCalledWith('expressCheckout', {});
    });

    it('should convert string buttonHeight to number when updating', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });

      manager.update({ buttonHeight: '64px' });

      expect(mockExpressCheckoutElement.update).toHaveBeenCalledWith({ buttonHeight: 64 });
    });
  });

  describe('setError', () => {
    it('should set error message in state', () => {
      manager.setError('Test error message');

      const state = manager.getState();

      expect(state.errorMessage).toBe('Test error message');
    });

    it('should update state with different error messages', () => {
      manager.setError('First error');
      manager.setError('Second error');

      const state = manager.getState();

      expect(state.errorMessage).toBe('Second error');
    });
  });

  describe('clearError', () => {
    it('should clear error message in state', () => {
      manager.setError('Test error message');
      manager.clearError();

      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });

    it('should be idempotent when called multiple times', () => {
      manager.clearError();
      manager.clearError();

      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });
  });

  describe('unmount', () => {
    it('should do nothing when element not initialized', () => {
      expect(() => manager.unmount()).not.toThrow();
    });

    it('should unmount express checkout element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });
      manager.unmount();

      expect(mockExpressCheckoutElement.unmount).toHaveBeenCalled();
    });

    it('should clear element reference after unmounting', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });
      manager.unmount();

      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should reset isReady to false after unmounting', async () => {
      let readyHandler: (() => void) | undefined;

      mockExpressCheckoutElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'ready') {
          readyHandler = handler;
        }
        return mockExpressCheckoutElement;
      });

      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });
      readyHandler!();

      expect(manager.getState().isReady).toBe(true);

      manager.unmount();

      expect(manager.getState().isReady).toBe(false);
    });

    it('should be idempotent when called multiple times', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="express-checkout-element"></div>';

      await manager.initialize(containerElement, { mode: 'payment' });
      manager.unmount();
      manager.unmount();

      expect(mockExpressCheckoutElement.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
