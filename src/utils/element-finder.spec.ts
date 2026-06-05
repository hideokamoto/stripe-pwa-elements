import { findElement } from './element-finder';

// Mock MutationObserver for Jest environment
let mutationObserverCallback: MutationCallback | null = null;
let mutationObserverInstance: any = null;

global.MutationObserver = class MutationObserver {
  callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    mutationObserverCallback = callback;
    mutationObserverInstance = this;
  }

  observe(_target: HTMLElement) {
    // Mock implementation
  }

  disconnect() {
    mutationObserverCallback = null;
    mutationObserverInstance = null;
  }

  takeRecords(): MutationRecord[] {
    return [];
  }
} as any;

// Helper to trigger mutation observer callback
function triggerMutationObserver() {
  if (mutationObserverCallback && mutationObserverInstance) {
    mutationObserverCallback([], mutationObserverInstance);
  }
}

describe('element-finder', () => {
  describe('findElement', () => {
    let containerElement: HTMLElement;
    let targetElement: HTMLElement;

    beforeEach(() => {
      containerElement = document.createElement('div');
      targetElement = document.createElement('div');
      targetElement.id = 'target-element';
      document.body.appendChild(containerElement);
    });

    afterEach(() => {
      if (containerElement.parentNode != null) {
        document.body.removeChild(containerElement);
      }
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should resolve immediately if element already exists', async () => {
      containerElement.appendChild(targetElement);

      const result = await findElement(containerElement, '#target-element');

      expect(result).toBe(targetElement);
    });

    it('should resolve when element appears after initial check', async () => {
      jest.useFakeTimers();

      const promise = findElement(containerElement, '#target-element');

      // Element not found initially
      await Promise.resolve();

      // Add element and trigger mutation observer
      containerElement.appendChild(targetElement);
      triggerMutationObserver();

      const result = await promise;

      expect(result).toBe(targetElement);
    });

    it('should find nested elements', async () => {
      const parent = document.createElement('div');
      parent.id = 'parent';
      const child = document.createElement('div');
      child.id = 'child';
      parent.appendChild(child);
      containerElement.appendChild(parent);

      const result = await findElement(containerElement, '#parent #child');

      expect(result).toBe(child);
    });

    it('should reject with timeout error if element not found within timeout', async () => {
      jest.useFakeTimers();

      const promise = findElement(containerElement, '#target-element', 1000);

      // Advance time to trigger timeout
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow promise to settle

      await expect(promise).rejects.toThrow('Element "#target-element" not found within 1000ms');
    });

    it('should use default timeout of 5000ms if not specified', async () => {
      jest.useFakeTimers();

      const promise = findElement(containerElement, '#target-element');

      // Advance time to trigger timeout
      jest.advanceTimersByTime(5000);
      await Promise.resolve(); // Allow promise to settle

      await expect(promise).rejects.toThrow('Element "#target-element" not found within 5000ms');
    });

    it('should work with class selectors', async () => {
      targetElement.className = 'test-class';
      containerElement.appendChild(targetElement);

      const result = await findElement(containerElement, '.test-class');

      expect(result).toBe(targetElement);
    });

    it('should work with attribute selectors', async () => {
      targetElement.setAttribute('data-test', 'value');
      containerElement.appendChild(targetElement);

      const result = await findElement(containerElement, '[data-test="value"]');

      expect(result).toBe(targetElement);
    });

    it('should find the first matching element when multiple exist', async () => {
      const div1 = document.createElement('div');
      div1.className = 'item';
      const div2 = document.createElement('div');
      div2.className = 'item';

      containerElement.appendChild(div1);
      containerElement.appendChild(div2);

      const result = await findElement(containerElement, '.item');

      expect(result).toBe(div1);
    });
  });
});
