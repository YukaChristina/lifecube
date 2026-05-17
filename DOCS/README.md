# DOCS 目次

このディレクトリは、LifeCube 開発の共有リファレンスです。

人間の開発者と AI コーディングエージェントの両方が読む前提で書きます。各ファイルは、通常の開発中に読み切れる長さを維持し、不安定な情報や未決定事項は `open-questions.md` に集約します。

AI エージェント向けの作業入口は、リポジトリルートの `AGENTS.md` です。

## 読む順番

多くの実装タスクでは、まず以下を読んでください。

1. `project-overview.md`
2. `development-principles.md`
3. `ai-development-workflow.md`
4. `test-strategy.md`
5. `open-questions.md`

その後、必要に応じて分野別の文書を読みます。

- プロダクト方針: `product-direction.md`
- 直近開発計画: `near-term-development-plan.md`
- アーキテクチャ: `architecture.md`
- React Native / TypeScript 規約: `coding-guidelines.md`
- テスト戦略: `test-strategy.md`
- UI/UX詳細: `ui-ux/README.md`
- 顔検出による内側写真フォーカス補正: `ui-ux/face-focus-composition.md`
- UIデザイン方針: `ui-ux/design-guidelines.md`
- ネイティブアプリとビルド方針: `native-app-policy.md`

## プロンプト雛形

AI に渡す再利用可能なプロンプトは `prompts/` 配下に置きます。

- `prompts/implement-feature.md`
- `prompts/update-docs.md`
- `prompts/review-architecture.md`
- `prompts/reorganize-docs.md`

## メンテナンス規約

- Markdown 形式で書きます。
- UTF-8 BOMなしで保存します。
- 長い文章よりも、短い見出しと箇条書きを優先します。
- チャットで説明した一般的な基礎知識は、原則として転記しません。
- プロジェクト固有の判断、運用ルール、未決定事項を優先して残します。
- `TBD` は、未決定であることを意図的に示す場合だけ使います。
- 決定済みになった内容は、`open-questions.md` から該当する文書へ移します。
- ドキュメント群が探しにくくなったら、このディレクトリ構成自体を再整理します。
