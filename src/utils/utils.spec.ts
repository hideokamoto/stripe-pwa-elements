import { checkPlatform, waitForElm } from './utils';

// Note: We're testing checkPlatform with the real implementation
// since mocking platform detection is complex and not very valuable

describe('utils', () => {
  describe('checkPlatform', () => {
    it('should return a string or undefined', () => {
      const result = checkPlatform();

      expect(typeof result === 'string' || result === undefined).toBe(true);

      if (typeof result === 'string') {
        expect(['ios', 'android']).toContain(result);
      }
    });
  });

  describe('waitForElm', () => {
    let mockElement: HTMLStripeCardElementElement;
    let mockTarget: HTMLElement;

    beforeEach(() => {
      mockTarget = document.createElement('div');
      mockTarget.id = 'target';

      mockElement = document.createElement('stripe-card-element') as unknown as HTMLStripeCardElementElement;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should resolve immediately if element already exists', async () => {
      mockElement.appendChild(mockTarget);

      const result = await waitForElm(mockElement, '#target');

      expect(result).toBe(mockTarget);
    });

    it('should resolve when element is found by class selector', async () => {
      mockTarget.className = 'test-class';
      mockElement.appendChild(mockTarget);

      const result = await waitForElm(mockElement, '.test-class');

      expect(result).toBe(mockTarget);
    });

    it('should work with attribute selectors', async () => {
      mockTarget.setAttribute('data-test', 'value');
      mockElement.appendChild(mockTarget);

      const result = await waitForElm(mockElement, '[data-test="value"]');

      expect(result).toBe(mockTarget);
    });

    it('should find nested elements', async () => {
      const parent = document.createElement('div');
      parent.id = 'parent';
      const child = document.createElement('div');
      child.id = 'child';
      parent.appendChild(child);
      mockElement.appendChild(parent);

      const result = await waitForElm(mockElement, '#parent #child');

      expect(result).toBe(child);
    });

    it('should find the first matching element when multiple exist', async () => {
      const div1 = document.createElement('div');
      div1.className = 'item';
      const div2 = document.createElement('div');
      div2.className = 'item';

      mockElement.appendChild(div1);
      mockElement.appendChild(div2);

      const result = await waitForElm(mockElement, '.item');

      expect(result).toBe(div1);
    });
  });
});
