import { StripeAddressElement } from './stripe-address-element/stripe-address-element';
import { StripeCardElement } from './stripe-card-element/stripe-card-element';
import { StripeCurrencySelector } from './stripe-currency-selector/stripe-currency-selector';
import { StripeExpressCheckoutElement } from './stripe-express-checkout-element/stripe-express-checkout-element';
import { StripeLinkAuthenticationElement } from './stripe-link-authentication-element/stripe-link-authentication-element';
import { StripePaymentElement } from './stripe-payment-element/stripe-payment-element';
import { StripePaymentRequestButton } from './stripe-payment-request-button/stripe-payment-request-button';
import { serviceFactory } from '../services/factory';

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({ registerAppInfo: jest.fn(), elements: jest.fn(() => ({})) })),
}));

jest.mock('../utils/i18n', () => ({
  i18n: { t: (key: string) => key },
}));

/**
 * Regression tests for the `dist/components/*` (custom-elements) build.
 *
 * In that build the host element is constructed before attributes are reflected onto props,
 * so reading `this.publishableKey` in the constructor yields `undefined` and `initStripe` is
 * never called (the shell renders but `stripeLoaded` never fires). Prop-dependent
 * initialization must therefore happen in `componentWillLoad`, never in the constructor.
 */
describe('prop-dependent initialization lifecycle', () => {
  const cases: Array<[string, new () => any, Record<string, unknown>]> = [
    ['stripe-address-element', StripeAddressElement, {}],
    ['stripe-card-element', StripeCardElement, {}],
    ['stripe-currency-selector', StripeCurrencySelector, {}],
    ['stripe-express-checkout-element', StripeExpressCheckoutElement, {}],
    ['stripe-link-authentication-element', StripeLinkAuthenticationElement, {}],
    ['stripe-payment-element', StripePaymentElement, {}],
    ['stripe-payment-request-button', StripePaymentRequestButton, { paymentRequestOption: { country: 'US', currency: 'usd' } }],
  ];

  beforeEach(() => {
    (Object.keys(Object.getPrototypeOf(serviceFactory)) as string[]).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(serviceFactory))).forEach(name => {
      if (name.startsWith('create')) {
        jest.spyOn(serviceFactory as any, name).mockReturnValue({ state: {}, onChange: jest.fn(), getState: jest.fn().mockReturnValue({}), unmount: jest.fn() });
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each(cases)('%s', (_tag, Klass, extraProps) => {
    it('does not call initStripe in the constructor (props are not populated yet)', () => {
      const spy = jest.spyOn(Klass.prototype, 'initStripe').mockResolvedValue(undefined);
      // Make the prop visible during construction so that a constructor which reads it would trigger initStripe.
      Object.defineProperty(Klass.prototype, 'publishableKey', { value: 'pk_test_xxxx', configurable: true, writable: true });
      Object.defineProperty(Klass.prototype, 'paymentRequestOption', { value: { country: 'US', currency: 'usd' }, configurable: true, writable: true });

      try {
        new Klass();
      } finally {
        delete Klass.prototype.publishableKey;
        delete Klass.prototype.paymentRequestOption;
      }

      expect(spy).not.toHaveBeenCalled();
    });

    it('calls initStripe from componentWillLoad with the publishable key and stripeAccount', () => {
      const spy = jest.spyOn(Klass.prototype, 'initStripe').mockResolvedValue(undefined);
      const el = new Klass();
      Object.assign(el, { publishableKey: 'pk_test_xxxx', stripeAccount: 'acct_123', ...extraProps });

      el.componentWillLoad();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBe('pk_test_xxxx');
    });

    it('does not call initStripe from componentWillLoad when publishableKey is not provided', () => {
      const spy = jest.spyOn(Klass.prototype, 'initStripe').mockResolvedValue(undefined);
      const el = new Klass();

      el.componentWillLoad();

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
