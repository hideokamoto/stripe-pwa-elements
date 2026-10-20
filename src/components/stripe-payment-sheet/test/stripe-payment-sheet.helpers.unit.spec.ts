import {
  collectedBillingDetails,
  isRecoverableConfirmError,
  planBillingDetailsCollection,
  toAppearance,
  toPaymentElementOptions,
  unsupportedOptionKeys,
} from '../stripe-payment-sheet.helpers';
import type { PaymentSheetOptions } from '../stripe-payment-sheet.helpers';
import { confirmPaymentOrSetup } from '../../stripe-payment-element/stripe-payment-element.helpers';

const FULL_ADDRESS = { country: 'US', city: 'San Francisco', line1: '1 Main St', line2: 'Apt 2', postalCode: '94111', state: 'CA' };
const STRIPE_FULL_ADDRESS = { country: 'US', city: 'San Francisco', line1: '1 Main St', line2: 'Apt 2', postal_code: '94111', state: 'CA' };
const ADDRESS_ELEMENT_VALUE = {
  name: 'Jenny Rosen',
  phone: '+15555555555',
  address: { line1: '1 Main St', line2: null, city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
};

const catchError = (run: () => unknown): unknown => {
  try {
    run();
  } catch (e) {
    return e;
  }

  throw new Error('did not throw');
};

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

  it.each([
    ['email', { email: 'never' }, { email: 'never' }],
    ['name', { name: 'never' }, { name: 'never' }],
    ['phone', { phone: 'never' }, { phone: 'never' }],
    ['address', { address: 'never' }, { address: 'never' }],
  ] as const)('turns off the Payment Element %s field for never', (_, billingDetailsCollectionConfiguration, billingDetails) => {
    expect(toPaymentElementOptions({ billingDetailsCollectionConfiguration })).toEqual({ fields: { billingDetails } });
  });

  it('turns off the Payment Element fields that a separate element collects', () => {
    expect(toPaymentElementOptions({ billingDetailsCollectionConfiguration: { email: 'always', address: 'full', phone: 'always', name: 'automatic' } })).toEqual({
      fields: { billingDetails: { email: 'never', address: 'never', phone: 'never' } },
    });
  });

  it('leaves the fields alone for phone always without an Address Element and for name always (beta only)', () => {
    expect(toPaymentElementOptions({ billingDetailsCollectionConfiguration: { phone: 'always', name: 'always' } })).toEqual({});
  });

  it.each([
    [{ enableApplePay: true }, { applePay: 'auto' }],
    [{ enableGooglePay: false }, { googlePay: 'never' }],
    [
      { enableApplePay: false, enableGooglePay: true },
      { applePay: 'never', googlePay: 'auto' },
    ],
  ] as const)('maps the wallet flags %j to wallets %j', (options, wallets) => {
    expect(toPaymentElementOptions(options)).toEqual({ wallets });
  });

  it('omits address keys that are not given', () => {
    expect(toPaymentElementOptions({ defaultBillingDetails: { address: { country: 'JP' } } })).toEqual({
      defaultValues: { billingDetails: { address: { country: 'JP' } } },
    });
  });
});

