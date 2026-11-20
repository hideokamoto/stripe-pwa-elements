---
title: エージェント向け検証マップ
description: 機能ごとの正典デモと、エージェント・コントリビュータが実行すべき検証コマンド。
---

この表は [AI コーディングエージェント](./ai-agents) 向けです。英語版: [Agent verification map](/en/guides/agent-verification-map/).

一括実行:

```bash
pnpm run verify:agent
```

| 利用者が求めること | 正典デモ | 必須コマンド | 任意 |
| --- | --- | --- | --- |
| カード分割フィールド + PaymentIntent | [`examples/codesandbox/card.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox/card.html) | `pnpm run test:component`（card）、`pnpm run test:unit` | `example:copy` + `example:serve` |
| 住所入力 | [`examples/codesandbox/address.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox) | address の component/unit tests | CodeSandbox |
| Express Checkout（ウォレット） | [`examples/codesandbox/express-checkout.html`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/examples/codesandbox) | express-checkout unit tests | Playwright（下記） |
| Payment Element（統合フォーム） | `example/example3.html`（ビルドコピー） | payment-element tests | デモ未整備 — 優先して codesandbox に追加予定 |
| Payment Sheet（未公開 npm） | Stencil `www/` / component tests | `pnpm run test:unit`（payment-sheet）、CI `model-check` | [`spec/payment-sheet/`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/spec/payment-sheet)（Quint） |
| Agent Skill とコードの同期 | — | `pnpm run test:unit`（`agent-skill.unit.spec.ts`） | `uvx --from skills-ref agentskills validate plugins/stripe-pwa-elements/skills/stripe-pwa-elements` |

### Playwright（Stripe 実ネットワーク）

[`e2e/stripe/`](https://github.com/hideokamoto/stripe-pwa-elements/tree/main/e2e/stripe) は **CI には含まれません**（ネットワークと Stripe.js が必要）。メンテナまたはローカルで:

```bash
pnpm run build
pnpm run test:e2e:stripe
```

`verify:agent --stripe-e2e` でも同じです。

### 形式検証（Payment Sheet）

CI は `spec/payment-sheet/sheet_v3.qnt` をシミュレーションします。詳細はリポジトリの [`spec/payment-sheet/README.md`](https://github.com/hideokamoto/stripe-pwa-elements/blob/main/spec/payment-sheet/README.md)。