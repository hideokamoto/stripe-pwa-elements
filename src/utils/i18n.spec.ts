import { i18n } from './i18n';

describe('i18n (ja)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    ['Pay', '支払う'],
    ['Loading', '読み込み中'],
    ['Payment information', '支払情報'],
    ['Billing address', '請求先住所'],
    ['Save', '保存'],
    ['Close', '閉じる'],
  ])('translates "%s" to Japanese', async (key, expected) => {
    await i18n.changeLanguage('ja');
    expect(i18n.t(key)).toBe(expected);
  });

  it('falls back to the key itself for English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('Loading')).toBe('Loading');
  });
});
