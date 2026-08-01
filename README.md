# Cookie Lyrix 2.0

Discord向け多機能Bot。レベリング/経済システム、ギブアウェイ、チケット、モデレーション、緊急地震速報など、サーバー運営に必要な機能を1つのBotにまとめています。日本語・英語のバイリンガル対応(サーバーごとに切り替え可能)。

## 目次

- [技術スタック](#技術スタック)
- [主な機能](#主な機能)
- [コマンド一覧](#コマンド一覧)
- [セットアップ](#セットアップ)
- [環境変数](#環境変数)
- [データベース(Prisma)](#データベースprisma)
- [デプロイ(Render)](#デプロイrender)
- [多言語対応について](#多言語対応について)
- [ディレクトリ構成](#ディレクトリ構成)

---

## 技術スタック

| | |
|---|---|
| ランタイム | Node.js 22+ |
| Discord API | [discord.js](https://discord.js.org/) v14 |
| データベース | PostgreSQL + [Prisma](https://www.prisma.io/) |
| 画像生成 | [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)(ランクカード・地震分布マップ) |
| 地震速報 | [P2P地震情報](https://www.p2pquake.net/) WebSocket API |
| Webサーバー | Express(常時起動監視用のkeep-alive) |
| ホスティング | [Render](https://render.com/)(無料枠を想定) |

---

## 主な機能

### レベリング / 経済
- チャット投稿でXP・コインを自動獲得(クールダウン無し)
- `/level` … ランクカード表示、XPランキング(その場表示・自動更新パネルの両対応)、管理者によるXP付与/リセット
- `/level-role` … 到達レベルに応じたロールの自動付与(レベルはいくつでも自由に設定可能。到達済みのロールは積み上げ式で付与)
- `/coins` … コインの確認・付与・剥奪・ランキング
- `/daily` … デイリーボーナス(24時間に1回)
- `/gamble`, `/slot`, `/dice`, `/janken`, `/minesweeper` … コインを賭けて遊べるミニゲーム
- `/shop` … サーバー内の個人間ショップ(出品・購入・削除)
- `/redeem`, `/code`, `/code-list`, `/redeem-panel` … ギフトコード(XP・コイン・ロール付与)の発行と引き換え
- `/affinity` … ユーザー同士の親密度(相互言及の蓄積)ランキング

### ギブアウェイ
- `/giveaway start` … 画像・必須ロール・必要レベル・コイン賞品などを細かく設定して開催
- 重み付き抽選(参加条件や親密度などに応じて当選確率を調整可能)
- `/giveaway reroll` … 再抽選(参加者が十分いる場合、前回当選者は除外して再抽選)
- `/giveaway template` … よく使う設定をテンプレートとして保存・再利用

### チケット
- `/ticket` … 問い合わせ用のプライベートチャンネルをボタン1つで発行・クローズ
- クローズ済みチケットの自動アーカイブ/削除スケジューラ

### モデレーション
- `/mod` … 警告・キック・BAN
- `/antiraid` … 短時間の大量参加を検知し、その時間帯に参加した全アカウントをまとめてキック/タイムアウト
- `/spam-filter`, `/ngword` … 連投スパム対策・NGワードフィルター
- `/verify` … 認証パネル(複数サーバー在籍チェック・アカウント作成日数チェック)
- `/auto-role`, `/welcome`, `/tempvc`, `/starboard`, `/channel-reset`, `/log` … 各種サーバー運用機能
- `/role-panel` … ロール付与パネル(タイトル・対象ロール・付与ボタンのみのシンプル構成、1パネル1ロール)

### 地震速報
- `/earthquake setup` … 通知チャンネル・最小震度のしきい値を設定
- 地震情報(確定情報)を都道府県別の震度分布マップ付きで通知。続報・訂正は元のメッセージを編集して更新
- 緊急地震速報(EEW)にも対応。地域ごとの予測震度・想定マグニチュード・震源地を通知(続報のserial更新・取消にも対応)
- 津波情報も表示
- WebSocket切断時は指数バックオフで自動再接続

### その他
- `/ai` … Gemini APIを使ったAI応答機能(ペルソナ切り替え対応)
- `/poll` … 投票(複数選択肢・自動更新)
- `/language` … サーバーごとの表示言語切り替え(日本語 / English)
- `/help`, `/ping`, `/serverinfo`, `/userinfo`, `/message`

---

## コマンド一覧

<details>
<summary>クリックして展開</summary>

| コマンド | 説明 |
|---|---|
| `/affinity` | ユーザーとの親密度を管理します |
| `/ai` | AI機能を管理します |
| `/antiraid` | 荒らし対策を設定します |
| `/auto-role` | 新規参加者に自動で付与するロールを設定します |
| `/channel-reset` | このチャンネルを初期化します(クローン作成後、元チャンネルを削除) |
| `/code` | ギフトコードを管理します |
| `/code-list` | 有効なギフトコード一覧を表示します |
| `/coins` | コインを確認・管理します |
| `/daily` | デイリーボーナスを受け取ります |
| `/dice` | サイコロを振ります |
| `/earthquake` | 地震通知を設定します |
| `/gamble` | コインを使ってギャンブルをします |
| `/giveaway` | ギブアウェイを管理します |
| `/help` | Botのコマンド一覧を表示します |
| `/janken` | じゃんけんで遊びます |
| `/language` | サーバーの言語設定を変更します |
| `/level` | レベリング機能(ランク表示・ランキング・XP管理) |
| `/level-role` | レベル到達時のロール付与を設定します |
| `/log` | ログチャンネルを設定します |
| `/message` | Botとしてメッセージを送信します |
| `/minesweeper` | マインスイーパーで遊びます |
| `/mod` | ユーザーを処罰します(警告・キック・BAN) |
| `/ngword` | NGワードを管理します |
| `/ping` | Botの応答速度を確認します |
| `/poll` | アンケートを作成します |
| `/redeem` | ギフトコードを交換します |
| `/redeem-panel` | ギフトコード引き換えパネルを設置します |
| `/role-panel` | ロール付与パネルを設置します |
| `/serverinfo` | サーバー情報を表示します |
| `/shop` | 個人商店を利用します(出品・購入・削除) |
| `/slot` | スロットで遊びます |
| `/spam-filter` | スパムフィルターの設定を行います |
| `/starboard` | スターボードを設定します |
| `/tempvc` | 一時ボイスチャンネルを設定します |
| `/ticket` | チケット機能を管理します |
| `/userinfo` | ユーザー情報を表示します |
| `/verify` | 認証パネルを設置します |
| `/welcome` | 参加・退出メッセージを設定します |

</details>

---

## セットアップ

```bash
git clone <このリポジトリ>
cd cookie-lyrix-2.0
npm install
```

`.env` を作成し、[環境変数](#環境変数)を設定してください。

```bash
# コマンドをDiscordへ登録
npm run deploy

# 起動
npm start
```

開発中は `npm run dev` でファイル変更を監視しながら起動できます。

---

## 環境変数

| 変数名 | 必須 | 説明 |
|---|---|---|
| `DISCORD_TOKEN` | ✓ | Discord Botのトークン |
| `CLIENT_ID` | ✓ | Botのクライアント(アプリケーション)ID。コマンド登録(`npm run deploy`)に使用 |
| `DATABASE_URL` | ✓ | PostgreSQLの接続文字列(`prisma/schema.prisma`から参照) |
| `GUILD_ID` | 任意 | 開発中に特定のサーバーへ即時反映したい場合のテスト用サーバーID |
| `GEMINI_API_KEY` | 任意 | `/ai`機能を使う場合のGemini APIキー |
| `PORT` | 任意 | keep-alive用Webサーバーのポート(未指定時は3000) |
| `DEBUG_DISCORD` | 任意 | discord.jsのdebugログを出力したい場合に設定 |

---

## データベース(Prisma)

```bash
# マイグレーションを適用(本番/CI向け、既存のマイグレーション履歴をそのまま適用)
npx prisma migrate deploy

# 開発中にスキーマを変更した場合
npx prisma migrate dev --name <変更内容の説明>

# Prisma Clientの再生成(スキーマ変更後やpackage更新後)
npx prisma generate
```

**⚠️ `prisma/migrations/` フォルダは必ずGit管理してください。** マイグレーション履歴が失われると、新しい環境(ステージング環境や障害復旧時など)へのデプロイができなくなります。既存のマイグレーションファイルは変更・削除しないでください。

---

## デプロイ(Render)

`render.yaml` に沿ってデプロイされます。

```yaml
buildCommand: npm install
preDeployCommand: npx prisma migrate deploy
startCommand: npm start
```

デプロイのたびに `prisma migrate deploy` が自動実行され、未適用のマイグレーションが反映されます。Render無料枠のスリープ対策として、Express製のkeep-aliveサーバー(`src/lib/keepAlive.js`)が同梱されています。

---

## 多言語対応について

`/language` コマンドでサーバーごとに日本語/英語を切り替えられます。Bot側のメッセージは全て `src/lib/i18n.js` を経由して翻訳されており、新しい文言を追加する際は必ず `ja`/`en` の両方にキーを追加してください(片方のみの追加は表示崩れの原因になります)。

コマンド名・オプションの説明文は、Discordの仕様上ローカライズが煩雑になるため、`日本語 / English` の併記形式で統一しています。

---

## ディレクトリ構成

```
src/
  commands/          コマンド本体(カテゴリごとのフォルダ分け)
    economy/         コイン・ギフトコード・ショップ
    games/           ミニゲーム
    general/         投票・親密度・ユーザー情報など
    giveaway/         ギブアウェイ
    level/           レベリング・レベルロール
    moderation/       モデレーション・地震速報・各種サーバー設定
    tickets/         チケット
  events/            Discordイベントハンドラ(messageCreate, guildMemberAddなど)
  handlers/          コマンド/イベントの動的読み込み処理
  lib/               共通ロジック(DB, i18n, 各種サービス, 画像描画など)
  data/              地震速報用の都道府県GeoJSONなど静的データ
  index.js           エントリーポイント
  deploy-commands.js コマンド登録スクリプト
  clear-commands.js  登録済みコマンドの削除スクリプト

prisma/
  schema.prisma      DBスキーマ定義
  migrations/        マイグレーション履歴(Git管理必須)
```
