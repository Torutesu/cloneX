# Octolane — direct product observation (fidelity pass)

- date: 2026-07-17
- method: The original `teardown.md` was **medium confidence** because octolane.com
  returned 403 at teardown time and screens were reconstructed from reviews/press.
  This pass captured the live site directly with a headless browser (Chromium via the
  session proxy) once access was available. Marketing site, the public design system
  (`/forge-octolane/*`), and the full product docs (`octolane.com/docs/**`) were
  reachable and captured. The authenticated app (`app.octolane.com`) is **not** —
  it is behind Google-OAuth sign-in and the subdomain is blocked by egress policy
  (502 on CONNECT), so screens below are grounded in the docs' own product
  screenshots + copy, not a logged-in session.
- confidence: **high** for design tokens, taxonomy, pricing, and feature behavior
  (multiple first-party pages agree); the authenticated pixel layout remains inferred.

## 1. Design system (first-party — `/forge-octolane/colors`, `/typography`)

Colors are a Radix-style ramp; the shipped accent + status scale (step 9) read
straight off the live swatches:

| Token | Value | Note |
|---|---|---|
| core-blue-9 | `#0081F2` (rgb 0,129,242) | **brand accent** — bright blue |
| status-error-9 | `#E5484D` | danger |
| status-warning-9 | `#F76B15` | warning (orange) |
| status-success-9 | `#46A758` | success (green) |
| status-feature-9 | `#5B5BD6` | "feature"/info accent (indigo-violet) |
| status-info-9 | `#7CE2FE` | light cyan (surfaces, not text) |
| lime-9 | `#BDEE63` | — |
| indigo-9 | `#3E63DD` | — |

Neutrals: warm off-white canvas (~`#F7F7F5`), white surfaces, warm hairline
borders, near-black warm text — **not** the cool blue-slate the clone shipped with.

Typography: two Figma tiers surfaced as `Typography.<Variant>` — a **display** tier
(`font-display`, 9 sizes Max→DisplaySM, tight tracking) and a **text** tier
(`font-text`, H1→Tiny). Custom faces are TWK Lausanne (text) + a bold display face.
Pull-quotes are serif italic.

→ Applied: `brands/default.config.ts` now uses `#0081F2` primary + the warm neutral
ramp + the status colors above. Font face left as the system stack (the licensed
TWK/Galnoy faces aren't redistributable; loading a grotesk like Inter is a
recommended follow-up but was left out to avoid a build-time font fetch).

## 2. Product taxonomy (footer + docs nav)

- **Platform**: Pipeline Management, AI Enrichment, Custom AI Fields, AI Meeting
  Notes, AI Reporting, Custom Data Model, Website Signal.
- **Agents**: Agents Overview, Deal Finder, Follow-Up Agent, Outreach Agent,
  Meeting Recorder, AI Chat.
- Object model (docs): Accounts, Contacts, Opportunities, Pipelines & Stages,
  Notes & Activities, Tasks, Custom Fields, Custom Objects, Views & Filters, Signal.
  cloneX maps Account→Company, Opportunity→Deal (naming aside, model matches).

## 3. Behavior confirmed to match the clone's model

- **Approvals** (`/docs/ai/approvals`): every AI action that changes data or sends a
  message queues for review → **Approve / Edit / Reject**; per-action-type +
  per-confidence auto-approve thresholds; owner can disable globally. → matches
  SCR-010 / AIF-004 exactly.
- **Auto-detect deals** (`/docs/ai/auto-detecting-deals`): scans mail for
  buying-intent, proposes opportunity with account (auto-created), primary contact,
  estimated stage from conversation depth, suggested amount, one-click accept.
  → matches AIF-001.
- **Pipeline stages** have a name, color, probability, entry (auto-advance) and exit
  criteria. cloneX has name/stage only — probability + entry/exit criteria are a gap.

## 4. Fidelity gaps vs. the real product — now implemented

