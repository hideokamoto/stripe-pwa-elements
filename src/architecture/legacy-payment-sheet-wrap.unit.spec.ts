import { LEGACY_PAYMENT_SHEET_WRAP_CLASS } from '../constants/legacy-stripe-class-names';

describe('legacy payment sheet wrap class name', () => {
  it('stays stable for backward-compatible host CSS', () => {
    expect(LEGACY_PAYMENT_SHEET_WRAP_CLASS).toBe('stripe-payment-sheet-wrap');
  });
});