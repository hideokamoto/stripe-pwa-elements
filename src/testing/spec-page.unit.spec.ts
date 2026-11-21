import { StripeModal } from '../components/stripe-modal/stripe-modal';
import { newSpecPage } from './spec-page';

describe('newSpecPage', () => {
  it('rejects template instead of silently ignoring it', async () => {
    await expect(
      newSpecPage({
        components: [],
        template: () => null,
      }),
    ).rejects.toThrow('`template` is not supported');
  });

  it('does not treat arbitrary nodeType-1 objects as HTMLElement', () => {
    expect({ nodeType: 1, tagName: 'svg' }).not.toBeInstanceOf(HTMLElement);
  });

  it('updates root after setContent', async () => {
    const page = await newSpecPage({
      components: [StripeModal],
      html: '<stripe-modal class="first"></stripe-modal>',
    });

    expect(page.root?.classList.contains('first')).toBe(true);

    await page.setContent('<stripe-modal class="second"></stripe-modal>');

    expect(page.root?.classList.contains('second')).toBe(true);
    expect(page.root?.classList.contains('first')).toBe(false);
  });
});
