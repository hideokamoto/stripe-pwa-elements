import { PaymentElementManager } from './payment-element-manager';
import type { IStripeService } from './interfaces';
import type { StripePaymentElement, StripeCheckoutElementsSdk } from '@stripe/stripe-js';

describe('PaymentElementManager', () => {
  let manager: PaymentElementManager;
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockElements: any;
  let mockPaymentElement: jest.Mocked<StripePaymentElement>;
  let mockCheckout: jest.Mocked<StripeCheckoutElementsSdk>;

  beforeEach(() => {
    // Create mock payment element
    mockPaymentElement = {
      mount: jest.fn(),
      unmount: jest.fn(),
      on: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      collapse: jest.fn(),
    } as any;

    // Create mock elements
    mockElements = {
      create: jest.fn().mockReturnValue(mockPaymentElement),
    };

    // Create mock checkout
    mockCheckout = {
      createPaymentElement: jest.fn().mockReturnValue(mockPaymentElement),
      confirm: jest.fn(),
      session: jest.fn(),
    } as any;

    // Create mock stripe service for Payment Intent mode
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
      initialize: jest.fn(),
      initializeWithCheckoutSession: jest.fn(),
      onChange: jest.fn(),
      getStripe: jest.fn(),
      getElements: jest.fn().mockReturnValue(mockElements),
      getCheckout: jest.fn().mockReturnValue(undefined),
      reset: jest.fn(),
      dispose: jest.fn(),
    } as any;

    manager = new PaymentElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty error message', () => {
      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });
  });

  describe('getState', () => {
    it('should return current state with errorMessage property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('errorMessage');
    });
  });

  describe('initialize in Payment Intent mode', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="payment-element"></div>';
    });

    it('should throw error when stripe service not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement)).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create payment element with default options', async () => {
      await manager.initialize(containerElement);

      expect(mockElements.create).toHaveBeenCalledWith('payment', {});
    });

    it('should create payment element with provided options', async () => {
      const options = {
        layout: 'tabs' as const,
        defaultValues: {
          billingDetails: {
            name: 'John Doe',
          },
        },
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('payment', options);
    });

    it('should mount payment element to DOM', async () => {
      await manager.initialize(containerElement);

      const targetElement = containerElement.querySelector('#payment-element');

      expect(mockPaymentElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return payment element instance', async () => {
      const result = await manager.initialize(containerElement);

      expect(result).toBe(mockPaymentElement);
    });

    it('should unmount previous element before initializing new one', async () => {
      await manager.initialize(containerElement);
      await manager.initialize(containerElement);

      expect(mockPaymentElement.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('initialize in Checkout Session mode', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="payment-element"></div>';

      // Configure for Checkout Session mode
      mockStripeService.state.isCheckoutSession = true;
      mockStripeService.state.elements = undefined;
      mockStripeService.state.checkout = mockCheckout as any;
      mockStripeService.getElements.mockReturnValue(undefined);
      mockStripeService.getCheckout.mockReturnValue(mockCheckout);
    });

    it('should throw error when checkout not initialized', async () => {
      mockStripeService.getCheckout.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement)).rejects.toThrow('StripeService not initialized with Checkout Session. Call StripeService.initializeWithCheckoutSession() first.');
    });

    it('should create payment element using checkout.createPaymentElement', async () => {
      await manager.initialize(containerElement);

      expect(mockCheckout.createPaymentElement).toHaveBeenCalled();
    });

    it('should create payment element with provided options', async () => {
      const options = {
        layout: 'accordion' as const,
      };

      await manager.initialize(containerElement, options);

      expect(mockCheckout.createPaymentElement).toHaveBeenCalledWith(options);
    });

    it('should mount payment element to DOM in checkout session mode', async () => {
      await manager.initialize(containerElement);

      const targetElement = containerElement.querySelector('#payment-element');

      expect(mockPaymentElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return payment element instance in checkout session mode', async () => {
      const result = await manager.initialize(containerElement);

      expect(result).toBe(mockPaymentElement);
    });
  });

  describe('getElement', () => {
    it('should return undefined when not initialized', () => {
      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should return payment element after initialization', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="payment-element"></div>';

      await manager.initialize(containerElement);

      const element = manager.getElement();

      expect(element).toBe(mockPaymentElement);
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

    it('should unmount payment element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="payment-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      expect(mockPaymentElement.unmount).toHaveBeenCalled();
    });

    it('should clear element reference after unmounting', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="payment-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should be idempotent when called multiple times', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="payment-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();
      manager.unmount();

      expect(mockPaymentElement.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
