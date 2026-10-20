import { LinkAuthenticationElementManager } from './link-authentication-element-manager';
import type { IStripeService } from './interfaces';
import type { StripeLinkAuthenticationElement } from '@stripe/stripe-js';

describe('LinkAuthenticationElementManager', () => {
  let manager: LinkAuthenticationElementManager;
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockElements: any;
  let mockLinkAuthenticationElement: jest.Mocked<StripeLinkAuthenticationElement>;

  beforeEach(() => {
    // Create mock link authentication element
    mockLinkAuthenticationElement = {
      mount: jest.fn(),
      unmount: jest.fn(),
      on: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    } as any;

    // Create mock elements
    mockElements = {
      create: jest.fn().mockReturnValue(mockLinkAuthenticationElement),
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
      initialize: jest.fn(),
      onChange: jest.fn(),
      getStripe: jest.fn(),
      getElements: jest.fn().mockReturnValue(mockElements),
      getCheckout: jest.fn(),
      reset: jest.fn(),
      dispose: jest.fn(),
    } as any;

    manager = new LinkAuthenticationElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty error message', () => {
      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });

    it('should initialize with undefined email', () => {
      const state = manager.getState();

      expect(state.email).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('should return current state with errorMessage property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('errorMessage');
    });

    it('should return current state with email property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('email');
    });
  });

  describe('onChange', () => {
    it('should register callback for state changes', async () => {
      const callback = jest.fn();

      manager.onChange('email', callback);

      // Simulate state change through initialize
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="link-authentication-element"></div>';

      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);

      changeHandler!({
        value: { email: 'test@example.com' },
      });

      expect(callback).toHaveBeenCalledWith('test@example.com');
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = manager.onChange('email', callback);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('initialize', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="link-authentication-element"></div>';
    });

    it('should throw error when stripe service not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement)).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create link authentication element without options', async () => {
      await manager.initialize(containerElement);

      expect(mockElements.create).toHaveBeenCalledWith('linkAuthentication', undefined);
    });

    it('should create link authentication element with provided options', async () => {
      const options = {
        defaultValues: {
          email: 'prefilled@example.com',
        },
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('linkAuthentication', options);
    });

    it('should mount link authentication element to DOM', async () => {
      await manager.initialize(containerElement);

      const targetElement = containerElement.querySelector('#link-authentication-element');

      expect(mockLinkAuthenticationElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return link authentication element instance', async () => {
      const result = await manager.initialize(containerElement);

      expect(result).toBe(mockLinkAuthenticationElement);
    });

    it('should set up change event listener', async () => {
      await manager.initialize(containerElement);

      expect(mockLinkAuthenticationElement.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update email state when change event fires with email', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);

      expect(changeHandler).toBeDefined();

      changeHandler!({
        value: { email: 'user@example.com' },
      });

      const state = manager.getState();

      expect(state.email).toBe('user@example.com');
    });

    it('should track whether the email is complete from the change event, and reset it on initialize', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);
      changeHandler!({ complete: false, empty: false, value: { email: 'foo' } });

      expect(manager.getState()).toEqual(expect.objectContaining({ email: 'foo', complete: false }));

      changeHandler!({ complete: true, empty: false, value: { email: 'foo@example.com' } });

      expect(manager.getState().complete).toBe(true);

      await manager.initialize(containerElement);

      expect(manager.getState().email).toBeUndefined();
      expect(manager.getState().complete).toBeUndefined();
    });

    it('should handle undefined email in change event', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);

      changeHandler!({
        value: { email: undefined },
      });

      const state = manager.getState();

      expect(state.email).toBeUndefined();
    });

    it('should handle empty string email in change event', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);

      changeHandler!({
        value: { email: '' },
      });

      const state = manager.getState();

      expect(state.email).toBe('');
    });

    it('should handle missing value in change event', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockLinkAuthenticationElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockLinkAuthenticationElement;
      });

      await manager.initialize(containerElement);

      changeHandler!({});

      const state = manager.getState();

      expect(state.email).toBeUndefined();
    });

    it('should unmount previous element before initializing new one', async () => {
      await manager.initialize(containerElement);
      await manager.initialize(containerElement);

      expect(mockLinkAuthenticationElement.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElement', () => {
    it('should return undefined when not initialized', () => {
      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should return link authentication element after initialization', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="link-authentication-element"></div>';

      await manager.initialize(containerElement);

      const element = manager.getElement();

      expect(element).toBe(mockLinkAuthenticationElement);
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

    it('should unmount link authentication element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="link-authentication-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      expect(mockLinkAuthenticationElement.unmount).toHaveBeenCalled();
    });

    it('should clear element reference after unmounting', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="link-authentication-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should be idempotent when called multiple times', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="link-authentication-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();
      manager.unmount();

      expect(mockLinkAuthenticationElement.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
