# Contributing

- `main` へ直接pushせず、Pull Request経由で変更してください。
- コミットはConventional Commits形式を基本とします（例: `feat: add interaction handler`）。
- 1コミット1目的とし、Secretや個人情報をコミットしないでください。
- Pull Request前に `pnpm typecheck`、`pnpm test`、`pnpm exec wrangler deploy --dry-run` を実行してください。
