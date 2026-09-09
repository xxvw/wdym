# wdym 要件定義書

## 1. 概要

### 1.1 プロジェクト名
`wdym`

### 1.2 目的
Discord 上でスラング、ネット用語、略語、口語表現などの意味を簡単に確認できる Bot を提供する。

ユーザーが Discord のスラッシュコマンドから単語や表現を入力すると、Cloudflare Workers 上でリクエストを受け取り、Venice API の `qwen3-5-9b` モデルへ問い合わせ、その意味・ニュアンス・使用例・注意点を日本語で返答する。

### 1.3 MVP の方針
初期バージョンでは以下に限定する。

- Discord のスラッシュコマンド `/wdym` に対応する
- LLM は Venice API の `qwen3-5-9b` を使用する
- Web Search は使用しない
- 会話履歴は保持しない
- データベースは使用しない
- Cloudflare Workers 上でサーバーレス運用する
- 返答は原則として日本語とする

---

## 2. システム構成

```text
Discord
  |
  | Slash Command: /wdym
  v
Cloudflare Workers
  |
  | HTTPS
  v
Venice API
  |
  | model: qwen3-5-9b
  v
Cloudflare Workers
  |
  v
Discord Response
```

### 2.1 使用技術

| 項目 | 採用技術 |
|---|---|
| Bot UI | Discord Slash Commands |
| 実行環境 | Cloudflare Workers |
| 言語 | TypeScript |
| LLM API | Venice API |
| LLM Model | `qwen3-5-9b` |
| Web Search | 使用しない |
| DB | 使用しない |
| デプロイ | Wrangler |
| パッケージ管理 | npm / pnpm のいずれか |

---

## 3. ユーザー要件

### 3.1 基本ユースケース

ユーザーは Discord 上で以下のようにコマンドを実行する。

```text
/wdym term:cooked
```

Bot は Discord Embed 形式で以下のような内容を返す。

```text
Title:
cooked

Fields:
意味
「もう終わった」「詰んだ」「どうしようもない」というニュアンス。

ニュアンス
失敗がほぼ確定している状況や、かなり不利な状態を表すカジュアルな表現。

例
"I'm cooked for this exam."
→「この試験、もう詰んだわ」

注意
かなりカジュアルな表現です。
```

### 3.2 想定入力

以下のような入力を対象とする。

- 英語スラング
- インターネットスラング
- SNS で使われる言葉
- 略語
- ミーム由来の表現
- チャット上の口語表現
- ゲームコミュニティで使われる表現
- 一般的な英語表現のニュアンス確認

例:

```text
/wdym term:sus
/wdym term:cooked
/wdym term:touch grass
/wdym term:iykyk
/wdym term:delulu
```

---

## 4. 機能要件

## 4.1 `/wdym` コマンド

### 概要
指定された単語またはフレーズの意味を LLM に問い合わせる。

### コマンド

```text
/wdym
```

### 引数

| 名前 | 型 | 必須 | 説明 |
|---|---|---:|---|
| `term` | string | Yes | 意味を知りたい単語またはフレーズ |

### 入力例

```text
/wdym term:touch grass
```

### 出力形式

回答は Discord Embed 形式で返す。

原則として以下の構成とする。

- Embed Title: 対象の単語または表現
- Field `意味`: 基本的な意味
- Field `ニュアンス`: 実際の使われ方や温度感
- Field `例`: 英文例と日本語訳
- Field `注意`: 必要な場合のみ表示

Embed の description は原則使用せず、情報は fields に分けて表示する。

注意事項には、該当する場合のみ以下を含める。

- offensive
- vulgar
- NSFW
- discriminatory
- outdated
- strongly context-dependent

---

## 4.2 Discord Interaction の検証

Cloudflare Worker は Discord から受信した HTTP リクエストについて署名検証を行う。

検証対象:

- `X-Signature-Ed25519`
- `X-Signature-Timestamp`

Discord Application の Public Key を使用して Ed25519 署名を検証する。

署名検証に失敗した場合は処理を行わず、HTTP 401 または適切なエラーを返す。

---

## 4.3 Discord PING 対応

Discord の Interaction Endpoint 登録時に必要な PING リクエストへ対応する。

Interaction Type が `PING` の場合、PONG を返す。

---

## 4.4 Venice API 呼び出し

Cloudflare Worker から Venice API の Chat Completions API を HTTPS で呼び出す。

使用モデル:

