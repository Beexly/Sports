# Branch status — `claude/data-source-eval-2026-06-03`

_Snapshot 2026-06-03. What is built, what is staged, and the exact founder-gated
steps to ship it. Everything below is on this branch; nothing has been deployed,
migrated, or had a live flag flipped._

## The one-line thesis

Three features land the entire "calibrated, not a tout" pitch at once: the engine
stops grading itself (independent estimators), it gets a second independent eye
(Poisson from real team rates), and it starts **proving** it beats the close
(CLV) — all explained in plain language and audited in the open (glass box).

## What shipped (commits, newest first)

| Commit | What | State |
|--------|------|-------|
| `bd0ae32` | Odds-provider failover decision + merge layer (#5 core) | pure logic done; adapter pending |
| `347267a` | Loss-autopsy DRAFT generator (#3 pt 2) | done; never auto-publishes |
| `41755df` | Glass-box "ask the model why" agent (#3 pt 1) | done |
| `57f5eac` | CLV capture pipeline + private admin dashboard (#2) | code done; needs migrate+deploy |
| `aa9bc31` | Team scoring rates → independent Poisson estimator (#11) | done; needs data + flag |
| `092dafb` | Edge engine wired into live moneyline scoring, surfaced-not-priced (#10) | done; needs cron wiring |
| `444affd` | Independent edge engine (`assessEdge`) — the core fix | done |
| `eb8d5d2` | Read-only Kalshi fair-value adapter (CLV keystone) | done |
| `ec17d9d` / `8641d13` / `4bd9d32` | Data-source decisions (Kalshi+odds-api.io+API-Sports; reject SerpApi/SportDB; defer Polymarket/Sportradar; decline NewsData) | decided |

All new code is tested and typechecks. Engine 268 tests, data-ingestion 45,
web 763 brand-safety + admin-gating green.

## Migrations authored on this branch (NOT applied)

Run with `prisma migrate deploy` (founder-gated). All are additive/idempotent.

1. `20260603120000_add_pick_clv` — CLV lock/close/graded columns on `picks` + index.
2. `20260603130000_seed_pick_explanation_budget` — `PICK_EXPLANATION` Claude budget.
3. `20260603140000_seed_loss_autopsy_draft_budget` — `LOSS_AUTOPSY_DRAFT` Claude budget.

`prisma generate` has been run locally so the client types match.

## Go-live order (founder-gated)

1. **Rotate every leaked key** (see the secrets ledger in
   `docs/source-providers/kalshi-and-odds-api-io-evaluation-2026-06-03.md`):
   odds-api.io, api-football/API-Sports, NewsData.io, SportDB.dev, and the
   unrelated **x.ai/Grok** key. Store replacements in env only.
2. **Deploy the branch** + run the 3 migrations (`prisma migrate deploy`).
3. **Edge engine goes live (additive, safe first):** wire the ingestion cron to
   pre-fetch Kalshi `getFairValue` (needs a team-abbreviation lookup table) into
   `OddsInput.context.independentFairValues`. The scorer already consumes it,
   surfaced-not-priced — confidence/edge/publish-gate are unchanged. CLV grading
   (already wired in `settle-sport.ts`) starts populating the `/admin/clv`
   dashboard as games settle.
4. **Poisson as the 2nd estimator:** set `TEAM_RATES_AVAILABLE=true` and wire the
   cron to add the Poisson `independentFairValue` (from real `TeamGameLog` scores)
   to the same context field. Only fires for soccer/hockey/baseball once teams
   clear `MIN_GAMES_FOR_RATES` (5) settled games.
5. **Let the edge MOVE confidence (the real switch):** a deliberate
   `MODEL_VERSION` bump that prices the independent edge into the score. Do this
   only after watching the surfaced edge + CLV agree on live data.
6. **Glass box:** `ANTHROPIC_API_KEY` is already env-based; the explainer and
   autopsy drafter work post-deploy. Loss autopsies save as DRAFT for review in
   `cockpit/losses` — publishing stays manual.

## Still open (and why they're not built here)

- **#5 odds-api.io adapter** — wire format unconfirmed; the failover *logic* is
  done, the concrete HTTP mapping waits on the verified endpoint (no guessing).
- **#4 Lighthouse CI** — needs a headless browser in CI (not available here).
- **#6 SharpSports "Second Opinion"** — external bet-sync API + user OAuth; depends
  on #2 being live.
- **#7 monetization / B2B fair-value API** — Stripe + pricing/product decisions.
- **#9 surface-routing / Haiku flips** — changes which model serves prod; needs
  live-key validation.

## Non-negotiables held throughout

No fabricated data (Poisson λ computed from real scores, never synthesized; no
guessed API schemas). No autonomous money/orders/publish/deploy/migration. Read-only
exchange data only. Secrets via env. Calibration + CLV over win-rate.
