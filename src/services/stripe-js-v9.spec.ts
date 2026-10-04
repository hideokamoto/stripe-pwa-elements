jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn() }));

import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeCheckoutElementsSdk, StripePaymentElement } from '@stripe/stripe-js';
import { StripeServiceClass } from './stripe-service';
import { PaymentElementManager } from './payment-element-manager';
import { buildSubmitEventProps, confirmCheckoutSession, confirmPaymentOrSetup } from '../components/stripe-payment-element/stripe-payment-element.helpers';

describe('Stripe.js v9 payment flows', () => {
  let service: StripeServiceClass;
  let manager: PaymentElementManager;
  let container: HTMLElement;
  let paymentElement: StripePaymentElement;
  let stripe: Pick<Stripe, 'registerAppInfo' | 'elements' | 'initCheckoutElementsSdk' | 'confirmPayment' | 'confirmSetup'>;
  let checkout: Pick<StripeCheckoutElementsSdk, 'createPaymentElement' | 'loadActions'>;
  let confirm: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentElement = { mount: jest.fn(), unmount: jest.fn() } as unknown as StripePaymentElement;
    confirm = jest.fn().mockResolvedValue({ type: 'success', session: { id: 'cs_test' } });
    checkout = {
      createPaymentElement: jest.fn().mockReturnValue(paymentElement),
      loadActions: jest.fn().mockResolvedValue({ type: 'success', actions: { confirm } }),
    };
    stripe = {
      registerAppInfo: jest.fn(),
      elements: jest.fn().mockReturnValue({ create: jest.fn().mockReturnValue(paymentElement) }),
      // Deliberately omit the removed initCheckout method.
      initCheckoutElementsSdk: jest.fn().mockReturnValue(checkout),
      confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_test', status: 'succeeded' } }),
      confirmSetup: jest.fn().mockResolvedValue({ setupIntent: { id: 'seti_test', status: 'succeeded' } }),
    };
    jest.mocked(loadStripe).mockResolvedValue(stripe as Stripe);
    service = new StripeServiceClass();
    manager = new PaymentElementManager(service);
    container = document.createElement('div');
    container.innerHTML = '<div id="payment-element"></div>';
  });

  afterEach(() => {
    manager.unmount();
    service.dispose();
  });

  it('initializes, mounts, exposes and confirms a Checkout Session through the v9 SDK', async () => {
    const elementsOptions = { appearance: { theme: 'stripe' as const } };

    await service.initializeWithCheckoutSession('pk_test_example', 'cs_test_secret', { stripeAccount: 'acct_test', elementsOptions });
    await manager.initialize(container);

    expect(loadStripe).toHaveBeenCalledWith('pk_test_example', { stripeAccount: 'acct_test' });
    expect(stripe.initCheckoutElementsSdk).toHaveBeenCalledWith({ clientSecret: 'cs_test_secret', elementsOptions });
    expect(service.state.loadStripeStatus).toBe('success');
    expect(stripe.elements).not.toHaveBeenCalled();
    expect(checkout.createPaymentElement).toHaveBeenCalled();
    expect(paymentElement.mount).toHaveBeenCalledWith(container.querySelector('#payment-element'));
    expect(buildSubmitEventProps({ stripe: service.getStripe(), isCheckoutSession: true, checkout: service.getCheckout(), checkoutSessionClientSecret: 'cs_test_secret' })).toEqual(
      {
        props: { stripe, checkout, checkoutSessionClientSecret: 'cs_test_secret' },
      },
    );
    await expect(confirmCheckoutSession(service.getCheckout(), 'https://example.com/return')).resolves.toEqual({ type: 'success', session: { id: 'cs_test' } });
    expect(confirm).toHaveBeenCalledWith({ returnUrl: 'https://example.com/return', redirect: 'if_required' });
  });

  it('propagates Checkout action loading errors without attempting confirmation', async () => {
    jest.mocked(checkout.loadActions).mockResolvedValue({ type: 'error', error: { message: 'Session expired', code: null } });
    await service.initializeWithCheckoutSession('pk_test_example', 'cs_test_secret');

    await expect(confirmCheckoutSession(service.getCheckout(), 'https://example.com/return')).rejects.toThrow('Session expired');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('propagates Checkout confirmation errors', async () => {
    confirm.mockResolvedValue({ type: 'error', error: { message: 'Payment declined', code: 'paymentFailed', paymentFailed: { declineCode: 'generic_decline' } } });
    await service.initializeWithCheckoutSession('pk_test_example', 'cs_test_secret');

    await expect(confirmCheckoutSession(service.getCheckout(), 'https://example.com/return')).rejects.toThrow('Payment declined');
  });

  it.each(['payment', 'setup'] as const)('keeps the %s intent flow on Elements', async intentType => {
    await service.initialize('pk_test_example');
    await manager.initialize(container);
    await confirmPaymentOrSetup(service.getStripe(), service.getElements(), intentType, 'https://example.com/return');

    expect(stripe.initCheckoutElementsSdk).not.toHaveBeenCalled();
    expect(service.getElements().create).toHaveBeenCalledWith('payment', {});
    expect(paymentElement.mount).toHaveBeenCalledWith(container.querySelector('#payment-element'));
    expect(intentType === 'payment' ? stripe.confirmPayment : stripe.confirmSetup).toHaveBeenCalledWith({
      elements: service.getElements(),
      confirmParams: { return_url: 'https://example.com/return' },
      redirect: 'if_required',
    });
    expect(intentType === 'payment' ? stripe.confirmSetup : stripe.confirmPayment).not.toHaveBeenCalled();
  });
});
