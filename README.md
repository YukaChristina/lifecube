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