describe('planBillingDetailsCollection', () => {
  it('needs no extra element and no fixed details without collection options', () => {
    expect(planBillingDetailsCollection({ merchantDisplayName: 'Example' }, 'payment')).toEqual({ fixedBillingDetails: {}, collectPhoneFromAddress: false });
    expect(planBillingDetailsCollection(undefined, 'payment')).toEqual({ fixedBillingDetails: {}, collectPhoneFromAddress: false });
  });

  it('fixes the never fields to the defaultBillingDetails values, with every address key', () => {
    const plan = planBillingDetailsCollection(
      {
        billingDetailsCollectionConfiguration: { email: 'never', name: 'never', phone: 'never', address: 'never' },
        defaultBillingDetails: { email: 'jenny@example.com', name: 'Jenny Rosen', phone: '+15555555555', address: { country: 'JP', postalCode: '1000001' } },
      },
      'payment',
    );

    expect(plan.fixedBillingDetails).toEqual({
      email: 'jenny@example.com',
      name: 'Jenny Rosen',
      phone: '+15555555555',
      address: { country: 'JP', postal_code: '1000001', line1: '', line2: '', city: '', state: '' },
    });
  });

  it.each([
    ['email', { email: 'never' }, {}],
    ['name', { name: 'never' }, { email: 'jenny@example.com' }],
    ['phone', { phone: 'never' }, {}],
    ['address', { address: 'never' }, {}],
    ['address', { address: 'never' }, { address: { city: 'Tokyo' } }],
  ] as const)('throws when %s is never but its default value is missing', (field, billingDetailsCollectionConfiguration, defaultBillingDetails) => {
    expect(() => planBillingDetailsCollection({ billingDetailsCollectionConfiguration, defaultBillingDetails } as PaymentSheetOptions, 'payment')).toThrow(
      `billingDetailsCollectionConfiguration.${field}`,
    );
  });

  it('shows a billing Address Element prefilled from defaultBillingDetails for address full', () => {
    const plan = planBillingDetailsCollection(
      { billingDetailsCollectionConfiguration: { address: 'full' }, defaultBillingDetails: { name: 'Jenny Rosen', phone: '+15555555555', address: FULL_ADDRESS } },
      'payment',
    );

    expect(plan.billingAddressElement).toEqual({
      mode: 'billing',
      defaultValues: { name: 'Jenny Rosen', phone: '+15555555555', address: STRIPE_FULL_ADDRESS },
    });
    expect(plan.collectPhoneFromAddress).toBe(false);
  });

  it('does not prefill an address without a country, which the Address Element requires', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full' }, defaultBillingDetails: { address: { city: 'Tokyo' } } }, 'payment');

    expect(plan.billingAddressElement).toEqual({ mode: 'billing', defaultValues: {} });
  });

  it('collects the phone in the billing Address Element for phone always with address full', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full', phone: 'always' } }, 'payment');

    expect(plan.billingAddressElement).toEqual({ mode: 'billing', defaultValues: {}, fields: { phone: 'always' }, validation: { phone: { required: 'always' } } });
    expect(plan.collectPhoneFromAddress).toBe(true);
  });

  it('hides the Address Element phone for phone never', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full', phone: 'never' }, defaultBillingDetails: { phone: '+81' } }, 'payment');

    expect(plan.billingAddressElement).toEqual({ mode: 'billing', defaultValues: { phone: '+81' }, fields: { phone: 'never' } });
  });

  it('shows the email element prefilled with the default email for email always', () => {
    expect(
      planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' }, defaultBillingDetails: { email: 'jenny@example.com' } }, 'payment').emailElement,
    ).toEqual({ defaultValues: { email: 'jenny@example.com' } });
    expect(planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' } }, 'payment').emailElement).toEqual({});
  });

  it('shows a shipping Address Element prefilled from shippingDetails for a PaymentIntent', () => {
    expect(planBillingDetailsCollection({ shippingDetails: { name: 'Jenny Rosen', phone: '+15555555555', address: FULL_ADDRESS } }, 'payment').shippingAddressElement).toEqual({
      mode: 'shipping',
      defaultValues: { name: 'Jenny Rosen', phone: '+15555555555', address: STRIPE_FULL_ADDRESS },
      fields: { phone: 'always' },
    });
    expect(planBillingDetailsCollection({ shippingDetails: {} }, 'payment').shippingAddressElement).toEqual({ mode: 'shipping', defaultValues: {} });
  });

  it('does not show a shipping Address Element for a SetupIntent, which has no shipping', () => {
    expect(planBillingDetailsCollection({ shippingDetails: { name: 'Jenny Rosen' } }, 'setup').shippingAddressElement).toBeUndefined();
  });
});

