import { i18n } from './i18n';

describe('i18n (ja)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    ['Pay', '支払う'],
    ['Failed to load Stripe', 'ライブラリの読み込みに失敗しました。'],
    ['Add your payment information', '支払情報を追加'],
    ['Add card', 'カードを追加'],
    ['Add a card', 'カードを追加'],
    ['Add', '追加'],
    ['Card information', 'カード情報'],
    ['Card Number', 'カード番号'],
    ['MM / YY', '月 / 年'],
    ['CVC', 'セキュリティコード(CVC)'],
    ['Postal Code', '郵便番号'],
    ['Close', '閉じる'],
    ['Loading', '読み込み中'],
    ['Payment information', '支払情報'],
    ['Billing address', '請求先住所'],
    ['Save', '保存'],
    ['Please complete your billing address.', '請求先住所を入力してください。'],
    ['Please enter your email address.', 'メールアドレスを入力してください。'],
    ['Please enter a valid email address.', '有効なメールアドレスを入力してください。'],
  ])('translates "%s" to Japanese', async (key, expected) => {
    await i18n.changeLanguage('ja');
    expect(i18n.t(key)).toBe(expected);
  });

  it.each([
    ['Pay', 'Pagar'],
    ['Failed to load Stripe', 'Falha ao ler Stripe'],
    ['Add your payment information', 'Informações do seu Pagamento'],
    ['Add card', 'Adicionar Cartão'],
    ['Add a card', 'Adicionar um Cartão'],
    ['Add', 'Adicionar'],
    ['Card information', 'Informações do Cartão'],
    ['Card Number', 'Número do Cartão'],
    ['MM / YY', 'MM / AA'],
    ['CVC', 'Número de Segurança(CVC)'],
    ['Postal Code', 'Cep'],
    ['Close', 'Fechar'],
    ['Please complete your billing address.', 'Preencha seu endereço de cobrança.'],
    ['Please enter your email address.', 'Informe seu endereço de e-mail.'],
    ['Please enter a valid email address.', 'Informe um endereço de e-mail válido.'],
  ])('translates "%s" to Brazilian Portuguese', async (key, expected) => {
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t(key)).toBe(expected);
  });

  it('falls back to the key itself for English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('Loading')).toBe('Loading');
  });
});
