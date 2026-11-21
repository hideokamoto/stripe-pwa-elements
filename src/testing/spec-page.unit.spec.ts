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
});
