# cloneX — Self-driving AI CRM (Octolane clone)

Spec lives in `pipeline/octolane/spec/`. Read `00-prd.md`, `02-schema.md`, `03-api.md`,
`04-e2e-cases.md`, `05-ai-features.md`, and `01-screens/*.md` before changing behavior —
this file only covers stack/commands/conventions, not product requirements.

## Stack

- Next.js 15 (App Router, TypeScript strict) + Tailwind CSS v4
- PostgreSQL + Prisma (`prisma/schema.prisma` is copied verbatim from `02-schema.md`)
- Auth: bcryptjs password hashing + a hand-rolled HMAC-signed session cookie
  (`src/lib/auth/session.ts`) — no iron-session, this is intentionally lightweight
- AI: single call-site `complete()` in `src/lib/ai/client.ts`, `AI_MODE=fixture|live`
- Playwright (`@playwright/test`) for E2E, one file per case in `e2e/`

## Commands

```
pnpm install
pnpm db:setup      # prisma db push && prisma db seed
pnpm dev           # next dev
pnpm build         # next build (must be 0 type errors)
pnpm lint
pnpm test:e2e      # playwright test (starts its own dev server on :3100, resets DB first)
```

Demo login after seeding: `demo@clonex.dev` / `demo1234`. Seeded API token (plaintext,
shown once by the seed script and here): `clonex-dev-token`.

## Architecture rules

- **Services layer is the only thing that touches Prisma.** `src/lib/services/*.ts`
  holds all business logic (dealService, contactService, companyService, taskService,
  proposalService, activityService, chatService, mailboxService, emailIngestService,
  settingsService, tokenService, workspaceService, pipelineService). API routes under
  `src/app/api/**/route.ts` only: parse/validate the request (Zod), call a service
  function, shape the response. This is required so `/api/mcp` (Phase 3) can call the
  exact same functions the UI uses (03-api.md "MCPファースト").
- **Proposal materialization is centralized.** `src/lib/proposals/materialize.ts`
  implements the SCR-010 "承認時の実体化ルール" table once; both manual approval
  (`proposalService.approveProposal`) and AIF-004 auto-approve
  (`proposalService.createProposalWithAutoApprove`) call it inside the same
  transaction that flips the proposal's status, so a materialization failure rolls
  back to PENDING instead of half-applying (per the AIF-004 fallback rule).
- **Error shape**: every thrown error in an API route must be (or become) an
  `ApiError` from `src/lib/api/errors.ts`, which `withErrorHandling()` converts to
  `{ error: { code, message } }`. Zod errors are also auto-converted to 400.
- **Workspace boundary**: every service function takes an explicit `workspaceId` and
  filters by it; every API route resolves it via `requireWorkspaceContext()`
  (`src/lib/api/context.ts`), never trusts a client-supplied workspace id.
- **Design tokens, not hardcoded colors.** `brands/default.config.ts` defines the
  `BrandConfig` (colors, radius, font). `src/lib/design-tokens.ts` turns it into CSS
  custom properties injected once in `src/app/layout.tsx`
  (`:root { --color-primary: ...; }`), and `src/app/globals.css` maps them into
  Tailwind's `@theme`. Components must reference colors as Tailwind classes that
  resolve to those tokens (`bg-primary`, `text-text-muted`, etc.) or `var(--color-*)`
  directly — never a literal hex/rgb value in a component. Re-skinning the product is
  "write a new `brands/<brand>.config.ts` and point `src/lib/design-tokens.ts` at it."
