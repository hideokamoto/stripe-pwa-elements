import type { StripeCheckoutElementsSdk } from '@stripe/stripe-js';
import { confirmCheckoutSession, isSubmitButtonDisabled } from '../stripe-payment-element.helpers';

const RETURN_URL = 'https://example.com/return';

const mockCheckout = (loadActionsResult: unknown) => ({ loadActions: jest.fn().mockResolvedValue(loadActionsResult) }) as unknown as StripeCheckoutElementsSdk;

/** Actions of an open session; `getSession` reports `open` unless a test replaces it */
const openSessionActions = (confirm: jest.Mock, getSession?: jest.Mock) => ({
  confirm,
  getSession: getSession ?? jest.fn(() => ({ id: 'cs_test_a1', status: { type: 'open' } })),
});

const RETURN_URL_CONFLICT_MESSAGE =
  'You cannot provide `returnUrl` to confirm() when `return_url` was already provided when creating the Checkout Session.';

/**
 * Unit tests for isSubmitButtonDisabled
 *
 * Pure function tests: no DOM, no Stencil page context.
 */
describe('isSubmitButtonDisabled', () => {
  const readyCheckout = { isCheckoutSession: true, loadStripeStatus: 'success' as const };
  const pendingCheckout = { isCheckoutSession: true, loadStripeStatus: '' as const };
  const intentMode = { isCheckoutSession: false, loadStripeStatus: 'success' as const };

  it('disables the button while the payment is being confirmed', () => {
    expect(isSubmitButtonDisabled({ ...intentMode, progress: 'loading', intentClientSecret: 'pi_secret' })).toBe(true);
    expect(isSubmitButtonDisabled({ ...readyCheckout, progress: 'loading' })).toBe(true);
  });

  it('disables the button after a successful payment so the spent intent cannot be resubmitted', () => {
    expect(isSubmitButtonDisabled({ ...intentMode, progress: 'success', intentClientSecret: 'pi_secret' })).toBe(true);
    expect(isSubmitButtonDisabled({ ...readyCheckout, progress: 'success' })).toBe(true);
  });

  it('keeps the button enabled after a failure so the user can retry', () => {
    expect(isSubmitButtonDisabled({ ...intentMode, progress: 'failure', intentClientSecret: 'pi_secret' })).toBe(false);
    expect(isSubmitButtonDisabled({ ...readyCheckout, progress: 'failure' })).toBe(false);
  });

  it('enables the button before any submit when the mode is ready', () => {
    expect(isSubmitButtonDisabled({ ...intentMode, progress: '', intentClientSecret: 'pi_secret' })).toBe(false);
    expect(isSubmitButtonDisabled({ ...readyCheckout, progress: '' })).toBe(false);
  });

  it('disables the button until an intent client secret is present in Payment Intent mode', () => {
    expect(isSubmitButtonDisabled({ ...intentMode, progress: '', intentClientSecret: undefined })).toBe(true);
    expect(isSubmitButtonDisabled({ ...intentMode, progress: '', intentClientSecret: '' })).toBe(true);
  });

  it('disables the button until Stripe finished loading in Checkout Session mode', () => {
    expect(isSubmitButtonDisabled({ ...pendingCheckout, progress: '' })).toBe(true);
  });
});

