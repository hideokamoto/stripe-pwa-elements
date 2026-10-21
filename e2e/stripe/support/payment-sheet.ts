import { expect } from '@playwright/test';
import type { FrameLocator, Locator, Page } from '@playwright/test';

/** Stripe test cards, see https://docs.stripe.com/testing */
export const TEST_CARDS = {
  success: '4242 4242 4242 4242',
  genericDecline: '4000 0000 0000 0002',
} as const;

export type SheetEventName = 'paymentSheetLoaded' | 'paymentSheetFailedToLoad' | 'paymentSheetCompleted' | 'paymentSheetCanceled' | 'paymentSheetFailed';

/** A DOM event recorded by the harness page, with a JSON-safe summary of its detail */
export type RecordedEvent = { name: SheetEventName; detail: unknown };

export type MountConfig = {
  publishableKey: string;
  clientSecret: string;
  /** `options` property of the element (PaymentSheetOptions) */
  options?: Record<string, unknown>;
  /** Extra attributes, e.g. { 'sheet-title': '...' } */
  attributes?: Record<string, string>;
};

/**
 * Page object for a harness page under e2e/stripe/pages/ that exposes `window.harness`
 * (see pages/payment-sheet.html for the contract).
 */
export class PaymentSheetHarness {
  constructor(readonly page: Page) {}

  /** The sheet element */
  get sheet(): Locator {
    return this.page.locator('stripe-payment-sheet');
  }

  /** The Payment Element iframe inside the sheet */
  get paymentFrame(): FrameLocator {
    return this.page.frameLocator('stripe-payment-sheet #payment-element iframe').first();
  }

  get submitButton(): Locator {
    return this.sheet.locator('form#stripe-payment-sheet button[type="submit"]');
  }

  get errorMessage(): Locator {
    return this.sheet.locator('.stripe-element-errors');
  }

  /** Close button of the inner `<stripe-modal>` (open shadow DOM, pierced by Playwright CSS) */
  get closeButton(): Locator {
    return this.sheet.locator('stripe-modal .modal-close-button');
  }

  /** Open a harness page (default: the plain payment sheet page) */
  async goto(pagePath = '/e2e/payment-sheet.html') {
    await this.page.goto(pagePath);
    await this.page.waitForFunction(() => 'harness' in window, undefined, { timeout: 15_000 });
  }

  /** Create the element with the given config and append it to the page */
  async mount(config: MountConfig) {
    await this.page.evaluate(c => (window as any).harness.mount(c), config);
  }

  /** Call `present()` without awaiting it; the result is read with presentResult() */
  async startPresent() {
    await this.page.evaluate(() => (window as any).harness.startPresent());
  }

  /** The value `present()` resolved with, or null while it is pending */
  async presentResult(): Promise<unknown> {
    return this.page.evaluate(() => (window as any).harness.presentResult);
  }

  async waitForPresentResult(): Promise<unknown> {
    await this.page.waitForFunction(() => (window as any).harness.presentResult != null || (window as any).harness.presentError != null, undefined, {
      timeout: 60_000,
    });

    const error = await this.page.evaluate(() => (window as any).harness.presentError);

    if (error != null) {
      throw new Error(`present() rejected: ${error}`);
    }

    return this.presentResult();
  }

  async events(): Promise<RecordedEvent[]> {
    return this.page.evaluate(() => (window as any).harness.events);
  }

  async eventNames(): Promise<SheetEventName[]> {
    return (await this.events()).map(e => e.name);
  }

  async waitForEvent(name: SheetEventName) {
    await expect.poll(() => this.eventNames(), { timeout: 60_000, message: `waiting for ${name}` }).toContain(name);
  }

