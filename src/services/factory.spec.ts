import { ServiceFactory, serviceFactory } from './factory';
import { StripeServiceClass } from './stripe-service';
import { CardElementManager } from './card-element-manager';
import { PaymentElementManager } from './payment-element-manager';
import { AddressElementManager } from './address-element-manager';
import { LinkAuthenticationElementManager } from './link-authentication-element-manager';
import { CurrencySelectorElementManager } from './currency-selector-element-manager';
import { ExpressCheckoutElementManager } from './express-checkout-element-manager';
import type { IStripeService } from './interfaces';
import type { Mocked } from 'vitest';

describe('ServiceFactory', () => {
  let factory: ServiceFactory;
  let mockStripeService: Mocked<IStripeService>;

  beforeEach(() => {
    factory = new ServiceFactory();

    mockStripeService = {
      state: {
        loadStripeStatus: 'success',
        applicationName: 'stripe-pwa-elements',
        publishableKey: 'pk_test_xxx',
        stripeAccount: undefined,
        stripe: {} as any,
        elements: {} as any,
        isCheckoutSession: false,
      },
      initialize: vi.fn(),
      initializeWithCheckoutSession: vi.fn(),
      onChange: vi.fn(),
      getStripe: vi.fn(),
      getElements: vi.fn(),
      getCheckout: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    } as any;
  });

  describe('createStripeService', () => {
    it('should create a StripeServiceClass instance', () => {
      const stripeService = factory.createStripeService();

      expect(stripeService).toBeInstanceOf(StripeServiceClass);
    });

    it('should create a new instance on each call', () => {
      const service1 = factory.createStripeService();
      const service2 = factory.createStripeService();

      expect(service1).not.toBe(service2);
    });
  });

  describe('createCardElementManager', () => {
    it('should create a CardElementManager instance', () => {
      const cardManager = factory.createCardElementManager(mockStripeService);

      expect(cardManager).toBeInstanceOf(CardElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createCardElementManager(mockStripeService);
      const manager2 = factory.createCardElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const cardManager = factory.createCardElementManager(mockStripeService);

      // The manager should have access to the stripe service
      // We can verify this by checking that getState works (which requires store initialization)
      expect(cardManager.getState()).toHaveProperty('errorMessage');
    });
  });

  describe('createPaymentElementManager', () => {
    it('should create a PaymentElementManager instance', () => {
      const paymentManager = factory.createPaymentElementManager(mockStripeService);

      expect(paymentManager).toBeInstanceOf(PaymentElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createPaymentElementManager(mockStripeService);
      const manager2 = factory.createPaymentElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const paymentManager = factory.createPaymentElementManager(mockStripeService);

      expect(paymentManager.getState()).toHaveProperty('errorMessage');
    });
  });

  describe('createAddressElementManager', () => {
    it('should create an AddressElementManager instance', () => {
      const addressManager = factory.createAddressElementManager(mockStripeService);

      expect(addressManager).toBeInstanceOf(AddressElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createAddressElementManager(mockStripeService);
      const manager2 = factory.createAddressElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const addressManager = factory.createAddressElementManager(mockStripeService);

      expect(addressManager.getState()).toHaveProperty('errorMessage');
      expect(addressManager.getState()).toHaveProperty('isComplete');
    });
  });

  describe('createLinkAuthenticationElementManager', () => {
    it('should create a LinkAuthenticationElementManager instance', () => {
      const linkAuthManager = factory.createLinkAuthenticationElementManager(mockStripeService);

      expect(linkAuthManager).toBeInstanceOf(LinkAuthenticationElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createLinkAuthenticationElementManager(mockStripeService);
      const manager2 = factory.createLinkAuthenticationElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const linkAuthManager = factory.createLinkAuthenticationElementManager(mockStripeService);

      expect(linkAuthManager.getState()).toHaveProperty('errorMessage');
      expect(linkAuthManager.getState()).toHaveProperty('email');
    });
  });

  describe('createCurrencySelectorElementManager', () => {
    it('should create a CurrencySelectorElementManager instance', () => {
      const currencyManager = factory.createCurrencySelectorElementManager(mockStripeService);

      expect(currencyManager).toBeInstanceOf(CurrencySelectorElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createCurrencySelectorElementManager(mockStripeService);
      const manager2 = factory.createCurrencySelectorElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const currencyManager = factory.createCurrencySelectorElementManager(mockStripeService);

      expect(currencyManager.getState()).toHaveProperty('errorMessage');
      expect(currencyManager.getState()).toHaveProperty('selectedCurrency');
    });
  });

  describe('createExpressCheckoutElementManager', () => {
    it('should create an ExpressCheckoutElementManager instance', () => {
      const expressCheckoutManager = factory.createExpressCheckoutElementManager(mockStripeService);

      expect(expressCheckoutManager).toBeInstanceOf(ExpressCheckoutElementManager);
    });

    it('should create a new instance on each call', () => {
      const manager1 = factory.createExpressCheckoutElementManager(mockStripeService);
      const manager2 = factory.createExpressCheckoutElementManager(mockStripeService);

      expect(manager1).not.toBe(manager2);
    });

    it('should inject stripe service dependency', () => {
      const expressCheckoutManager = factory.createExpressCheckoutElementManager(mockStripeService);

      expect(expressCheckoutManager.getState()).toHaveProperty('errorMessage');
      expect(expressCheckoutManager.getState()).toHaveProperty('isReady');
    });
  });
});

describe('serviceFactory singleton', () => {
  it('should be an instance of ServiceFactory', () => {
    expect(serviceFactory).toBeInstanceOf(ServiceFactory);
  });

  it('should be a singleton (same instance)', async () => {
    const { serviceFactory: factory1 } = await import('./factory');
    const { serviceFactory: factory2 } = await import('./factory');

    expect(factory1).toBe(factory2);
    expect(factory1).toBe(serviceFactory);
  });

  it('should be able to create all manager types', () => {
    const stripeService = serviceFactory.createStripeService();

    expect(stripeService).toBeDefined();

    const mockService: IStripeService = {
      state: {
        loadStripeStatus: '',
        applicationName: 'test',
        isCheckoutSession: false,
      },
      initialize: vi.fn(),
      initializeWithCheckoutSession: vi.fn(),
      onChange: vi.fn(),
      getStripe: vi.fn(),
      getElements: vi.fn(),
      getCheckout: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };

    expect(serviceFactory.createCardElementManager(mockService)).toBeDefined();
    expect(serviceFactory.createPaymentElementManager(mockService)).toBeDefined();
    expect(serviceFactory.createAddressElementManager(mockService)).toBeDefined();
    expect(serviceFactory.createLinkAuthenticationElementManager(mockService)).toBeDefined();
    expect(serviceFactory.createCurrencySelectorElementManager(mockService)).toBeDefined();
    expect(serviceFactory.createExpressCheckoutElementManager(mockService)).toBeDefined();
  });
});
