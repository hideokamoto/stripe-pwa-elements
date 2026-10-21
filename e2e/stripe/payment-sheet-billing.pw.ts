import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createPaymentIntent, fetchPublishableKey } from './support/demo-api';
import { PaymentSheetHarness, TEST_CARDS } from './support/payment-sheet';
import { recordConfirmRequests, retrievePaymentIntent } from './support/stripe-api';
import type { ConfirmParams } from './support/stripe-api';

/**
 * Billing details, shipping details and wallet options of <stripe-payment-sheet> against real Stripe.js in TEST mode.
 * Every test creates its own PaymentIntent through the demo API.
 *
 * Besides the sheet's result and events, the tests check what Stripe received and stored:
 * - the params of the confirm request Stripe.js sends (`recordConfirmRequests`), which also tells whether the sheet confirmed at all
 * - the PaymentIntent and its PaymentMethod, retrieved with the publishable key and the client secret (`retrievePaymentIntent`)
 *
 * What Stripe saved is checked, not which layer supplied it: Stripe.js itself adds the values of a billing Address Element and of
 * the email (Link Authentication) element of the same Elements group to the confirmation, and `elements.submit()` already rejects
 * an incomplete Address Element or an invalid email. So the sheet's own billing details param and its own email check are backstops
 * that these tests do not isolate (the unit tests in src/components/stripe-payment-sheet/test/ do). The `address: 'never'` test does
 * depend on the sheet's param, since nothing else sends that address.
 */

/** Mask keys and client secrets before anything from the page reaches the test output */
const mask = (text: string) => text.replace(/pk_test_\w+/g, 'pk_test_***').replace(/(pi|seti)_\w+_secret_\w+/g, '$1_***_secret_***');

/** A fresh address, so that no existing Link account is looked up */
const uniqueEmail = (label: string) => `e2e-${label}-${Date.now()}@example.com`;

