# cloneX

Self-driving AI CRM (Octolane clone). Spec: `pipeline/octolane/spec/`. Dev conventions
and architecture rules: `CLAUDE.md`.

## Setup

```bash
pnpm install
cp .env.example .env   # adjust DATABASE_URL if needed
pnpm db:setup           # prisma db push && prisma db seed
pnpm dev
```

## Demo credentials (from `prisma/seed.ts`)

- Login: `demo@clonex.dev` / `demo1234`
- Workspace: "Demo Inc"
- API token (plaintext, shown once by the seed script and here — used for
  `/api/mcp` Bearer auth and E2E-015): `clonex-dev-token`

## Tests

```bash
pnpm build      # type-checks + builds
pnpm test:e2e   # playwright test — resets the DB and starts its own dev server
```

## Deploy (Vercel + managed Postgres) — 確認テスト用の公開URLを作る

1. **DB**: [Neon](https://neon.tech) か Vercel Postgres で空のPostgresを作成し、接続文字列を控える
2. **Vercel**: GitHubで `Torutesu/cloneX` を import(ブランチ `claude/bold-bell-q4mpl2`)。
   Framework は Next.js が自動検出される(`postinstall` で prisma generate 済み)
3. **環境変数**(Vercel Project Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | 手順1の接続文字列 |
   | `SESSION_SECRET` | ランダムな32文字以上(`openssl rand -hex 32`) |
   | `AI_MODE` | `fixture`(デモ用・APIキー不要)or `live` |
   | `ANTHROPIC_API_KEY` | `live` の場合のみ |
   | `AI_MODEL_MID` / `AI_MODEL_HIGH` | 省略可(既定 claude-sonnet-5 / claude-fable-5) |

4. **初回のみ、スキーマ適用とシード**(ローカルから本番DBへ):

   ```bash
   DATABASE_URL="<本番の接続文字列>" pnpm db:setup
   ```

5. デプロイ完了後、`https://<project>.vercel.app/login` に `demo@clonex.dev / demo1234` でログイン

注意: `AI_MODE=fixture` はfixtureメール6通+チャット定型2パターンのデモが動く。実AIで試すには `live` + APIキー。

## Cloudflare Workers 本番デプロイ(OpenNext アダプタ)

`@opennextjs/cloudflare` でビルドし、`wrangler` で Cloudflare Workers にデプロイする。
Prisma は Workers 上では `@prisma/adapter-pg` + Hyperdrive 経由で動く(`src/lib/prisma.ts`
がローカルNode/Workersを実行時に自動判定して分岐 — ローカル `pnpm dev`/`pnpm test:e2e` の
挙動は無変更)。

```bash
pnpm install
pnpm build          # 通常のNextビルド(型エラー0を確認)
pnpm test:e2e        # ローカルパスが無傷であることの確認(17/17)
```

1. **DB**: [Neon](https://neon.tech) 等で本番用の空Postgresを作成し、接続文字列を控える。
   ローカルから一度だけスキーマ適用+シード:

   ```bash
   DATABASE_URL="<本番の接続文字列>" pnpm db:setup
   ```

2. **Wrangler ログイン → Hyperdrive 作成**:

   ```bash
   npx wrangler login
   npx wrangler hyperdrive create clonex-db --connection-string="<本番の接続文字列>"
   ```

   出力される `id` を `wrangler.jsonc` の `hyperdrive[0].id`
   (プレースホルダ `REPLACE_WITH_WRANGLER_HYPERDRIVE_CREATE_ID`)に上書きする。
   `wrangler.jsonc` の `name`(既定 `clonex`)も、自分のCloudflareアカウントで
   空いている名前に変更する必要がある場合がある(workers.dev のサブドメインは
   アカウント内でグローバルに一意)。

3. **Secrets**(`wrangler secret put <NAME>` を対話的に実行、値を貼り付ける):

   ```bash
   npx wrangler secret put SESSION_SECRET
   npx wrangler secret put AI_MODE            # fixture か live
   npx wrangler secret put ANTHROPIC_API_KEY   # AI_MODE=live の場合のみ(空でも可)
   ```

4. **デプロイ**:

   ```bash
   pnpm cf:deploy
   ```

   表示される `https://<worker-name>.<subdomain>.workers.dev` を開き、
   `demo@clonex.dev` / `demo1234` でログインして確認する。

### ローカルでの動作確認(実デプロイ前)

```bash
pnpm cf:build     # OpenNextビルド(.open-next/ 生成)
pnpm cf:preview   # OpenNextビルド + wrangler dev(ローカルworkerd、Hyperdriveは
                  # wrangler.jsonc の localConnectionString 経由でローカルPGに接続)
```

`wrangler.jsonc` の `hyperdrive[0].localConnectionString` は既定で
`.env`/`.env.example` と同じローカルPG接続文字列になっている。Secrets のローカル版は
`.dev.vars`(`.dev.vars.example` をコピーして使う、`.env` 同様 gitignore 対象)。

ハマりやすい点:
- `wrangler.jsonc` の `name` が Cloudflare アカウント内で衝突していると `cf:deploy` が失敗する
- Hyperdrive の `id` をプレースホルダのままデプロイすると起動時にエラーになる(`cf:preview`
  はプレースホルダのままでも `localConnectionString` を使うので動く)
- `AI_MODE=live` にした場合は `ANTHROPIC_API_KEY` の secret も必須

## Cloudflare で確認テスト用URLを出す(最速: Quick Tunnel)

ローカルでアプリを起動し、Cloudflare Quick Tunnel で即席の公開URLを作る方法。
**Cloudflareアカウント不要・無料**。スマホからそのまま開けます。

```bash
# 0. PostgreSQLが無い場合はDockerで(DATABASE_URLは.env.exampleの既定値と一致)
docker run -d --name clonex-pg -e POSTGRES_USER=clonex -e POSTGRES_PASSWORD=clonex \
  -e POSTGRES_DB=clonex -p 5432:5432 postgres:16

# 1. アプリをローカル起動
pnpm install && pnpm db:setup && pnpm dev   # http://localhost:3000

# 2. 別ターミナルで cloudflared を入れてトンネルを張る
brew install cloudflared        # macOS(Windows: winget install Cloudflare.cloudflared)
cloudflared tunnel --url http://localhost:3000
```

出力される `https://<ランダム>.trycloudflare.com` がそのまま公開URL。
スマホで開いて `demo@clonex.dev / demo1234` でログインすれば確認テストができます。

注意:
- Quick Tunnel はターミナルを閉じると消える一時URL(確認テスト用途向け)
- 常設したい場合は Cloudflare Zero Trust の Named Tunnel か、
  上の「Cloudflare Workers 本番デプロイ」を使う