```text
qwen3-5-9b
```

### 基本パラメータ

想定値:

```json
{
  "model": "qwen3-5-9b",
  "max_tokens": 300,
  "temperature": 0.3
}
```

実装時に API 仕様との整合性を確認し、必要に応じて調整する。

### System Prompt の目的

LLM に以下の振る舞いを要求する。

- インターネットスラングや口語表現を説明する
- 原則として日本語で回答する
- 簡潔に説明する
- 意味だけでなくニュアンスも説明する
- 短い使用例を 1 つ含める
- offensive / vulgar / NSFW 等の場合は注意を書く
- 確信がない場合は断定しない
- Web Search を使用していないため、最新用語について不確かな場合はその旨を明示する
- 存在しない意味を推測して事実のように説明しない

---

## 4.5 長時間処理への対応

LLM の応答時間が Discord の初期応答制限を超える可能性があるため、必要に応じて Deferred Response を使用する。

想定フロー:

```text
Discord
  |
  | /wdym
  v
Worker
  |
  | Deferred Response
  v
Discord
  |
Worker -> Venice API
  |
Worker -> Discord Follow-up
```

MVP では、安定性を優先し Deferred Response + Follow-up Message を基本方式とする。

---

## 4.6 エラーハンドリング

以下を適切に処理する。

### Venice API エラー

例:

- API Key 不正
- Rate Limit
- 5xx
- Timeout
- 不正レスポンス

ユーザー向け例:

```text
今ちょっと意味を調べられませんでした。少し時間を置いてもう一度試してください。
```

内部エラーの詳細や API Key は Discord に表示しない。

### 入力エラー

空文字や無効な入力の場合は LLM を呼ばず、入力を促す。

### 想定外エラー

ユーザーには一般化したエラーメッセージを返し、Worker 側でログを記録する。

---

## 5. 非機能要件

## 5.1 コスト

インフラ固定費を極力発生させない。

基本構成:

- Cloudflare Workers
- Venice API

MVP では以下を使用しない。

- VPS
- 常駐 Bot プロセス
- データベース
- Redis
- Queue
- Web Search
- Object Storage

主な変動費は Venice API の LLM 利用料とする。

---

## 5.2 パフォーマンス

通常時、ユーザーがコマンドを送信してから数秒程度で回答を返すことを目標とする。

LLM の応答時間が長い場合でも、Discord の Interaction を失効させないよう Deferred Response を利用する。

---

## 5.3 可用性

Cloudflare Workers および Venice API が利用可能な範囲でサービスを提供する。

外部 API 障害時には Bot 全体をクラッシュさせず、ユーザーへエラーを通知する。

---

## 5.4 セキュリティ

以下を必須とする。

- Discord Interaction の署名検証
- Venice API Key をソースコードへ直接記述しない
- Secret は Cloudflare Workers Secrets として管理する
- GitHub リポジトリへ秘密情報をコミットしない
- ユーザー入力をログへ過剰に保存しない
- 外部 URL や HTML をユーザー入力から直接取得しない
- LLM から返された内容をコードとして実行しない

---

## 5.5 プライバシー

MVP では会話履歴を永続保存しない。

LLM に送信する情報は原則として以下のみとする。

- System Prompt
- `/wdym` に入力された term

不要な Discord ユーザー情報、サーバー情報、メッセージ履歴などは Venice API に送信しない。

---

## 6. LLM 要件

## 6.1 入力

例:

```text
cooked
```

### 推奨 System Prompt

```text
You are a concise dictionary for internet slang, informal English,
abbreviations, memes, and online expressions.

Explain the user's term primarily in Japanese.

Return:
1. Meaning
2. Nuance
3. One short example with Japanese translation
4. A warning only when relevant, such as offensive, vulgar, NSFW,
   discriminatory, outdated, or highly context-dependent usage.

Keep the answer concise and useful for Discord.

Do not invent a meaning when you are unsure.
Because you do not have web search enabled, explicitly say when a term
may be too new, niche, ambiguous, or context-dependent to explain reliably.
```

---

## 6.2 出力制約

- 原則日本語
- 短く読みやすい
- Discord 上で視認しやすい
- Markdown 使用可
- 長文を避ける
- 1 回の回答は概ね数百文字程度を目安とする
- Discord のメッセージ上限を超えないよう制御する

---

## 6.3 最新性に関する制約

MVP では Web Search を使用しない。

