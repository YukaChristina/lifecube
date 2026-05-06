# LifeCube

LifeCube は、iOS / Android の両方で動作するインストール可能なモバイルアプリとして開発する Expo / React Native プロジェクトです。

このリポジトリでは、Codex や Claude Code などの AI コーディングエージェントを通常の開発フローに組み込みます。人間の開発チームと AI エージェントの両方が、`DOCS/` 配下のドキュメントを参照しながら、プロジェクト方針・設計・開発規約を共有します。

## 最初に読むもの

実装や設計判断の前に、まず以下を確認してください。

- `DOCS/README.md`
- `DOCS/project-overview.md`
- `DOCS/development-principles.md`
- `DOCS/ai-development-workflow.md`
- `DOCS/open-questions.md`

`DOCS/` 配下のドキュメントは、人間にも AI にも読みやすいことを重視します。開発が進んだら、現状に合わせて短く整理し続けます。

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

## ドキュメント規約

- プロジェクト文書は `DOCS/` 配下に置きます。
- Markdown 形式で書きます。
- テキストファイルは UTF-8 BOMなしで保存します。
- 見出しは安定させ、1ファイルを長くしすぎないようにします。
- 表は比較が必要な場合にだけ使います。
- ワイヤーフレーム、ディレクトリ構成、コマンド、プロンプト雛形は fenced code block で書きます。
- 未決定事項は実装メモに埋め込まず、`DOCS/open-questions.md` に集約します。
- チャットで説明した一般的な基礎知識は、原則として README や `DOCS/` に転記しません。プロジェクト固有の決定、運用ルール、実装方針だけを残します。

## AI支援開発

Codex、Claude Code、その他の AI エージェントに実装を依頼する場合は、関連する `DOCS/` ファイルを文脈として渡してください。

このプロジェクトでは音声入力による指示が多く、認識違いが混ざる前提です。AI エージェントは、文脈から明らかな誤変換は補完し、実装や設計に影響する曖昧さがある場合だけ、簡潔に質問してください。
