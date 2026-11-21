import type { StripeCheckoutElementsSdk } from '@stripe/stripe-js';
import { StripeAPIError } from './error';
import { assertCheckoutSessionOpen, confirmCheckoutActions, isCheckoutReturnUrlConflict } from './checkout-confirm';

describe('isCheckoutReturnUrlConflict', () => {
  it('detects the conflict on a thrown Error', () => {
    expect(isCheckoutReturnUrlConflict(new Error('You cannot provide `returnUrl` when the session has return_url'))).toBe(true);
  });

  it('detects the conflict on a non-Error object with a message', () => {
    expect(isCheckoutReturnUrlConflict({ message: 'cannot provide `returnUrl`' })).toBe(true);
  });

  it('is false when there is no string message', () => {
    expect(isCheckoutReturnUrlConflict({ code: 'failed' })).toBe(false);
    expect(isCheckoutReturnUrlConflict(null)).toBe(false);
    expect(isCheckoutReturnUrlConflict(undefined)).toBe(false);
  });
});

describe('assertCheckoutSessionOpen', () => {
  it('does nothing for an open or unknown session', () => {
    expect(() => assertCheckoutSessionOpen(undefined)).not.toThrow();
    expect(() => assertCheckoutSessionOpen({ type: 'open' } as any)).not.toThrow();
  });

  it('uses a default message when none is given', () => {
    expect(() => assertCheckoutSessionOpen({ type: 'expired' } as any)).toThrow(StripeAPIError);

    try {
      assertCheckoutSessionOpen({ type: 'complete' } as any);
    } catch (error) {
      expect(error).toMatchObject({
        type: 'invalid_request_error',
        code: 'checkout_session_complete',
        message: 'The Checkout Session is complete and can no longer be paid.',
      });
    }
  });

  it('prefers the confirm error message when provided', () => {
    try {
      assertCheckoutSessionOpen({ type: 'expired' } as any, 'session expired');
    } catch (error) {
      expect(error).toMatchObject({ message: 'session expired', code: 'checkout_session_expired' });
    }
  });
});

describe('confirmCheckoutActions', () => {
  const mockCheckout = (confirm: ReturnType<typeof vi.fn>, status: { type: string } = { type: 'open' }) =>
    ({
      loadActions: vi.fn().mockResolvedValue({
        type: 'success',
        actions: {
          confirm,
          getSession: () => ({ status }),
        },
      }),
    }) as unknown as StripeCheckoutElementsSdk;

  it('omits email when it is missing or empty', async () => {
    const confirm = vi.fn().mockResolvedValue({ type: 'success' });

    await confirmCheckoutActions(mockCheckout(confirm), 'https://example.com/return');
    await confirmCheckoutActions(mockCheckout(confirm), 'https://example.com/return', '');

    expect(confirm).toHaveBeenCalledTimes(2);
    expect('email' in confirm.mock.calls[0][0]).toBe(false);
    expect('email' in confirm.mock.calls[1][0]).toBe(false);
  });

  it('passes a non-empty email to confirm', async () => {
    const confirm = vi.fn().mockResolvedValue({ type: 'success' });

    await confirmCheckoutActions(mockCheckout(confirm), 'https://example.com/return', 'jenny@example.com');

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jenny@example.com',
        returnUrl: 'https://example.com/return',
      }),
    );
  });
});
