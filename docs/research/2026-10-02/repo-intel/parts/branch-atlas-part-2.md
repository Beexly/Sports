# Branch Atlas — Part 2 (chunk 02)

Generated 2026-10-02 from GitHub API branch reads on `Beexly/Sports`. Entries are ordered as in `branch-chunk-02.txt`.

### `gse/true-pava-calibrator-matrix`
- Last commit: 313b9f4 — "feat(cal): true pointwise PAVA + calibrator selection matrix" (2026-08-09)
- Inferred purpose: Calibration lane — implements a true pointwise PAVA (pool-adjacent-violators) isotonic regressor and a matrix comparing/selecting calibrators. Touches the calibration module (likely edge-lab / calibration code). Status hint: old (August), experimental, likely superseded by later calibration work.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/true-pava-calibrator-matrix

### `gse/wp24-c86-totals-drop-reasons`
- Last commit: 1dee2fc — "[hermes-wp24] attach total drop reasons to coverage" (2026-09-24)
- Inferred purpose: WP-24 work package, claim C-86 — attaches reasons rows were dropped to coverage reporting for totals (over/under) markets. Touches coverage/reporting code. Status hint: recent-ish; may have been absorbed into the totals coverage lane.
- Open in browser: https://github.dev/Beexly/Sports/tree/gse/wp24-c86-totals-drop-reasons

### `handoff/gse-complete-2026-09-20`
- Last commit: ecc39d1 — "handoff: GSE complete work package" (2026-09-20)
- Inferred purpose: Handoff snapshot branch — a packaged snapshot of the complete GSE work state as of 2026-09-20, presumably for transfer between agents/hosts. Status hint: snapshot artifact; unlikely to be actively developed.
- Open in browser: https://github.dev/Beexly/Sports/tree/handoff/gse-complete-2026-09-20

### `hermes-surf-14-inventory`
- Last commit: ed4b99d — "[hermes-surf-16] ledger: resolve the evidence SHA to 2b546ec5b" (2026-09-29)
- Inferred purpose: Inventory/audit lane (surf-14 naming) whose latest commit ties into the surf-16 ledger, resolving an evidence SHA. Touches docs/ops ledger bookkeeping. Status hint: recent; active bookkeeping context.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-14-inventory

### `hermes-surf-16-provenance-fix`
- Last commit: 47fe369 — "docs(ops): four worker reports (airwave readiness, odds blackout, PR triage, dupes)" (2026-09-29)
- Inferred purpose: Provenance/audit lane for surf-16 — publishes four worker reports covering airwave readiness, an odds blackout, PR triage, and duplicates. Touches docs/ops. Status hint: recent; active audit documentation.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-16-provenance-fix

### `hermes-surf-16b`
- Last commit: 95c36c1 — "docs(ops): bridge-file review - 66 of the 75 rescued files are already in the repo" (2026-09-29)
- Inferred purpose: surf-16 follow-up lane — a bridge-file dedupe review finding that 66 of 75 rescued files were already present in the repo. Touches docs/ops. Status hint: recent; active dedupe/audit work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes-surf-16b

### `hermes/2026-09-18-flash`
- Last commit: 4cdd779 — "fix(edge-lab): close remaining loop holes — CQR empty, 5pp market, Venn-by-sport, discrete CRPS" (2026-09-18)
- Inferred purpose: One-day flash fix lane on edge-lab — closes CQR empty-interval loopholes, the 5-percentage-point market check, Venn-by-sport, and discrete CRPS handling. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/2026-09-18-flash

### `hermes/2026-09-18-queues`
- Last commit: 1b13ba9 — "fix(types): static dispatch for ranking orderings (Codacy critical)" (2026-09-18)
- Inferred purpose: One-day fix lane — replaces a dynamic dispatch with static dispatch in ranking-ordering types, flagged critical by Codacy. Touches type-level/ranking code. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/2026-09-18-queues

### `hermes/arbiter-0930`
- Last commit: 7ac8d5d — "fix(arbiter): declare the cron in the LIVE apps/web config too" (2026-10-01)
- Inferred purpose: Arbiter lane — declares the arbiter cron in the live apps/web config so the scheduled job actually runs in production. Touches apps/web cron config. Status hint: very recent; active.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/arbiter-0930

### `hermes/b6a-chain-append`
- Last commit: 7f3822c — "B-6a: ledger-store.ts added; process-sport.ts wiring BLOCKED" (2026-08-19)
- Inferred purpose: B-6a chain-append work — adds ledger-store.ts; process-sport.ts wiring was explicitly blocked at this commit. Touches the ledger chain code. Status hint: old; flagged BLOCKED — may be dead or awaiting unblock.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/b6a-chain-append

