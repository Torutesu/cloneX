# Butai — 製品を実演しながら喋るAIデモ社員(Sable clone)

Spec lives in `../../pipeline/sable/spec/`. Read `00-prd.md`, `02-schema.md`, `03-api.md`,
`04-e2e-cases.md`, `05-ai-features.md`, and `01-screens/*.md` before changing behavior.
Build deviations are recorded in `../../pipeline/sable/build-notes.md`.

This app is fully independent from the octolane clone at the repository root —
own package.json, own Prisma schema, own database (`sable`), own Playwright setup.
Always run commands from THIS directory (`apps/sable`).

## Stack

- Next.js 15 (App Router, TypeScript strict) + Tailwind CSS v4
- PostgreSQL (`sable` database) + Prisma
- Auth: bcryptjs + hand-rolled HMAC-signed session cookie (`src/lib/auth.ts`)
- AI: single call-site `src/lib/ai/client.ts`, `AI_MODE=fixture|live`
  (fixture is deterministic; E2E always runs fixture)
- Playwright E2E in `tests/e2e/` — uses the PRE-INSTALLED Chromium via
  `launchOptions.executablePath: /opt/pw-browsers/chromium`. Never run `playwright install`.

## Commands (run in apps/sable)

```
pnpm install
pnpm db:setup      # prisma db push && prisma db seed(seedは冪等)
pnpm dev           # next dev
pnpm build         # next build (must be 0 type errors)
pnpm lint
pnpm test:e2e      # playwright test(port 3100で自前サーバ起動、DBリセット+シード)
```

Demo login after seeding: `demo@example.com` / `demo1234`.
Buyer-side demo entry: `/d/taskflow-demo`(公開中のとき)。

## Architecture rules

- **Session progression logic lives in `src/lib/session-service.ts`** (messages/step/end
  share it). API routes only parse (Zod) → call service → shape response.
- **AI fixture matching** is title-based token/topic-synonym matching (`src/lib/ai/matching.ts`).
  Deterministic on purpose — E2E depends on it. Live mode replaces judgment with the LLM but
  keeps the same JSON shapes (`src/lib/ai/types.ts`).
- **Design tokens, not hardcoded colors.** `brands/butai.config.ts` defines the brand;
  `src/brand/config.ts` re-exports it and generates CSS vars injected in `src/app/layout.tsx`.
  Components reference `var(--brand-*)` or the component classes in `globals.css` — never
  literal hex values. Re-skin = new `brands/<brand>.config.ts` + change one import.
- **Never weaken E2E assertions to make them pass.** `tests/e2e/` cases map 1:1 to
  `04-e2e-cases.md` P0 cases (E2E-001..017).
- **DB reset for tests** uses `tests/reset-db.ts` (deleteMany), NOT `prisma db push --force-reset`
  (blocked by a safety guard in this environment).

## Multi-language (USER-REQ)

Buyer sessions support ja/en/zh/es with mid-conversation instant switching (AIF-003):
language is detected per buyer message, `Session.language` is updated server-side, and
narrations come from `DemoStep.narration` (per-language JSON). Buyer-facing UI strings
live in `src/lib/i18n.ts` — add languages there + `Persona.languages`.
