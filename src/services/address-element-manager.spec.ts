import { AddressElementManager } from './address-element-manager';
import type { IStripeService } from './interfaces';
import type { StripeAddressElement } from '@stripe/stripe-js';

describe('AddressElementManager', () => {
  let manager: AddressElementManager;
  let mockStripeService: jest.Mocked<IStripeService>;
  let mockElements: any;
  let mockAddressElement: jest.Mocked<StripeAddressElement>;

  beforeEach(() => {
    // Create mock address element
    mockAddressElement = {
      mount: vi.fn(),
      unmount: vi.fn(),
      on: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getValue: vi.fn(),
    } as any;

    // Create mock elements
    mockElements = {
      create: vi.fn().mockReturnValue(mockAddressElement),
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

    manager = new AddressElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty error message', () => {
      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });

    it('should initialize with isComplete as false', () => {
      const state = manager.getState();

      expect(state.isComplete).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return current state with errorMessage property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('errorMessage');
    });

    it('should return current state with isComplete property', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('isComplete');
    });
  });

  describe('initialize', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="address-element"></div>';
    });

    it('should throw error when stripe service not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement)).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create address element with default billing mode', async () => {
      await manager.initialize(containerElement);

      expect(mockElements.create).toHaveBeenCalledWith('address', { mode: 'billing' });
    });

    it('should create address element with provided options', async () => {
      const options = {
        mode: 'shipping' as const,
        defaultValues: {
          name: 'John Doe',
        },
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('address', options);
    });

    it('should mount address element to DOM', async () => {
      await manager.initialize(containerElement);

      const targetElement = containerElement.querySelector('#address-element');

      expect(mockAddressElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return address element instance', async () => {
      const result = await manager.initialize(containerElement);

      expect(result).toBe(mockAddressElement);
    });

    it('should set up change event listener', async () => {
      await manager.initialize(containerElement);

      expect(mockAddressElement.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update isComplete state when address changes', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockAddressElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockAddressElement;
      });

      await manager.initialize(containerElement);

      expect(changeHandler).toBeDefined();

      // Simulate change event with complete address
      changeHandler!({
        complete: true,
        value: {
          name: 'John Doe',
          address: {
            line1: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94111',
            country: 'US',
          },
        },
      });

      const state = manager.getState();

      expect(state.isComplete).toBe(true);
    });

    it('should clear error message on change event', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockAddressElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockAddressElement;
      });

      await manager.initialize(containerElement);
      manager.setError('Previous error');

      changeHandler!({
        complete: false,
        value: {},
      });

      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });

    it('should unmount previous element before initializing new one', async () => {
      await manager.initialize(containerElement);
      await manager.initialize(containerElement);

      expect(mockAddressElement.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElement', () => {
    it('should return undefined when not initialized', () => {
      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should return address element after initialization', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="address-element"></div>';

      await manager.initialize(containerElement);

      const element = manager.getElement();

      expect(element).toBe(mockAddressElement);
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

    it('should unmount address element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="address-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      expect(mockAddressElement.unmount).toHaveBeenCalled();
    });

    it('should clear element reference after unmounting', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="address-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should be idempotent when called multiple times', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="address-element"></div>';

      await manager.initialize(containerElement);
      manager.unmount();
      manager.unmount();

      expect(mockAddressElement.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
