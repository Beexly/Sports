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

## OPEN — ranked, to their proper branch (NOT bundled into hotfix)

### Production (independent → own hotfix PR after #79, or queued)

| # | Finding | Sev/Conf | Disposition |
|---|---|---|---|
| M-F2 | 07:00 settle-picks "second freeze" front-runs the 10:00 pick mint; today-slate committed with yesterday's population daily → receipts stay slateKey:null, outside pre-registration | HIGH/CONF | QUEUED hotfix-2: freeze offset [1] only, or apply the >12:00 deferral to offset 0 |
| O-1.7 | Stub Prisma client in prod is warn-and-continue → silent dropped writes, `/api/health` DB check passes vacuously | HIGH/CONF | QUEUED: fail-closed when `DATABASE_URL` unset in prod; make health DB check non-vacuous |
| O-5.1 | CI push/PR filters: a PR from a non-`claude/*` head into a `claude/*` trunk triggers ZERO checks | HIGH/CONF | QUEUED: broaden PR base filter / add required aggregate gate. **Owner: branch-protection config** |
| O-2.1 | commercial/perf scanners cover 7 of ~60 public app dirs; homepage/picks/board/fantasy uncovered → "printing money" passes every gate | HIGH/CONF | QUEUED guardrail-hardening: expand scanned-dir list to all app/**/page copy |
| M-F4 | Settlement partial failure orphans CLV+snapshot forever (`settled.count===0` stand-down) | MED/CONF | QUEUED: key CLV pass on `result != PENDING AND clvGradedAt IS NULL`, add re-grade job |
| M-F5/F6 | `subscription.updated` trusts embedded snapshot w/o freshness ordering; refresh/settle TOCTOU can rewrite a settled pick | MED/PLAUS | QUEUED: re-retrieve subscription or compare event.created; conditional updateMany where PENDING |
| M-F7 | No staleness bound on "the close"; `take:80` can truncate a closing batch | MED/PLAUS | QUEUED: capturedAt-to-kickoff freshness bound before grading; raise/remove take cap |
| T-daily-slate | `recentRecord` hardcoded {0,0,0} when perf gate on → board renders fabricated "0W/0L" | MED/CONF | QUEUED: withhold (LockedValue), never fabricate |
| T-picks-outage | `/api/picks` DB outage returns bootstrapGateResponse → outage dressed as deliberate gating | MED/CONF | QUEUED: distinct outage state (states doctrine) |
| M-F9 | Cancelled/PPD games → immortal PENDING picks (no VOID writer); 2 missed cron days orphan a day | LOW-MED/CONF | QUEUED: VOID path + catch-up settle window |
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
| O-3.x | trust-gate: line-based matching defeats multi-word bans; string-splitting; homoglyphs/entities/soft-hyphen; markdown headings skipped as comments; "the lock" blanking; commercial-scan negation+import exemption; draft-only comment-suffix exemption | HIGH-within-scope/CONF. QUEUED guardrail-hardening: normalize before scan (strip zero-width, NFKC, join concatenations), scan rendered strings not source lines |
| O-4.x | secret-scan reads worktree content of STAGED names (partial-stage bypass); misses renames; >2MB skip; dist/build/coverage SKIP_DIRS even in --all; missing redis://, ghp_, napi_, sk- rules | MED/CONF. QUEUED: scan `--cached` blob content; add rules; drop SKIP_DIRS in CI mode |
| O-1.x | vercel-skip-build diffs only HEAD^..HEAD (multi-commit push skips needed deploy); ACTIVE_TRUNK staleness; scripts/ not build-relevant; skip-gate tests never run | MED/CONF. QUEUED: diff the full pushed range; wire the .mjs test into CI |
| O-6 | vacuous stub-DB tests: board-phase2/daily-slate/dev-state assert empty results that hold whether or not the where-clause is correct | MED/CONF. QUEUED: seed the stub or assert against a populated fixture for suppression logic |

## The meta-lesson (permanent)

Codex reads every diff cold and adversarially. The durable countermeasure is
to make that pass a STANDING gate, not a one-off: (a) the guardrail-hardening
PR closes the scanner/CI/secret holes above so the mechanical classes fail
pre-merge; (b) the `independent-diff-reviewer` Foundry manifest (PR #77) is
the seat for a pre-PR adversarial pass; (c) this ledger is consumed by the
next cycle's ranking. Every finding here became a test or a queued fix — the
repo is measurably harder to break than before the audit.
