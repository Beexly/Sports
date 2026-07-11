# 16 — Failure Memory (adversarial audit, 2026-07-11)

Four fresh-context adversarial agents attacked distinct surfaces with the full
taxonomy of past reviewer catches, hunting siblings. This ledger is the durable
learning: every finding, its verdict, its disposition. FIXED items carry a
regression pin so the class cannot recur. OPEN items are ranked, owner-gated,
or queued to their proper branch (never bundled into an unrelated review).

Legend: sev/conf · [FIXED commit] / [OPEN → branch] / [QUEUED] / [OWNER] / [WONTFIX]

## FIXED — live on main, shipped in PR #79 (hotfix off main)

| # | Finding | Sev/Conf | Fix |
|---|---|---|---|
| M-F1 | CLV averaged American odds across the ±100 discontinuity → ~0.98 implied from a straddle, fabricating the CLV verdict that gates the ESTABLISHED price phase | HIGH/CONF | `averageAmericanPrices` averages in probability space; new `impliedProbabilityToAmerican` inverse (clv-capture.ts, scoring.ts). Pin: clv-moneyline-averaging.test.ts (3fc9ce31) |
| T-2 | Anonymous `/api/picks/[id]/audit` FREE branch returned live preMortem (embeds gated confidence in plaintext) + fragility (factor thresholds) | HIGH/CONF | FREE returns preMortem/fragility null; real pins added to audit-drawer-shape.test.ts (ac8947e9) |
| M-F3 | Stripe `invoice.payment_failed` resurrected CANCELED subs to PAST_DUE (grants access), permanently | MED-HIGH/CONF | both updateMany exclude `status: {not: CANCELED}`; stripe-webhook pin (ac8947e9) |
| M-F8 | `calculatePickResult` fell through to PUSH for unknown pick type — fabricated no-loss result | MED/CONF | throws; settlement.test.ts pin (ac8947e9) |

## FIXED — frontier branches (earlier this session)