そのため、以下のケースでは回答の正確性が保証できない。

- 数日前に発生した新しいミーム
- 特定コミュニティだけで使われる極端にニッチな言葉
- TikTok / X / Twitch 等で急速に意味が変化している表現
- 固有名詞に強く依存する表現

モデルが十分な確信を持てない場合は、推測せず次のように返す。

```text
かなり新しい、または特定コミュニティに限定された表現の可能性があります。
Web検索なしでは正確な意味を判断できません。
```

---

## 7. Discord UI 要件

### 7.1 回答形式

Bot の通常回答は Discord Embed を使用する。

想定構造:

```json
{
  "embeds": [
    {
      "title": "cooked",
      "fields": [
        {
          "name": "意味",
          "value": "「もう終わった」「詰んだ」という意味。",
          "inline": false
        },
        {
          "name": "ニュアンス",
          "value": "失敗がほぼ確定している、またはかなり不利な状況で使うカジュアルな表現。",
          "inline": false
        },
        {
          "name": "例",
          "value": "\"I'm cooked for this exam.\"\n→「この試験、もう詰んだわ」",
          "inline": false
        },
        {
          "name": "注意",
          "value": "かなりカジュアルな表現です。",
          "inline": false
        }
      ]
    }
  ]
}
```

### 7.2 Embed 表示要件

- Title には検索対象の語句を表示する
- `意味` は必須
- `ニュアンス` は必須
- `例` は必須
- `注意` は該当する場合のみ表示する
- 各 field は `inline: false` を基本とする
- Discord の Embed 上限を超えないよう出力を制御する
- LLM の出力をそのまま Embed JSON として信用せず、Worker 側で構造化する
- Markdown は Discord Embed 内で利用可能な範囲に限定する
- ユーザー入力を Title に入れる際は、想定外に長い文字列を適切に切り詰める

### 7.3 Discord Embed の制約

実装時は Discord の最新仕様を確認し、少なくとも以下の上限を意識する。

- Title: 最大 256 文字
- Field name: 最大 256 文字
- Field value: 最大 1024 文字
- 1 Embed あたり最大 25 fields
- Embed 全体の文字数制限を超えないこと

`wdym` の用途では 4 fields 程度に抑え、各項目は簡潔にする。


### 7.4 コマンド名

```text
/wdym
```

### 7.5 Description

例:

```text
スラングやネット用語の意味を説明します
```

### 7.6 term Description

例:

```text
意味を知りたい単語やフレーズ
```

### 7.7 出力例

```text
[Embed]

Title:
cooked

意味
「もう終わった」「詰んだ」という意味。

ニュアンス
失敗がほぼ確定している、またはかなり不利な状況で使うカジュアルな表現。

例
"I'm cooked for this exam."
→「この試験、もう詰んだわ」

注意
かなりカジュアルな表現です。
```

---

## 8. 環境変数・Secrets

最低限以下を使用する。

| 変数名 | 種別 | 説明 |
|---|---|---|
| `DISCORD_PUBLIC_KEY` | Secret / Env | Discord Application Public Key |
| `DISCORD_APPLICATION_ID` | Env | Discord Application ID |
| `DISCORD_BOT_TOKEN` | Secret | コマンド登録等で必要な Discord Bot Token |
| `VENICE_API_KEY` | Secret | Venice API Key |

必要に応じて以下を追加する。

| 変数名 | 用途 |
|---|---|
| `VENICE_MODEL` | モデル名をコード外から変更可能にする |
| `ENVIRONMENT` | development / production の判定 |

推奨:

```text
VENICE_MODEL=qwen3-5-9b
```

---

## 9. ログ要件

Cloudflare Workers のログを利用する。

記録してよい情報:

- リクエスト成功 / 失敗
- Venice API の HTTP Status
- 処理時間
- エラー種別

原則として記録しない情報:

- API Key
- Discord Bot Token
- Authorization Header
- ユーザーの入力全文
- Venice のレスポンス全文

開発時のみ必要に応じて入力内容をログ出力する場合は、本番環境では無効にする。

---

## 10. リポジトリ構成案

```text
wdym/
├── src/
│   ├── index.ts
│   ├── discord.ts
│   ├── venice.ts
│   ├── prompts.ts
│   └── types.ts
├── scripts/
│   └── register-command.ts
├── test/
│   ├── discord.test.ts
│   └── venice.test.ts
├── wrangler.toml
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
└── REQUIREMENTS.md
```