- **AI fixture mode** (`AI_MODE=fixture`, the default and what E2E always runs under):
  - AIF-001 (email → proposals): fixture content lives in `fixtures/emails/**/*.json`,
    each file embedding its own `expectedProposals`. Matching is by exact
    `(fromEmail, subject, bodyText)` triple (`src/lib/ai/fixtureRegistry.ts`) — not by
    an id — so the same manual-add UI/API path used in production also works in
    fixture mode. `fixtures/emails/*.json` (top-level) = the simulated mailbox pulled
    by `POST /api/integrations/mailbox/sync`. `fixtures/emails/manual/*.json` = presets
    only reachable via `POST /api/ingest/email` (SCR-015 "メールを手動追加"), used for
    E2E-013's two same-subject/different-confidence cases.
  - Fixture payloads can't hardcode a real `dealId` (generated at seed time), so they
    use a `$dealByName:<Deal.name>` sentinel string wherever a real id is needed;
    `src/lib/ai/sentinels.ts` resolves it against the live DB right after a fixture
    match. Live mode never produces sentinels — this is fixture-mode-only plumbing.
  - AIF-002/003 (chat) are **stubbed** in this build phase: `completeChatFixture()`
    always returns the fixed fallback ("応答を生成できませんでした"). Phase 3 replaces
    it with real pattern matching against `fixtures/ai/chat-patterns.json`.
- **Amount is stored as whole currency units, not minor units** — see
  `pipeline/octolane/build-notes.md` for why this deviates from the schema's own
  comment.

## data-testid conventions

Where `01-screens/*.md` names a concrete `data-testid` (e.g. `approve-<id>` on
SCR-010's ApproveButton, `stage-column-<stageName>` on SCR-005's DnD target), the E2E
tests use exactly that. Everything else follows this convention (screens are Phase 2 —
these are the ids the E2E suite in `e2e/` already assumes; implement screens to match):

| Area | data-testid |
|---|---|
| Auth (SCR-001) | `email-input`, `password-input`, `name-input`, `submit-button`, `error-banner`, `switch-link` |
| Onboarding (SCR-002) | `workspace-name-input`, `create-workspace-button`, `connect-mailbox-button`, `sync-progress`, `sync-summary`, `go-to-review-button` |
| Sidebar (common) | `sidebar-nav-<dashboard\|chat\|pipeline\|contacts\|companies\|tasks\|review\|settings>`, `review-badge-count` |
| Dashboard (SCR-003) | `proposal-preview-list`, `pipeline-summary`, `today-tasks`, `recent-activity`, `empty-state` |
| Review (SCR-010) | `proposal-card-<id>`, `approve-<id>`, `reject-<id>`, `edit-approve-<id>`, `filter-tab-<type>`, `history-section`, `confidence-badge-<id>`, `source-accordion-<id>` |
| Pipeline (SCR-005) | `stage-column-<stageName>`, `deal-card-<id>`, `add-deal-button`, `empty-state` |
| Deal detail (SCR-006) | `deal-name`, `deal-amount`, `deal-stage-select`, `timeline`, `timeline-item-<id>`, `note-input`, `add-note-button`, `task-tab`, `note-tab`, `pending-proposal-banner` |
| Contacts (SCR-007) | `add-contact-button`, `contact-row-<id>`, `contact-name-input`, `contact-email-input`, `contact-company-input`, `contact-search-input`, `contact-modal-error` |
| Companies (SCR-008) | `add-company-button`, `company-row-<id>`, `company-name-input`, `company-domain-input` |
| Tasks (SCR-013) | `task-checkbox-<id>`, `add-task-button`, `filter-tab-<status>`, `task-row-<id>` |
| Settings (SCR-015) | `auto-approve-toggle-<type>`, `auto-approve-threshold-<type>`, `save-auto-approve-button`, `add-token-button`, `token-plaintext`, `sync-now-button`, `manual-add-email-button`, `manual-email-from-input`, `manual-email-subject-input`, `manual-email-body-input`, `manual-email-submit` |
| Chat (SCR-004) | `chat-input`, `chat-send-button`, `chat-message-list`, `deal-ref-card-<id>`, `draft-preview-card`, `add-to-review-button` |

## Build phases (this repo tracks clone-factory Stage 3)

Phase 0-1 (current): scaffold, schema+seed, auth+API, AI fixture plumbing, E2E P0
tests written against the data-testid contract above. **No screens exist yet** — every
E2E test that reaches a UI step is expected to fail (missing testid), not a config/
harness error. Phase 2 builds the screens against this same contract; Phase 3 wires up
live AI; Phase 4 is the fix-until-green loop.