### `hermes/c104-clock-rot`
- Last commit: f33b09b — "[hermes-c104] clock-rot: relative kickoff + toKalshiDateFragment (test-only)" (2026-09-18)
- Inferred purpose: Claim C-104 — clock rotation helpers: relative kickoff time and a Kalshi date-fragment formatter, marked test-only. Touches Kalshi/time utilities. Status hint: single-day lane; test-only scope suggests experimental.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c104-clock-rot

### `hermes/c11-launch-fixes`
- Last commit: 3c28651 — "Record the game-clustering limitation on the AUC, and why the null survives it" (2026-09-04)
- Inferred purpose: C-11 launch lane — documents a game-clustering limitation affecting AUC measurement and why the null result survives it. Touches evaluation/AUC documentation. Status hint: old; documentation fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c11-launch-fixes

### `hermes/c12-close-the-pass`
- Last commit: 87000c3 — "C12 recovery completion: commit 9 worktree-only files the crash left behind (age-verify page+route+lib, paid-checkout switch, board-surface-chip, stripe-price-c…" (2026-09-05)
- Inferred purpose: C-12 crash recovery — commits 9 worktree-only files left behind by a crash (age-verify page/route/lib, paid-checkout switch, board-surface-chip, Stripe price code). Touches website checkout/verification UI. Status hint: one-off recovery; done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c12-close-the-pass

### `hermes/c298-inplay-parity-2026-09-12`
- Last commit: 395a58e — "Fix em-dash-scan failures in the-beat copy (punctuation only, no meaning change)" (2026-09-12)
- Inferred purpose: C-298 inplay-parity lane — latest commit is a copy-punctuation pass fixing em-dash-scan failures in the-beat copy (copy doctrine compliance). Touches website copy. Status hint: single-day lane; likely landed or stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/c298-inplay-parity-2026-09-12

### `hermes/cal-oom-fix-20260919`
- Last commit: 38d7577 — "fix(calibration): pass the Prisma client through the loose OddsTableDb boundary at the three recompute call sites (repo convention)" (2026-09-19)
- Inferred purpose: Calibration OOM fix — threads the Prisma client through the loose OddsTableDb boundary at three recompute call sites per repo convention. Touches calibration recompute paths. Status hint: single-day lane; likely landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/cal-oom-fix-20260919

### `hermes/calibration-audit-2026-09-30`
- Last commit: 034bfd7 — "docs(calibration): audit engine calibration claims against measured evidence" (2026-09-30)
- Inferred purpose: Calibration audit lane — a document auditing the engine's calibration claims against measured evidence. Touches docs/calibration. Status hint: recent; active audit.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/calibration-audit-2026-09-30

### `hermes/clv-decided-disclosure-20260920`
- Last commit: 2b2b780 — "Merge branch 'main' into hermes/clv-decided-disclosure-20260920" (2026-09-20)
- Inferred purpose: CLV (closing line value) decided-disclosure lane — disclosure reporting for decided bets' CLV. Latest commit is a main merge, so the substantive work is in earlier commits. Touches CLV/disclosure code. Status hint: rebased recently; purpose partly inferred from name since the latest commit is just a merge.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/clv-decided-disclosure-20260920

### `hermes/covariate-bus`
- Last commit: 5a1790d — "fix(edge-lab): add avgYac covariate to bus + tests" (2026-08-22)
- Inferred purpose: Covariate-bus lane in edge-lab — adds the avgYac (average yards after catch) covariate to the bus with tests. Touches edge-lab covariates. Status hint: old; likely superseded by the covariate-bus feature lanes.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-bus

### `hermes/covariate-bus-pfeatures-frame-forecast`
- Last commit: bc401cb — "feat(edge-lab): PFeatureSet + FrameForecast over covariate bus (PR per DEEPSEEK-CONTINUE-BUS)" (2026-08-27)
- Inferred purpose: Extends the covariate bus with PFeatureSet + FrameForecast features, built per the DeepSeek CONTINUE-BUS spec. Touches edge-lab feature framing code. Status hint: old; experimental feature framing.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-bus-pfeatures-frame-forecast

### `hermes/covariate-cpoe-comp`
- Last commit: d92a64d — "docs: mark #553 merged, update serving SHA to 0285b992" (2026-08-22)
- Inferred purpose: Covariate CPOE (completion percentage over expected) comparison lane — latest commit is pure bookkeeping: marks PR #553 merged and updates the serving SHA. Touches docs/CPOE tracking. Status hint: old; bookkeeping commit.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/covariate-cpoe-comp

