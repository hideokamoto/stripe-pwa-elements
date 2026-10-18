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
    await this.page.waitForFunction(() => (window as any).harness.presentResult != null, undefined, { timeout: 60_000 });

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
