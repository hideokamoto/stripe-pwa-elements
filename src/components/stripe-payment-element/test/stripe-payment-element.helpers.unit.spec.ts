import { isSubmitButtonDisabled } from '../stripe-payment-element.helpers';

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
