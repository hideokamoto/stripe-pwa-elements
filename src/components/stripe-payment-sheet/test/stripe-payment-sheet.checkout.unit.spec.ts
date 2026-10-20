import type { StripeCheckoutElementsSdk } from '@stripe/stripe-js';
import { checkoutIgnoredOptionKeys, confirmCheckoutSessionSheet, toCheckoutElementsOptions, toCheckoutPaymentElementOptions } from '../stripe-payment-sheet.checkout';
import { isRecoverableConfirmError } from '../stripe-payment-sheet.helpers';

const RETURN_URL = 'https://example.com/return';

const mockCheckout = (loadActionsResult: unknown) => ({ loadActions: jest.fn().mockResolvedValue(loadActionsResult) }) as unknown as StripeCheckoutElementsSdk;

describe('toCheckoutPaymentElementOptions', () => {
  it('returns no options without payment sheet options', () => {
    expect(toCheckoutPaymentElementOptions(undefined)).toEqual({});
  });

  it('maps the layout and drops options the Checkout Payment Element does not take', () => {
    expect(
      toCheckoutPaymentElementOptions({
        paymentMethodLayout: 'horizontal',
        merchantDisplayName: 'Example Inc.',
        defaultBillingDetails: { name: 'Jenny', email: 'jenny@example.com' },
      }),
    ).toEqual({ layout: 'tabs' });
  });
});

describe('checkoutIgnoredOptionKeys', () => {
  it('returns nothing without options', () => {
    expect(checkoutIgnoredOptionKeys(undefined)).toEqual([]);
    expect(checkoutIgnoredOptionKeys({ paymentMethodLayout: 'vertical', style: 'alwaysLight', returnURL: 'https://example.com' })).toEqual([]);
  });

  it('lists the options a Checkout Session does not use, keeping the email that is passed to confirm', () => {
    expect(checkoutIgnoredOptionKeys({ merchantDisplayName: 'Example', defaultBillingDetails: { email: 'jenny@example.com', name: 'Jenny', address: { country: 'JP' } } })).toEqual(
      ['defaultBillingDetails.address', 'defaultBillingDetails.name', 'merchantDisplayName'],
    );
    expect(checkoutIgnoredOptionKeys({ defaultBillingDetails: { email: 'jenny@example.com' } })).toEqual([]);
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

  it('throws a recoverable card_error when the payment failed', async () => {
    const confirm = jest
      .fn()
      .mockResolvedValue({ type: 'error', error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'insufficient_funds' } } });
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

  describe('a session that can no longer be paid', () => {
    const DECLINED = { type: 'error', error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'generic_decline' } } };
    const OTHER = { type: 'error', error: { code: null, message: 'This Checkout Session is no longer active.' } };

    /**
     * Checkout actions whose session status is `before` until confirm runs and `after` once it has returned.
     */
    const actionsWithStatus = (result: unknown, before: object, after: object = before) => {
      let status = before;
      const confirm = jest.fn().mockImplementation(async () => {
        status = after;

        return result;
      });

      return { confirm, actions: { confirm, getSession: jest.fn(() => ({ id: 'cs_test_a1', status })) } };
    };

    it.each([
      ['expired', { type: 'expired' }],
      ['complete', { type: 'complete', paymentStatus: 'paid' }],
    ])('throws an unrecoverable invalid_request_error without confirming when the session is already %s', async (status, sessionStatus) => {
      const { confirm, actions } = actionsWithStatus(OTHER, sessionStatus);
      const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions }), RETURN_URL).catch(e => e);

      expect(confirm).not.toHaveBeenCalled();
      expect(error).toMatchObject({ type: 'invalid_request_error', code: `checkout_session_${status}` });
      expect(isRecoverableConfirmError(error)).toBe(false);
    });

    it.each([
      ['expired', { type: 'expired' }],
      ['complete', { type: 'complete', paymentStatus: 'unpaid' }],
    ])('throws an unrecoverable invalid_request_error when the session is %s after a failed confirm', async (status, sessionStatus) => {
      const { actions } = actionsWithStatus(OTHER, { type: 'open' }, sessionStatus);
      const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions }), RETURN_URL).catch(e => e);

      expect(error).toMatchObject({ type: 'invalid_request_error', code: `checkout_session_${status}`, message: 'This Checkout Session is no longer active.' });
      expect(isRecoverableConfirmError(error)).toBe(false);
    });

    it('treats a decline as unrecoverable when the session expired with it', async () => {
      const { actions } = actionsWithStatus(DECLINED, { type: 'open' }, { type: 'expired' });
      const error = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions }), RETURN_URL).catch(e => e);

      expect(isRecoverableConfirmError(error)).toBe(false);
    });

    it('keeps declines and other errors recoverable while the session stays open', async () => {
      const declined = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: actionsWithStatus(DECLINED, { type: 'open' }).actions }), RETURN_URL).catch(
        e => e,
      );
      const other = await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: actionsWithStatus(OTHER, { type: 'open' }).actions }), RETURN_URL).catch(e => e);

      expect(declined).toMatchObject({ type: 'card_error', code: 'paymentFailed' });
      expect(other).toMatchObject({ type: 'api_error' });
      expect(isRecoverableConfirmError(declined)).toBe(true);
      expect(isRecoverableConfirmError(other)).toBe(true);
    });
  });
});
