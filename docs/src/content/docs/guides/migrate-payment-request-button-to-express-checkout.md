---
title: stripe-payment-request-button から stripe-express-checkout-element への移行
description: stripe.paymentRequest() の廃止に伴う移行ガイド。
---

## なぜ移行が必要か

Stripe は `stripe.paymentRequest()` API を **Stripe.js 9.x で削除予定**です（2025-09-30 非推奨宣言 / 2026-03-25 削除予定）。
`<stripe-payment-request-button>` はこの API に依存しているため、**非推奨（deprecated）** となりました。

代替として、`<stripe-express-checkout-element>` を使用してください。こちらはモダンな Express Checkout Element API を使用し、Apple Pay・Google Pay・Link・PayPal・Amazon Pay など多数の決済手段をサポートします。

## 移行前後のコード比較

### Before: `<stripe-payment-request-button>`

```html
<stripe-payment-request-button
  publishable-key="pk_test_xxxxx"
  stripe-account="acct_xxxxx"
></stripe-payment-request-button>
```

```js
const element = document.querySelector('stripe-payment-request-button');

// PaymentRequest オプションを設定
await element.setPaymentRequestOption({
  country: 'US',
  currency: 'usd',
  total: {
    label: 'Total',
    amount: 1099,
  },
  requestPayerName: true,
  requestPayerEmail: true,
});

// Stripe を初期化
await element.initStripe('pk_test_xxxxx');

// 決済メソッドイベントを処理
await element.setPaymentMethodEventHandler(async (event, stripe) => {
  const { error } = await stripe.confirmCardPayment(
    paymentIntent.client_secret,
    {
      payment_method: event.paymentMethod.id,
    },
    { handleActions: false },
  );

  if (error) {
    event.complete('fail');
  } else {
    event.complete('success');
  }
});
```

### After: `<stripe-express-checkout-element>`

```html
<stripe-express-checkout-element
  publishable-key="pk_test_xxxxx"
  client-secret="pi_xxxxx_secret_xxxxx"
  amount="1099"
  currency="usd"
  stripe-account="acct_xxxxx"
></stripe-express-checkout-element>
```

```js
const element = document.querySelector('stripe-express-checkout-element');

// Stripe を初期化
await element.initStripe('pk_test_xxxxx');

// 決済確定イベントを処理（カスタム動作が必要な場合）
element.addEventListener('confirm', async ({ detail }) => {
  const { error } = await detail.stripe.confirmPayment({
    elements: detail.elements,
    confirmParams: {
      return_url: 'https://example.com/success',
    },
  });

  if (error) {
    console.error(error);
  }
});

// デフォルトの確定動作を使用する場合（推奨）
// should-use-default-confirm-action="true"（デフォルト）のまま
// defaultConfirmResult イベントで結果を受け取る
element.addEventListener('defaultConfirmResult', ({ detail }) => {
  if (detail instanceof Error) {
    console.error(detail);
  } else {
    console.log('Success:', detail);
  }
});
```

## Props / Events マッピング

### Props

| stripe-payment-request-button | stripe-express-checkout-element | 備考 |
| --- | --- | --- |
| `publishable-key` | `publishable-key` | 同じ |
| `stripe-account` | `stripe-account` | 同じ |
| `application-name` | `application-name` | 同じ |
| `stripeDidLoaded` | `stripeDidLoaded` | 同じ（JS プロパティ） |
| _(PaymentRequestOptions の `total.amount`)_ | `amount` | 属性として直接指定 |
| _(PaymentRequestOptions の `currency`)_ | `currency` | 属性として直接指定 |
| _(PaymentRequestOptions の `country`)_ | _(Elements に自動設定)_ | `client-secret` から自動推定 |
| `paymentMethodEventHandler` | _(`confirm` イベントで代替)_ | イベントリスナーに移行 |
| `shippingAddressEventHandler` | _(Express Checkout Element の `shippingaddresschange` で代替)_ | Stripe.js 直接利用 |
| `shippingOptionEventHandler` | _(Express Checkout Element の `shippingoptionchange` で代替)_ | Stripe.js 直接利用 |

### Events

| stripe-payment-request-button | stripe-express-checkout-element | 備考 |
| --- | --- | --- |
| `stripeLoaded` | `stripeLoaded` | 同じ |
| _(paymentmethod コールバック)_ | `confirm` | Express Checkout 確定時に発火 |
| _(なし)_ | `expressCheckoutClick` | ボタンクリック時に発火 |
| _(なし)_ | `defaultConfirmResult` | デフォルト確定動作の結果 |
| _(なし)_ | `cancel` | ユーザーがキャンセルした場合 |

### Methods

| stripe-payment-request-button | stripe-express-checkout-element | 備考 |
| --- | --- | --- |
| `initStripe(key, options)` | `initStripe(key, options)` | ほぼ同じ |
| `setPaymentRequestOption(options)` | _(属性 `amount`, `currency` で代替)_ | 移行先では属性で指定 |
| `setPaymentMethodEventHandler(fn)` | _(`confirm` イベントで代替)_ | イベントリスナーに移行 |
| `setPaymentRequestShippingOptionEventHandler(fn)` | _(Stripe Elements API で代替)_ | より柔軟な API を使用 |
| `setPaymentRequestShippingAddressEventHandler(fn)` | _(Stripe Elements API で代替)_ | より柔軟な API を使用 |
| `isAvailable(type)` | _(Express Checkout は自動的にボタンを表示制御)_ | 明示的な確認不要 |
| _(なし)_ | `updateProgress(status)` | ローディング状態の制御 |
| _(なし)_ | `setErrorMessage(msg)` | エラーメッセージの表示 |
| _(なし)_ | `updateElementOptions(options)` | 動的なオプション更新 |

## 関連リンク

- [`<stripe-express-checkout-element>` コンポーネントリファレンス](/components/stripe-express-checkout-element/)
- [Stripe Express Checkout Element ドキュメント](https://stripe.com/docs/elements/express-checkout-element)
- [Stripe.js 移行ガイド（英語）](https://stripe.com/docs/js/appendix/payment_request)

## 次に読む

- [決済フロー](/guides/payment-flows/)
- [Getting Started](/guides/getting-started/)
