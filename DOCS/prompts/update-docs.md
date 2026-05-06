# プロンプト: ドキュメント更新

変更後にプロジェクト文書を更新するときに使うプロンプトです。

```text
あなたは LifeCube のドキュメントを更新しています。

以下を読んでください。
- AGENTS.md
- DOCS/README.md
- DOCS/project-overview.md
- DOCS/development-principles.md
- DOCS/open-questions.md

タスク:
次の変更内容を反映して、ドキュメントを更新してください。
[ここに変更内容を書く]

ルール:
- Markdown を簡潔に書く。
- UTF-8 BOMなしで保存する。
- 同じ情報を複数ファイルに重複して書かない。
- 決定済みになった内容は DOCS/open-questions.md から移す。
- 新しい未決定事項は DOCS/open-questions.md に追加する。
- 人間と AI エージェントの両方にとって使いやすい文書にする。
```
