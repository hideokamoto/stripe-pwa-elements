import { getPlatforms } from './platform';

export const checkPlatform = () => {
  const device = getPlatforms();

  if (device.includes('ios')) {
    return 'ios';
  }

  if (device.includes('android')) {
    return 'android';
  }
};

export const waitForElm = (el: HTMLStripeCardElementElement, selector: string): Promise<HTMLElement> => {
  return new Promise(resolve => {
    if (el.querySelector(selector) != null) {
      return resolve(el.querySelector(selector) as HTMLElement);
    }

    const observer = new MutationObserver(() => {
      if (el.querySelector(selector) != null) {
        resolve(el.querySelector(selector) as HTMLElement);
        observer.disconnect();
      }
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
    });
  });
};
