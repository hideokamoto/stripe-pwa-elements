import { isRecoverableConfirmError, toAppearance, toPaymentElementOptions, unsupportedOptionKeys } from '../stripe-payment-sheet.helpers';

describe('toPaymentElementOptions', () => {
  it('returns no options when nothing is given', () => {
    expect(toPaymentElementOptions(undefined)).toEqual({});
  });

  it('uses merchantDisplayName as the business name', () => {
    expect(toPaymentElementOptions({ merchantDisplayName: 'Example Inc.' })).toEqual({ business: { name: 'Example Inc.' } });
  });

  it.each([
    ['horizontal', 'tabs'],
    ['vertical', 'accordion'],
    ['automatic', 'auto'],
  ] as const)('maps paymentMethodLayout %s to layout %s', (paymentMethodLayout, layout) => {
    expect(toPaymentElementOptions({ paymentMethodLayout })).toEqual({ layout });
  });

  it('maps defaultBillingDetails to defaultValues, renaming postalCode to postal_code', () => {
    expect(
      toPaymentElementOptions({
        defaultBillingDetails: {
          email: 'jenny@example.com',
          name: 'Jenny Rosen',
          phone: '+15555555555',
          address: { country: 'US', city: 'San Francisco', line1: '1 Main St', line2: 'Apt 2', postalCode: '94111', state: 'CA' },
        },
      }),
    ).toEqual({
      defaultValues: {
        billingDetails: {
          email: 'jenny@example.com',
          name: 'Jenny Rosen',
          phone: '+15555555555',
          address: { country: 'US', city: 'San Francisco', line1: '1 Main St', line2: 'Apt 2', postal_code: '94111', state: 'CA' },
        },
      },
    });
  });

  it('omits address keys that are not given', () => {
    expect(toPaymentElementOptions({ defaultBillingDetails: { address: { country: 'JP' } } })).toEqual({
      defaultValues: { billingDetails: { address: { country: 'JP' } } },
    });
  });
});

describe('toAppearance', () => {
  it.each([
    ['alwaysLight', 'stripe'],
    ['alwaysDark', 'night'],
  ] as const)('maps style %s to theme %s', (style, theme) => {
    expect(toAppearance(style)).toEqual({ theme });
  });

  it('returns undefined when no style is given', () => {
    expect(toAppearance(undefined)).toBeUndefined();
  });
});

describe('unsupportedOptionKeys', () => {
  it('lists the Capacitor options that have no effect on the web', () => {
    expect(
      unsupportedOptionKeys({
        merchantDisplayName: 'Example',
        enableApplePay: true,
        customerId: 'cus_123',
        billingDetailsCollectionConfiguration: { email: 'always' },
        withZipCode: false,
      }),
    ).toEqual(['billingDetailsCollectionConfiguration', 'customerId', 'enableApplePay', 'withZipCode']);
  });

  it('returns an empty list when every option is supported', () => {
    expect(unsupportedOptionKeys({ merchantDisplayName: 'Example', returnURL: 'https://example.com', style: 'alwaysDark' })).toEqual([]);
  });

  it('ignores options set to undefined', () => {
    expect(unsupportedOptionKeys({ customerId: undefined })).toEqual([]);
  });
});

describe('isRecoverableConfirmError', () => {
  it.each(['card_error', 'validation_error', 'api_connection_error', 'rate_limit_error', 'api_error'])('treats %s as recoverable', type => {
    expect(isRecoverableConfirmError({ type, message: 'x' })).toBe(true);
  });

  it.each(['invalid_request_error', 'authentication_error', 'idempotency_error'])('treats %s as unrecoverable', type => {
    expect(isRecoverableConfirmError({ type, message: 'x' })).toBe(false);
  });

  it('treats an error without a Stripe error type as unrecoverable', () => {
    expect(isRecoverableConfirmError(new Error('network down'))).toBe(false);
  });
});
