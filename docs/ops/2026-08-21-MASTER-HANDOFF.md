# MASTER HANDOFF — 2026-08-21

**This is the single entry point for the next builder (Grok 4.6 or any model).** It consolidates
four research workflows + this session's verification pass into one ranked, source-anchored plan.

## How to read this (trust model)

Every load-bearing claim is tagged so you build on checked ground, not on our confidence — because
**our own prior research had a measurable error rate this session** (SBR mis-classified, shrinkage
direction stated backwards, "T11 spec doesn't exist" when it did, MoneyPuck marked commercial when
it isn't, a PR that "fixed the settlement path" fixed dead code). The tags:

- **[VERIFIED]** — checked against a primary source (a fetched ToS page, a grep of the actual code,
  a hand-run computation) *by the orchestrator this session*. Trust it; the check is named.
- **[ANALYST]** — a research subagent asserted it with a cited source, but the orchestrator did not
  independently re-run the check. Treat as a strong lead; re-verify before it becomes load-bearing.
- **[COUNSEL]** — legal/regulatory/payments risk framing for a lawyer's review, **not legal advice**
  and **not a fact**. Never ship a decision on one of these without counsel.

**Guards are not gospel.** Section 3 lists guards that were *wrong*. When a guard blocks you, check
which tag it carries before treating it as settled.

**Source artifacts (fuller detail than fits here):** this session's four workflow outputs live at
`/tmp/.../tasks/{wqvsa4ojd,wk8zk5e4s,wq1y08sf2}.output` — **ephemeral, they die with the session.**
The build-critical specs they contain (de-vig oracle, Parlay MRI, golden fixtures) are persisted
durably in the companion doc `docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md`.

---

## 0-A. VERIFICATION SWEEP RESULT (read this before trusting anything below)

An adversarial sweep re-checked this document's own load-bearing claims (workflow `w4lfzwsun`,
4 lanes + synthesis). **36 claims checked: 22 CONFIRMED, 7 CORRECTED, 4 REFUTED, 2 DRIFTED,
1 UNVERIFIABLE — ≈37% defect rate.** Corrections are already applied below.

**The critical shape of that number: every single [VERIFIED] claim held. All 13 defects were in the
[ANALYST] and [COUNSEL] tiers.** So the tag system works — build freely on VERIFIED, re-check ANALYST
before it becomes load-bearing. *A model that reads this doc flat, ignoring tags, will ship real errors.*

### The payments finding was OVERSTATED — and it had wrongly displaced a verified item

The original Item 1 ranked a **[COUNSEL]** claim (which this doc's own preamble defines as *"not legal
advice and not a fact"*) **above** a **[VERIFIED]** one. That is precisely the failure the trust model
exists to prevent, occurring inside the document that introduces it. Corrected: the age gate is #1.

What survived and what collapsed, on re-fetch of the primary sources:
- **Survives:** the Stripe bullet is real, quoted correctly, and *is* in the **Prohibited** tier (not
  the Restricted/due-diligence tier). Paddle mirrors it near-verbatim. Real, counsel-worthy risk.
- **[REFUTED] The omitted qualifier.** The bullet reads "sports forecasting or odds-making **with a
  monetary or material prize**." That qualifier is textually load-bearing (adjacent bullets carry it
  independently) and the original write-up **omitted it**. GSE holds no stakes and pays no prize.
- **[REFUTED] "PayPal repeats it"** — backwards. PayPal's gambling clause sits under **"Activities
  Requiring Approval"** (the friendlier tier), and its text requires **both** an entry fee **and** a prize.
- **[REFUTED] Live counter-evidence.** **actionnetwork.com** — a competitor named in GSE's own market
  research — serves a live `pk_live_` **Stripe** key on a page selling "Expert Picks."
- **[CORRECTED] The "90–180 day freeze"** is not documented Stripe policy. Stripe's Services Agreement
  describes Reserves only in open-ended discretionary terms. The day-count comes from high-risk-merchant
  brokers who sell fund-recovery services.

**Net:** genuine ambiguity with real enforcement-inconsistency risk → written scope-clarification to
Stripe + keep the crypto rail as insurance. **Not** a #1-slot emergency.

---

## 1. TOP CRITICAL PATH — do in this order

Ranked by *survival then revenue*, not by ease. Items 1–2 gate the whole paid business.