  /**
   * Fill the card form of the Payment Element.
   * Selects the card tab when several payment methods are offered, and fills country/ZIP only when shown.
   */
  async fillCard(number: string, { expiry = '12 / 34', cvc = '123', postalCode = '42424' } = {}) {
    const frame = this.paymentFrame;
    const cardTab = frame.locator('button[value="card"], [data-value="card"]').first();

    if (await cardTab.isVisible().catch(() => false)) {
      await cardTab.click();
    }

    const numberInput = frame.locator('input[name="number"]');

    await numberInput.waitFor({ state: 'visible', timeout: 30_000 });
    await numberInput.fill(number);
    await frame.locator('input[name="expiry"]').fill(expiry);
    await frame.locator('input[name="cvc"]').fill(cvc);

    const country = frame.locator('select[name="country"]');

    if (await country.isVisible().catch(() => false)) {
      await country.selectOption('US');
    }

    const zip = frame.locator('input[name="postalCode"]');

    if (await zip.isVisible().catch(() => false)) {
      await zip.fill(postalCode);
    }
  }

  /** Iframe of the email (Link Authentication) element, shown with `billingDetailsCollectionConfiguration.email: 'always'` */
  get emailFrame(): FrameLocator {
    return this.page.frameLocator('stripe-payment-sheet .stripe-payment-sheet-email iframe').first();
  }

  /** Iframe of the billing Address Element, shown with `billingDetailsCollectionConfiguration.address: 'full'` */
  get billingAddressFrame(): FrameLocator {
    return this.page.frameLocator('stripe-payment-sheet .stripe-payment-sheet-billing-address iframe[title="Secure address input frame"]').first();
  }

  /** Iframe of the shipping Address Element, shown with `shippingDetails` */
  get shippingAddressFrame(): FrameLocator {
    return this.page.frameLocator('stripe-payment-sheet .stripe-payment-sheet-shipping-address iframe[title="Secure address input frame"]').first();
  }

  /** Fill an Address Element with a US address, closing its autocomplete suggestions */
  async fillUsAddress(frame: FrameLocator, { name = 'Jenny Rosen', line1 = '354 Oyster Point Blvd', city = 'South San Francisco', state = 'CA', postalCode = '94080' } = {}) {
    const nameInput = frame.locator('input[name="name"]');

    await nameInput.waitFor({ state: 'visible', timeout: 30_000 });
    await nameInput.fill(name);
    await frame.locator('select[name="country"]').selectOption('US');

    const line1Input = frame.locator('input[name="addressLine1"]');

    await line1Input.fill(line1);
    await line1Input.press('Escape');

    // With autocomplete, the other fields may stay hidden behind an "Enter address manually" link
    const manual = frame.getByText(/enter address manually/i);

    if (await manual.isVisible().catch(() => false)) {
      await manual.click();
    }

    await frame.locator('input[name="locality"]').fill(city);
    await frame.locator('select[name="administrativeArea"]').selectOption(state);
    await frame.locator('input[name="postalCode"]').fill(postalCode);
  }

  /**
   * Untick "Save my information for faster checkout" (Link sign-up) in the Payment Element, when it is shown and ticked.
   * Once an email is known (e.g. from the email element), Stripe ticks it by default and then requires a mobile number;
   * whether it is shown depends on the account's Link settings, so it is handled only when present.
   */
  async declineLinkSignUp() {
    const optIn = this.paymentFrame.locator('input[name="linkOptIn"]');
    // It appears shortly after the card is complete; give it a bounded moment instead of racing it
    const shown = await optIn.waitFor({ state: 'visible', timeout: 5_000 }).then(
      () => true,
      () => false,
    );

    if (shown && (await optIn.isChecked())) {
      await optIn.uncheck({ force: true });
      await expect(optIn).not.toBeChecked();
    }
  }

  async submit() {
    await expect(this.submitButton).toBeEnabled();
    await this.submitButton.click();
  }

  /** Wait until the sheet is shown (its modal is open and the Payment Element is mounted) */
  async expectVisible() {
    await expect(this.sheet.locator('stripe-modal .modal-row.open')).toBeVisible();
    await expect(this.paymentFrame.locator('input[name="number"], button[value="card"]').first()).toBeVisible({ timeout: 30_000 });
  }

  async expectHidden() {
    await expect(this.sheet.locator('stripe-modal .modal-row.open')).toHaveCount(0);
  }
}
