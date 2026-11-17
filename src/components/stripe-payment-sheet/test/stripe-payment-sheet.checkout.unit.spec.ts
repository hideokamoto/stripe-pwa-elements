import type { StripeCheckoutElementsSdk } from '@stripe/stripe-js';
import {
  checkoutIgnoredOptionKeys,
  confirmCheckoutSessionSheet,
  toCheckoutDefaultValues,
  toCheckoutElementsOptions,
  toCheckoutPaymentElementOptions,
} from '../stripe-payment-sheet.checkout';
import { isRecoverableConfirmError } from '../stripe-payment-sheet.helpers';

const RETURN_URL = 'https://example.com/return';

const RETURN_URL_CONFLICT_MESSAGE =
  'You cannot provide `returnUrl` to confirm() when `return_url` was already provided when creating the Checkout Session.';

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

  it('lists the options a Checkout Session does not use, keeping the details prefilled through defaultValues', () => {
    expect(checkoutIgnoredOptionKeys({ merchantDisplayName: 'Example', defaultBillingDetails: { email: 'jenny@example.com', name: 'Jenny', address: { country: 'JP' } } })).toEqual(
      ['merchantDisplayName'],
    );
    expect(checkoutIgnoredOptionKeys({ defaultBillingDetails: { email: 'jenny@example.com' } })).toEqual([]);
  });

  it('lists name and address that cannot be prefilled because they lack a country', () => {
    expect(
      checkoutIgnoredOptionKeys({
        merchantDisplayName: 'Example',
        defaultBillingDetails: { name: 'Jenny', phone: '+81 90 1234 5678', address: { city: 'Tokyo', postalCode: '100-0001' } },
      }),
    ).toEqual(['defaultBillingDetails.address', 'defaultBillingDetails.name', 'merchantDisplayName']);
  });

  it('lists the billing details, shipping and wallet options that only intent mode supports', () => {
    expect(
      checkoutIgnoredOptionKeys({
        billingDetailsCollectionConfiguration: { email: 'always' },
        shippingDetails: { name: 'Jenny', address: { country: 'JP' } },
        enableApplePay: true,
        enableGooglePay: false,
      }),
    ).toEqual(['billingDetailsCollectionConfiguration', 'enableApplePay', 'enableGooglePay', 'shippingDetails']);
  });
});

describe('toCheckoutDefaultValues', () => {
  it('returns undefined without default billing details', () => {
    expect(toCheckoutDefaultValues(undefined)).toBeUndefined();
    expect(toCheckoutDefaultValues({})).toBeUndefined();
    expect(toCheckoutDefaultValues({ defaultBillingDetails: {} })).toBeUndefined();
  });

  it('maps email and phone to the Checkout Elements default values', () => {
    expect(toCheckoutDefaultValues({ defaultBillingDetails: { email: 'jenny@example.com', phone: '+81 90 1234 5678' } })).toEqual({
      email: 'jenny@example.com',
      phoneNumber: '+81 90 1234 5678',
    });
  });

  it('maps the billing address with the Stripe field names, keeping the country', () => {
    expect(
      toCheckoutDefaultValues({
        defaultBillingDetails: {
          name: 'Jenny',
          address: { country: 'JP', city: 'Tokyo', line1: '1-1 Chiyoda', postalCode: '100-0001', state: 'Tokyo' },
        },
      }),
    ).toEqual({
      billingAddress: {
        name: 'Jenny',
        address: { country: 'JP', city: 'Tokyo', line1: '1-1 Chiyoda', postal_code: '100-0001', state: 'Tokyo' },
      },
    });
  });

  it('drops the name and address when the address has no country', () => {
    expect(toCheckoutDefaultValues({ defaultBillingDetails: { name: 'Jenny', address: { city: 'Tokyo' } } })).toBeUndefined();
    expect(toCheckoutDefaultValues({ defaultBillingDetails: { email: 'jenny@example.com', name: 'Jenny', address: { city: 'Tokyo' } } })).toEqual({
      email: 'jenny@example.com',
    });
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

  it('retries without returnUrl when a session created with return_url rejects it with a thrown error', async () => {
    const confirm = jest.fn().mockRejectedValueOnce(new Error(RETURN_URL_CONFLICT_MESSAGE)).mockResolvedValueOnce({ type: 'success', session: {} });

    await confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL, 'jenny@example.com');

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenNthCalledWith(1, { returnUrl: RETURN_URL, redirect: 'if_required', email: 'jenny@example.com' });
    expect(confirm).toHaveBeenNthCalledWith(2, { redirect: 'if_required', email: 'jenny@example.com' });
  });

  it('retries without returnUrl when the conflict is returned as an error result', async () => {
    const confirm = jest
      .fn()
      .mockResolvedValueOnce({ type: 'error', error: { code: null, message: RETURN_URL_CONFLICT_MESSAGE } })
      .mockResolvedValueOnce({ type: 'success', session: {} });

    await expect(confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL)).resolves.toEqual({ type: 'success', session: {} });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenNthCalledWith(2, { redirect: 'if_required' });
  });

  it('does not retry a thrown error that is not the return_url conflict', async () => {
    const networkError = new Error('Network error');
    const confirm = jest.fn().mockRejectedValue(networkError);

    await expect(confirmCheckoutSessionSheet(mockCheckout({ type: 'success', actions: { confirm } }), RETURN_URL)).rejects.toBe(networkError);
    expect(confirm).toHaveBeenCalledTimes(1);
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
