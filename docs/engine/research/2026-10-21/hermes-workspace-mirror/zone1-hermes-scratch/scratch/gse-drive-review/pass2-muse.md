# Pass 2 — Muse — inside two archives (not a repeat of muse-zips.md)

Method: read-only `zipfile.ZipFile.read()` on two archives in `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`. No extraction to G:\. No Sports checkout modified. No personal/legal/credential files opened (EYI `Conversation with Muse AI_*.txt` and `fsa-reimbursement-sweep/hsa-receipts/*` not opened beyond filename confirmation in pass 1). No invented numbers — all figures below are quoted from the files named.

Archives opened:
- `gse-competitive-intel-main (1).zip` (3222 entries)
- `EYI Package_10-02-2026_1790971043.zip` (384 entries)

Question answered: which concrete method, gate, or measured result did the filename pass throw away by stopping at names.

## 1. What the filename pass threw away

`muse-zips.md` correctly listed names but classified both archives as "something else" and stopped. Opening them shows three concrete things the name-only pass could not judge:

1. `gse-competitive-intel-main/LAUNCH/ENGINES-MATH-CALIBRATIONS-RESEARCH.md` — a calibration/metrics canon with formulas and citations (Platt, Isotonic/PAV, Beta, Venn-Abers IVAP/CVAP, Conformal, drift, Brier/Murphy, log-loss, e-process, slope/intercept, CLV, Gaussian copula). Dismissed as "competitive intel" by name.
2. `gse-competitive-intel-main/codex-work/handoff-docs/CALIBRATION_MEASUREMENT_RUNTIME.md` + `gse-competitive-intel-main/LAUNCH/10-RECORD-AUDIT.md` + `raw/prod-launch-audit-2026-09-08/{_audit_meta.json,proof_verification_spec.json,proof_ledger_self.json}` — a measurement runtime plus a live-ledger audit with a calibration-inversion table. Dismissed as filenames.
3. `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/gse-v5.3.0-build-spec.md` (in EYI package, 19747 bytes) — a full v5.3.0 rebuild spec that rewrites confidence, Premium, and three signal layers, with an explicit "no shadow period" override. Dismissed as "name suggests a calibration rebuild spec; not the standing brief."

`nfl-injury-report.md` is the one filename-pass call confirmed on open: it is a scraped Action Network-style table (`Name | Pos | Status | Injury | Update | Updated`, e.g. "James Conner | RB | Out | Foot"), not a gate. No threshold, no calibration, no hold logic inside.

## 2. Already a diagnostic (does NOT change a published number)

These measure, verify, or display-safety without rewriting confidence, edge, Premium, stake, or ledger economics.

- **Calibration Measurement Runtime** (`codex-work/handoff-docs/CALIBRATION_MEASUREMENT_RUNTIME.md`, 324 bytes, full text): "Brier score, Expected calibration error, Maximum calibration error, Confidence buckets, Sample-size display safety, Model-version grouping, Current/unsettled season exclusion, **No model weight changes**." Diagnostic by its own header. Safe to run; changes no published number.
- **Methods canon** (`LAUNCH/ENGINES-MATH-CALIBRATIONS-RESEARCH.md`): reference formulas only — `p' = sigma(A*z+B)` (Platt 1999); isotonic PAV "Needs > ~1,000 samples"; Beta (Kull/Filho/Flach 2017); Venn-Abers `[p_lo,p_hi]`, `ivap.ts/cvap.ts`; conformal `q = ceil((n+1)(1-alpha))/n`; drift "sliding-window refits + prequential"; Brier `BS=(1/N)sum(p_i-y_i)^2`, Murphy `REL-RES+UNC`; log-loss "Comparisons only on the same sample set"; e-process `s_t=(p_hat/p0)^y*((1-p_hat)/(1-p0))^(1-y)`, reject when `E_T>=1/alpha`; slope/intercept "slope 1.0 = calibrated" (Cox 1958); `nCLV=p_close-1/P_lock`; copula `P(A&B)=pA*pB+rho*sqrt(pA(1-pA)pB(1-pB))`. No fitted weights, no thresholds, no backtest table inside. Library, not a gate.
- **Live record audit** (`LAUNCH/10-RECORD-AUDIT.md` + `_audit_meta.json`): independent verification PASS ("recomputed locally (python hashlib, no GSE code): MATCH"), ledger shape "1,111 receipts, 45 pages", `modelVersion: v5.2.7 (100%)`, "WIN 555 | LOSS 532 | VOID 19 | PUSH 5", entryOdds bug "199/1,111 (17.9%) ... NOT valid American odds", honest economics "decided 890 | W 460 / L 430 | win rate 51.7% | NET -52.47u | ROI -5.9%" (valid-odds flat-1u only; "first pass produced a nonsensical +139.85u" called out as garbage), calibration inversion table (conf 50-54: n=457/57.1% down to conf 75-79: n=9/22.2%, "Holds WITHIN every sport"), launch guidance "KEEP PUBLICATION OFF ... Publish nothing numerical until both are fixed." This is the audit that *blocks* a published number; it does not itself publish one.
- **Verification/ledger doctrine files** (`proof_verification_spec.json`: `GSE-PickCommit-v1`, `sha256('leaf:'+pickId+':'+canonicalPayload)`, synthetic vectors only; `proof_ledger_self.json` doctrine: "four legs: coverage denominator, Wilson or Clopper-Pearson lower bound, CLV backing, walk-forward provenance", "Publication is founder-gated and defaults OFF"). Diagnostic infrastructure.
- **Captured pages** (`raw/prod-launch-audit-2026-09-08/calibration_page.html`, `proof_page.html`, `route_status_138.txt`): frozen public-surface snapshots (e.g. `/calibration`, `/proof`, `/api/proof/*` statuses). Evidence of what rendered, not a method.

