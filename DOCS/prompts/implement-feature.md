# プロンプト: 機能実装

AI エージェントに機能実装を依頼するときに使うプロンプトです。

```text
あなたは LifeCube リポジトリで作業しています。

ファイルを編集する前に、以下を読んでください。
- AGENTS.md
- DOCS/README.md
- DOCS/project-overview.md
- DOCS/development-principles.md
- DOCS/ai-development-workflow.md
- DOCS/test-strategy.md
- DOCS/open-questions.md

タスク:
[ここに実装したい機能や修正内容を書く]

制約:
- 変更範囲を小さく保つ。
- 既存の Expo / React Native の作法に従う。
- TypeScript を使う。
- 必要がない限り、新しいアーキテクチャ、バックエンド、状態管理、UIシステムの判断を導入しない。
- 未決定事項に触れる場合は、簡潔に質問するか、明確な前提を置く。
- 関係のないユーザー変更を壊さない。

実装後に報告すること:
- 変更したファイル
- 変更した挙動
- 実行した確認
- 再ビルドや実機確認の要否
- 残っているリスクや未決定事項
```
