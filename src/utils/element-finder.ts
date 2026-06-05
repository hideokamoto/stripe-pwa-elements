/**
 * Wait for an element to appear in the DOM
 * @param containerElement - Parent element to search in
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds (default: 5000ms)
 * @returns Promise that resolves to the found element or rejects on timeout
 */
export function findElement(containerElement: HTMLElement, selector: string, timeout = 5000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const elem = containerElement.querySelector(selector);

    if (elem != null) {
      return resolve(elem as HTMLElement);
    }

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const elem = containerElement.querySelector(selector);

      if (elem != null) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(elem as HTMLElement);
      }
    });

    observer.observe(containerElement, {
      childList: true,
      subtree: true,
    });
  });
}
