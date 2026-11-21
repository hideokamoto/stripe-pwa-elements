import { CardElementManager } from './card-element-manager';
import type { IStripeService } from './interfaces';
import type { Mocked } from 'vitest';

describe('CardElementManager', () => {
  let manager: CardElementManager;
  let mockStripeService: Mocked<IStripeService>;
  let mockElements: { create: ReturnType<typeof vi.fn> };
  let cardNumber: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  let cardExpiry: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };
  let cardCvc: { mount: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

  const containerWithMountPoints = () => {
    const container = document.createElement('div');

    container.innerHTML = '<div id="card-number"></div><div id="card-expiry"></div><div id="card-cvc"></div>';

    return container;
  };

  beforeEach(() => {
    cardNumber = { mount: vi.fn(), unmount: vi.fn(), on: vi.fn() };
    cardExpiry = { mount: vi.fn(), unmount: vi.fn(), on: vi.fn() };
    cardCvc = { mount: vi.fn(), unmount: vi.fn(), on: vi.fn() };

    mockElements = {
      create: vi.fn((type: string) => {
        if (type === 'cardNumber') {
          return cardNumber;
        }

        if (type === 'cardExpiry') {
          return cardExpiry;
        }

        return cardCvc;
      }),
    };

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
      initializeWithCheckoutSession: vi.fn(),
      onChange: vi.fn(),
      getStripe: vi.fn(),
      getElements: vi.fn().mockReturnValue(mockElements),
      getCheckout: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;

    manager = new CardElementManager(mockStripeService);
  });

  describe('constructor', () => {
    it('should initialize with empty error message', () => {
      expect(manager.getState().errorMessage).toBe('');
    });
  });

  describe('initialize', () => {
    it('should throw when stripe service is not initialized', async () => {
      mockStripeService.getElements.mockReturnValue(undefined);

      await expect(manager.initialize(containerWithMountPoints())).rejects.toThrow('StripeService not initialized. Call StripeService.initialize() first.');
    });

    it('should create and mount card number, expiry and CVC elements', async () => {
      const container = containerWithMountPoints();

      const result = await manager.initialize(container);

      expect(mockElements.create).toHaveBeenCalledWith('cardNumber', { placeholder: 'Card Number' });
      expect(mockElements.create).toHaveBeenCalledWith('cardExpiry');
      expect(mockElements.create).toHaveBeenCalledWith('cardCvc');
      expect(cardNumber.mount).toHaveBeenCalledWith(container.querySelector('#card-number'));
      expect(cardExpiry.mount).toHaveBeenCalledWith(container.querySelector('#card-expiry'));
      expect(cardCvc.mount).toHaveBeenCalledWith(container.querySelector('#card-cvc'));
      expect(result).toEqual({ cardNumber, cardExpiry, cardCVC: cardCvc });
    });

    it('should unmount previous elements before initializing again', async () => {
      const container = containerWithMountPoints();

      await manager.initialize(container);
      await manager.initialize(container);

      expect(cardNumber.unmount).toHaveBeenCalledTimes(1);
      expect(cardExpiry.unmount).toHaveBeenCalledTimes(1);
      expect(cardCvc.unmount).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElements', () => {
    it('should return undefined before initialize', () => {
      expect(manager.getElements()).toBeUndefined();
    });

    it('should return mounted instances after initialize', async () => {
      await manager.initialize(containerWithMountPoints());

      expect(manager.getElements()).toEqual({ cardNumber, cardExpiry, cardCVC: cardCvc });
    });
  });

  describe('errors', () => {
    it('should set and clear error messages', () => {
      manager.setError('Card declined');

      expect(manager.getState().errorMessage).toBe('Card declined');

      manager.clearError();

      expect(manager.getState().errorMessage).toBe('');
      expect(manager.getState().errorSource).toBeUndefined();
    });

    it('should record a change error from the same card field', async () => {
      const handlers: Record<string, (event: { error?: { message: string } }) => void> = {};

      cardNumber.on.mockImplementation((_event: string, handler: (event: { error?: { message: string } }) => void) => {
        handlers.cardNumber = handler;
      });
      cardExpiry.on.mockImplementation((_event: string, handler: (event: { error?: { message: string } }) => void) => {
        handlers.cardExpiry = handler;
      });

      await manager.initialize(containerWithMountPoints());

      handlers.cardNumber({ error: { message: 'Invalid number' } });

      expect(manager.getState().errorMessage).toBe('Invalid number');
      expect(manager.getState().errorSource).toBe('cardNumber');

      handlers.cardExpiry({ error: { message: 'Expired' } });

      expect(manager.getState().errorMessage).toBe('Expired');

      handlers.cardNumber({});

      expect(manager.getState().errorMessage).toBe('Expired');

      handlers.cardExpiry({});

      expect(manager.getState().errorMessage).toBe('');
      expect(manager.getState().errorSource).toBeUndefined();
    });
  });

  describe('unmount', () => {
    it('should do nothing when not initialized', () => {
      expect(() => manager.unmount()).not.toThrow();
    });

    it('should unmount all card fields and clear the instances', async () => {
      await manager.initialize(containerWithMountPoints());
      manager.unmount();

      expect(cardNumber.unmount).toHaveBeenCalled();
      expect(cardExpiry.unmount).toHaveBeenCalled();
      expect(cardCvc.unmount).toHaveBeenCalled();
      expect(manager.getElements()).toBeUndefined();
    });

    it('should be idempotent', async () => {
      await manager.initialize(containerWithMountPoints());
      manager.unmount();
      manager.unmount();

      expect(cardNumber.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
