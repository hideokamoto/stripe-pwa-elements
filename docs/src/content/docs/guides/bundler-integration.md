---
title: バンドラ統合（Vite / webpack / Capacitor）
description: custom-elements ビルドから直接 import して実行時の動的 import 失敗を回避する。
---

Vite・webpack・Rollup などのバンドラを使う場合（Capacitor アプリを含む）は、
遅延ローダー `defineCustomElements()` ではなく **custom-elements ビルドからの直接 import** を推奨します。

## 遅延ローダーの問題

通常のインストール手順では、遅延ローダー経由ですべてのコンポーネントを登録します。

```javascript
import { defineCustomElements } from 'stripe-pwa-elements/loader';
defineCustomElements();
```

このローダーは各コンポーネントを実行時に動的 `import()` で別チャンクとして取得します。
バンドラ環境ではチャンク URL がパッケージ自身の ESM 出力を基準に解決されるため、
バンドラが正しく配信できないことがあります。Vite（および Vite ベースの Capacitor プロジェクト）では、
次のエラーとして現れることがよくあります。

```text
TypeError: Failed to fetch dynamically imported module
```

## 解決策: custom-elements ビルドから import する

必要なコンポーネントを `dist/components` から直接 import します。
各モジュールは import 時にカスタム要素を自動登録するため、import するだけで利用できます。

```javascript
// <stripe-payment-element> を登録 — defineCustomElements() は不要
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

import が静的になるため、バンドラがコンポーネントをアプリのバンドルに含めます。
実行時の動的 `import()` が発生しないので、"Failed to fetch dynamically imported module"
エラーは起こりません。

実際に使うコンポーネントだけを import してください（それぞれ tree-shaking 可能です）。

```javascript
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
import 'stripe-pwa-elements/dist/components/stripe-express-checkout-element';
```

要素のタグ名は変わらないため、マークアップはそのままです。

```html
<stripe-payment-element
  publishable-key="pk_test_xxxxx"
  intent-client-secret="pi_xxxxx_secret_xxxxx"
></stripe-payment-element>
```

TypeScript の型は `dist/components` からではなく、引き続きパッケージルートから import します。

```ts
import type { DefaultFormSubmitResult, IntentType } from 'stripe-pwa-elements';
```

## バンドラ別のセットアップ

### Vite

特別な設定は不要で、上記の静的 import がそのまま動作します。
アプリのエントリポイント（例: `main.ts`）付近で一度 import してください。

```javascript
// main.ts
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

以前 `defineCustomElements()` を呼んでいた場合は、二重登録を避けるため削除してください。

### webpack

webpack は静的 import を直接解決するため、追加のローダー設定は不要です。
エントリモジュールからコンポーネントを import します。

```javascript
// index.js
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

### Rollup

Rollup はインポートしたコンポーネントを静的にバンドルします。
パッケージパスを解決できるよう `@rollup/plugin-node-resolve` を有効にしてください。

```javascript
// rollup.config.mjs
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  plugins: [nodeResolve()],
  // ...
};
```

```javascript
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
```

## Capacitor + Vite（推奨セットアップ）

Capacitor の Web レイヤーは通常 Vite でビルドされるため、遅延ローダーでは上記の
動的 import エラーに遭遇することがあります。代わりに直接 import を使ってください。

```javascript
// src/main.ts
import 'stripe-pwa-elements/dist/components/stripe-payment-element';
// 利用する他のコンポーネントも追加
```

これは Capacitor アプリおよび
[`@capacitor-community/stripe`](https://github.com/capacitor-community/stripe)
の Web 実装で推奨されるセットアップです。

## どちらを使うか

| 環境 | 推奨 import |
| --- | --- |
| 素の HTML / ビルドなし | CDN `<script type="module">` |
| Vite / webpack / Rollup / Capacitor | `stripe-pwa-elements/dist/components/<tag>` |

どちらも同じコンポーネントを登録します。読み込み方法が異なるだけです。