Each was a faithful-reproduction lever grounded in §1–3; all four shipped in this
pass (verified: 17/17 E2E green, 0 type errors):

1. **Chat slash commands + `Cmd+/`** (`/docs/ai/chat-slash-commands`): the composer
   now has an Octolane-style slash menu (`/find`, `/followup`, `/forecast`,
   `/report`, `/tasks`) with descriptions and arrow/enter/esc keyboard nav, and
   `⌘/` (Ctrl+/) jumps to AI Chat from any screen (AppShell) and focuses the
   composer. `/find` and `/followup` insert the fixture-backed phrases so they run
   end-to-end in `AI_MODE=fixture`; all commands execute for real in live mode.
2. **Stage probability + weighted pipeline value**: `Stage.probability` (0–100)
   added to the schema/seed (Lead 10 → Won 100); the board exposes a per-stage
   `weightedAmount` and the pipeline header shows a weighted forecast total.
3. **Typography**: self-hosted Inter (variable, latin, OFL) via `next/font/local`
   drives latin text; Japanese falls through to the system stack. Headings get
   display-register tracking; body enables tabular numerals so amounts align.
4. **Quiet sidebar**: emoji replaced with line icons, the solid accent pill became
   a quiet gray selection with a blue left-accent bar, plus a small brand mark.

Still out of scope (reference only): stage entry/exit criteria + multi-pipeline;
`/create`/`/email`/`/explain` backends; meeting recorder, visitor signal, real
email send; pricing tiers (Pro $39–49, Business $79–99, Team).

## 5. Real-app captures (second pass, same day)

The first pass relied on docs copy. A second sweep recovered **actual product
imagery** (the first crawl stripped `/_next/image?url=` query strings and lost
every product screenshot; refetched with full URLs + third-party articles):

- **8K product render** (Octolane's own asset via every.io's founder profile):
  the Opportunities *table* view with per-cell AI activity — cells literally show
  "Writing value… / AI running…" while a right-hand **AI step panel** streams
  `Trigger fired → Inputs gathered → Prompt prepared` with evidence chips
  (Quote #1234.pdf, an email thread, a web source). Sidebar: workspace switcher,
  **"Find or create…" search with ⌘K**, Home (badge), grouped sections
  (Workspace ▸ Sales ▸ Dashboards/Opportunities/Accounts/Contacts, Signals,
  Forms, Reports, Campaigns, Workflows; Private ▸ Inbox).
- **Photo of the real logged-in app** (Quivly case-study hero, octolane.com):
  the home screen is a **chat-first hub** — centered "Your move, Chandrika",
  a composer ("Ask about a deal, draft a follow-up, or recap a meeting…"),
  suggestion chips ("What's on today?", "Any missed follow-ups?", "Catch me up"),
  "Make Octolane smarter" cards (AI Memory / AI Actions), Upcoming meetings.
- **Older marketing shot** (theaiway.net): settings screens (Profile, Email &
  calendar, Data model, Pipelines, Integrations) and an "AI memory" review UI
  with Accept all / Dismiss — the approvals mental model extended to memories.

→ Applied from these: the dashboard became a "Your move, {name}" chat-first hero
(composer routes into /app/chat?q=… and auto-sends; chips map to the
fixture-backed flows), and the sidebar gained the workspace name row plus a real
"Find or create…" ⌘K palette searching deals/contacts/companies with create
shortcuts. Not yet done: AI cell-writing indicators in tables, the step/evidence
panel styling for proposals, AI Memory.

## 6. Access limitation (for the record)

"Log into the app and screenshot every screen" could not be done end-to-end: the
product requires Google OAuth and `app.octolane.com` is egress-blocked. The captured
evidence lives in the session scratchpad (`octolane/shots`, `octolane/text`) — the
docs pages embed the real in-app screenshots, which is what these observations rely
on. If a demo Octolane login is provided, a logged-in capture pass can refine §1/§4.