describe('confirmCheckoutSession', () => {
  it('confirms with returnUrl and email on the first attempt', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'success', session: { id: 'cs_test_a1' } });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    const result = await confirmCheckoutSession(checkout, RETURN_URL, 'jenny@example.com');

    expect(result).toEqual({ type: 'success', session: { id: 'cs_test_a1' } });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith({ redirect: 'if_required', returnUrl: RETURN_URL, email: 'jenny@example.com' });
  });

  it('omits returnUrl and email when they are not given', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'success', session: {} });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    await confirmCheckoutSession(checkout, '');

    expect(confirm).toHaveBeenCalledWith({ redirect: 'if_required' });
  });

  it('retries without returnUrl when a session created with return_url rejects it with a thrown error', async () => {
    const confirm = jest.fn().mockRejectedValueOnce(new Error(RETURN_URL_CONFLICT_MESSAGE)).mockResolvedValueOnce({ type: 'success', session: {} });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    const result = await confirmCheckoutSession(checkout, RETURN_URL, 'jenny@example.com');

    expect(result).toEqual({ type: 'success', session: {} });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenNthCalledWith(1, { redirect: 'if_required', returnUrl: RETURN_URL, email: 'jenny@example.com' });
    // The retry keeps the email and drops only the returnUrl
    expect(confirm).toHaveBeenNthCalledWith(2, { redirect: 'if_required', email: 'jenny@example.com' });
  });

  it('retries without returnUrl when the conflict is returned as an error result', async () => {
    const confirm = jest
      .fn()
      .mockResolvedValueOnce({ type: 'error', error: { code: null, message: RETURN_URL_CONFLICT_MESSAGE } })
      .mockResolvedValueOnce({ type: 'success', session: {} });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    await expect(confirmCheckoutSession(checkout, RETURN_URL)).resolves.toEqual({ type: 'success', session: {} });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenNthCalledWith(2, { redirect: 'if_required' });
  });

  it('throws a card_error for a declined payment on an open session', async () => {
    const confirm = jest
      .fn()
      .mockResolvedValue({ type: 'error', error: { code: 'paymentFailed', message: 'Your card was declined.', paymentFailed: { declineCode: 'generic_decline' } } });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    const error = await confirmCheckoutSession(checkout, RETURN_URL).catch(e => e);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ type: 'card_error', code: 'paymentFailed', message: 'Your card was declined.' });
  });

  it('throws an api_error for other confirm errors', async () => {
    const confirm = jest.fn().mockResolvedValue({ type: 'error', error: { code: null, message: 'An email address is required to confirm this Checkout Session.' } });
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    const error = await confirmCheckoutSession(checkout, RETURN_URL).catch(e => e);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ type: 'api_error', code: 'checkout_session_error', message: 'An email address is required to confirm this Checkout Session.' });
  });

  it('does not retry a thrown error that is not the return_url conflict', async () => {
    const networkError = new Error('Network error');
    const confirm = jest.fn().mockRejectedValue(networkError);
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm) });

    await expect(confirmCheckoutSession(checkout, RETURN_URL)).rejects.toBe(networkError);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('throws an api_error without confirming when the actions cannot be loaded', async () => {
    const checkout = mockCheckout({ type: 'error', error: { code: null, message: 'Network error' } });

    const error = await confirmCheckoutSession(checkout, RETURN_URL).catch(e => e);

    expect(error).toMatchObject({ type: 'api_error', code: 'checkout_session_error', message: 'Network error' });
  });

  it('throws an unrecoverable invalid_request_error without confirming when the session is already complete', async () => {
    const confirm = jest.fn();
    const getSession = jest.fn(() => ({ id: 'cs_test_a1', status: { type: 'complete', paymentStatus: 'paid' } }));
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm, getSession) });

    const error = await confirmCheckoutSession(checkout, RETURN_URL).catch(e => e);

    expect(confirm).not.toHaveBeenCalled();
    expect(error).toMatchObject({ type: 'invalid_request_error', code: 'checkout_session_complete' });
  });

  it('throws an unrecoverable invalid_request_error when the session expired with a failed confirm', async () => {
    let status = { type: 'open' };
    const confirm = jest.fn().mockImplementation(async () => {
      status = { type: 'expired' };

      return { type: 'error', error: { code: null, message: 'This Checkout Session is no longer active.' } };
    });
    const getSession = jest.fn(() => ({ id: 'cs_test_a1', status }));
    const checkout = mockCheckout({ type: 'success', actions: openSessionActions(confirm, getSession) });

    const error = await confirmCheckoutSession(checkout, RETURN_URL).catch(e => e);

    expect(error).toMatchObject({ type: 'invalid_request_error', code: 'checkout_session_expired', message: 'This Checkout Session is no longer active.' });
  });
});
