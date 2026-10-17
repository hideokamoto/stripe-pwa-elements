---
title: Getting Started
description: インストールから最小の利用例まで。
---

## まず触る

インストール前に、CodeSandbox 上のデモ（Stripe テストモード・APIキー不要）で動作を確認できます。

[![Edit in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/devbox/github/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox)

デモで試せるコンポーネント:

- `<stripe-card-element>`（カード入力・PaymentIntent の確認フロー）
- `<stripe-address-element>`（住所入力）
- `<stripe-express-checkout-element>`（Apple Pay / Google Pay / Link。デバイス依存）

`<stripe-payment-element>` のデモはまだありません。

## インストール

```bash
npm i stripe-pwa-elements
```

## 利用（HTML）

> この例は「概念の最小」を示します。実運用では Stripe 側で PaymentIntent / SetupIntent を作成して `client_secret` を渡してください。

```html
<stripe-card-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
  should-use-default-form-submit-action="false"
></stripe-card-element>
```

## 次に読む

- `Guides` から Intent の扱いやイベント設計を確認
- `Components` から各コンポーネントの Props / Events / Methods を参照
