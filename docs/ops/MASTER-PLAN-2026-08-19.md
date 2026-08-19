# MASTER PLAN — 2026-08-19 night

Single source of alignment for all agents. Read this and the ledger before
acting. Anything not on this plan is out of scope until the founder says
otherwise.

## Ground truth (verified, not assumed)

- Production runs `b71f7e28`. `main` is at `a0a64857` with 124 commits of
  fixes that are NOT live: checkout 400 fix, NFL season-window fix, npm
  build fix, premium-leak gates, line-archive wiring.
- The edge program's verdict so far: market-level close-prediction DEAD
  (corr artifact), per-book shading DEAD, cross-book lead-lag DEAD.
  Minute-cadence MLB totals is closed (L-15, L-16). ONE pre-registered
  experiment remains (L-17, below). One quarantined prospective-only lead
  (C-41, fanatics moneyline).
- The asset that survives everything: the append-only 1.37M-row multi-book
  price-path archive plus the calibration pipeline. Per the round-7
  facts packet, no competitor publishes per-book price-quality history or
  calibration curves. That is the product.

## The one blocker

**Vercel redeploy from `main` at `a0a64857`.** Everything on this plan is
inert until it lands: NFL data collection, the phase-tagged line archive
(`LINE_ARCHIVE_ENABLED` must be the exact lowercase string `true`),
checkout revenue, leak closure. Owner: founder via browser agent. If the
build fails, the full log goes to Claude — do not retry blind.

## Two tracks

**TRACK R — REVENUE (primary).** Does not wait on any research outcome.
1. Deploy (above).
2. Claude ships remaining C-31 fixes: free-teaser truncation, /faq false
   "every pick free" claims (FTC exposure), /pricing RiskDisclosure,
   daily-slate date bound.
3. Hermes computes BPQI (per-book price-quality vs consensus close) and
   BURS (book update reliability) on the 241-game corpus (L-18). These are
   PRODUCT numbers, valuable whether or not any edge exists.
4. Claude builds the public metrics surface from L-18 output: BPQI board +
   calibration scorecard. Honest claims only, forbidden-claims list in
   L-18 row. This is the "no man or machine has done this" claim we can
   actually defend: nobody publishes per-book pricing quality or their own
   calibration. Differentiation through verified honesty, not edge claims.

**TRACK E — EDGE (one experiment, then silence).** L-17: the six
path-geometry features (pre-entry-only realized variation, increment
autocorrelation, sign changes, dispersion decay, skew, staleness) → Ridge,
grouped CV by game, predicting realized CLV on the 241 clean-close games.
Pre-registered: r ≥ 0.15 continue; r < 0.10 the edge program STOPS on this
corpus — one unhedged sentence, no appeal, pivot all effort to Track R and
to forward NFL data accumulation. Every DeepSeek round from now on must be
attached to a concrete result (L-17/L-18 output), never open-ended.

## Assignments

| Agent | Does | Does NOT |
|---|---|---|
| founder | Approve deploy; nothing else tonight | Write code, run research |
| browser | Redeploy `main`@`a0a64857`, smoke test, report SHA/log | Touch env vars other than verifying LINE_ARCHIVE_ENABLED="true" |
| hermes | L-17 then L-18 on the existing extract | New mechanism studies, boosters, DB writes |
| claude | Merge results, C-31 fixes, metrics surface, keep main green | New fleets, new research rounds, data purchases |
| deepseek | Audit L-17/L-18 results when they exist | Open-ended rounds |
| copilot | Nothing | Anything |

## Do-not-do (waste prevention)

- No new mechanism studies on the 19-minute corpus. It is closed.
- No data purchases (cadence, props, Kalshi) until the deploy lands AND
  the BPQI board ships. The "first-half odds are ~free" claim is
  packet-sourced and unverified — verify before spending anything.
- No retrospective claims from C-41. Prospective pre-registered track only.
- No gradient boosting anywhere near 241 games.
- No new Workflow fleets without an explicit founder ask.

## Sign-off — the night is DONE when

1. Deployed SHA = `a0a64857` (or later main) and smoke test passes.
2. `odds_line_snapshots` row count > 0 and growing; NFL odds rows exist.
3. L-17 verdict recorded either way.
4. L-18 BPQI/BURS numbers merged.
5. C-31 fixes on main.