### `hermes/ethandojo-typecheck-2026-09-25`
- Last commit: 5734416 — "[hermes-ETH-V1] record verification and the 18-error remediation in the ledger" (2026-09-25)
- Inferred purpose: ETH-V1 (Ethan Do model-rebuild lane) typecheck verification — records verification and an 18-error TypeScript remediation in the ledger. Touches the rebuilt model's types + ledger. Status hint: single-day lane; done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/ethandojo-typecheck-2026-09-25

### `hermes/f9-ledger-chain-schema`
- Last commit: 96feca8 — "[founder-F-9] ledger DONE a28e1d67" (2026-08-20)
- Inferred purpose: Founder claim F-9 — the ledger chain schema; marked DONE at this commit. Touches the ledger chain schema. Status hint: old; completed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/f9-ledger-chain-schema

### `hermes/fe-c93`
- Last commit: 6c5ef58 — "[hermes-c93] claim C-93 frontend launch-quality batch (FE-02/08/09/11/12/13/17/18); FE-05/10/15 already in f06be6b31, FE-14 skipped for Claude's uncommitted tok…" (2026-09-10)
- Inferred purpose: C-93 frontend launch-quality batch — a set of FE-* frontend tasks (FE-02/08/09/11/12/13/17/18), with some already landed and FE-14 skipped. Touches the web frontend. Status hint: old; batch partially landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fe-c93

### `hermes/final-pass-2026-09-10`
- Last commit: fc1df2d — "[hermes-C313] ledger: C-313 DONE with the timeout correction, C-315 opened for the misnamed credential on this host" (2026-09-11)
- Inferred purpose: Final-pass ledger lane — marks C-313 DONE with a timeout correction and opens C-315 for a misnamed credential on this host. Touches ledger bookkeeping. Status hint: old; bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/final-pass-2026-09-10

### `hermes/finish-line-2026-09-05`
- Last commit: 56994f6 — "Merge remote-tracking branch 'origin/main' into hermes/finish-line-2026-09-05" (2026-09-06)
- Inferred purpose: purpose unclear from name and commit — the latest commit is only a main merge, and the branch name gives no domain hint. Substantive intent would need earlier commits. Status hint: old; stale.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/finish-line-2026-09-05

### `hermes/fix-884-mock-isresearchpower`
- Last commit: 2137f49 — "test(cqr): take main's fail-closed conformal-quantile assertions" (2026-09-26)
- Inferred purpose: Fix for #884 (mock isResearchPower flag) — latest commit pulls main's fail-closed conformal-quantile assertions into the CQR tests. Touches CQR test assertions. Status hint: recent; syncing with main.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-884-mock-isresearchpower

### `hermes/fix-ingestion-oom-and-tracing`
- Last commit: 5be986c — "ledger: FIX-3 and FIX-4 verified live on dpl_CJYjQ13QPRtrBNGWrJnP4sEUTWKa; DOC-1 now measured" (2026-09-28)
- Inferred purpose: Ingestion OOM + tracing fixes — FIX-3 and FIX-4 verified live on a Vercel deployment (dpl_CJYjQ13QPRtrBNGWrJnP4sEUTWKa), with DOC-1 now measured. Touches data ingestion and tracing/ledger code. Status hint: recent; actively verified live.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-ingestion-oom-and-tracing

### `hermes/fix-lint-unused-args`
- Last commit: 5185a5b — "fix(data-ingestion): filter the season DURING the parse so refresh-player-stats stops OOMing" (2026-09-28)
- Inferred purpose: OOM fix in data ingestion — filters the season during the parse so refresh-player-stats no longer runs out of memory. Touches data-ingestion parse code. Status hint: recent; active fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-lint-unused-args

### `hermes/fix-publish-time-market-p-scan`
- Last commit: 9eabac8 — "[hermes-fix-ptmp-scan] publish-time-market-p source scan: accept the defensive db cast" (2026-09-20)
- Inferred purpose: Publish-time market-probability source scan fix — accepts the defensive database cast in the scan code. Touches the publish-time market-p source scan. Status hint: single-day lane; likely landed.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-publish-time-market-p-scan

### `hermes/fix-trust-gate-surname`
- Last commit: a3cc77e — "fix(trust-gate): clear the 4 remaining hits the job log named" (2026-09-26)
- Inferred purpose: Trust-gate scan fix — clears the 4 remaining hits named by the job log (oddly named "surname"; likely a scan-rule key). Touches trust-gate/guardrail scanning. Status hint: recent; active cleanup.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/fix-trust-gate-surname

