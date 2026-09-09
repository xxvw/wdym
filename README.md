# wdym

Discordの `/wdym` コマンドで、スラング・ネット用語・略語の意味を日本語で説明するCloudflare Workers Botです。Venice APIの `qwen3-5-9b` を使用します。

## 開発

```bash
pnpm install
cp .env.example .dev.vars
pnpm dev
```

ローカルの `.dev.vars` には `DISCORD_PUBLIC_KEY`、`DISCORD_APPLICATION_ID`、`VENICE_API_KEY` を設定します。秘密情報はGitへコミットしないでください。

## Discordコマンド登録

```bash
pnpm register-command
```

`DISCORD_APPLICATION_ID`、`DISCORD_BOT_TOKEN`、`DISCORD_GUILD_ID` が必要です。初期実装はGuild Command登録です。

## 検証

```bash
pnpm typecheck
pnpm test
pnpm build
```

## GitHub Actions / Cloudflare

Pull Requestでは型チェック・テスト・デプロイdry-runを実行し、`main`へのpush時に `staging`（Worker名: `wdym-staging`）へデプロイします。GitHub Environment `non-production` に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` をSecretとして登録してください。

本番Cloudflare環境、DNS、実運用Secretsの構築は今回の対象外です。

## 公開リポジトリ運用

`main`へ直接pushせず、Pull Request経由で変更します。コミットはConventional Commits形式・1コミット1目的を基本とします。API Key、Bot Token、`.env`、`.dev.vars`は公開リポジトリへ含めません。
