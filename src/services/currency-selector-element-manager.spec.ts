import { CurrencySelectorElementManager } from './currency-selector-element-manager';
import type { IStripeService } from './interfaces';
import type { StripeCurrencySelectorElement } from '@stripe/stripe-js';
import type { Mocked } from 'vitest';

describe('CurrencySelectorElementManager', () => {
  let manager: CurrencySelectorElementManager;
  let mockStripeService: Mocked<IStripeService>;
  let mockElements: any;
  let mockCurrencySelectorElement: Mocked<StripeCurrencySelectorElement>;

  beforeEach(() => {
    // Create mock currency selector element
    mockCurrencySelectorElement = {
      mount: vi.fn(),
      unmount: vi.fn(),
      on: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getValue: vi.fn(),
    } as any;

    // Create mock elements
    mockElements = {
      create: vi.fn().mockReturnValue(mockCurrencySelectorElement),
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
      },
      initialize: vi.fn(),
      onChange: vi.fn(),
      getStripe: vi.fn(),
      getElements: vi.fn().mockReturnValue(mockElements),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    manager = new CurrencySelectorElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty state', () => {
      const state = manager.getState();

      expect(state.errorMessage).toBe('');
      expect(state.selectedCurrency).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('errorMessage');
      expect(state).toHaveProperty('selectedCurrency');
    });
  });

  describe('initialize', () => {
    let containerElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      containerElement.innerHTML = '<div id="currency-selector"></div>';
    });

    it('should throw error when stripe service not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerElement)).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create currency selector element with default options', async () => {
      await manager.initialize(containerElement);

      expect(mockElements.create).toHaveBeenCalledWith('currencySelector', {});
    });

    it('should create currency selector element with provided options', async () => {
      const options = {
        clientSecret: 'cs_test_xxx',
      };

      await manager.initialize(containerElement, options);

      expect(mockElements.create).toHaveBeenCalledWith('currencySelector', options);
    });

    it('should mount currency selector element to DOM', async () => {
      await manager.initialize(containerElement);

      const targetElement = containerElement.querySelector('#currency-selector');

      expect(mockCurrencySelectorElement.mount).toHaveBeenCalledWith(targetElement);
    });

    it('should return currency selector element', async () => {
      const result = await manager.initialize(containerElement);

      expect(result).toBe(mockCurrencySelectorElement);
    });

    it('should set up change event listener', async () => {
      await manager.initialize(containerElement);

      expect(mockCurrencySelectorElement.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update state when currency changes', async () => {
      let changeHandler: ((event: any) => void) | undefined;

      mockCurrencySelectorElement.on.mockImplementation((eventName: any, handler: any) => {
        if (eventName === 'change') {
          changeHandler = handler;
        }
        return mockCurrencySelectorElement;
      });

      await manager.initialize(containerElement);

      expect(changeHandler).toBeDefined();

      // Simulate change event
      changeHandler!({
        value: {
          currency: 'EUR',
        },
      });

      const state = manager.getState();

      expect(state.selectedCurrency).toBe('EUR');
      expect(state.errorMessage).toBe('');
    });

    it('should unmount previous element before initializing new one', async () => {
      await manager.initialize(containerElement);
      await manager.initialize(containerElement);

      expect(mockCurrencySelectorElement.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElement', () => {
    it('should return undefined when not initialized', () => {
      const element = manager.getElement();

      expect(element).toBeUndefined();
    });

    it('should return currency selector element after initialization', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="currency-selector"></div>';

      await manager.initialize(containerElement);

      const element = manager.getElement();

      expect(element).toBe(mockCurrencySelectorElement);
    });
  });

  describe('setError', () => {
    it('should set error message in state', () => {
      manager.setError('Test error message');

      const state = manager.getState();

      expect(state.errorMessage).toBe('Test error message');
    });
  });

  describe('clearError', () => {
    it('should clear error message in state', () => {
      manager.setError('Test error message');
      manager.clearError();

      const state = manager.getState();

      expect(state.errorMessage).toBe('');
    });
  });

  describe('unmount', () => {
    it('should do nothing when element not initialized', () => {
      expect(() => manager.unmount()).not.toThrow();
    });

    it('should unmount currency selector element', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="currency-selector"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      expect(mockCurrencySelectorElement.unmount).toHaveBeenCalled();
    });

    it('should clear element reference after unmounting', async () => {
      const containerElement = document.createElement('div');

      containerElement.innerHTML = '<div id="currency-selector"></div>';

      await manager.initialize(containerElement);
      manager.unmount();

      const element = manager.getElement();

      expect(element).toBeUndefined();
    });
  });
});
