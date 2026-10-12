import { newSpecPage } from '@stencil/core/testing';
import { StripeModal } from '../stripe-modal';

/**
 * Component tests for StripeModal
 *
 * Following Kent Beck's test pyramid philosophy:
 * - These tests verify component rendering and DOM interactions
 * - Use newSpecPage for Stencil component context
 * - For pure unit tests, see stripe-modal.unit.spec.ts
 */
describe('stripe-modal component tests', () => {
  describe('Rendering', () => {
    it('renders', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal></stripe-modal>`,
      });

      expect(page.root).toEqualHtml(`
      <stripe-modal>
        <mock:shadow-root>
          <div class="modal-row">
            <div class="modal-child">
              <div class="modal-close-button-wrap">
                <ion-icon class="modal-close-button" name="close" size="large"></ion-icon>
              </div>
              <div class="modal-loading">
                <svg version="1.1" viewBox="0 0 2400 2400" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" id="spinner" stroke="currentColor" stroke-linecap="round" stroke-width="200">
                    <line x1="1200" x2="1200" y1="600" y2="100"></line>
                    <line opacity="0.5" x1="1200" x2="1200" y1="2300" y2="1800"></line>
                    <line opacity="0.917" x1="900" x2="650" y1="680.4" y2="247.4"></line>
                    <line opacity="0.417" x1="1750" x2="1500" y1="2152.6" y2="1719.6"></line>
                    <line opacity="0.833" x1="680.4" x2="247.4" y1="900" y2="650"></line>
                    <line opacity="0.333" x1="2152.6" x2="1719.6" y1="1750" y2="1500"></line>
                    <line opacity="0.75" x1="600" x2="100" y1="1200" y2="1200"></line>
                    <line opacity="0.25" x1="2300" x2="1800" y1="1200" y2="1200"></line>
                    <line opacity="0.667" x1="680.4" x2="247.4" y1="1500" y2="1750"></line>
                    <line opacity="0.167" x1="2152.6" x2="1719.6" y1="650" y2="900"></line>
                    <line opacity="0.583" x1="900" x2="650" y1="1719.6" y2="2152.6"></line>
                    <line opacity="0.083" x1="1750" x2="1500" y1="247.4" y2="680.4"></line>
                    <animateTransform attributeName="transform" attributeType="XML" begin="0s" calcMode="discrete" dur="0.83333s" keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667" repeatCount="indefinite" type="rotate" values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"></animateTransform>
                  </g>
                </svg>
              </div>
              <div class="modal-content">
                <slot></slot>
              </div>
            </div>
          </div>
        </mock:shadow-root>
      </stripe-modal>
      `);
    });

    it("should match snapshot (open='true')", async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="true"></stripe-modal>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it("should match snapshot (showCloseButton='true')", async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal show-close-button="true"></stripe-modal>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it("should match snapshot (showCloseButton='false')", async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal show-close-button="false"></stripe-modal>`,
      });

      expect(page.root).toMatchSnapshot();
    });

    it("should have 'open' class when open is true", async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="true"></stripe-modal>`,
      });

      // Wait for animation frame to complete
      await new Promise(resolve => requestAnimationFrame(resolve));
      await page.waitForChanges();

      const modalRow = page.root.shadowRoot.querySelector('.modal-row');
      expect(modalRow.classList.contains('open')).toBe(true);
    });

    it("should not have 'open' class when open is false", async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="false"></stripe-modal>`,
      });

      const modalRow = page.root.shadowRoot.querySelector('.modal-row');
      expect(modalRow.classList.contains('open')).toBe(false);
    });

    it('should render slot content', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal><div class="test-content">Test Content</div></stripe-modal>`,
      });

      const slot = page.root.shadowRoot.querySelector('slot');
      expect(slot).not.toBeNull();
    });

    it('should show close button by default', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal></stripe-modal>`,
      });

      const closeButton = page.root.shadowRoot.querySelector('.modal-close-button');
      expect(closeButton).not.toBeNull();
    });
  });

  describe('Event emission', () => {
    it('should emit close event with correct data when closeModal is called', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="true"></stripe-modal>`,
      });

      let eventEmitted = false;
      page.root.addEventListener('close', () => {
        eventEmitted = true;
      });

      await page.rootInstance.closeModal();
      await page.waitForChanges();

      expect(eventEmitted).toBe(true);
    });

    it('should emit close event when toggleModal is called from open state', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="true"></stripe-modal>`,
      });

      let eventEmitted = false;
      page.root.addEventListener('close', () => {
        eventEmitted = true;
      });

      await page.rootInstance.toggleModal();
      await page.waitForChanges();

      expect(eventEmitted).toBe(true);
    });

    it('should not emit close event when toggleModal is called from closed state', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal open="false"></stripe-modal>`,
      });

      let eventEmitted = false;
      page.root.addEventListener('close', () => {
        eventEmitted = true;
      });

      await page.rootInstance.toggleModal();
      await page.waitForChanges();

      expect(eventEmitted).toBe(false);
    });
  });

  describe('Props reactivity', () => {
    it('should update visibility when the open prop changes after load', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal></stripe-modal>`,
      });
      const modalRow = page.root.shadowRoot.querySelector('.modal-row');
      expect(modalRow.classList.contains('open')).toBe(false);

      for (const open of [true, false, true, false]) {
        page.root.open = open;
        await new Promise(resolve => requestAnimationFrame(resolve));
        await page.waitForChanges();
        expect(modalRow.classList.contains('open')).toBe(open);
      }
    });

    it('should update showCloseButton prop', async () => {
      const page = await newSpecPage({
        components: [StripeModal],
        html: `<stripe-modal></stripe-modal>`,
      });

      expect(page.rootInstance.showCloseButton).toBe(true);

      page.root.setAttribute('show-close-button', 'false');
      await page.waitForChanges();

      expect(page.rootInstance.showCloseButton).toBe(false);
    });
  });
});