test.describe('stripe-payment-sheet billing details (real Stripe.js, test mode)', () => {
  // The extra elements make the sheet much taller than the plain one, and `<stripe-modal>` does not scroll
  test.use({ viewport: { width: 1280, height: 1600 } });

  let harness: PaymentSheetHarness;
  let confirms: ConfirmParams[];

  test.beforeEach(async ({ page }) => {
    // Surface page errors in the test output; they usually explain a failure
    page.on('pageerror', error => console.log(`[pageerror] ${mask(error.message)}`));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[console.error] ${mask(msg.text())}`);
      }
    });
    confirms = recordConfirmRequests(page);
    harness = new PaymentSheetHarness(page);
    await harness.goto();
  });

  /** Create a PaymentIntent, mount the sheet with the given options and present it */
  const present = async (page: Page, options: Record<string, unknown>) => {
    const publishableKey = await fetchPublishableKey(page);
    const clientSecret = await createPaymentIntent(page);

    await harness.mount({ publishableKey, clientSecret, options });
    await harness.startPresent();
    await harness.waitForEvent('paymentSheetLoaded');
    await harness.expectVisible();

    return { publishableKey, clientSecret };
  };

  /** The sheet completed with a succeeded PaymentIntent after exactly one confirm request */
  const expectCompleted = async () => {
    expect(await harness.waitForPresentResult()).toEqual({ paymentResult: 'paymentSheetCompleted' });
    expect(await harness.eventNames()).toEqual(['paymentSheetLoaded', 'paymentSheetCompleted']);
    await harness.expectHidden();
    expect(confirms).toHaveLength(1);
  };

  /** The sheet refused to confirm: an error is shown, the sheet stays open and present() stays pending */
  const expectRejectedInSheet = async (message: RegExp = /\S/) => {
    await expect(harness.errorMessage).toHaveText(message);
    await expect(harness.submitButton).toBeEnabled();
    await harness.expectVisible();
    expect(await harness.presentResult()).toBeNull();
    expect(await harness.eventNames()).toEqual(['paymentSheetLoaded']);
    expect(confirms).toHaveLength(0);
  };

  test('address full: the billing Address Element replaces the card ZIP, and its address is saved', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { address: 'full' } });

    await expect(harness.billingAddressFrame.locator('input[name="addressLine1"]')).toBeVisible();
    await expect(harness.paymentFrame.locator('input[name="postalCode"]')).toHaveCount(0);

    await harness.fillUsAddress(harness.billingAddressFrame);
    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();
    await expectCompleted();

    const { status, paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(status).toBe('succeeded');
    expect(paymentMethod?.billing_details).toMatchObject({
      name: 'Jenny Rosen',
      address: { line1: '354 Oyster Point Blvd', city: 'South San Francisco', state: 'CA', postal_code: '94080', country: 'US' },
    });
  });

  test('address full left empty: the Address Element error is shown and nothing is confirmed', async () => {
    await present(harness.page, { billingDetailsCollectionConfiguration: { address: 'full' } });

    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();

    await expectRejectedInSheet();
    // elements.submit() also marks the empty required fields of the Address Element
    await expect(harness.billingAddressFrame.locator('input[name="name"][aria-invalid="true"]')).toBeVisible();
  });

  test('address never with a partial defaultBillingDetails.address: the given keys are saved, the others as empty strings', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, {
      billingDetailsCollectionConfiguration: { address: 'never' },
      defaultBillingDetails: { address: { country: 'US', postalCode: '94080' } },
    });

    // The Payment Element collects no part of the address
    await expect(harness.paymentFrame.locator('input[name="postalCode"]')).toHaveCount(0);
    await expect(harness.paymentFrame.locator('select[name="country"]')).toHaveCount(0);

    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();
    await expectCompleted();

    expect(confirms[0]).toMatchObject({
      'payment_method_data[billing_details][address][country]': 'US',
      'payment_method_data[billing_details][address][postal_code]': '94080',
      'payment_method_data[billing_details][address][line1]': '',
      'payment_method_data[billing_details][address][city]': '',
    });

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod?.billing_details.address).toEqual({ line1: '', line2: '', city: '', state: '', postal_code: '94080', country: 'US' });
  });

  test('phone always + address full: submitting without a phone is refused, then the typed phone is saved', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { address: 'full', phone: 'always' } });
    const frame = harness.billingAddressFrame;

    await expect(frame.locator('input[name="phone"]')).toBeVisible();
    await harness.fillUsAddress(frame);
    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();

    await expectRejectedInSheet(/phone/i);
    await expect(frame.locator('input[name="phone"][aria-invalid="true"]')).toBeVisible();

    await frame.locator('input[name="phone"]').fill('2025550199');
    await harness.submit();
    await expectCompleted();

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod?.billing_details).toMatchObject({ name: 'Jenny Rosen', phone: '+12025550199', address: { line1: '354 Oyster Point Blvd' } });
  });

  test('email always: the email element replaces the Payment Element email, and the typed email is saved', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { email: 'always' } });
    const email = uniqueEmail('typed');
    const emailInput = harness.emailFrame.locator('input[name="email"]');

    await expect(emailInput).toBeVisible();
    await expect(harness.paymentFrame.locator('input[name="email"]')).toHaveCount(0);
    await emailInput.fill(email);
    await emailInput.press('Tab');

    await harness.fillCard(TEST_CARDS.success);
    await harness.declineLinkSignUp();
    await harness.submit();
    await expectCompleted();

    expect(confirms[0]['payment_method_data[billing_details][email]']).toBe(email);

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod).toMatchObject({ type: 'card', billing_details: { email } });
  });

  test('email always with Link sign-up kept: the mobile number is required, and the email is saved on the Link payment', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { email: 'always' } });
    const email = uniqueEmail('link');
    const emailInput = harness.emailFrame.locator('input[name="email"]');

    await emailInput.fill(email);
    await emailInput.press('Tab');
    await harness.fillCard(TEST_CARDS.success);

    // Depends on the demo account offering Link sign-up in the Payment Element (it does at the time of writing)
    const optIn = harness.paymentFrame.locator('input[name="linkOptIn"]');

    await expect(optIn).toBeChecked();
    await harness.paymentFrame.locator('input[name="linkMobilePhone"]').fill('2025550142');
    await harness.submit();
    await expectCompleted();

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod).toMatchObject({ type: 'link', billing_details: { email } });
  });

  test('email always with an invalid email: the sheet stays open without confirming, then a corrected email is saved', async ({ page }) => {
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { email: 'always' } });
    const emailInput = harness.emailFrame.locator('input[name="email"]');

    await emailInput.fill('not-an-email');
    await emailInput.press('Tab');
    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();

    await expectRejectedInSheet(/email/i);

    const email = uniqueEmail('corrected');

    await emailInput.fill(email);
    await emailInput.press('Tab');
    await harness.declineLinkSignUp();
    await harness.submit();
    await expectCompleted();

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod?.billing_details.email).toBe(email);
  });

  test('email always with defaultBillingDetails.email: the prefilled email is saved without being edited', async ({ page }) => {
    const email = uniqueEmail('prefilled');
    const { publishableKey, clientSecret } = await present(page, { billingDetailsCollectionConfiguration: { email: 'always' }, defaultBillingDetails: { email } });

    await expect(harness.emailFrame.locator('input[name="email"]')).toHaveValue(email);

    await harness.fillCard(TEST_CARDS.success);
    await harness.declineLinkSignUp();
    await harness.submit();
    await expectCompleted();

    expect(confirms[0]['payment_method_data[billing_details][email]']).toBe(email);

    const { paymentMethod } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(paymentMethod?.billing_details.email).toBe(email);
  });

  test('shippingDetails: the shipping Address Element is prefilled and the shipping is saved on the PaymentIntent', async ({ page }) => {
    const shippingDetails = {
      name: 'Sam Shipper',
      phone: '+12025550123',
      address: { country: 'US', line1: '1 Main St', city: 'Springfield', state: 'IL', postalCode: '62701' },
    };
    const { publishableKey, clientSecret } = await present(page, { shippingDetails });
    const frame = harness.shippingAddressFrame;

    await expect(frame.locator('input[name="name"]')).toHaveValue('Sam Shipper');
    await expect(frame.locator('input[name="addressLine1"]')).toHaveValue('1 Main St');
    await expect(frame.locator('input[name="locality"]')).toHaveValue('Springfield');
    await expect(frame.locator('select[name="administrativeArea"]')).toHaveValue('IL');
    await expect(frame.locator('input[name="postalCode"]')).toHaveValue('62701');
    await expect(frame.locator('input[name="phone"]')).toHaveValue(/202.*555.*0123/);

    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();
    await expectCompleted();

    const { shipping } = await retrievePaymentIntent(page, publishableKey, clientSecret);

    expect(shipping).toMatchObject({
      name: 'Sam Shipper',
      phone: '+12025550123',
      address: { line1: '1 Main St', city: 'Springfield', state: 'IL', postal_code: '62701', country: 'US' },
    });
  });

  // Headless Chromium on http://localhost cannot show Apple Pay or Google Pay (no wallet, no registered domain), so whether
  // the options show or hide the wallet buttons is NOT checked here. This only checks that the sheet loads and pays by card with them set.
  for (const enabled of [true, false]) {
    test(`enableApplePay / enableGooglePay = ${enabled}: the sheet loads and a card payment completes (wallet buttons not observable)`, async () => {
      await present(harness.page, { enableApplePay: enabled, enableGooglePay: enabled });

      await harness.fillCard(TEST_CARDS.success);
      await harness.submit();
      await expectCompleted();
    });
  }
});