0. ~~**[BLOCKING PRECONDITION] Merge PR #446.**~~ ✅ **DONE 2026-08-21 21:12Z — ALL BLOCKERS CLEARED.**
   **The merge queue is empty. `main` is green. Nothing is gated on a merge button any more.**

   | PR | What | Merged as |
   |---|---|---|
   | #447 | **T12 import boundary — 8 violations → 0.** The repo-wide CI red is GONE. | `e742a1af` |
   | #446 | ESPN `limit=1000` on all three scoreboard fetchers (incl. the live settlement path) | `2da6f4e0` |
   | #441 | build-segfault / placeholder `DATABASE_URL` stub | `e7dd6222` |
   | #445 | this handoff + build specs | `3fa20887` |
   | #448 | de-vig oracle + Parlay MRI v1 (queue item 7) | `4455c96f` |

   **Verified on `main`:** import-boundary guard OK (0 violations, 2138 files);
   `espn-scores.ts` carries `limit=1000`; prediction-engine 2399 tests pass; `tsc` exit 0.

   → **START AT ITEM 1.** Do not wait for any merge. If you need something merged, push a PR and
   say so — do not stall.
1. **[VERIFIED] Age gate — the real #1; launch blocker for all paid acquisition.** No DOB field
   anywhere on the `User` model (`awk '/^model User /,/^}/' packages/db/prisma/schema.prisma` → zero
   hits), no 21+ gate at signup/checkout, despite 21+ messaging everywhere. Server-side DOB + 21+
   verification. ~1–2 days. Every ad platform requires it.
2. **[ANALYST] T11 settlement backfill** (`docs/ops/2026-08-21-settlement-backfill-spec.md`, on branch
   `origin/claude/overnight-2026-08-21` — read it with
   `git show origin/claude/overnight-2026-08-21:docs/ops/2026-08-21-settlement-backfill-spec.md`).
   `daysFrom 2→3` at `settle-sport.ts:184,187` **[VERIFIED: both lines are exactly as cited, and The
   Odds API documents max daysFrom = 3, so 2→3 is legal]** + a free-source backfill lane + health
   metric. Fixes the CRITICAL 86/1739 overdue backlog. Free-source only, no live DB in tests, deploy
   is founder's. **✅ Item 0 is DONE — `espn-scores.ts` on `main` already carries `limit=1000`, so
   build directly against it. Nothing blocks this.**
   - **[DRIFTED — delete spec step B.4]** "Terminal VOID for >14-day unresolvable picks can reuse
     existing VOID conventions" is false: the only VOID path
     (`free-settlement.ts:292-306`, `voidReason:'POSTPONED_OR_CANCELLED'`) is gated by
     `findPostponedMatch` (:377-395) requiring **positive** postponement evidence — there is no
     give-up fallback to reuse. Keep PENDING-with-flag.
   - **[CORRECTED — build this]** The **dated** ESPN fetch loop in `multi-source-scores.ts:130-141` —
     precisely the path backfill uses — has **no `checkClearance` call**, while the undated board
     (:111-121) and final fallback (:401-435) do. Gate it as part of T11.
3. **[COUNSEL — REVISED DOWN from #1, see §0-A] Payments rail: a real ambiguity, not a proven
   company-ender.** Counsel-worthy; **not** a reason to reorder everything. Send Stripe a **written
   scope-clarification** describing GSE's exact mechanics (sells analysis; holds no stakes, pays no
   prize), and keep the Coinbase Commerce rail (`CRYPTO-PAYMENTS-SPEC.md`, dark behind
   `CRYPTO_PAYMENTS_ENABLED`) as **insurance**, built in parallel rather than as an emergency migration.
4. **[VERIFIED] Flip the PROVEN pipeline — AFTER T11.** The pipeline + public CLV ledger are built
   and **dark** (`public-clv-policy.ts` encodes 52.4% break-even + Wilson CIs; `app/clv/page.tsx` is
   live). Flip `PUBLIC_PICKS_ENABLED` + `CANONICAL_HISTORY_ENABLED` to start settled-pick accrual
   toward the 100-settled PROVEN milestone. Blocker is accrual, not code. Flip after T11 so settlement
   debt can't corrupt the first published record.
5. **[VERIFIED] MoneyPuck license fix + clearance-gate the ungated hosts** (Section 3). Live compliance
   exposure. Downgrade the registry row; email MoneyPuck for commercial permission or pull the route.
