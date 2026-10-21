import { expect, test } from '@playwright/test';
import { createPaymentIntent, fetchPublishableKey } from './support/demo-api';
import { PaymentSheetHarness, TEST_CARDS } from './support/payment-sheet';

/**
 * <stripe-payment-sheet> against real Stripe.js in TEST mode.
 * Every test creates its own PaymentIntent through the demo API.
 */
test.describe('stripe-payment-sheet (real Stripe.js, test mode)', () => {
  // The sheet with the demo account's Payment Element (card + Link sign-up) is about 810px tall on desktop.
  // `<stripe-modal>` does not scroll, so on shorter viewports its top (title and close button) is cut off;
  // see the "close button is reachable" check below. Use a viewport that fits the whole sheet here.
  test.use({ viewport: { width: 1280, height: 1100 } });

  let harness: PaymentSheetHarness;

  test.beforeEach(async ({ page }) => {
    // Surface page errors in the test output; they usually explain a failure
    page.on('pageerror', error => console.log(`[pageerror] ${error.message}`));
    harness = new PaymentSheetHarness(page);
    await harness.goto();
  });

  test('PaymentIntent: a successful card completes the sheet', async ({ page }) => {
    const publishableKey = await fetchPublishableKey(page);
    const clientSecret = await createPaymentIntent(page);

    await harness.mount({ publishableKey, clientSecret });
    await harness.startPresent();
    await harness.waitForEvent('paymentSheetLoaded');
    await harness.expectVisible();

    await harness.fillCard(TEST_CARDS.success);
    await harness.submit();

    expect(await harness.waitForPresentResult()).toEqual({ paymentResult: 'paymentSheetCompleted' });

    const events = await harness.events();
    const completed = events.find(e => e.name === 'paymentSheetCompleted');

    expect(completed?.detail).toMatchObject({ paymentIntent: { status: 'succeeded' } });
    expect(events.map(e => e.name)).not.toContain('paymentSheetFailed');
    await harness.expectHidden();
  });

  test('PaymentIntent: a declined card keeps the sheet open, then closing cancels it', async ({ page }) => {
    const publishableKey = await fetchPublishableKey(page);
    const clientSecret = await createPaymentIntent(page);

    await harness.mount({ publishableKey, clientSecret });
    await harness.startPresent();
    await harness.waitForEvent('paymentSheetLoaded');
    await harness.expectVisible();

    await harness.fillCard(TEST_CARDS.genericDecline);
    await harness.submit();

    await expect(harness.errorMessage).not.toBeEmpty();
    await expect(harness.submitButton).toBeEnabled();
    await harness.expectVisible();
    expect(await harness.presentResult()).toBeNull();
    expect(await harness.eventNames()).not.toContain('paymentSheetFailed');

    await harness.closeButton.click();

    expect(await harness.waitForPresentResult()).toEqual({ paymentResult: 'paymentSheetCanceled' });
    expect(await harness.eventNames()).toContain('paymentSheetCanceled');
    await harness.expectHidden();
  });

  test.describe('on a phone-sized viewport', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    // Known issue, expected to fail until fixed: `<stripe-modal>` is `position: fixed` and bottom-aligned with no
    // max-height or overflow, so a sheet taller than the viewport (about 1040px at this width) is pushed above the
    // top edge. The title and the close button cannot be seen or reached by scrolling.
    // When this starts passing, Playwright reports it; remove `test.fail()` then.
    test('the close button is reachable when the sheet is taller than the viewport', async ({ page }) => {
      test.fail();

      const publishableKey = await fetchPublishableKey(page);
      const clientSecret = await createPaymentIntent(page);

      await harness.mount({ publishableKey, clientSecret });
      await harness.startPresent();
      await harness.waitForEvent('paymentSheetLoaded');
      await harness.expectVisible();

      await expect(harness.closeButton).toBeInViewport({ timeout: 5_000 });
      await harness.closeButton.click({ timeout: 5_000 });
      expect(await harness.waitForPresentResult()).toEqual({ paymentResult: 'paymentSheetCanceled' });
    });
  });

  // The demo API has no endpoint that creates a SetupIntent (only /config, /create-payment-intent and
  // /create-checkout-session), so a SetupIntent cannot be confirmed here without new credentials.
  test.fixme('SetupIntent: a successful card completes the sheet (needs a SetupIntent endpoint on the demo API)', async () => {});
});
