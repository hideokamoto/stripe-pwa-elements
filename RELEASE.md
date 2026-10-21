# リリースガイド

このリポジトリは **Changesets** を使った自動リリースフローを採用しています。
公開対象は次の 2 パッケージです。

| パッケージ | 場所 |
| --- | --- |
| `stripe-pwa-elements` | リポジトリルート |
| `hono-stripe-elements` | `packages/hono-stripe-elements` |

## リリースフロー概要

```
開発
  ↓
pnpm changeset で変更内容を記述（.changeset/*.md を PR に含める）
  ↓
PR を main に merge
  ↓
CircleCI (npm-monorepo.yaml) が一直線に自動実行:
  changeset version（版上げ＋CHANGELOG）
    → main へコミット & push（[skip ci]）
    → changeset publish（npm 公開・OIDC）
    → タグ push
```

> リリース用の CI 設定は別リポジトリ [`hideokamoto/circleci-configurations`](https://github.com/hideokamoto/circleci-configurations) の
> `workflows/publish/npm-monorepo.yaml` にあり、CircleCI の Pipeline Definition（config source）でこのプロジェクトに紐づけています。
> **このリポジトリに publish 用の workflow ファイルは置きません。**
> version 上げも publish も CircleCI に統一しており、「Version Packages」PR は使いません。
> npm 公開は **OIDC Trusted Publishing** で行うため、長期の npm トークンは不要です。
> CI が**版上げコミットを main に直接 push** するため、main をブランチ保護する場合は bot/トークンに保護バイパスを許可してください。

---

## 手順

### 1. PR 作成時

```bash
pnpm changeset
```

- **どのパッケージが変更されたか**（`stripe-pwa-elements` / `hono-stripe-elements`）
- **バージョン種別**（`patch` / `minor` / `major`）
- **変更内容の説明**（CHANGELOG に記載されます）

生成された `.changeset/*.md` を PR に含めてください。リリース不要な変更（docs、CI のみなど）では changeset は不要です。

### 2. main へのマージ後（自動）

1. **未消化 changeset の判定** - `.changeset/*.md`（README 以外）が無ければ即終了
2. **`changeset version`** - `package.json` の版を上げ、`CHANGELOG.md` を生成し、取り込んだ changeset を削除
3. **main へコミット & push** - `chore: release version packages [skip ci]`
4. **`changeset publish`** - ビルドして未公開バージョンを npm に公開（OIDC）
5. **タグ push** - `<パッケージ名>@<版>` 形式（例: `stripe-pwa-elements@4.1.0`）

> 4.0.1 以前のタグは `v4.0.1` 形式です。以降は Changesets 標準の `<パッケージ名>@<版>` 形式になります。

> **公開が途中で失敗したら**: 手順 3 の push 後に 4 が失敗すると、main は版上げ済みで npm 未公開の状態になります。
> 手動で `pnpm changeset:publish` を再実行してください（package.json と npm を比較して未公開分だけ公開するため二重公開しません）。

### 補足: ピア依存の範囲

`hono-stripe-elements` は `stripe-pwa-elements` を peerDependency（`>=4.0.1`）に持ちます。
`.changeset/config.json` で `onlyUpdatePeerDependentsWhenOutOfRange` を有効にしているため、
`stripe-pwa-elements` の patch/minor リリースで peer の範囲や hono 側の版が連動して上がることはありません。

---

## ローカルでの手動リリース（緊急時のみ）

```bash
pnpm changeset:version   # 版上げ + CHANGELOG
git add -A && git commit -m "chore: release version packages"
npm login
pnpm changeset:publish   # ビルド → publish
git push origin --tags
```

---

## 必要な設定

### npmjs.com 側: Trusted Publisher 登録（必須）

公開する **各パッケージ**（`stripe-pwa-elements`、`hono-stripe-elements`）に、Trusted Publisher（CircleCI）を登録します。

| 項目 | 値 |
| --- | --- |
| Organization ID | CircleCI の Organization Settings（UUID） |
| Project ID | CircleCI の Project Settings（UUID） |
| Pipeline definition ID | publish 用 Pipeline Definition の ID |
| VCS origin | `github.com/hideokamoto/stripe-pwa-elements` |

### CircleCI 側

- Pipeline Definition: config source に `circleci-configurations` の `workflows/publish/npm-monorepo.yaml`、checkout source にこのリポジトリを指定
- Trigger: main への push（`default-branch-pushes`、`config-ref main`）
- Context: `npm-publish-guard`（実行できるブランチ/ユーザーを制限。npm トークンは入れない）、`github`（版上げコミットとタグの push 用。`contents:write` が必要）

### main のブランチ保護

CI が版上げコミットを main に直接 push します。保護している場合は bot/トークンに保護バイパスを許可してください。

---

## トラブルシューティング

- **何も公開されない**: `.changeset/*.md`（README 以外）が main にあるか、CircleCI の `release` ジョブのログを確認
- **版上げコミットの push で失敗**: `github` Context のトークン権限とブランチ保護バイパスを確認
- **Publish が失敗する**: 各パッケージの Trusted Publisher 登録、`NODE_AUTH_TOKEN` / `NPM_TOKEN` や `.npmrc` の `_authToken` が残っていないか（残っていると OIDC 交換がスキップされる）、`pnpm build` が通るかを確認
- **特定のパッケージだけ公開したくない**: `.changeset/config.json` の `ignore` にパッケージ名を追加

## 参考

- [Changesets](https://github.com/changesets/changesets/blob/main/docs/intro-to-changesets.md)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [circleci-configurations/workflows/publish](https://github.com/hideokamoto/circleci-configurations/tree/main/workflows/publish)
