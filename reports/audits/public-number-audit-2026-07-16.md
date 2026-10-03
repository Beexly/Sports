# Public-Surface Performance-Number Audit — 2026-07-16

**Trigger:** intel reconciliation (FTC substantiation exposure — RagingBull precedent:
$2.425M settlement for performance claims "without written evidence those claims are
typical"). **Scope:** every unauthenticated route under `apps/web/app` (excluding
/admin, /cockpit, /dashboard, /brief, internal API). **Question:** which public
surfaces render a performance number (win rate, accuracy %, W-L record, ROI, units,
confidence, hit rate) NOT protected by a substantiation guard?

## Summary

The guarded core is genuinely guarded: `/glass-ledger` (display-guard, renders nothing
until PUBLISH_LEDGER), `/performance` (sample floors + Wilson bands + readiness gates),
`/clv` (public-clv-policy, CI + break-even check), `/calibration` (bucket sample
minimums). The gaps cluster in older/side surfaces:

## Findings that need remediation (ranked)

1. **`apps/web/app/stats/proof/page.tsx:10`** — `const proofScore = 61;` rendered as a
   public "Proof Readiness" ScoreRing on the page whose stated purpose is "the honest
   proof layer." A hardcoded, non-computed score presented with visual specificity.
   **Worst single finding.** Fix: compute it from real inputs, or replace the ring with
   explicit "self-assessment (not measured)" framing, or remove.
2. **`apps/web/app/stats/page.tsx:12-17,47,52,101`** — hardcoded "King Standard 61/100"
   + four component scores (Source Coverage 40, Live Feeds 10, Proof Archive 5, Metric
   Depth 65) as source literals on public `/stats`. Page self-discloses "fixture-backed"
   status, which mitigates but does not substantiate. Same fix options as #1.
   **FOUNDER decision — product surface with deliberate framing.**
3. **`apps/web/app/performance/losses/page.tsx:144-146` and `/losses/[id]/page.tsx:163-164`**
   — bare `Confidence {n}` / `Edge {n}` per-pick renders, zero guard, one page away from
   the carefully-floored `/performance` aggregate. Per-pick historical facts (lower risk
   than aggregate claims) but should carry calibration-context framing.
4. **`apps/web/app/proof/page.tsx:426-474`** — per-pick confidence, CLV value,
   model-vs-market pp render raw on the flagship Proof of Record page (single-pick
   facts; no denominator/CI framing).
5. **`components/intelligence/engine-view.tsx:814-841,887-893`** — buy-low/sell-high
   hit-rate percentages with n shown but **no Wilson LCB and no minimum-n floor**; a
   thin sample (n=3) prints a headline-looking colored percentage. Fix: min-n floor +
   Wilson LCB display, matching /performance's standard.
6. **`lib/trust-claims.ts` banned-phrase scanner (STRUCTURAL)** — the only automated
   defense against a numeric performance claim in CMS blog content is a fixed phrase
   list with **no numeric-claim detector**; "our picks hit 71% last month" passes
   untouched. Fix: add a numeric-performance-claim pattern (percentages/records/ROI
   near performance verbs) to the blog public-guard, defaulting to block-with-review.
7. **`app/api/picks/daily-slate/route.ts:116-133`** — `recentRecord` is gate-protected
   but hardcoded `{wins:0,losses:0,pushes:0}` (dead path). Wire to real graded data or
   remove before the gate ever opens.
8. **`components/picks/pick-card.tsx:449-478`** — ConfidenceBadge falls back to the raw
   uncalibrated heuristic (relabeled "{n}/100", not %) when the self-suppressing
   calibrator is inactive. Mitigated by the relabel; noted as below the display-guard
   standard. Resolution rides the edge-engine/confidence founder flip already on the
   roadmap.
9. **`app/vs/tout-services/page.tsx:110-113`** — hypothetical "64% calibrated
   confidence… loses 36 of 100 times" framed generically; acceptable as a teaching
   example, keep phrasing clearly hypothetical.
10. **`app/ledger/page.tsx:27-93`** — confidence/edgeScore fetched but never rendered
    (dead fields); note so a future edit doesn't render them unguarded.

## Clean surfaces (verified)

`/pricing` (feature labels only, win-rate explicitly gated), home tout-comparison
(qualitative), `/methodology`, `/how-to-verify-a-record`, `/accountability`, `/house`,
`/the-beat`, `/academy`, `/board` (counts/links only), `/airwave` (Wilson-banded AND
explicitly fictional demo data), home operational counts (outage-guarded).

## Hardcoded numeric claims (exact locations)

- `app/stats/proof/page.tsx:10` — `const proofScore = 61;`
- `app/stats/page.tsx:12-17` — KING_DIMENSIONS literals 40/10/5/65; `:52,101` — "King
  Standard: 61 / 100", "61 is an honest score…"
- `data/statking/backtests/backtest_summary.json` — `"mae": 5.8`, `"hit_rate": 0.61`,
  `"calibration": "limited"` (status "fixture_backtest" in source; renders as plain
  table values on /stats/proof without the fixture caveat at point of render).

## Disposition

Items 1–2: FOUNDER decision (product framing vs compute vs remove). Items 3–5, 6, 7:
engineering remediation queued (branch work, deploys only via founder merge). Items
8–10: tracked, resolved by flips already on the roadmap or by convention.
