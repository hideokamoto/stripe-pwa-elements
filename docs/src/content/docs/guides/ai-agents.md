---
title: AI コーディングエージェントで使う
description: Agent Skill と llms.txt で、コーディングエージェントに stripe-pwa-elements の正しい使い方を渡す。
---

このリポジトリは、コーディングエージェント向けの [Agent Skill](https://agentskills.io/specification) を配布しています。
スキルには、用途に合うコンポーネントの選び方、publishable key と client secret の渡し方、送信・確定の流れ、
そして Stripe アカウントに変更を加える操作の前に利用者の承認を取るといった安全ルールが書かれています。

## インストール

[`skills`](https://www.npmjs.com/package/skills) CLI でプロジェクトに入れます。

```bash
npx skills add hideokamoto/stripe-pwa-elements
```

Claude Code ではプラグインとして入れることもできます。

```text
/plugin marketplace add hideokamoto/stripe-pwa-elements
/plugin install stripe-pwa-elements@stripe-pwa-elements
```

## HTTP で取得する

このサイトは、リポジトリの `plugins/stripe-pwa-elements/skills/stripe-pwa-elements/SKILL.md` をビルド時に読み込んで配信しています。

| URL | 内容 |
| --- | --- |
| [`/skill.md`](/skill.md) | スキル本体（SKILL.md） |
| [`/.well-known/agent-skills/index.json`](/.well-known/agent-skills/index.json) | [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc)（草案 v0.2.0）形式の一覧。各スキルの SHA-256 ダイジェスト付き |
| [`/.well-known/agent-skills/stripe-pwa-elements/SKILL.md`](/.well-known/agent-skills/stripe-pwa-elements/SKILL.md) | スキル本体。リンク先の `reference.md` と `examples.md` も同じディレクトリにあります |

## llms.txt

ドキュメント全体は [`/llms.txt`](/llms.txt)、[`/llms-full.txt`](/llms-full.txt)、[`/llms-small.txt`](/llms-small.txt) で取得できます。
`/llms.txt` にはスキルの URL とインストール方法も載せています。
各ページの `<head>` には `<link rel="describedby" href="/llms.txt">` があり、どのページからでも `/llms.txt` を見つけられます。

## コンポーネントを変えたら

コンポーネントの追加・名前変更・削除や、props・イベント・メソッド・読み込み方法を変えたときは、
同じプルリクエストでスキルも更新してください。
スキルに書いたタグ名・CDN のパス・i18n の言語がコードと合わなくなると、`src/agent-skill.unit.spec.ts` が失敗します。