6. **[ANALYST] Calibration-page CI layer** — gates a *defensible* PROVEN page: Clopper-Pearson headline
   interval, per-bin bands, quantile binning, full population incl. voids, version pinning, disclaimer.
   2–4 days reusing existing numerics. Publishing a bare "58% win rate" at n~100 is an FTC overclaim.
7. **[ANALYST] De-vig oracle + Parlay MRI v1** (build-specs companion doc). Real feature IP, TS specs
   + golden fixtures ready. **One caveat: the golden fixtures were self-derived; cross-check against
   real penaltyblog (numpy/scipy) once before treating them as CI-blocking.**

Then the reliability/hardening tail (Section 4): watchdog fix, schedule-literal lint, NB2 property
test, per-sport dispersion estimator, registry consolidation.

---

## 2. Existential / high risks (with the pre-condition each imposes)

| # | Risk | Tag | Pre-condition it imposes |
|---|---|---|---|
| 1 | No server-side age verification | **VERIFIED** | No paid ads of any kind until the age gate ships |
| 2 | Stripe rail ambiguity (**revised down** — see §0-A; prize qualifier omitted, PayPal claim refuted, competitor live on Stripe) | COUNSEL | Written scope-clarification to Stripe; crypto rail built in parallel as insurance |
| 3 | PROVEN-page overclaim (bare win-rate at n~100) | COUNSEL | No public track record until the CI/calibration layer + publication policy exist |
| 4 | Leaky-bucket economics (~150–200 active payers = ramen; ~10–15%/mo est. churn, no category benchmark) | ANALYST | Growth must be a *continuous* funnel (300–1,500 free signups/mo), annual-anchored — not a one-time launch |
| 5 | Chargebacks trigger the Stripe flag (Visa 0.65/0.9/1.8%, MC ~1.5%+100/mo) | ANALYST | Chargeback-defense pack before scaling: reminders, clear descriptor, one-click cancel, Radar |

---

## 3. Guard corrections — what our own rights guards got WRONG

The rights posture has **five** uncoordinated catalogs; only `apps/web/lib/scraping/source-rights-registry.ts`
is read by `checkClearance`. Findings:

- **[VERIFIED] MoneyPuck: registry says `commercialUse: true`; the site says non-commercial.** I
  fetched `moneypuck.com/data.htm` myself: *"free to use for non-commercial purposes and by journalists
  for ad-hoc use … For other purposes please inquire."* GSE is a paid SaaS with a **live route**
  (`/api/moneypuck/nhl`). `source-registry.ts:239` is wrong. → downgrade to non-commercial /
  permission_required; email for permission or pull the route. **Founder decision.**
- **[VERIFIED] My own PR #446 fixed dead code.** `EspnResultsClient` is called nowhere outside its
  test. The real settlement fetcher is `espnScoreboardUrl` in `espn-scores.ts` — it had the same
  missing-`limit=` truncation bug and #446 originally missed it. **Now fixed and pushed** (commit
  `8d712e1b` on `claude/espn-scoreboard-limit`).
- **[ANALYST] ESPN: two registries, opposite verdicts.** `source-registry.ts:303` = `espn-hidden-api`
  FORBIDDEN (non-commercial); `source-rights-registry.ts:230` = `espn-public-api` approved, automation
  allowed. Same source, and only the permissive one is enforced. Half the call sites are ungated.
  → one real legal review; treat public scoreboard *facts* as approved input, gate every call site.
- **[ANALYST] nflverse `spread_line`/`total_line`:** third-party odds columns inside a blanket CC-BY
  approval that carves out only `pfr_advstats`/`nextgen`, and they're **consumed as "the closing line"**
  in `clv-calibration.ts` (backtest-only). → document an explicit backtest-only exemption or carve them out.
- **[ANALYST] open-meteo:** conflicting verdicts (`paid-required` vs `approved_open_license`). Adopt the
  safer `paid-required` reading (free tier is non-commercial); fund it or gate the caller.
