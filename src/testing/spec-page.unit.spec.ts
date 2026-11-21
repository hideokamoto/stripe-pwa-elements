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
});
