# GSE Gate Census — 2026-10-12

**The single manifest every lane works from tonight.** Machine-readable twin: `GATE_CENSUS_2026-10-12.json` (same directory). Every status below was verified by reading code — git trees of `main` and `research/rating-atlas-2026-10-09-packet`, caller greps, harness headers — not by trusting the inventory docs.

## Headline counts (229 entries)

| Status | Count |
|---|---|
| WIRED-LIVE | 14 |
| LANDED-NOT-WIRED | 34 |
| INFERRED-SPEC-QUARANTINE | 24 |
| SPEC-ONLY | 157 |
| MISSING | 0 |
| **Total** | **229** |

Breakdown: the **30 engine gates** → 14 live / 10 landed-not-wired / 6 spec-only. The **179 prediction-engine modules** → 0 live / 24 landed-not-wired / 4 quarantine / 151 spec-only. A **20-entry local annex** (inferred-spec harnesses that live only in the workspace) → all quarantined.

MISSING is 0 for a precise reason: everything anyone has named as a gate has at least a canonical spec or a doc. The gap is not missing gates — it is unevaluated ones.

## The discrepancy, resolved

The two source docs were said to disagree (14/1/15 vs 14/5/11). They don't, quite — the truth is worse and simpler:

- **Both documents carry the same header tally — 14 live / 5 partial / 11 not-wired — and both documents' own per-gate lists contradict it.** Enumerated gate by gate, both docs actually list **15 live** (gates 1,2,3,4,5,6,9,10,11,15,16,17,18,19,20), **1 partial** (gate 8 only — the "5 partial" figure appears in no enumeration anywhere), and **14 not-wired** (7, 12, 13, 14, and 21–30). 15+1+14 = 30.
- **Code-verified census: 14 / 10 / 6.** Same live count as the headers, different composition. Gate 2 (Injury Pull Gate) drops out of live: on `main` it has **no production caller** — only a test wire (`intelligence/gates/test_phase_wires.py`). Gates 21–27 move up from "not-wired" to landed-not-wired: their code verifiably exists on `main` (callers unverified for 21–27 — flagged per entry). Gates 28–30 are confirmed documentation only. Gate 8 stays landed-not-wired: the promotion *decision* code exists in `publish-guards-bridge.ts`; the shadow evaluation lane that would feed it does not.
- **The module numbering has a verified mis-mapping.** GATE-SPECS.md (179 modules, 116 NOT EVALUATED / 63 stated-no-status / 0 gateless) is canonical and internally consistent, and the Oct 11 eval batches follow its numbering — **except modules 53–56**: the landed `eval_module53–56` files evaluate root-level TS files (`2508-07136v2-ledger-0795`, `2508-09992v1-openfpl`, `2508-14065v1-tower`, `2508-15299v1-basketlidar`) that GATE-SPECS explicitly excluded from the corpus. Canonical PE-053…056 (MC-dropout CER, analytic drawdown pricer, dual-threshold conformal, two-knob sizer) have **no valid eval** — quarantined.
- **Number collisions in local staging.** Workspace harnesses calling themselves "modules 1–8, 13–16, 21–24" are *different modules* built on inferred specs (confidence score, tier assignment, FG/kicker EPA, calibration checks) — same numbers, different identities. `gates_staging` idx25–28 are another lane's IDX numbering. All 20 are quarantined in the annex. Separately, modules **29–36** have harnesses built from the *canonical* specs sitting only in local staging (`~/workspace/pe_gates_29_32/`, duplicated in `pe_gates_33_36/`) — reconciled, but never landed, so in the repo they remain spec-only.

Also verified: the two inventory docs exist **only** on `research/rating-atlas-2026-10-09-packet` — checked across all 712 fetched remote refs. They are not on `main`, not on the Hermes branch, nowhere else.

## The 30 gates (verified)

**WIRED-LIVE (14):** G-01 FreshnessGate (packet branch; ~21 consumer scripts), G-03 CollegeGuard (packet `live_board.py`, whole-board refusal), G-04 Signal Spine, G-05 Contest-Shape Guard, G-06 Per-Market Calibration Gate (historical: ML PASS, SPREAD PASS, TOTAL FAIL), G-09 Selective Abstention (called by the publish-guards bridge), G-10 Proper Scoring Gate (same bridge), G-11 JEV 10K Sim Engine (DFS optimizer path), G-15 DFS Lineup Validation, G-16 Board Gate Rows (board/gate page + slate loader), G-17 Live Board Honesty Labels, G-18 Kill Ledger (append-only record), G-19 GSE Score Honesty, G-20 Banned Language Filter (enforced by construction in `live_board.py` — no standalone scanner; noted as the weak form).

