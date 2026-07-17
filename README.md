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
