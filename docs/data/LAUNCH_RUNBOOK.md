# LAUNCH RUNBOOK — Aug 22 → NFL kickoff (~Sep 10)

**Status:** the single ordered path. Everything the org executes between now and kickoff
lives here or in `docs/data/FLEET_DISPATCH.md` (Grok's operational read). Written Fri
2026-08-22 on branch `claude/grok-stats-analysis-i8muyp` (kernel contract PR #554 landed
on this branch; `kernel/slots/` NOT yet populated — Wave K1 in flight on the free fleet).

**Two clocks, in order of hardness:**
1. **Ox Alpha free window closes ~Aug 28–29** (`docs/ops/FREE_WINDOW_BLITZ.md`). Every
   PUBLIC-class card not dispatched by then is built at paid cost or not at all.
2. **NFL kickoff ~Sep 10** (`docs/data/EDGE_SUPREMACY_DOCTRINE.md` §H0).

**Card inventory (7 decks on disk, 81 cards):** CARDS_SCANNERS (10), CARDS_CLOSING_LINE
(9), CARDS_INCENTIVE_CALENDAR (9), CARDS_SHARE_CORE_WIRING (10), CARDS_EDGE_VALIDATE
(17), CARDS_LAUNCH_QA (18), CARDS_PROOF_LADDER (8). 11 PUBLIC · 70 INTERNAL/CROWN.

**CARDS_PROOF_LADDER landed a live, real grading bug — this is not a hypothetical.**
PL1 (CRITICAL): the free-settlement path matches finals by team-pair + calendar-day
only, no game ID anywhere in the chain (`apps/web/lib/data-sources/free-settlement.ts`,
`settlePendingPicks()` L281-334). A same-day doubleheader (the canonical case — common
in August/September MLB pennant-race scheduling, i.e. right now) produces two finals
under one `matchupKey`; the code takes `candidates[0]` and silently grades whichever
game sorted first — with zero test coverage, zero anomaly, zero hold. Concrete repro in
the deck: a real doubleheader split (Astros 4-2 Game 1, Rangers 6-1 Game 2) grades a
Game-2 pick as a WIN off Game 1's score. This is a published, real-money-adjacent,
silently-wrong grade sitting in the settlement path today. PL1/PL2/PL3 (all INTERNAL,
Grok/Hermes) run BEFORE any other card in this deck and before any settlement-volume
scale-up elsewhere — see Gate 2 below, which now supersedes the placeholder "Claude
authors a GR card" language from the original synthesis pass.

---

## 1 · THE THREE GATES

A launch is GO when all three are green by their own checkable condition (§5).

### GATE 1 — EDGE (doctrine §H0 shipped)

The H0 battle order (`EDGE_SUPREMACY_DOCTRINE.md` §Horizons) mapped to the decks that
close each item:

| H0 item | Closed by | Blockers |
|---|---|---|
| 1. Validation harness + known_at/provenance + q-contamination | PR #555 merge, then EV2→EV3→EV4/EV5/EV6→EV7 (`edge:validate` CLI), EV8 (repo guard), EV9 (leak wall), EV10/EV11 (bind enforcement) | EV7 needs K1,K2,K3,K4,K5,K7 slots landed; EV8/EV9/EV10/EV11 need #555 merged |
| 2. C2.1 kneel/garbage model | PR #557 merge + EV17 input guards | EV17 locus decision (branch vs main — Garrett/Claude) |
| 3. NGS SEP covariate (pipe-cleaner) | PR #555 (code exists on branch); admission via EV7 bench | #555 merge |
| 4. est-routes/TPRR exposure offset | PR #556 merge + EV16 guards; SC6 (share-core alpha-projection) consumes it | #556 merge; SC9 (share-core) bus plan post-merge |
| 5. Change-point role / vacancy elasticity | SC7 (share-core reproject: drop+renormalize+hook). Measured elasticity = post-launch | decision-time inactive feed does not exist (share-core OQ4) |
| 6. C3.1 ladder + C3.5 boost scanners | CARDS_SCANNERS SC1–SC10 | data-blocked on archive flags (Garrett #11); boosts blocked on SC9 clearance + storage decision (Garrett #13) |
| 7. C6.2 closing-line forecaster v0 | CARDS_CLOSING_LINE CL1–CL9 | data-blocked on archive flags; CL1 READY needs ≥200 close-both-sides prop markets + ≥400 trajectories≥3 |
| 8. C5.1 incentive calendar + C5.3 rule-change sprint | CARDS_INCENTIVE_CALENDAR IC1–IC9 | IC1 census (CROWN research); IC9 needs IC3+IC6 |
| 9. Dirichlet-multinomial share core | K11 slot + CARDS_SHARE_CORE_WIRING SC1–SC10 | SC3/SC10 need K11 (+K1/K2 for SC10); SC9 needs #555+#556 |
| 10–11. RZ bifurcation, remaining covariates | existing masterplan queue (#538/#539) — not launch-gating | — |
| 12. Exact SGP (C7.1) | H1 — explicitly post-launch | share core live first |

**EDGE ships as glass-box research: every module is `priced:false`, fail-closed, and
nothing enters live p without masterplan §6 (`EDGE_FACTORY_MASTERPLAN.md`). "Shipped" =
code merged + gates green + scanners/forecaster honestly refusing on the empty archive
until data accrues. That refusal is by design, not a launch defect.**

### GATE 2 — PROOF (≥100 settled + published calibration)

PROOF splits into two conditions with different deadlines:

- **PROOF-MACHINERY (launch blocker):** the proof clock must be RUNNING and verifiable —
  scheduler firing (`refresh-odds` */15, `board-fill`, `settle-picks` hourly :20),
  settles idempotent on the PAID path only, calibration pipeline publishing
  (`apps/web/lib/calibration/report.ts` → homepage `loadPublicCalibrationReport`).
- **PROOF-MILESTONE (PROVEN trigger, may land post-kickoff):** ≥100 canonical settled +
  published calibration. MLB settles daily — with the scheduler live and gates flipped
  by ~Aug 26, 100 settles is reachable near kickoff; every day the scheduler decision
  slips, PROVEN slips one-for-one. `PRICING_PHASE` stays unset (FOUNDING) until the
  milestone verifiably holds (Garrett #8).

What closes it:
1. **Scheduler decision** — OWNER-ACTION, Garrett #1. The one RED spine item (preflight
   audit). Nothing else in this gate matters until it's made.
2. **CRON_SECRET** set + LQ16 makes `deploy:ready` honest about it.
3. **Grading fixes BEFORE settlement scale-up** — now a concrete, ready-to-implement
   deck (`CARDS_PROOF_LADDER.md` PL1/PL2/PL3), not a placeholder:
   - **PL1 (CRITICAL, run first):** same-day/doubleheader rematch grades against
     `candidates[0]` — an arbitrary final — because matching is team-pair + calendar-day
     only, no game ID (`free-settlement.ts` `settlePendingPicks()` L281-334, reused by
     `runFreePathSettlement`, `backfillStaleSettlement`, and
     `historical-settlement-backfill.ts` — the exposure is not one-place). Fix: HELD +
     `AMBIGUOUS_MATCH` when candidates disagree, additive-only, zero schema change.
   - **PL2 (HIGH):** PR #550's `?path=free` forced-drain can now run against the same
     game as the paid path in the same window; each writes `Game.homeScore/awayScore`
     from its own source with no cross-path comparison — whichever path runs second
     silently overwrites the row, contradicting an already-settled pick. Fix: refuse to
     overwrite a FINAL score with a conflicting cross-path value; new
     `SCORE_MISMATCH_CROSS_PATH` anomaly, human-reviewed, never auto-resolved.
   - **PL3 (MEDIUM):** the PROVEN-gate signal in the free-path autonomy response reads
     `learning?.nEligible` (this cycle's batch, typically single digits) into a slot
     every other caller treats as the cumulative settled count — so the self-audit
     signal CLAUDE.md's Autonomous Loop Protocol tells an agent to read can report
     "3/100" forever even after the true cumulative count has cleared 100.
   - Launch posture unchanged: `THE_ODDS_API_KEY` is in `deploy:ready` REQUIRED
     (`scripts/check-deploy-readiness.mjs:92-110`), so prod resolves
     `selectSettlementPath === "odds-api"` (paid path, structurally safer) — verify,
     don't assume; PL1/PL2/PL3 harden the free/backfill path regardless, since
     `?path=free` (PR #550) makes it reachable in prod on demand, not just as a fallback.
4. **Gate ladder flips** (Garrett #7): `CANONICAL_HISTORY_ENABLED` → derived history →
   `PUBLIC_PICKS_ENABLED` → `PERFORMANCE_STATS_ENABLED`; `FORCE_NO_BET_IF_STALE=true`
   week 1.
5. **CLV manufacturing** (CL deck) feeds the NEXT rung (ESTABLISHED, CLV ≥52.4%), and
   its archive must start accruing NOW (Garrett #11) to have any close data by kickoff.

### GATE 3 — TRUST (grading / claims / paywall clean)

| Sub-gate | Verdict today | Closed by |
|---|---|---|
| Grading | Paid path SAFE; free/backfill path UNSAFE | Paid-path-only verification + GR hotfix card (above) |
| Claims | Copy honest, guards porous | LQ8 (humans.txt), LQ9 (faq/about/trends), LQ10 (Elite "real-time" downgrade), LQ11 (SAFE_CONTEXT numeric bypass — HIGH), LQ12 (scanner coverage — HIGH), LQ13/LQ14/LQ15 (LLM numeric grounding: calibration insights, pick explainer, Model Court) |
| Paywall | Survives a curious Reddit user; hardening gaps only | LQ1 (ungated `/api/dfs/salaries` — the one real hole), LQ2→LQ3, LQ4, LQ5, LQ6, LQ7 (research) |
| Preflight | AMBER, one RED (scheduler) | LQ16, LQ17, LQ18 + full OWNER-ACTION checklist (§4) |

**Claims fixes land BEFORE any marketing push. No bot post, no pricing-page change, no
launch announcement until LQ8–LQ12 are merged and both guards are green over the
extended scan surface.**

---

## 2 · WEEK-BY-WEEK SEQUENCE

Dependency law across the whole program:
`Wave K1 slots → share-core wiring (SC3/SC10) → edge:validate CLI (EV7) → shadow (SC10)
→ promotion (EV6, ceiling VALIDATED_PENDING_HOLDOUT)`. Grading fixes precede settlement
scale-up. Claims fixes precede marketing. #555 → #556 → #557 merge precedes EV8–EV11,
EV16/EV17, SC9, IC/SC bus registration.

### Week 0 — Fri Aug 22 → Fri Aug 29 (Ox window week: front-load PUBLIC, merge the tri-conflict)

**FREE-FLEET (PUBLIC only, stealth OK — card text only, never deck headers):**
- Finish Wave K1 (`KERNEL_SLOT_CARDS.md`). Priority: K1 crps, K2 pit, K3 brier-murphy,
  K4 calibration-fit, K5 bh-fdr, K7 block-bootstrap (EV7's runtime prereqs), K11
  dirichlet-multinomial (share-core prereq); then K6, K8, K9, K10, K12, K13.
- Then the 9 PUBLIC deck cards, all dispatched before the window closes:
  SC1 ladder-coherence, SC2 boost-ev (scanners) · CL3 path-stats · IC2 standings-math ·
  LQ8, LQ9, LQ10, LQ11, LQ12 (copy + guard scripts).

**GROK-ORCH:**
- Verify + sequence the merges: PR #554 branch → main first (kernel contract), then
  #555 (grok/h0-validation-harness) → #556 (h0-est-routes) → #557 (h0-kneel-garbage).
  They tri-conflict on `packages/prediction-engine/src/index.ts` + duplicated kernel
  files; merge sequentially, resolve toward the union, and wire ALL barrel exports in
  ONE integration commit after the third lands (every deck defers index.ts by fiat).
- Dispatch unblocked INTERNAL cards in parallel: EV12, EV13, EV14 (no deps);
  EV2→EV3→EV4/EV5/EV6 (contract-typed, not blocked on Wave K); EV1 research.
  CL1, CL2, CL4, CL6 · IC1 (CROWN — Grok/Hermes only), IC3 (after IC2), IC5, IC6, IC7 ·
  SC3 (line-archive-reader), SC8, SC10-research (scanners) · SC1-research (share-core).
- LQ Section A: LQ1 (do first — the real hole), LQ2→LQ3, LQ4, LQ5, LQ6, LQ7 (research).
  LQ13/LQ14/LQ15 (LLM grounding). LQ16, LQ17 (preflight scripts).
- Post-#555: EV8, EV9 immediately (the leak wall is part of the bench).

**HERMES (covariate-binds lane):** EV10, EV11 (after EV9) · IC8 props-context-bind ·
share-core SC2 usage-matrix once SC1-research merges.

**CLAUDE:**
- Grading hotfix cards are AUTHORED (`CARDS_PROOF_LADDER.md` PL1/PL2/PL3, ready to
  dispatch) — Grok/Hermes implement against `free-settlement.ts` / `root-cause-analysis.ts`
  / `free-settlement-runner.ts` / `settle-sport.ts` per the deck; Claude spot-audits the
  PL1 fix specifically before it merges (it changes live grading behavior).
- SC9 boost/promo clearance research (scanners deck — judgment lane, Opus only).
- Decisions this week: IC layer-label ("L3") confirmation · IC1 CROWN routing confirm ·
  EV16/EV17 locus recommendation to Garrett · spot-audit 2–3 green-lane merges/day.

**GARRETT (cannot be delegated — see §4):** #1 scheduler (CRITICAL, decide by Mon Aug 25),
#2 CRON_SECRET, #11 flip archive flags (every day of delay = one less day of line
archive by kickoff), #12 SC8 credit spend, #3 canonical host/OAuth/apex, #4 Stripe.

**Exit criteria Aug 29:** Wave K slots landed + conformance green · #555/#556/#557
merged + ONE integration commit · EV bench merged through EV6 · all 9 PUBLIC cards
merged or in verified PR · LQ1 merged · scheduler decision MADE · archive flags flipped.

### Week 1 — Sat Aug 30 → Fri Sep 5 (implementation completes; proof clock running)

- **EV7** `npm run edge:validate` live (K slots + EV2–EV6). EV15 (after EV13).
  EV16/EV17 per locus decision. Guard chain wiring (`guard:q-contamination` into the
  aggregate chain) — integrator commit.
- **Scanners:** SC4 (after SC1) → SC5 → SC6/SC7 (CROWN — Grok/Hermes; fixture tests
  only, real-run outputs never committed).
- **Share-core:** SC3 masked fit (K11) → SC4 team-trials → SC5 volume-marginal →
  SC6 alpha-projection / SC7 reproject / SC8 teammate-corr → SC9 bus plan (post-#555/#556)
  → **SC10 shadow harness** (K1+K2+K11) — the §6 evidence generator.
- **Closing line:** CL5 → CL7 → CL8 → CL9 (selftest green; `--db` prints ACCUMULATING
  honestly until CL1 READY — expected, not a failure).
- **Incentive:** IC4 (after IC3), IC9 context-admission runner (after IC3+IC6).
- **Grading:** GR hotfix merged BEFORE the board publishes at volume; verify prod
  settlement path = paid; one settle cycle audited end-to-end.
- **Claims freeze:** LQ8–LQ15 all merged; `guard:performance-claims` +
  `guard:commercial-copy` green over the extended roots. Marketing may start only now.
- **Garrett:** complete env/console items #3–#10; proof of one live firing each of
  refresh-odds / board-fill / settle-picks with advancing timestamps.

**Exit criteria Sep 5:** every non-blocked card in all 6 decks merged or explicitly
parked with a named blocker · LQ1–LQ17 done · settles accruing on paid path · calibration
report generating · CL1 census committed (`scripts/edge-lab/line-archive-census.ts`)
showing archive row growth.

### Launch week — Mon Sep 8 → kickoff ~Sep 10

- **Code freeze on launch-path surfaces Sep 8** (apps/web routes, entitlements, Stripe,
  cron): hotfixes only. Edge-lab research merges may continue (no launch-path contact).
- **LQ18** `scripts/launch-night-smoke.mjs`: T-1h local → deploy → T+10m `--prod` →
  re-run `--prod` after each gate flip (Garrett #7, in ladder order,
  `FORCE_NO_BET_IF_STALE=true` for week 1).
- Paywall spot-checks (LQ18 EXPECTED table): `/api/board/state` confidence≡null anon,
  `/api/picks` no PREMIUM rows, `/api/dfs/salaries` 401, apex 301 → www.
- CL1 census + IC9/CL9 runs stay ACCUMULATING/READY-gated — publish nothing; promotion
  decisions only via EV6 reports (CROWN, untracked `reports/`), Claude sign-off,
  founder holdout (`VALIDATED_PENDING_HOLDOUT` ceiling holds).
- Stripe TEST-mode subscribe per tier × interval before flipping public gates.

---

## 3 · OWNERSHIP BY WORKSTREAM

| Owner | Lane | Work |
|---|---|---|
| **FREE-FLEET** (Ox/stealth, training-on-input) | PUBLIC cards only, single-card text, never SHARED CONTEXT / deck headers | Wave K1 (K1–K13) · SC1, SC2 (scanners) · CL3 · IC2 · LQ8–LQ12 |
| **GROK-ORCH** | dispatch, FLEET_STATUS ledger, deterministic gates, cross-family verify, green-lane squash-merges, INTERNAL cards | EV deck (all 17) · CL1/2/4/5/6/7 · IC3/4/6/7 · SC3/4/5/8/10 (scanners) · share-core SC2–SC5 · LQ1–LQ7, LQ13–LQ18 · #555/556/557 merge mechanics + the one index.ts integration commit |
| **HERMES** | covariate-binds lane (no-training endpoints) | EV10, EV11 · IC8 · share-core SC2/SC6 support · CROWN cards alongside Grok: SC6/SC7 (scanners), CL8/CL9, IC1/IC9, share-core SC6–SC10 |
| **CLAUDE** | judgment tier: contract changes, p-side promotion decisions, clearance/rights, spot audits | SC9 boost clearance (Opus-only lane) · GR grading card authoring · EV6 promotion sign-offs · IC layer/routing calls · post-merge registry/bus integration commits · random audit of ≥10% of green-lane merges |
| **GARRETT** | everything only the founder can touch | §4 checklist — env, Stripe, DNS/OAuth, flags, purchases, product stances |

---

## 4 · OWNER-ACTION CHECKLIST — reclassified by gap type, not just "founder or not"

Every owner-action found across all decks, one list. Items 1–10 are
`CARDS_LAUNCH_QA.md` OWNER-ACTIONs verbatim (proofs-of-done there); 11+ are pulled from
the other decks' open questions. **Bold = launch-blocking.**

**Two different kinds of gap live in this list, and they route differently:**

- **[GROK-EXEC]** — a pure *technical* action (set an env var, call a provider API, flip
  a flag) that only looked founder-only because it needs credentials. **If Grok's
  environment holds the credential, Grok executes it directly** — do not wait on Garrett.
  First move on each: confirm the credential exists (`vercel whoami` / a scoped Stripe
  key / a DNS-provider token / GCP access) before attempting; if absent, escalate to
  Garrett naming exactly which credential is missing.
- **[GROK-EXEC, VERIFY-THEN-FLIP]** — same as above, but the flip is one-way and
  blast-radius (breaks checkout for everyone, or takes the site down) if the precondition
  isn't actually true yet. Grok reads the precondition back from the live system
  immediately before flipping — never assumes it from this doc — then flips.
- **[GARRETT-DECISION]** — not a credential gap at all: a purchase, a budget commitment,
  a product/UX tradeoff, or a judgment call on whether real data actually supports going
  live. Grok prepares everything up to the decision (options, costs, exact commands
  ready to run) and stops there.

1. **[GARRETT-DECISION, RED]** Pick a scheduler — Vercel Pro OR restored Actions billing
   OR third-party pinger. This is a paid-service commitment; Grok cannot choose spend on
   your behalf. **Once decided, the wiring is [GROK-EXEC]:** `CRON_SECRET`/
   `CRON_TARGET_URL` secrets, cron config, proof of one live firing each of
   refresh-odds/board-fill/settle-picks. Decide by **Mon Aug 25**.
2. **[GROK-EXEC]** `CRON_SECRET` set in Vercel prod (all 29 cron routes bearer_only;
   unset = 500s) — via Vercel CLI/API if credentialed.
3. **Canonical host pair + OAuth + apex redirect** — split by sub-item:
   - `NEXT_PUBLIC_APP_URL` = `NEXTAUTH_URL` = `https://www.galaxysportsedge.com`:
     **[GROK-EXEC]** (Vercel env API).
   - Google OAuth redirect URI on www: **[GARRETT-DECISION]** unless Grok holds a GCP
     credential scoped to OAuth-client config, which is unusual to grant — verify first,
     default to Garrett.
   - apex→www 301 at the DNS/platform layer: **[GROK-EXEC, VERIFY-THEN-FLIP]** if a
     DNS/registrar API token is available — read the current record back after the
     change, don't just trust the API call succeeded.
4. **Stripe price ladder + ToS ordering** — split:
   - All six price ID env vars (Fantasy pair especially), comma-history discipline
     (`lib/billing/price-ids.ts`): **[GROK-EXEC]**.
   - `STRIPE_TERMS_CONSENT_ENABLED`: **[GROK-EXEC, VERIFY-THEN-FLIP]** — before flipping,
     read back `business_profile.terms_of_service_url` from the live Stripe Account
     object via API (requires an account-scoped key, not the restricted checkout key)
     and confirm it is actually set. Flipping first 500s every Checkout Session for
     every tier — this is the single highest-blast-radius flip in the whole checklist.
5. **[GROK-EXEC]** Elite alert channel keys (`RESEND_API_KEY`, `ALERTS_EMAIL_FROM`, VAPID
   trio) if credentialed; the watchlist founder migration is **[GARRETT-DECISION]**
   (touches user data model). Alerts-dark launch is legal; invisible-dark is not (LQ16).
6. **[GROK-EXEC]** Off-stack monitoring on `/api/health` + `/api/ops/public-surface-truth`
   if Grok has an account with the monitoring provider; else name the provider decision
   for Garrett.
7. **[GARRETT-DECISION]** Launch gate ladder + kill switch flips — Grok prepares the
   exact flip sequence and verifies every precondition, but the decision that live data
   honestly supports going public is human judgment, every time. `FORCE_NO_BET_IF_STALE=
   true` week 1; `DEV_FAKE_ADMIN`/`DEMO_PICKS_ENABLED` unset in prod is [GROK-EXEC] as a
   pure check.
8. **[GARRETT-DECISION]** `PRICING_PHASE` stays unset (FOUNDING) until PROVEN milestones
   verifiably hold — same reasoning as #7, this is a claim about reality, not a flag.
9. **[GROK-EXEC]** Odds API quota vs `*/15` × 7 sports cadence — `deploy:ready` already
   prints `x-requests-remaining`; Grok reads and reports, escalates only if tight.
10. **[GROK-EXEC]** Doc edits: CLAUDE.md tier table "real-time" → "graded-pick" alerts
    (match LQ10); `docs/ops/GO_LIVE_RUNBOOK.md:17` Actions-cron claim corrected;
    `vercel.json` `deliver-settlement-alerts` retime only after #1 is decided.
11. **[GROK-EXEC]** Flip `LINE_ARCHIVE_ENABLED` + `EVENT_ODDS_INGEST_ENABLED` (+
    `LINE_ARCHIVE_EU_PINNACLE`) — pure env flags, no financial or user-facing blast
    radius; every scanner and the closing-line forecaster are data-blocked until then.
    Do this immediately, same day as #1 if possible — every day of delay is one less
    day of line archive by kickoff.
12. **[GARRETT-DECISION]** SC8 credit spend: approve/deny 2 credits of `getEventMarkets`
    alt-ladder probes + the ongoing per-cycle `*_alternate` capture cost vs the
    500-credit tier — a recurring cost commitment, not a technical gap.
13. **[GARRETT-DECISION]** Boost storage (scanners SC9): founder-spec'd future table vs
    fixture corpus — schema is sealed by fiat; this is an architecture choice.
14. **[GARRETT-DECISION]** Confirm `MIN_PROP_BOOKS = 3` stance (no degraded 2-book prop
    consensus) — a product-quality tradeoff; deck default is NO.
15. **[GARRETT-DECISION]** LQ7 Stripe-webhook serialization option — deck default:
    Option C (documented handler-idempotency convention) for launch week; Option A needs
    a founder-approved migration.
16. **[GARRETT-DECISION]** Accept LQ10's Elite copy downgrade ("graded-pick alerts") for
    launch, or order a faster alert path instead (new card, post-launch) — a product
    promise, not a technical gap.
17. **[GARRETT-DECISION]** EV16/EV17 execution locus: pre-merge on the Grok branches
    (cheapest) vs post-merge on main — a sequencing call with rework-cost tradeoffs.
18. **[GARRETT-DECISION]** Multi-rung phase semantics sign-off (SC8 recommendation:
    read-side derivation; no `line-archive.ts` writer change).
19. **[GARRETT-DECISION]** Fantasy JSON floor product decision: do `/api/projections` +
    `/api/scoring/player-index` move to the fantasy floor like `/api/tools/lineup`
    (LQ3 scoped them out pending this)?
20. **[GARRETT-DECISION]** Confirm the `/fantasy/dfs` 24-row SSR salary teaser is the
    intended free surface (LQ1 gates only the raw JSON on that assumption).

**Net effect: items 2, 3(partial), 4(partial), 5(partial), 6, 9, 10, 11 move off your
plate entirely if Grok's environment is credentialed — that's the scheduler wiring, the
env vars, the archive flags, and the doc edits. What's left for you is genuinely
irreversible-in-spirit or a spend/product call: which scheduler to pay for, the OAuth
console edit, the two VERIFY-THEN-FLIP moments (Stripe consent, DNS cutover) as a final
go signal even though Grok does the mechanical work, and the launch-gate/pricing-phase
judgment that live data actually supports going public.**

---

## 5 · DEFINITION OF LAUNCH-READY (checkable, no opinions)

**EDGE green ⟺ all of:**
- `test -f packages/prediction-engine/src/edge-lab/kernel/slots/{crps,pit,brier-murphy,calibration-fit,bh-fdr,block-bootstrap,dirichlet-multinomial}.ts`
- #555/#556/#557 merged to main + the single index.ts integration commit; branch decks'
  preconditions (`grep -q knownAtWeek covariate-bus.ts`, `test -f est-routes-tprr.ts`,
  `test -f nfl-kneel-garbage.ts`) pass on main.
- `npm run edge:validate -- --candidate synthetic --seed 7` exits 0, byte-deterministic
  across two runs; `guard:q-contamination` green; sealed-holdout scan green.
- Scanner + forecaster + incentive + share-core modules merged with green per-card gates;
  SC10 shadow selftest passes; CL9/IC9/CL1 selftests pass and `--db`/`--real` modes
  refuse honestly (ACCUMULATING) on the still-thin archive.

**PROOF green ⟺ machinery live:**
- Three cron proofs (refresh-odds, board-fill, settle-picks) with advancing timestamps.
- Prod settlement path verified `odds-api` (paid); GR grading hotfix merged; zero
  free-path/backfill canonical settles in the settlement run log.
- Calibration pipeline produces a report; public surfaces stay gated below thresholds
  (RED-eligibility copy is correct pre-100 — that honesty ships).
- Milestone tracking: settled count published internally daily; `PRICING_PHASE` untouched.

**TRUST green ⟺ all of:**
- `npm run guard:performance-claims && npm run guard:commercial-copy` green over the
  LQ11/LQ12-extended surface; the five LQ11 must-FAIL fixtures fail; LQ13–15 grounding
  merged (all three LLM output paths run the numeric guard).
- LQ18 `--prod` fully green: anon confidence≡null on board/picks, `/api/dfs/salaries`
  401, `/api/intelligence/predictiveness` 401, apex 301, health + surface-truth 200.
- Stripe TEST subscribe green per tier × interval; webhook signature-first verified.
- Garrett items 1–11 all proved done.

---

## 6 · TOP 5 RISKS (from the audits) + MITIGATING CARDS

1. **Dead scheduler (preflight RED).** Vercel Hobby daily cap + idle Actions fallback =
   nothing fires at game-day cadence and every watchdog rides the same dead scheduler.
   *Mitigation:* Garrett #1/#2 (only he can act) · LQ16 makes `deploy:ready` honest
   about CRON_SECRET · LQ18 proves liveness · Garrett #6 puts a monitor off-stack.
2. **Mis-grading via the free/backfill path — CONFIRMED, not hypothetical.**
   `CARDS_PROOF_LADDER.md` PL1 traced a concrete repro: team+calendar-day matching with
   no game ID grades a doubleheader pick against the wrong game's final,
   `candidates[0]`, zero test coverage. PL2 adds a second live path: `?path=free`
   (PR #550) can silently overwrite an already-settled game's score from a
   disagreeing source. *Mitigation:* PL1/PL2/PL3 (INTERNAL, Grok/Hermes, run before
   any other card in the deck) · paid-path law verified (`path-select.ts` +
   `THE_ODDS_API_KEY` in deploy:ready REQUIRED) · settlement scale-up (PL4/PL5) blocked
   until PL1-PL3 merge.
3. **Fabricated-stat leak through guard holes.** Proven SAFE_CONTEXT bypass ("68% win
   rate across 500 settled picks" passes), unscanned components/workers/route.ts
   surfaces, and three ungated LLM output paths. *Mitigation:* LQ11 (numeric-pass
   clause-scoped exemption) · LQ12 (coverage extension) · LQ13/LQ14/LQ15 (grounding) ·
   LQ8/LQ9/LQ10 make the copy true first.
4. **Archive stays empty → EDGE classes 3/6 never arm, CLV proof never accrues.** All
   scanners/forecaster fail-closed on flags that default OFF; CL1 READY needs ≥200
   close-both-sides markets. *Mitigation:* Garrett #11 flips flags in week 0 · SC3/CL6
   readers + CL1 census measure accrual · CL9/IC9 refuse honestly meanwhile · SC8/SC10
   research quantifies credit cost before widening capture.
5. **Merge-churn breakage at the prediction-engine barrel.** #555/#556/#557 tri-conflict
   on `src/index.ts` + duplicated kernel files; every deck defers exports; building
   against main's 3-field CovariateCell is a known typecheck landmine. *Mitigation:*
   sequential merge + ONE integration commit (Grok-orch) · EV8/EV9/SC9/IC-bus cards
   mechanically BLOCKED until `grep -q knownAtWeek covariate-bus.ts` passes · local
   cell types in IC8/EV2 exist precisely to dodge this.

---

*Companion doc: `docs/data/FLEET_DISPATCH.md` (Grok's read-on-wake). Doctrine:
`EDGE_SUPREMACY_DOCTRINE.md` §H0. Gates: `EDGE_FACTORY_MASTERPLAN.md` §6. Lanes:
`docs/ops/FREE_WINDOW_BLITZ.md` §3.*