- **[VERIFIED] Ungated hosts feeding pick confidence — the solid half.** `build-independent-fair-values.ts`
  calls **Kalshi** (:167-192, :472-474) and **ClubElo** (:226-240, :486-489) with **zero `checkClearance`**
  in either the builder or the client files, and neither host is in the canonical registry. These feed the
  `independentFairValue` confidence-calibration signal. Gate + register both.
  - **[REFUTED] `weather.gov` is NOT in that file.** `grep -rn weather packages/ingestion-pipeline/src/build-independent-fair-values.ts`
    → **zero hits**. The real caller is `apps/web/lib/weather/game-weather.ts:111,198`. Fix the attribution;
    the registry-coverage point still stands for that file.
  - **[CORRECTED] Kalshi/Polymarket "three live paths"** conflated two vendors. Kalshi's REST client has
    exactly **one** live call site; a second provider (`packages/quote-plane/src/providers/kalshi-trade-api.ts:98`,
    zero `checkClearance`) is exported but **has no caller**. Register both; the exposure is smaller than stated.
  - `statsapi.mlb.com` registry-missing and `fetch-failover.ts` relaying "cleared" GitHub sources through
    `ghproxy.net` (unreviewed third party) both stand.
- **[VERIFIED] Guards that HELD:** football-data.co.uk (`approved_public_logged_off` affirmed by
  direct multi-page check — robots open, the one purpose clause fits GSE), the-odds-api (both registries
  agree, licensed), and the hard-law boundaries (sportsbook internals, StatsBomb non-commercial). The
  **law-floor guards were sound; the error rate is in our research-based classifications.**

**Root-cause fix [founder-gated, L]:** consolidate to the single canonical registry, push gates into
client files, make `assertIngestible` a thin wrapper. This is behind nearly every finding above.

---

## 4. Develop queue (buildable, NOT founder-gated) — ranked

Each item is self-contained: what, where, validation gate, size. Merged from all four workflows.

1. **T11 settlement backfill** [ANALYST, M] — see critical path #3. Gate: backfill lane settles a
   fixture-fed overdue pick with no live DB; suite green.
2. **External-watchdog false-alarm fix + contract test** [ANALYST, S] — `external-watchdog.yml:63`
   compares status to `"ok"` but `scheduler-liveness.ts:52` emits `"healthy"|"degraded"|"dead"|"unknown"`
   → alarm permanently red, ops muted it. Fix the literal + add a test tying the accepted string to the
   `SchedulerLivenessStatus` union. **NOTE: `.github/**` is sealed — founder applies the workflow line;
   the contract test is yours.**
3. **De-vig oracle golden fixtures + module** [ANALYST, M] — build-specs companion doc. Gate: 7 methods
   reproduce fixtures at atol 1e-9. Cross-check fixtures against real penaltyblog once first.
4. **Soccer CLV closing-line verify-then-wire** [ANALYST, M] — CLV ledger is more built than assumed;
   wire football-data.co.uk Pinnacle close (`PSCH/PSCD/PSCA`) as the graded close for soccer.
