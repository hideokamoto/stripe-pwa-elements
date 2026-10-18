import type { StripeCheckoutElementsSdk } from '@stripe/stripe-js';
import { confirmCheckoutSessionSheet, toCheckoutElementsOptions, toCheckoutPaymentElementOptions } from '../stripe-payment-sheet.checkout';
import { isRecoverableConfirmError } from '../stripe-payment-sheet.helpers';

const RETURN_URL = 'https://example.com/return';

const mockCheckout = (loadActionsResult: unknown) => ({ loadActions: jest.fn().mockResolvedValue(loadActionsResult) }) as unknown as StripeCheckoutElementsSdk;

describe('toCheckoutPaymentElementOptions', () => {
  it('returns no options without payment sheet options', () => {
    expect(toCheckoutPaymentElementOptions(undefined)).toEqual({});
  });

  it('maps the layout and drops options the Checkout Payment Element does not take', () => {
    expect(
      toCheckoutPaymentElementOptions({ paymentMethodLayout: 'horizontal', merchantDisplayName: 'Example Inc.', defaultBillingDetails: { name: 'Jenny', email: 'jenny@example.com' } }),
    ).toEqual({ layout: 'tabs' });
  });
});

describe('toCheckoutElementsOptions', () => {
  it('returns undefined without a style', () => {
    expect(toCheckoutElementsOptions(undefined)).toBeUndefined();
    expect(toCheckoutElementsOptions({ merchantDisplayName: 'Example' })).toBeUndefined();
  });

  it('passes the style as the appearance', () => {
    expect(toCheckoutElementsOptions({ style: 'alwaysDark' })).toEqual({ appearance: { theme: 'night' } });
  });
});

describe('confirmCheckoutSessionSheet', () => {
  it('confirms through the Checkout actions without redirecting when not required', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'success', session: { id: 'cs_test_a1' } });
    const checkout = mockCheckout({ type: 'success', actions: { confirm } });

    await expect(confirmCheckoutSessionSheet(checkout, RETURN_URL)).resolves.toEqual({ type: 'success', session: { id: 'cs_test_a1' } });
    expect(confirm).toHaveBeenCalledWith({ returnUrl: RETURN_URL, redirect: 'if_required' });
  });

  it('passes the email when given', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'success', session: {} });

    await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL, 'jenny@example.com');

    expect(confirm).toHaveBeenCalledWith({ returnUrl: RETURN_URL, redirect: 'if_required', email: 'jenny@example.com' });
  });

  it('throws a recoverable card_error with the decline code when the payment failed', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'error', error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'insufficient_funds' } } });
    const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL).catch(e => e);

    expect(error).toMatchObject({ type: 'card_error', code: 'paymentFailed', message: 'Your card was declined.' });
    expect(isRecoverableConfirmError(error)).toBe(true);
  });

  it('throws a recoverable error for other confirm errors', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'error', error: { code: null, message: 'Your payment details are incomplete.' } });
    const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL).catch(e => e);

    expect(error).toMatchObject({ type: 'api_error', message: 'Your payment details are incomplete.' });
    expect(isRecoverableConfirmError(error)).toBe(true);
  });

  it('throws a recoverable error when the actions cannot be loaded', async () => {
    const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'error', error: { code: null, message: 'Network error' } }), RETURN_URL).catch(e => e);

    expect(error).toMatchObject({ type: 'api_error', message: 'Network error' });
    expect(isRecoverableConfirmError(error)).toBe(true);
  });
});
