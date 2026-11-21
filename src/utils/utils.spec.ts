vi.mock('./platform', () => ({
  getPlatforms: vi.fn(() => []),
}));

import { getPlatforms } from './platform';
import { checkPlatform, waitForElm } from './utils';

describe('utils', () => {
  describe('checkPlatform', () => {
    afterEach(() => {
      vi.mocked(getPlatforms).mockReset();
      vi.mocked(getPlatforms).mockReturnValue([]);
    });

    it('should return ios when the platform list includes ios', () => {
      vi.mocked(getPlatforms).mockReturnValue(['ios', 'mobile']);

      expect(checkPlatform()).toBe('ios');
    });

    it('should return android when the platform list includes android', () => {
      vi.mocked(getPlatforms).mockReturnValue(['android', 'mobile']);

      expect(checkPlatform()).toBe('android');
    });

    it('should return undefined for desktop platforms', () => {
      vi.mocked(getPlatforms).mockReturnValue(['desktop']);

      expect(checkPlatform()).toBeUndefined();
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

    it('should resolve when the element appears after the observer starts', async () => {
      let observerCallback: MutationCallback | undefined;

      const OriginalObserver = globalThis.MutationObserver;

      globalThis.MutationObserver = class {
        constructor(callback: MutationCallback) {
          observerCallback = callback;
        }

        observe() {
          return undefined;
        }

        disconnect() {
          return undefined;
        }

        takeRecords(): MutationRecord[] {
          return [];
        }
      } as typeof MutationObserver;

      try {
        const promise = waitForElm(mockElement, '#target');

        await Promise.resolve();
        mockElement.appendChild(mockTarget);
        observerCallback?.([], {} as MutationObserver);

        await expect(promise).resolves.toBe(mockTarget);
      } finally {
        globalThis.MutationObserver = OriginalObserver;
      }
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
