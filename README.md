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
