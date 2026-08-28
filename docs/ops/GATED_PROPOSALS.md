# GALAXY KEYLESS-FIXES — GATED ITEM PROPOSALS (founder/research decision-needed)

Branch: `hermes/galaxy-keyless-fixes`
Status: **NONE of these are implemented.** They are documented proposals. Each
is gated behind a founder/research decision or a schema/migration the founder
owns. Per the build directive ("build the 6 concrete only, gate the 5"), the
concrete waves (LQ18 --prod, cron-matrix, freshness-gating, H-M off-season,
re-grade/CLV-drain) are shipped; these remain proposals.

No fabrication: every claim below is anchored to a real repo artifact (file
path shown). Where measurement is required and not yet done, it is marked
`[MEASUREMENT REQUIRED]`.

---

## G1. Sport×Market CLV slices behind admin auth  — DECISION-NEEDED (product/security)

**What:** Expose per (sport, market) CLV breakdowns — currently the platform
captures CLV at the pick level (`packages/prediction-engine/src/clv-capture.ts`,
`lib/settlement/free-path-clv.ts`) and persists `clvValue/clvVerdict` per pick,
but there is no aggregated sport×market slice surface.

**Proposal:** Add a read-only aggregation query keyed by `(sportKey, market,
pickType)` over settled+CLV-graded picks, surfaced **only** behind the existing
admin auth wall (`ADMIN_COOKIE` / founder session, same gate `prod-probe` uses).
Never keyless. The CLV census already exists as a one-off CSV
(`docs/ops/calibration/2026-08-18-clv-census.csv`, 1161 rows per AGENT_LEDGER
H-E) and can seed the aggregation contract.

**Decision needed:**
- [ ] Founder: is this a public "proof" surface (post-launch, needs
      PERFORMANCE_STATS gate alignment) or strictly internal ops?
- [ ] Schema: new read model vs. computed-at-settle column. New columns are
      founder-only (schema/migration owned by founder).
- [ ] Auth: confirm admin wall = same `ADMIN_COOKIE` predicate, no new secret.

**Out of scope for this branch:** any schema change. Implementation blocked on
the three decisions above.

---

## G2. nflverse true-closing-line backtest → promotion gate  — DECISION-NEEDED (research)

**What:** The grading fixes shipped in Wave 3 (`scoreGame` lock-capture guards,
`resolveCloseSourceLadder` close-source preference) change which close line is
used for CLV. Before promoting these to the default grading path, a backtest
against nflverse *true* closing lines should confirm the new close-source
ladder actually improves CLV fidelity (not just "different").

**Anchors:** `packages/data-ingestion/src/nflverse-game-lines.ts` (true closing
lines source), `apps/web/lib/intelligence/clv-calibration.ts` + its test,
`packages/prediction-engine/src/historical-replay.ts` (replay harness).

**Proposal:** A read-only backtest script (scripts/edge-lab/ style, ro DB only)
that replays a sample of settled picks through BOTH the old average-close path
and the new per-book CLOSE-preference path, diffs the resulting `clvValue`
distributions, and reports whether the new path reduces bias. Output: a
go/no-go table — no promotion until the new path is ≥ non-inferior.

**Decision needed:**
- [ ] Founder: acceptable backtest window + sample size (nflverse history is
      large; cost of a full replay vs. a stratified sample).
- [ ] Research: define the non-inferiority margin (e.g. CLV mean within X bps,
      tail error rate down).
- [ ] Gate wiring: who flips the default — founder only, behind a flag
      (`LINE_ARCHIVE_ENABLED` style), never default-on.

**Out of scope for this branch:** the backtest itself + the flag flip. Proposed
as a follow-up PR once the decision is made.

---

## G3. Deck SC1–SC10 renumber  — DECISION-NEEDED (product call)

**What:** The deck (`apps/web/app/deck/page.tsx`, `apps/web/app/engine/page.tsx`)
references card slugs SC1–SC10. A renumber was floated to align with the current
deck narrative. This is purely a product/labeling decision — no logic change.

**Proposal:** Mechanical rename SC1→SCn per founder's chosen ordering. Pure
find/replace across deck copy + any cross-links in `docs/data/CARDS_LAUNCH_QA.md`.

**Decision needed:**
- [ ] Founder: the target ordering. I will NOT pick the numbers (product voice).
- [ ] Confirm no external doc (handoff, runbooks) hard-codes the old SCn that
      would silently drift.

**Out of scope for this branch:** the rename itself. I will execute it on
approval with a doc-drift check.

---

## G4. Doc-drift batch  — DECISION-NEEDED (measurement first)

**What:** `handoff/DOC_DRIFT.md` tracks known doc/code drift. Several seed
entries are resolved; others need measurement before fixing. Fabricating fixes
here would be dishonest — the directive explicitly says "needs measurement."

**Proposal:** Audit pass that (a) re-checks each open DOC_DRIFT entry against
current code, (b) measures the actual delta, (c) emits a per-entry
RESOLVED / STILL-DRIFT / CAN'T-VERIFY verdict. Fixes only applied to
RESOLVED ones, with the measurement recorded.

**Decision needed:**
- [ ] Founder: priority vs. launch-night. Recommend: batch runs during the
      audit wave, low-risk doc-only fixes shipped as a separate commit.
- [ ] Confirm no doc change touches a founder-owned spec (CARDS_*, RUNBOOK)
      without sign-off.

**Status:** anchored to `handoff/DOC_DRIFT.md` (D1 already resolved this
session's cron-matrix). Remaining entries measured in the audit wave below.

---

## G5. K11 / K1–K13 kernel ML iteration  — DECISION-NEEDED (research-gated)

**What:** The stat-king kernel (H-K/H-L series in AGENT_LEDGER) has kernel
iterations K1–K13 plus K11. These are research/ML iterations on the prediction
core, not bug fixes. Several are explicitly "research" class (LQ7, IC-series).

**Proposal:** Do NOT implement blind. Each K-iteration needs: a hypothesis, a
backtest harness result (reuse `historical-replay.ts` + `clv-calibration.ts`),
and a promotion gate (≤ non-inferior + calibrated). Until a K-iteration has a
passing backtest, it stays behind its flag.

**Decision needed:**
- [ ] Founder/research: which K-iteration is in scope for THIS launch cycle?
- [ ] ML owner: provide the backtest hypothesis + acceptance margin per K.
- [ ] Confirm none are default-on (kernel flags are founder-only).

**Out of scope for this branch:** all K-iterations. Listed so the founder can
prioritize during the audit/launch window.

---

## Summary gate

| ID | Item | Decision owner | Implemented? |
|----|------|----------------|--------------|
| G1 | Sport×market CLV slices (admin) | Founder (product/sec) | NO — proposal |
| G2 | nflverse true-CL closing backtest | Founder + research | NO — proposal |
| G3 | Deck SC1–SC10 renumber | Founder (product) | NO — proposal |
| G4 | Doc-drift batch | Founder (priority) | NO — measure-first |
| G5 | K11/K1–K13 kernel ML | Founder + research | NO — proposal |

No schema/migration touched. No founder-only gates flipped. Secret scanner clean
on every commit in this branch.
