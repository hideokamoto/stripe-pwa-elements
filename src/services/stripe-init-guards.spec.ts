import { describe, expect, it } from 'vitest';
import type { StripeCheckoutElementsSdk, StripeElements } from '@stripe/stripe-js';
import type { IStripeService } from './interfaces';
import {
  STRIPE_CHECKOUT_NOT_INITIALIZED_MESSAGE,
  STRIPE_ELEMENTS_NOT_INITIALIZED_MESSAGE,
  requireStripeCheckout,
  requireStripeElements,
} from './stripe-init-guards';

const stubStripeService = (overrides: Partial<IStripeService>): IStripeService =>
  ({
    getElements: () => undefined,
    getCheckout: () => undefined,
    ...overrides,
  }) as IStripeService;

describe('requireStripeElements', () => {
  it('returns elements when present', () => {
    const elements = {} as StripeElements;
    const service = stubStripeService({ getElements: () => elements });

    expect(requireStripeElements(service)).toBe(elements);
  });

  it('throws the pinned initialization error when elements are missing', () => {
    const service = stubStripeService({});

    expect(() => requireStripeElements(service)).toThrow(STRIPE_ELEMENTS_NOT_INITIALIZED_MESSAGE);
  });
});

describe('requireStripeCheckout', () => {
  it('returns checkout when present', () => {
    const checkout = {} as StripeCheckoutElementsSdk;
    const service = stubStripeService({ getCheckout: () => checkout });

    expect(requireStripeCheckout(service)).toBe(checkout);
  });

  it('throws the pinned checkout initialization error when checkout is missing', () => {
    const service = stubStripeService({});

    expect(() => requireStripeCheckout(service)).toThrow(STRIPE_CHECKOUT_NOT_INITIALIZED_MESSAGE);
  });
});