**LANDED-NOT-WIRED (10):** G-02 Injury Pull Gate (test-only wiring), G-07 PE Acceptance Gates roll-up, G-08 Model Promotion Gate (no shadow lane), G-21 Age Gate, G-22 CSRF Origin Guard, G-23 In-Play Guard, G-24 Durable Write Guard, G-25 Numeric Guard, G-26 Trust Gate, G-27 Evidence Guard (21–27: code on `main`, callers unverified).

**SPEC-ONLY (6):** G-12 JEV 5-Gate Sieve (code on Garrett's Windows host only), G-13 JEV Arbitration Oracle (live API on Windows only), G-14 Fail-Closed Mandate (doctrine, no enforcement code), G-28 Calibration Gate Scale (doc), G-29 Release Gate Plan (doc), G-30 Independence Gates (doc).

## Prediction-engine modules (179)

- **LANDED-NOT-WIRED (24)** — eval harnesses on the packet branch at `minis/gates/prediction_engine/`: 9–12 (harness live, specs never registered — SPEC_PENDING by design), 17–20 (actually run on nflverse data: **17 PASS, 18 FAIL, 19 FAIL**, 20 no verdict recorded), 37–40, 49–52, 57–60, 61–64 (specs transcribed from GATE-SPECS; need frozen manifests / historical data for verdicts).
- **INFERRED-SPEC-QUARANTINE (4)** — 53–56, mis-mapped (above).
- **SPEC-ONLY (151)** — includes 29–36 (canonical harnesses local-only), 41–48 (no batch, no staging found anywhere), and 65–179 (untouched). Every one of the 179 has its TS module on `main` and its gate spec in GATE-SPECS.md; none is wired into the production prediction path, and none promotes without its gate verdict plus RVC clearance.

## Can run tonight as-is

The 14 WIRED-LIVE gates — with their input conditions, which are the lanes' real work tonight: FreshnessGate + CollegeGuard + honesty labels + banned-language on the packet-branch board (needs fresh stamped pulls), the publish-guards bridge pair (G-09/G-10) on whatever the publish path submits, per-market calibration on settled rows, and the DFS chain (G-04/G-05/G-11/G-15/G-19) — which will run on an **illustrative slate** until the real-slate lane lands, and must be labeled as such. G-16 runs but the production board stays honest-empty while RVC is NOT CLEARED. PE harnesses 17–20 are re-runnable on the packet branch where their nflverse data path resolves; 9–12 can emit only SPEC_PENDING stamps until their (existing, canonical) specs are registered.

## Cannot run tonight (one-line reasons)

- **G-02 Injury Pull Gate** — no production caller; only a test exercises it.
- **G-07 / all 179 PE modules (as promotions)** — gates unevaluated or verdicts absent; nothing promotes tonight.
- **G-08 Model Promotion** — shadow evaluation lane doesn't exist; needs ≥500 paired settled events.
- **G-12 JEV Sieve** — implementation lives only on the Windows host.
- **G-13 JEV Oracle** — live `jev ask` API is Windows-hosted; VM heuristics are not arbitration.
- **G-14 Fail-Closed Mandate** — written rule, no enforcement code in the publish path.
- **G-21…G-27** — code exists on `main`; enforcement callers unverified, so none may be claimed live.
- **G-28/G-29/G-30** — documents, not code.
- **PE-053…056** — landed eval code targets the wrong modules; canonical slots unevaluated.
- **PE 29–36** — harnesses exist only in local staging; not landed, and their gates need historical graded data.
- **PE 1–8, 13–16, 21–28, 41–48, 65–179 (143 modules)** — no eval harness exists; each gate needs walk-forward data on a frozen manifest.
- **All 20 local annex harnesses** — inferred specs / colliding numbers; quarantined until reconciled against GATE-SPECS.md.

## Branch state at census time

`main` (verified directly); `research/rating-atlas-2026-10-09-packet` (inventory docs, minis pipeline, all landed harnesses); `fix/galaxy-odds-first-2026-10-08` = PR #1156 (SGP/props, no gate content); the `motif/*` 2026-10-12 stack (SGP real prices, review fixes, Pinnacle prop feed, live props board, projections surface) adds no gates and changes no gate status — its outputs are DIAGNOSTIC-stamped with RVC NOT CLEARED, which this census respects: **nothing in the SGP/props chain is a gate, and no gate above clears it.**

*Census method: code read directly (vendor git object store for main + packet branch, full 712-ref tree search for the source docs, caller greps per gate, harness header inspection, local staging enumeration). Statuses are as of 2026-10-12 afternoon CT.*