### 各ファイルの責務

#### `src/index.ts`

- Worker のエントリポイント
- HTTP リクエスト受信
- Discord Interaction のルーティング

#### `src/discord.ts`

- Discord 署名検証
- Interaction の解析
- Deferred Response
- Follow-up Message

#### `src/venice.ts`

- Venice API 呼び出し
- Timeout
- エラー処理
- レスポンス解析

#### `src/prompts.ts`

- System Prompt
- LLM 用入力生成

#### `scripts/register-command.ts`

- Discord Slash Command の登録

---

## 11. 実装対象外

MVP では以下を実装しない。

- Web Search
- メッセージ監視
- `messageCreate` ベースの Gateway Bot
- 会話履歴
- ユーザーごとの記憶
- DB
- キャッシュ
- 管理画面
- Dashboard
- 複数 LLM モデル切り替え UI
- 音声入力
- 画像入力
- 自動翻訳 Bot としての汎用利用
- モデレーション Bot 機能
- 課金機能

---

## 12. 将来的な拡張候補

MVP 完成後、必要に応じて以下を検討する。

### Web Search

```text
/wdym term:xxxx search:true
```

Venice Web Search を利用して最新スラングを調査する。

### Context オプション

```text
/wdym term:cooked context:"bro said I'm cooked"
```

単語単体では曖昧なケースに文脈を与える。

### Language オプション

```text
/wdym term:cooked language:English
```

回答言語を切り替える。

### 自動検索フォールバック

モデルが確信を持てない場合のみ Web Search を実行する。

### キャッシュ

同じ単語への問い合わせ結果を Cloudflare KV 等へ一定期間キャッシュし、LLM コストを削減する。

---

## 13. テスト要件

最低限以下を確認する。

### 正常系

- Discord PING に正常応答する
- `/wdym term:sus` が動作する
- 複数単語のフレーズを処理できる
- Venice API の回答を Discord に返せる
- 日本語で回答される

### 異常系

- 不正な Discord 署名を拒否する
- Venice API が 401 の場合に安全に失敗する
- Venice API が 429 の場合に安全に失敗する
- Venice API が 5xx の場合に安全に失敗する
- Venice API がタイムアウトしても Worker がクラッシュしない
- 空入力を処理しない
- 非常に長い入力を制限する

### LLM 出力品質

以下の代表例で手動確認する。

```text
sus
cooked
touch grass
iykyk
delulu
based
cap
no cap
mid
ratio
```

確認項目:

- 意味が概ね正しい
- 日本語が自然
- ニュアンスが説明されている
- 使用例が自然
- 過剰に長くない
- 不確かな言葉を断定しない

---

## 14. 受け入れ条件

MVP は以下をすべて満たした時点で完成とする。

- [ ] Cloudflare Workers にデプロイできる
- [ ] Discord の Interaction Endpoint として登録できる
- [ ] `/wdym` コマンドが Discord に表示される
- [ ] `term` を指定して実行できる
- [ ] Discord リクエストの署名検証が行われる
- [ ] Venice `qwen3-5-9b` へリクエストできる
- [ ] 回答が Discord Embed 形式で返される
- [ ] 回答が原則として日本語である
- [ ] 意味・ニュアンス・使用例を含む
- [ ] 必要な場合に注意事項を表示する
- [ ] Web Search を使用しない
- [ ] DB を使用しない
- [ ] API Key がソースコードに含まれていない
- [ ] Venice API 障害時にユーザーへ安全なエラーを返す
- [ ] README にローカル開発・Secrets 設定・デプロイ方法が記載されている

---

## 15. 完成イメージ

```text
User
  |
  | /wdym term:touch grass
  v
Discord
  |
  v
Cloudflare Worker
  |
  | Verify Discord Signature
  |
  | Deferred Response
  |
  v
Venice API
  | model: qwen3-5-9b
  v
Cloudflare Worker
  |
  | Follow-up Message (Embed)
  v
Discord

--------------------------------

touch grass

意味:
「ネットばかり見てないで外に出ろ」
「現実世界に戻れ」というニュアンス。

ニュアンス:
ネット上で熱くなりすぎている人などに対して、
少し皮肉っぽく使われる表現。

例:
"You need to touch grass."
→「ちょっとネットから離れた方がいいよ」

注意:
相手を小馬鹿にするニュアンスを含むことがあります。
```