## 3. Would change a published number (must stay gated)

These rewrite displayed confidence, Premium/Free, grade, stake, or ledger denominators if wired to live scoring.

- **v5.3.0 Workstream 1 — calibrated confidence** (`gse-v5.3.0-build-spec.md` §5): "`confidence = round(calibrated_p x 100)`", one head "per sport x market type", spread push handling "3-class or P(cover|no push) x (1-push_rate)", "Start with logistic regression (L2)", "GBM may run as challenger; it only replaces the linear head if it beats it on out-of-sample log-loss/Brier", labels "primary = CLV-derived; validation = realized ROI", "`rankingP` and `calibrated_p` converge." Directly changes the public confidence number. Gated in-spec on `CALIBRATION_ADJUSTMENTS_ENABLED` with heuristic fallback — but see §4 below.
- **v5.3.0 Workstream 2 — refit thresholds + Premium conjunction** (§6): "sweep candidate Premium cutoffs over settled history", "Premium requires ALL of: calibrated confidence ≥ cutoff, shrunk edge ≥ min_edge, beat-vector agreement (no unresolved negative hold), prop alignment ≥ neutral, `dataQualityScore` ≥ bar. One red light → Free", "`MIN_PUBLISH_CONFIDENCE = 50` stays as the floor." Changes Premium/Free and Elite/Strong/Solid/Lean assignment. Current static rule quoted in-spec for contrast: "confidence >= 70 → PREMIUM", grades "conf≥85 & edge≥80 → ELITE" etc.
- **Fractional Kelly stake** (`codex-work/prediction-engine-reference/kelly.ts`): `KELLY_FRACTION = 0.25`, `MAX_UNITS_PER_PICK = 3`, `MIN_CONFIDENCE_FOR_STAKE = 65`, `MIN_EDGE_FOR_STAKE = 50`, `return null` below thresholds (UI "stake: research only"), `fairProb = clamp(offeredProb + (edgeScore/100 x 0.05), 0, 0.95)`. Changes displayed stake units. File header: "this is NOT a recommendation to bet ... bounded at MAX_UNITS_PER_PICK."
- **Data-correctness fixes** (spec §4 + audit §3): dedupe on `(gameId, pickType, selection)` + DB unique index (spec cites "Rays ML 86 x3" duplicate example); snapshot parity "every pick row has a `pick_signal_snapshots` row" (spec notes "42 signal-path picks have none" today); odds-population guard "reject |odds| < 100 && > -100 at write time." Each changes denominators and economics once live (audit proves sensitivity: full-ledger naive math vs valid-odds-only math).
- **New-layer scores/holds** (spec §§7-9): beat-desk hold "blocks Premium until resolved" (explicitly "Do NOT resurrect the dead `gate_decisions` table"); unexplained-steam factor ("A significant line move with no preceding public beat item = sharp steam"); prop alignment "Aligned → small boost; conflicted → penalty and review flag" + "Team-total consistency ... divergence is its own edge signal"; narrative holds ("conflicting incentive ... triggers a Premium hold"); context matrix "learned weights (Workstream 1), not hand-set bonuses" with "small-sample shrinkage." All change score or Premium reach if wired.
- **Path-to-publication math** (audit §8): "NCAAF lane: 109/183 = 59.6%, Wilson 95% LOWER BOUND = 52.3% ... denominator 183 < 250 required. FAILS the guard today (correctly)", "MLB lane: 292/590 = 49.5%, Wilson lower = 45.5%. FAILS", unlock "(b) accumulate ~70+ additional settled valid-odds NCAAF picks." Quoted as the guard's own output; "Do NOT massage thresholds to make lanes pass."

## 4. v5.3.0 "skip shadow" is a contradiction, not a build order

Spec §1(d) and §10 order: "everything ships **direct to production** — no shadow period (founder override 2026-09-13 ... Safety comes from the kill switch, the conjunction gate ..., and weekly monitoring, not from waiting)" and "Ship directly behind `CALIBRATION_ADJUSTMENTS_ENABLED` ... Backtest every layer on historical data before it ships (that is analysis, not shadow — it stays)."

Standing doctrine contradicts this:

- Shadow-until-calibrated: uncalibrated signals "compute in shadow but never promote to published outputs"; "wire = calibration row ... shadow-only, weight zero"; "Nothing published until it's calibrated" (wire → weight → calibrate → test → polish sequence).
- Calibration-pipeline gate: "**Not live** until `CALIBRATION_ADJUSTMENTS_ENABLED` + human MODEL_VERSION gate", "Time hold-out only", "Full Kelly forbidden", "Do not wire into live scoring without the gate."
- Ledger doctrine (`proof_ledger_self.json`): four-leg substantiation (denominator + Wilson/Clopper lower bound + CLV backing + walk-forward provenance), "Publication ... defaults OFF", "neverDoes: Emit a performance number that has not passed the four-leg substantiation guard."

Therefore: treat the "no shadow" sentence as a documented contradiction to be flagged, not as authorization to ship calibrated confidence, conjunction Premium, Kelly stakes, or new-layer scores to production. Backtest + shadow + the four-leg guard + the `CALIBRATION_ADJUSTMENTS_ENABLED`/MODEL_VERSION gate still apply. The spec's own kill-switch paragraph (`CALIBRATION_ADJUSTMENTS_ENABLED` rollback, "fails safe → fewer Premium picks") does not satisfy walk-forward provenance or selected-slice ECE.

No build action taken. No G:\ writes. No Sports checkout touched.