5. **Workflow schedule-literal lint + refresh-odds fix** [ANALYST, S] — `external-cron.yml:130` gates
   `refresh-odds` on a cron literal absent from `on.schedule` → never fires. Add a lint asserting every
   `github.event.schedule ==` literal has a matching `on.schedule` entry. (Workflow edit is founder's.)
6. **NB2 dispersion property test** [ANALYST, S] — research-only; Monte-Carlo assert `Var=μ+μ²/φ` and
   empirical VMR ~2.15 at league mean (the test that would have caught φ=12).
7. **Clean-source registry batch registration** [ANALYST, S] — Section 5 list, into the canonical registry.
8. **Clearance-surface mechanical hardening** [ANALYST, M] — behavior-preserving: fix the
   `free-first-ingest.ts` hardcoded-`espn-public-api` routing, gate the dated ESPN path, register the
   ungated hosts. Gate: no behavior change, all clearance tests green.
9. **Per-sport dispersion estimator** [ANALYST, M] — offline `estimate-phi.ts` (method-of-moments,
   floored) + runner over settled `TeamGameLog`; makes NHL fall to Poisson automatically. Evidence-only.
10. **Age gate** [VERIFIED, S] — DOB on `User` + server-side 21+ at signup + checkout.
11. **Chargeback-defense pack** [ANALYST, S] — reminders, descriptor, one-click cancel, Radar.
12. **Betting-vocabulary payments scan** [ANALYST, S] — extend `compliance-scanner/rules.ts` beyond the
    `FAN_EXPLAINER` template to pricing//clv/methodology/dashboard, flag-not-block, underwriting angle.
13. **B2B v1 API tier scoping** [VERIFIED, S] — `/api/v1/signals` + `/probabilities` return Pro-gated
    confidence on ALL picks (incl. premium rows) under one shared static key. Add per-key scopes.
14. **Durable rate limiting on public routes** [ANALYST, S] — swap in-memory token bucket for the
    Postgres-backed limiter already built for B2B; add trusted-proxy `x-forwarded-for` handling.
15. **Parlay MRI v1 honest engine** [ANALYST, M] — build-specs doc; correlation lookup + Cholesky MC;
    ship as transparency until book SGP quotes exist and correlated beats naive on a walk-forward.
16. **Field-leverage adopters** [ANALYST, S–M each] — Section 6 of the build-specs doc (ESPN odds
    open/close, PowerIndex ~35 metrics, ClubElo scoreline grid, MoneyPuck situational xG, ESPN
    weather/probables). All engine-input provenance ceiling; ClubElo gated on its clearance fix.

---

## 5. Register / rights reconciliation (execute item 4.7 into the canonical registry)

- **Downgrade:** MoneyPuck → non-commercial/permission_required [VERIFIED]. open-meteo → paid-required.
- **Register ungated live hosts:** Kalshi + Polymarket → permission_required (written-consent terms);
  statsapi.mlb.com → likely approved_public_logged_off after ToS check; api.clubelo.com → verify
  (no stated terms — email maintainer) but gate now; weather.gov → mirror into canonical registry.
- **New clean open sources [ANALYST, license-verified this session]:** Wyscout/Pappalardo (CC-BY-4.0),
  idsse-data (CC-BY-4.0), SkillCorner (MIT), EWF (CC-BY-SA-4.0), jfjelstul/worldcup (CC-BY-SA-4.0),
  Lahman DB (CC-BY-SA-3.0), FiveThirtyEight (CC-BY-4.0), OpenLigaDB (ODbL), Reep register (CC0
  entity-mapping), Wikidata (CC0), droher/boxball (Retrosheet Parquet).
  - **[VERIFIED by re-fetch]** Wyscout/Pappalardo (CC-BY-4.0), FiveThirtyEight (CC-BY-4.0), Lahman.
  - **[CORRECTED] OpenLigaDB "explicitly allows betting games" is a mistranslation.** ODbL is confirmed,
    but the phrase renders *Tippspiele* — free **prediction-pool / pick'em** contests, **not** wagering.
    Do not cite it as a betting-use grant. ODbL share-alike caveat still applies.
- **Vendor_candidate (address US-majors closing-line gap):** SportsDataIO, SportMonks,
  Football-Data.org odds add-on — run the free questionnaire; purchase is founder-gated.
- **Verify-pending (register nothing yet):** StatsBomb, ImpectAPI (research-license pattern), clubelo,
  RSSSF, vaastav/FPL, Polymarket commercial terms.
- **Protective-exclusion:** the sportsdata-mcp sportsbook-direct cluster (Sportsbet, Ladbrokes,
  PointsBet, TAB, Unibet, Pinnacle, FanDuel endpoints) → `excluded`, same class as SBR.
- **Drops:** Cricsheet/Sackmann-tennis/Squiggle/Jolpica-F1 (clean but out-of-scope sports),
  transfermarkt-datasets + zarklin closing_odds (wrapper over restrictive source — SBR trap).

---

## 6. Founder-gated decisions (recommendation in brackets)

- **[REORDER] Payments:** counsel review + pull crypto rail forward now [do immediately].
- **MoneyPuck:** email for commercial permission or pull the route [downgrade registry now].
- **Kalshi/Polymarket exposure:** three ungated prod paths incl. the CLV-ledger cron [gate + register].
- **Math-fix deployment** (Anscombe 1/8, per-sport φ, D_i, MIN_GAMES, NHL-Poisson) into priced paths +
  the MVE greenlight [approve the *tests/estimator* now — all non-priced; defer priced deployment + MVE].
- **PROVEN go/no-go:** flip `PUBLIC_PICKS_ENABLED`+`CANONICAL_HISTORY_ENABLED` [flip AFTER T11].
- **T12 import-boundary CI red** (sealed control-plane) — unchanged repo-wide blocker [approve the
  relocation approach documented in `docs/ops/2026-08-21-gym-session-status.md`].
- **ESPN / open-meteo / nflverse verdict conflicts** [one legal review each; recommendations in §3].
- **Betfair Historical Data** — account-gated exchange, near the hard boundary [rule in-bounds as an
  official paid product, not scraping — founder call].
- **Registry consolidation (L)** [approve — root-cause fix].
- **US-majors vendor spend** [run free questionnaires now; gate the purchase].
- **Neon prod connection string** — still needs rotation (exposed in chat earlier).

---

## 7. Off-limits — restated on the record (the law-floor, NOT re-negotiable by research)

No sportsbook private systems (DraftKings/FanDuel/etc. internal APIs/apps), no competitor products, no
source classified permission_required/excluded/gambling-banned — specifically statsapi.mlb.com,
api-web.nhle.com, stats.nba.com, scores24.live, siriusxm-activator. No circumvention of any login,
paywall, CAPTCHA, anti-bot, or IP-block. No fake accounts, no proxy rotation, no evasion tooling. This
is computer-fraud + trade-secret law, independent of our research — re-checking our classifications
cannot relegalize unauthorized access. The reverse-engineering this session touched ONLY (a) code GSE
owns/is authorized to assess and (b) facts behind already-approved endpoints, spec-only, MIT-attributed.

---

## 8. Answered-questions map (what this research now settles)

- **Is selling picks legal?** [COUNSEL] Yes — Lowe v. SEC bona-fide-publisher posture, no picks-license
  regime found; stays protected while picks are impersonal and affiliate revenue never influences surfacing.
- **What gets pick-sellers prosecuted?** [COUNSEL] Fabricated inside-info + investment/return framing —
  patterns GSE's scanner already bans. Keep them banned forever.
- **Will Stripe serve this?** [COUNSEL] No clear path (Prohibited list). Single-rail is the top risk.
- **Real payments fallback?** [ANALYST] Coinbase Commerce crypto (owner-approved spec), gated on MSB read.
- **Is the math sound?** [ANALYST] Yes — e-process, robust-Kelly, calibration-selection check out vs the
  canon; needs citation-naming + property tests, not a rebuild.
- **Does Parlay MRI price correlation today?** [VERIFIED] No — copula is shadow-only (`priced:false`);
  survivability runs on naive product-of-marginals over hardcoded sample legs. Fix path is defined.
- **Does the consumer paywall hold?** [ANALYST] Yes — genuinely server-side; premium rows never leave
  the query for FREE viewers; Stripe webhook/checkout are reference-grade. **Gap:** the B2B v1 API leaks
  Pro-gated confidence under one shared key.
- **Are secrets clean?** **[VERIFIED — and cleaner than first reported]** `node scripts/guardrails/secret-scan.mjs --all`
  → `OK - scanned 5677 file(s) [all-tracked] (24 file(s) >2MB not scanned); no secrets detected.`, **exit 0.
  Zero hits** — not "one flagged then dismissed." (The earlier base64-image-blob story was wrong.)
- **Is "nobody publishes calibration" true?** [ANALYST] No — PropsBot.AI self-publishes on 218k picks
  (unaudited). True only of the six named leaders. **The open lane is *verified/credible* calibration.**
- **Real differentiators?** [ANALYST] Own-picks CLV ledger + a *verified* track record. Confidence
  scores, factor trail, line movement, parlay tools, alerts = table stakes (Rithmm ships "confidence scores").
- **Ramen number?** [ANALYST] ~150–200 simultaneously-active payers at ~$15 blended net ARPU; infra-only
  breakeven is 4–7 subs. Best retention lever = annual/season-pass SKU (LTV ~$177) — carries NY GBL 527-a
  notice obligations not yet built.
- **Can we advertise?** [COUNSEL] Google yes (core product, no gambling cert; affiliate surface excluded);
  Meta plausibly with Business-Manager account segregation; X paid partnerships foreclosed for gambling;
  Reddit unverified. **All gated on the age gate + creative-review SOP + counsel review of the PROVEN page.**

---

## 9. Status of this session's shipped work

- **PR #446** (`claude/espn-scoreboard-limit`) — ESPN scoreboard `limit=` fix. Now covers the schedule
  seed AND the real settlement path (`espn-scores.ts`); the dead-code `EspnResultsClient` fix remains but
  is harmless. Green except the repo-wide T12.
- **PR #445** (`claude/master-research-charter`) — all research/handoff docs, incl. this one. Green except T12.
- **PR #441** — build-segfault fix, verified green except T12.
- **T12** remains the single repo-wide CI red; its fix is founder-gated (sealed control-plane relocation).

---

*Build specs (de-vig oracle, Parlay MRI, golden fixtures, field-leverage adopters) →
`docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md`.*