describe('collectedBillingDetails', () => {
  it('returns undefined when nothing has to be passed', () => {
    expect(collectedBillingDetails(planBillingDetailsCollection({}, 'payment'), {})).toBeUndefined();
  });

  it('passes the fixed values', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'never' }, defaultBillingDetails: { email: 'jenny@example.com' } }, 'payment');

    expect(collectedBillingDetails(plan, {})).toEqual({ email: 'jenny@example.com' });
  });

  it('passes the name and address of the billing Address Element, without its phone unless phone is always', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full' } }, 'payment');

    expect(collectedBillingDetails(plan, { billingAddress: { complete: true, value: ADDRESS_ELEMENT_VALUE } })).toEqual({
      name: 'Jenny Rosen',
      address: ADDRESS_ELEMENT_VALUE.address,
    });
  });

  it('passes the phone of the billing Address Element for phone always', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full', phone: 'always' } }, 'payment');

    expect(collectedBillingDetails(plan, { billingAddress: { complete: true, value: ADDRESS_ELEMENT_VALUE } })).toEqual({
      name: 'Jenny Rosen',
      phone: '+15555555555',
      address: ADDRESS_ELEMENT_VALUE.address,
    });
  });

  it('lets the fixed values win over the Address Element', () => {
    const plan = planBillingDetailsCollection(
      { billingDetailsCollectionConfiguration: { address: 'full', name: 'never' }, defaultBillingDetails: { name: 'Fixed Name' } },
      'payment',
    );

    expect(collectedBillingDetails(plan, { billingAddress: { complete: true, value: ADDRESS_ELEMENT_VALUE } })).toEqual({
      name: 'Fixed Name',
      address: ADDRESS_ELEMENT_VALUE.address,
    });
  });

  it('passes the collected email for email always', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' } }, 'payment');

    expect(collectedBillingDetails(plan, { email: 'jenny@example.com' })).toEqual({ email: 'jenny@example.com' });
  });

  it('throws a recoverable validation error when the billing address is incomplete', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { address: 'full' } }, 'payment');

    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, { billingAddress: { complete: false, value: ADDRESS_ELEMENT_VALUE } })))).toBe(true);
    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, {})))).toBe(true);
  });

  it('throws a recoverable validation error when the email is empty', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' } }, 'payment');

    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, { email: '' })))).toBe(true);
    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, {})))).toBe(true);
  });

  it('throws a recoverable validation error when the email is not valid', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' } }, 'payment');
    const incomplete = catchError(() => collectedBillingDetails(plan, { email: 'foo', emailComplete: false }));

    expect(isRecoverableConfirmError(incomplete)).toBe(true);
    expect((incomplete as Error).message).toBe('Please enter a valid email address.');
    // Without a change event from the email element, the value is checked here
    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, { email: 'foo' })))).toBe(true);
    expect(collectedBillingDetails(plan, { email: 'jenny@example.com', emailComplete: true })).toEqual({ email: 'jenny@example.com' });
  });

  it('passes the prefilled email when the email element has not reported a value', () => {
    const plan = planBillingDetailsCollection({ billingDetailsCollectionConfiguration: { email: 'always' }, defaultBillingDetails: { email: 'jenny@example.com' } }, 'payment');

    expect(collectedBillingDetails(plan, {})).toEqual({ email: 'jenny@example.com' });
    // A cleared field is not replaced by the prefilled value
    expect(isRecoverableConfirmError(catchError(() => collectedBillingDetails(plan, { email: '', emailComplete: false })))).toBe(true);
  });
});

describe('confirmPaymentOrSetup', () => {
  const createStripe = () => ({
    confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { id: 'pi_1' } }),
    confirmSetup: jest.fn().mockResolvedValue({ setupIntent: { id: 'seti_1' } }),
  });
  const elements = {} as any;

  it('keeps the confirmParams unchanged without extra params', async () => {
    const stripe = createStripe();

    await confirmPaymentOrSetup(stripe as any, elements, 'payment', 'https://example.com');

    expect(stripe.confirmPayment).toHaveBeenCalledWith({ elements, confirmParams: { return_url: 'https://example.com' }, redirect: 'if_required' });
  });

  it.each(['payment', 'setup'] as const)('merges the extra confirmParams for a %s', async intentType => {
    const stripe = createStripe();
    const extra = { payment_method_data: { billing_details: { email: 'jenny@example.com' } } };

    await confirmPaymentOrSetup(stripe as any, elements, intentType, 'https://example.com', extra);

    expect(intentType === 'payment' ? stripe.confirmPayment : stripe.confirmSetup).toHaveBeenCalledWith({
      elements,
      confirmParams: { return_url: 'https://example.com', ...extra },
      redirect: 'if_required',
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
    ).toEqual(['customerId', 'withZipCode']);
  });

  it('lists name always, which needs Stripe beta access on the web', () => {
    expect(unsupportedOptionKeys({ billingDetailsCollectionConfiguration: { name: 'always' } })).toEqual(['billingDetailsCollectionConfiguration.name']);
  });

  it('lists phone always only when no billing Address Element collects the phone', () => {
    expect(unsupportedOptionKeys({ billingDetailsCollectionConfiguration: { phone: 'always' } })).toEqual(['billingDetailsCollectionConfiguration.phone']);
    expect(unsupportedOptionKeys({ billingDetailsCollectionConfiguration: { phone: 'always', address: 'full' } })).toEqual([]);
  });

  it('lists shippingDetails for a SetupIntent only', () => {
    expect(unsupportedOptionKeys({ shippingDetails: { name: 'Jenny' } }, 'setup')).toEqual(['shippingDetails']);
    expect(unsupportedOptionKeys({ shippingDetails: { name: 'Jenny' } }, 'payment')).toEqual([]);
  });

  it('treats the collection, shipping and wallet options as supported', () => {
    expect(
      unsupportedOptionKeys({
        billingDetailsCollectionConfiguration: { email: 'always', address: 'full', phone: 'never', name: 'automatic' },
        shippingDetails: {},
        enableApplePay: true,
        enableGooglePay: false,
      }),
    ).toEqual([]);
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
