vi.mock('hono/jsx', () => ({
  useState: () => [true, vi.fn()],
  useEffect: (fn: () => void | (() => void)) => {
    fn();
  },
}));

import { createStripeElementComponent, type StripeCardElementProps } from './index';

describe('createStripeElementComponent', () => {
  const Comp = createStripeElementComponent<StripeCardElementProps>('stripe-card-element', async () => ({}));

  it('maps camelCase props to kebab-case attributes and skips function props', () => {
    const handleSubmit = vi.fn();
    const vnode = Comp({
      publishableKey: 'pk_test_xxx',
      buttonLabel: 'Pay now',
      zip: true,
      handleSubmit,
    }) as { tag: string; props: Record<string, unknown> };

    expect(vnode.tag).toBe('stripe-card-element');
    expect(vnode.props['publishable-key']).toBe('pk_test_xxx');
    expect(vnode.props['button-label']).toBe('Pay now');
    expect(vnode.props.zip).toBe('');
    expect(vnode.props.handleSubmit).toBeUndefined();
  });

  it('binds onXxx listeners to camelCase custom events on the element', () => {
    const onFormSubmit = vi.fn();
    const vnode = Comp({ onFormSubmit }) as { props: Record<string, unknown> };
    const el = document.createElement('stripe-card-element');
    const ref = vnode.props.ref as (el: HTMLElement | null) => void | (() => void);

    const cleanup = ref(el);

    el.dispatchEvent(new CustomEvent('formSubmit', { detail: { ok: true } }));

    expect(onFormSubmit).toHaveBeenCalled();

    if (typeof cleanup === 'function') {
      cleanup();
    }

    onFormSubmit.mockClear();
    el.dispatchEvent(new CustomEvent('formSubmit'));
    expect(onFormSubmit).not.toHaveBeenCalled();
  });
});