### `hermes/footer-link`
- Last commit: e50e611 — "[hermes-footer] Retarget dead /#founding-waitlist footer link to /waitlist" (2026-09-10)
- Inferred purpose: Website footer fix — retargets the dead /#founding-waitlist footer link to /waitlist. Touches the site footer. Status hint: old; small fix, done.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/footer-link

### `hermes/founder-picks-form`
- Last commit: 93cb695 — "[hermes-UI-1] ledger: record the resolvable work SHA on the UI-1 row" (2026-09-27)
- Inferred purpose: UI-1 founder-picks form lane — latest commit is ledger bookkeeping recording the resolvable work SHA on the UI-1 row. Touches the founder picks form UI + ledger. Status hint: recent-ish; bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/founder-picks-form

### `hermes/frontier-transfer-2026-09-15`
- Last commit: 44b8ee6 — "[hermes-self-audit] Withdraw unisolated causal claim (thread-sprawl); L3 shelved on wrong half (snap_counts + practice_status unused); E2/F4 unblockable via the…" (2026-09-16)
- Inferred purpose: Frontier-transfer self-audit — withdraws an unisolated causal claim (thread-sprawl), shelves L3 for sitting on the wrong half (snap_counts + practice_status unused), notes E2/F4 unblockable. Touches research transfer audit docs. Status hint: single-day audit; corrective.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frontier-transfer-2026-09-15

### `hermes/frozen-path-guardrails`
- Last commit: 66b27f2 — "[hermes-C-363] ci: verify:holdout in run-all; L11 scorecard precondition (C-363)" (2026-09-15)
- Inferred purpose: Frozen-path CI guardrails — wires verify:holdout into run-all and adds the L11 scorecard precondition (C-363). Touches CI config and scorecard preconditions. Status hint: old; CI hardening.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frozen-path-guardrails

### `hermes/frozen-path-settle-scheduler`
- Last commit: b261b35 — "[hermes-C-418] ci: remove settle-picks from GitHub Actions (frozen-path)" (2026-09-15)
- Inferred purpose: Frozen-path CI change — removes settle-picks from GitHub Actions (C-418), likely to keep pick-settlement off the automated path. Touches GitHub Actions workflows. Status hint: old; deliberate automation restriction.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/frozen-path-settle-scheduler

### `hermes/galaxy-keyless-fixes`
- Last commit: 727f3eb — "fix(galaxy): resolve 6 pre-existing tsc errors + add cron-matrix CI gate" (2026-08-28)
- Inferred purpose: Galaxy keyless fixes — resolves 6 pre-existing TypeScript errors and adds a cron-matrix CI gate. Touches the galaxy web app + CI. Status hint: old; maintenance fix.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/galaxy-keyless-fixes

### `hermes/galaxy-keyless-odds`
- Last commit: d880a84 — "feat(galaxy): clearance-gated keyless path + Kalshi second-book capability + timeouts" (2026-08-28)
- Inferred purpose: Galaxy keyless odds feature — a clearance-gated keyless path, Kalshi as a second book, and timeouts. Touches the galaxy web app's odds/keyless flow. Status hint: old; feature work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/galaxy-keyless-odds

### `hermes/gate-bound-stability-2026-09-12`
- Last commit: 74cd837 — "[hermes-gate] feat(ops): per-market calibration gate — RES floor as the anti-constant guard, no-skill-relative Brier" (2026-09-11)
- Inferred purpose: Per-market calibration gate — adds an RES floor as an anti-constant guard and a no-skill-relative Brier metric. Touches calibration gating/ops code. Status hint: single-day lane; gate stability work.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/gate-bound-stability-2026-09-12

### `hermes/green-board-1`
- Last commit: a3560fa — "fix(guardrails): GB-6 review — mask-then-scan replaces line-level exemption (bypass hole closed)" (2026-08-29)
- Inferred purpose: Green-board guardrails — GB-6 review replacing line-level scan exemptions with mask-then-scan, closing a bypass hole. Touches guardrail scanning code. Status hint: old; security hygiene.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/green-board-1

### `hermes/grok46-full-audit-2026-08-27`
- Last commit: d6fc2c2 — "[hermes-C-64] ledger: mark C-64 DONE with 4ad1af456 #679" (2026-08-27)
- Inferred purpose: Grok 4.6 full-audit lane — latest commit is ledger bookkeeping marking C-64 DONE (referencing PR #679). Touches the audit ledger. Status hint: old; audit completion bookkeeping.
- Open in browser: https://github.dev/Beexly/Sports/tree/hermes/grok46-full-audit-2026-08-27