| # | Finding | Fix |
|---|---|---|
| G-runtime | assurance/foundry resolved repo root from process.cwd() → every fs claim inverts on serverless | findRepoRoot() returns null when tree unreachable; honest degrade (1161ebc0, PR #77) |

## Caught by the property-stress suite (2026-07-11 PM cycle)

| # | Finding | Sev/Conf | Disposition |
|---|---|---|---|
| M-F13 | Settlement side-derivation inverts WIN/LOSS when the away name begins with the home name + space ("Jets" vs "Jets Metro"). Found by the seeded property fuzzer ON ITS FIRST RUN. | MED-latent/CONF | **FIXED — PR #83** (fec2ecc1 + 645c02c5): `selectionIsHomeSide()` most-specific-match. Codex then caught that the OPTIONAL away param left two production callers (free-settlement, historical replay) on the old path — awayTeam is now MANDATORY (compile-pinned; the 7-arg form is a @ts-expect-error), all callers pass it, and gradeHistoricalClv drops its bare startsWith. LESSON: an optional safety parameter is itself a fail-open. |
| T-INFRA-1 | Plant-fixture tests wrote violations into the REAL tree; calibration-cockpit's own trust-gate check in a parallel vitest worker saw them → nondeterministic CI red on PR #81 (green in isolation). | test-infra/CONF | **FIXED — PR #81 (a3d2705e)**: all plant tests build a sandbox repo skeleton in the OS temp dir and run the scanner with cwd there — plants structurally invisible to every other test. LESSON: a plant inside the scanned tree is a race with every repo-scanning test; sandbox-cwd is the standing pattern. |

## OPEN — ranked, to their proper branch (NOT bundled into hotfix)

### Production (independent → own hotfix PR after #79, or queued)

| # | Finding | Sev/Conf | Disposition |
|---|---|---|---|
| M-F2 | 07:00 settle-picks "second freeze" front-runs the 10:00 pick mint; today-slate committed with yesterday's population daily → receipts stay slateKey:null, outside pre-registration | HIGH/CONF | **FIXED — PR #80** (claude/hotfix-slate-freeze-frontrun, d58a200e; owner-gated merge). Implemented exactly per the spec below incl. both trap avoidances; test matrix (a)–(e) pinned, 15/15. |
| O-1.7 | Stub Prisma client in prod is warn-and-continue → silent dropped writes, `/api/health` DB check passes vacuously | HIGH/CONF | **FIXED — PR #82** (claude/hotfix-prod-db-fail-closed): stub THROWS when VERCEL_ENV=production unless ALLOW_STUB_DB_IN_PRODUCTION=true; health reports stub as database error/503. db 17/17 + web 7382/7382 pinned. |
| O-5.1 | CI push/PR filters: a PR from a non-`claude/*` head into a `claude/*` trunk triggers ZERO checks | HIGH/CONF | **FIXED — PR #81** (PR base filter covers claude/* trunks + concurrency dedupe; pinned). **Owner remains: branch-protection required-check config** |
| O-2.1 | commercial/perf scanners cover 7 of ~60 public app dirs; homepage/picks/board/fantasy uncovered → "printing money" passes every gate | HIGH/CONF | **FIXED — PR #81** (full rendered-surface sweep: tout-usage patterns + hardcoded numeric claims; planted-violation pins prove the gates fire) |
| M-F4 | Settlement partial failure orphans CLV+snapshot forever (`settled.count===0` stand-down) | MED/CONF | **FIXED — PR #84** (claude/hotfix-clv-regrade-orphans, eb1cbca1): settle pass reads PENDING + orphans (settled, clvGradedAt null); orphans heal CLV/snapshot WITHOUT re-running settlement math; grade-once conditional updateMany mirrors settle-once. Pipeline 92/92. |
| M-F5/F6 | `subscription.updated` trusts embedded snapshot w/o freshness ordering; refresh/settle TOCTOU can rewrite a settled pick | MED/PLAUS | QUEUED: re-retrieve subscription or compare event.created; conditional updateMany where PENDING |
| M-F7 | No staleness bound on "the close"; `take:80` can truncate a closing batch | MED/PLAUS | QUEUED: capturedAt-to-kickoff freshness bound before grading; raise/remove take cap |
| T-daily-slate | `recentRecord` hardcoded {0,0,0} when perf gate on → board renders fabricated "0W/0L" | MED/CONF | **FIXED — PR #85** (claude/hotfix-fabricated-record, 5b369e41): record COMPUTED via groupBy under the official filter; withheld (null) on gate-closed / empty window / query failure. Real-or-withheld pins. |
| T-picks-outage | `/api/picks` DB outage returns bootstrapGateResponse → outage dressed as deliberate gating | MED/CONF | **FIXED — branch claude/hotfix-picks-outage-state (d7f19966, PR pending verify-workflow verdict)**: new outageGateResponse (reason:"backend_outage", bootstrapMode:false) on the /api/picks primary-query catch AND the same dressing found+fixed on /api/clv; three public dark states now mutually distinguishable (bootstrap / stale_data / backend_outage); deliberate gating unchanged. 5 pins incl. three-state discriminator |
| M-F9 | Cancelled/PPD games → immortal PENDING picks (no VOID writer); 2 missed cron days orphan a day | LOW-MED/CONF | **FIXED — PR #86** (claude/hotfix-void-stale-picks): daysFrom 2→3 (API max); catch-up HEAL settles FINAL-with-recorded-scores orphans from truth; 72h VOID sweep (idempotent PENDING-scoped write, never learning-eligible, game status never fabricated); settlement body extracted to settleCompletedGame() so feed+sweep share one semantics; picksVoided surfaced. 7 new pins. **Codex round (80f1c336, 3/3 real, resolved):** sweep now feed-independent (feed outage can't recreate M-F9); heal preserves bootstrap provenance on game logs (mode OR any-pick-bootstrap); VOID = NO ACTION everywhere — excluded from public ROI sample (query + unitsForPick, convention re-pinned), engine-story totalSettled graded-only, bot-outbox blocks VOID posts (was collapsing to PUSH). Proof-of-record Merkle ledger deliberately KEEPS voids (hiding them would be less honest) |
| M-F10 | `fantasy-upsell.tsx` hardcodes "$49/yr" — drifts from pricing-phases on phase advance | LOW/CONF | QUEUED: derive from PRICE_DISPLAY |
| M-F12 | Merkle count not folded into root (`[A,B,C]` and `[A,B,C,C]` share a root) | LOW/CONF-note | QUEUED: bind count into the root or document count-checked verification |
| T-perf-summary | performance/CalibrationPanel can co-render "N settled" beside "no record"; PerformanceSummary has no isBootstrap col + no writer | MED/latent | QUEUED before any summary writer ships |
| M-F11 / T-board-utc | vercel.json Root Directory check; board todayBounds uses LOCAL time vs engine UTC | LOW/PLAUS | OWNER (dashboard) / QUEUED |

### Frontier modules (flag-off-default → their stacked PR branch)

| # | Finding | Branch |
|---|---|---|
| G-1 | Page-level auth: cockpit pages do zero auth (rely on layout); RSC flight payload may stream admin data to non-ADMIN | PR #77 — add explicit per-page `auth()` role check (defense-in-depth) |
| G-3/G-4 | radar `validateSnapshot` never called at runtime → policy fails OPEN on unknown POSTURE (risk is fixed-closed, posture is not); REJECT/posture typos → OBSERVE | PR #76 — call validateSnapshot at load; posture fail-closed like risk |
| G-10 | assurance council-autonomy tripwire checks "ACTIVE", outside the CouncilSeatStatus union → dead guard behind an `as` cast | PR #77 — check wiringState/real regression signal |
| G-11 | assurance security + outcome_quality have no findings generator → vacuous health 1.0 shown as "70% inspected, 100% healthy" | PR #77 — emit an explicit "no checks implemented" finding, cap health |
| G-6 | foundry authority rule fires only for tier-0 seats; 2 of 3 seed owners are tier≥1 | PR #77 — enforce approval rule across tiers |
| G-15 | routing rule order: HIGH+structured takes cheap EXTRACT lane before the HIGH-risk rule | PR #78 — reorder so risk precedes structured |
| G-14 | assurance coverage rounded to 2dp before threshold compare (boundary disagree) | PR #77 — compare unrounded |
| G-2 | repo-root partial-tree spoof on Vercel (`packages/db` traced for Prisma) → null-guard may not fire | PR #77 — require a source-only marker (e.g. a tsconfig/test dir that never deploys) |
| G-12/G-13 | assurance evidence strings hard-coded vs existsSync-only; `foundry-unused` hardcoded ACKNOWLEDGED; flag name `AI_MODEL_ROUTER_LIVE_ENABLED` exists nowhere | PR #77 — derive evidence from real checks |
| G-7/G-8/G-9/G-16/G-17/G-18 | scanner verb/field coverage gaps; nested-key canonical hash; page executable tile hardcoded 0; SENSITIVE-block reason text; grep pins scoped too narrow; install-affordance regex misses pnpm/yarn/bun | PR #77/#78 — low-sev hardening, batch |

### Guardrail/CI/secret-scan holes (independent → guardrail-hardening PR)

| # | Finding | Note |
|---|---|---|
| O-3.x | trust-gate: line-based matching defeats multi-word bans; string-splitting; homoglyphs/entities/soft-hyphen; markdown headings skipped as comments; "the lock" blanking; commercial-scan negation+import exemption; draft-only comment-suffix exemption | HIGH-within-scope/CONF. **CORE FIXED — PR #81 (4eb7d475)**: NFKC + zero-width/soft-hyphen strip + apostrophe folding on all 3 copy gates; markdown headings/lists now scanned; 6 planted-evasion pins. REMAINING queued: string-concatenation joins, cross-line multi-word bans, confusables map (cross-script homoglyphs), "the lock" blanking refinement, negation/comment-suffix exemption tightening. |
| O-4.x | secret-scan reads worktree content of STAGED names (partial-stage bypass); misses renames; >2MB skip; dist/build/coverage SKIP_DIRS even in --all; missing redis://, ghp_, napi_, sk- rules | MED/CONF. **FIXED — PR #81**: staged mode scans INDEX blobs (`git show :path`), ACMR, artifact dirs scanned in --all, >2MB skips reported, rules added (github/openai-legacy/slack/neon/redis) |
| O-1.x | vercel-skip-build diffs only HEAD^..HEAD (multi-commit push skips needed deploy); ACTIVE_TRUNK staleness; scripts/ not build-relevant; skip-gate tests never run | MED/CONF. **FIXED — PR #81**: diffs from VERCEL_GIT_PREVIOUS_SHA (sha-validated, fail-safe fallback); scripts/deploy/ + the gate itself deploy-relevant; node:test wired into CI. ACTIVE_TRUNK staleness remains OWNER (env config) |
| O-6 | vacuous stub-DB tests: board-phase2/daily-slate/dev-state assert empty results that hold whether or not the where-clause is correct | MED/CONF. QUEUED: seed the stub or assert against a populated fixture for suppression logic |

## M-F2 deep spec (diagnosed 2026-07-11; verified against the code, NOT yet fixed)

Pipeline (vercel.json): 07:00 settle-picks (freeze shot), 10:00 refresh-odds
(processSport MINTS picks/receipts, THEN freezes), 11:00 generate-drafts.
`freezeSlateCommitments` (freeze-slate-commitments.ts) loops offsets [0,1];
`NEXT_RUN_UTC_HOUR=10`, `NEXT_RUN_MARGIN_HOURS=2`. Freeze-once = first commit
per (sport, UTC-day) wins; later runs SKIP (`alreadyCommitted`).

**Root cause:** the 10:00 refresh-odds freeze is the CORRECT one (mint→freeze,
full population). The 07:00 settle-picks freeze runs BEFORE the 10:00 mint, so
for offset 0 (today) it commits the slate with only picks that already existed
(yesterday's population), then freeze-once makes the 10:00 freeze SKIP. Every
pick first priced overnight and minted at 10:00 gets `slateKey: null` forever —
outside the pre-registration the anti-cherry-pick claim rests on. Confirmed:
settle-picks/route.ts:91-102 calls freeze with the SAME [0,1] offsets; its
comment calls the pass "pure redundancy" — it is not for offset 0.

**Why the obvious fixes are wrong:**
- "Freeze offset [1] only at 07:00" — loses the legitimate case: a today-game
  that kicks off BEFORE the 10:00 mint must be sealed at 07:00 (else its pick
  would be post-kickoff, unsealed). So offset 0 CAN'T be blanket-deferred.
- "Mirror the offset-1 deferral to offset 0 using `now < ownRunReach`" — TRAP:
  at the 10:00 run, `now`≈10:00 and `ownRunReach`=10:00+2h, so `now < ownRunReach`
  is still true → the 10:00 run would ALSO defer offset 0, and NOTHING ever
  freezes it. Freeze-once is per-slate, not per-game, so you can't partial-freeze.

**Correct fix (design-consistent, testable):** apply a deferral to offset 0 in
the 07:00 run ONLY, keyed on whether this run precedes the mint run:
```
const isBeforeMintRun = now.getUTCHours() < NEXT_RUN_UTC_HOUR;   // 07 < 10 → true; 10 < 10 → false
if (offsetDays === 0 && isBeforeMintRun) {
  const mintReach = new Date(start.getTime() + (NEXT_RUN_UTC_HOUR + NEXT_RUN_MARGIN_HOURS) * 3600_000);
  if (earliestKickoff >= mintReach) {           // no game kicks before the mint run
    push SKIP "deferred: 10:00 mint run will freeze the full population"; continue;
  }
  // else a game kicks before 10:00 → fall through and freeze now to seal it
}
```
At 07:00: normal today-slates (earliest kickoff after 12:00) DEFER → the 10:00
mint run freezes the full population. Early-kickoff today-games still freeze at
07:00 (sealed pre-kickoff, accepting the smaller slate — correct, since those
picks already exist from yesterday's mint). At 10:00: `isBeforeMintRun` false →
offset 0 always freezes (population complete). offset 1 logic unchanged.

**Tests required:** (a) 07:00 + all-today-kickoffs-after-12:00 → offset-0 SKIP
deferred; (b) 10:00 same slate → offset-0 FREEZE full; (c) 07:00 + a
before-10:00 kickoff → offset-0 FREEZE now; (d) offset-1 behavior byte-identical;
(e) the "10:00 run must never defer offset 0" trap pinned explicitly. Own PR off
main (packages/ingestion-pipeline), no migration.

## The meta-lesson (permanent)

Codex reads every diff cold and adversarially. The durable countermeasure is
to make that pass a STANDING gate, not a one-off: (a) the guardrail-hardening
PR closes the scanner/CI/secret holes above so the mechanical classes fail
pre-merge; (b) the `independent-diff-reviewer` Foundry manifest (PR #77) is
the seat for a pre-PR adversarial pass; (c) this ledger is consumed by the
next cycle's ranking. Every finding here became a test or a queued fix — the
repo is measurably harder to break than before the audit.
