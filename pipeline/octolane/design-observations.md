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

## 4. Notable gaps vs. the real product (candidate follow-ups, not yet done)

Prioritized; none are in the current MVP scope (`00-prd.md`) but each is a
faithful-reproduction lever:

1. **Chat slash commands + `Cmd+/`** (`/docs/ai/chat-slash-commands`): `/find`,
   `/create`, `/report`, `/email`, `/forecast`, `/explain`. cloneX chat is free-text
   only. High value, medium effort (fits the existing tool-wrapper layer).
2. **Stage probability** on pipeline stages + a weighted pipeline value. Low effort.
3. **Typography scale**: adopt a display/text two-tier scale + a grotesk webfont.
4. **Warm-neutral surface polish**: subtle sidebar selection (Octolane uses a quiet
   gray selection, not a solid accent pill), line icons instead of emoji.
5. **Pricing** (reference only, out of scope): Pro $39–49/seat, Business $79–99/seat,
   Team (custom); "Save 20% yearly"; AI-credit allotments per tier.

## 5. Access limitation (for the record)

"Log into the app and screenshot every screen" could not be done end-to-end: the
product requires Google OAuth and `app.octolane.com` is egress-blocked. The captured
evidence lives in the session scratchpad (`octolane/shots`, `octolane/text`) — the
docs pages embed the real in-app screenshots, which is what these observations rely
on. If a demo Octolane login is provided, a logged-in capture pass can refine §1/§4.
