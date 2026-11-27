import type { StripeCurrencySelectorElement } from '@stripe/stripe-js';

export type StripeCurrencySelectorChangePayload = {
  value?: { currency?: string };
};

/** Stripe documents `change`; installed @stripe/stripe-js types omit it on the element. */
export const onStripeCurrencySelectorChange = (
  element: StripeCurrencySelectorElement,
  handler: (event: StripeCurrencySelectorChangePayload) => void,
): void => {
  const bindChange = element.on as unknown as (
    eventType: 'change',
    fn: (event: StripeCurrencySelectorChangePayload) => void,
  ) => StripeCurrencySelectorElement;

  bindChange.call(element, 'change', handler);
};