# LifeCube

LifeCube は、iOS / Android の両方で動作するインストール可能なモバイルアプリとして開発する Expo / React Native プロジェクトです。

この README は人間向けの入口です。AI コーディングエージェント向けの作業入口は `AGENTS.md` です。

## 最初に読むもの

プロジェクト方針や設計の詳細は `DOCS/` 配下で管理します。

- `DOCS/README.md`
- `DOCS/project-overview.md`
- `DOCS/development-principles.md`
- `DOCS/open-questions.md`

AI エージェントに作業を依頼する場合は、まず `AGENTS.md` を入口にしてください。

## 現在の開発基盤

- 対象プラットフォーム: iOS / Android
- フレームワーク: Expo / React Native
- 言語: TypeScript
- ルーティング: Expo Router を標準採用
- ビルド方針: development build と EAS Build を前提
- 開発サーバー: `npx expo start --dev-client`
- ネイティブ層: まずは Expo modules と既存ライブラリを使い、必要な場合のみネイティブ設定やネイティブコードを扱う

## Expo / EAS 環境

推奨する EAS CLI / Node 環境:

```bash
eas-cli/18.11.0 win32-x64 node-v22.15.0
```

環境は Expo / EAS 標準に合わせて以下の3つを使います。

| 環境 | 用途 |
| --- | --- |
| development | 開発者の手元確認 |
| preview | テストユーザー確認。iOS では TestFlight 配布 |
| production | 本番配布 |

ローカル開発では `.env.local` を使います。`.env.local` は Git 管理しません。

```env
APP_VARIANT=development
EXPO_PUBLIC_APP_ENV=development
```

詳細な環境切替、bundle identifier、EAS profile の方針は `DOCS/native-app-policy.md` を参照してください。

## セットアップ

依存関係をインストールします。

```bash
npm install
```

## 開発サーバー

development build に接続する開発サーバーを起動します。

```bash
npx expo start --dev-client
```

Web プレビューが必要な場合だけ、補助的に以下を使います。

```bash
npm run web
```
