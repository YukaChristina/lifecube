# AGENTS.md

このファイルは、LifeCube リポジトリで作業する AI コーディングエージェント向けの入口です。

README は人間向けの概要とセットアップを扱います。AI エージェントへの恒常的な作業指示は、このファイルに集約します。

## Read First

作業前に、まず以下を読んでください。

- `DOCS/README.md`
- `DOCS/project-overview.md`
- `DOCS/development-principles.md`
- `DOCS/ai-development-workflow.md`
- `DOCS/coding-guidelines.md`
- `DOCS/test-strategy.md`
- `DOCS/open-questions.md`

UI/UX、保存、ネイティブ機能、アーキテクチャに関わる作業では、該当する分野別DOCSも確認してください。

## Communication

- 基本的に日本語で、簡潔に回答します。
- ユーザーは音声入力を多用します。
- 文脈から明らかな音声認識ミスは補完します。
- 実装や設計が分岐する曖昧さがある場合だけ、簡潔に質問します。
- 軽微な言い間違いや表記揺れだけで作業を止めません。

## Work Rules

- 既存のDOCSとコードを確認してから実装します。
- 変更範囲を小さく保ちます。
- MVP中は、必要以上の全体リファクタリングを避けます。
- ユーザーの既存変更や無関係なファイルを壊しません。
- アーキテクチャ、永続化、バックエンド、ビルド設定、UI方針に影響する変更では前提を明示します。
- 決定したプロジェクト方針は、必要に応じてDOCSへ反映します。

## Documentation

- Markdown とソースコードは UTF-8 BOMなしで保存します。
- 一般論を過剰にDOCS化しません。
- DOCSには、プロジェクト固有の決定、運用ルール、実装方針、未決定事項を優先して残します。
- 未決定事項は `DOCS/open-questions.md` に集約します。
- テスト方針は `DOCS/test-strategy.md` に従います。

## Verification

- 変更後は `DOCS/test-strategy.md` に従って確認します。
- 通常のコード変更では、最低限 `npm run lint` と `npx tsc --noEmit` を実行します。
- 実行できなかった確認がある場合は、理由を報告します。
- カメラ、音声認識、写真保存、SQLite、権限、アルバムに関わる変更では、実機確認が必要かを報告します。

## Build Awareness

- ビルド作業自体は基本的に人間が行います。
- AI エージェントは、変更内容から development build の作り直しが必要かを判断し、必要な場合は報告します。
- native module、Expo config plugin、権限、`app.json`、`eas.json` に影響する変更では、再ビルド要否を明記します。
- 通常の JS / TS / UI のみの変更では、原則として再ビルド不要として扱います。

## Final Report

作業後は、以下を簡潔に報告します。

- 変更したファイル
- 変更した挙動
- 実行した確認
- 実行できなかった確認
- 再ビルドや実機確認の要否
- 残っているリスクや未決定事項
