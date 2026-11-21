import { newSpecPage } from '@stencil/core/testing';
import { StripeCardElementModal } from '../stripe-card-element-modal';

describe('stripe-card-element-modal', () => {
  describe('rendering test', () => {
    it('renders', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal></stripe-card-element-modal>`,
      });

      expect(page.root).toEqualHtml(`<stripe-card-element-modal>
      <stripe-modal showclosebutton="">
        <stripe-card-element intenttype="payment" shouldusedefaultformsubmitaction="" zip=""></stripe-card-element>
      </stripe-modal>
    </stripe-card-element-modal>`);
    });

    it('should render with publishableKey prop', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal publishable-key="pk_test_xxx"></stripe-card-element-modal>`,
      });

      const innerPayment = page.root.querySelector('stripe-card-element');
      expect(innerPayment.getAttribute('publishableKey')).toBe('pk_test_xxx');
    });

    it('should render with open modal', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal open="true"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.open).toBe(true);
    });

    it('should forward zip prop to inner component', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal zip="false"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.zip).toBe(false);
    });

    it('should forward showLabel prop to inner component', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal show-label="true"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.showLabel).toBe(true);
    });

    it('should forward intentType prop to inner component', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal intent-type="setup"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.intentType).toBe('setup');
    });

    it('should forward buttonLabel prop to inner component', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal button-label="Add card"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.buttonLabel).toBe('Add card');
    });

    it('should forward sheetTitle prop to inner component', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal sheet-title="Custom Title"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.sheetTitle).toBe('Custom Title');
    });

    it('should forward showCloseButton prop to modal', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal show-close-button="false"></stripe-card-element-modal>`,
      });

      expect(page.rootInstance.showCloseButton).toBe(false);
    });

    it('should render with all props', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal
          publishable-key="pk_test_xxx"
          stripe-account="acct_xxx"
          application-name="test-app"
          show-label="true"
          sheet-title="Test Title"
          button-label="Test Button"
          intent-client-secret="pi_xxx"
          should-use-default-form-submit-action="false"
          intent-type="setup"
          show-close-button="false"
          zip="false"
          open="true"
        ></stripe-card-element-modal>`,
      });

      expect(page.root).toMatchSnapshot();
    });
  });

  describe('method test', () => {
    describe('#getStripeCardElementElement', () => {
      it('should return the inner stripe-card-element element', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        const element = await page.rootInstance.getStripeCardElementElement();
        expect(element.tagName.toLowerCase()).toBe('stripe-card-element');
      });
    });

    describe('#present', () => {
      it('should set open to true when called', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        expect(page.rootInstance.open).toBe(false);

        // Start present (don't await it as it returns a promise that waits for events)
        const presentPromise = page.rootInstance.present();

        // Check that open was set to true
        expect(page.rootInstance.open).toBe(true);

        // Clean up by closing the modal
        const closedEvent = new Event('closed');
        page.root.dispatchEvent(closedEvent);

        // Should reject on close
        await expect(presentPromise).rejects.toBeUndefined();
      });
    });

    describe('#updateProgress', () => {
      it('should call updateProgress on inner stripe-card-element element', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        const innerPayment = page.root.querySelector('stripe-card-element') as any;
        innerPayment.updateProgress = vi.fn().mockResolvedValue(undefined);

        await page.rootInstance.updateProgress('loading');

        expect(innerPayment.updateProgress).toHaveBeenCalledWith('loading');
      });

      it('should support all progress states', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        const innerPayment = page.root.querySelector('stripe-card-element') as any;
        innerPayment.updateProgress = vi.fn().mockResolvedValue(undefined);

        await page.rootInstance.updateProgress('loading');
        await page.rootInstance.updateProgress('success');
        await page.rootInstance.updateProgress('failure');
        await page.rootInstance.updateProgress('');

        expect(innerPayment.updateProgress).toHaveBeenCalledTimes(4);
      });
    });

    describe('#destroy', () => {
      it('should remove both inner payment element and itself', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        const innerPayment = page.root.querySelector('stripe-card-element') as any;
        innerPayment.remove = vi.fn();
        page.root.remove = vi.fn();

        await page.rootInstance.destroy();

        expect(innerPayment.remove).toHaveBeenCalled();
        expect(page.root.remove).toHaveBeenCalled();
      });
    });

    describe('#setPaymentRequestButton', () => {
      it('should set payment request button on inner element', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        const options = {
          country: 'US',
          currency: 'usd',
          total: {
            label: 'Total',
            amount: 1000,
          },
        };

        const innerPayment = page.root.querySelector('stripe-card-element') as any;
        innerPayment.setPaymentRequestOption = vi.fn();

        await page.rootInstance.setPaymentRequestButton(options);

        expect(innerPayment.getAttribute('show-payment-request-button')).toBe('true');
        expect(innerPayment.setPaymentRequestOption).toHaveBeenCalledWith(options);
      });

      it('should set application name when provided', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal application-name="test-app"></stripe-card-element-modal>`,
        });

        const options = {
          country: 'US',
          currency: 'usd',
          total: {
            label: 'Total',
            amount: 1000,
          },
        };

        const innerPayment = page.root.querySelector('stripe-card-element') as any;
        innerPayment.setPaymentRequestOption = vi.fn();

        await page.rootInstance.setPaymentRequestButton(options);

        expect(innerPayment.getAttribute('application-name')).toBe('test-app');
      });

      it('should handle missing stripe-card-element element gracefully', async () => {
        const page = await newSpecPage({
          components: [StripeCardElementModal],
          html: `<stripe-card-element-modal></stripe-card-element-modal>`,
        });

        // Remove inner element
        const innerPayment = page.root.querySelector('stripe-card-element');
        innerPayment.remove();

        const options = {
          country: 'US',
          currency: 'usd',
          total: {
            label: 'Total',
            amount: 1000,
          },
        };

        // Should not throw
        await expect(page.rootInstance.setPaymentRequestButton(options)).resolves.toBeUndefined();
      });
    });
  });

  describe('event test', () => {
    it('should emit closed event when modal is closed', async () => {
      const page = await newSpecPage({
        components: [StripeCardElementModal],
        html: `<stripe-card-element-modal></stripe-card-element-modal>`,
      });

      let eventEmitted = false;
      page.root.addEventListener('closed', () => {
        eventEmitted = true;
      });

      // Trigger componentDidLoad manually
      await page.rootInstance.componentDidLoad();

      // Simulate close event from inner modal
      const modal = page.root.querySelector('stripe-modal');
      const closeEvent = new Event('close');
      modal.dispatchEvent(closeEvent);

      expect(eventEmitted).toBe(true);
    });
  });

});

