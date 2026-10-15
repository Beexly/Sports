# PIT Round-2 Joint Freeze — STOPPED: the combination rule is not specified anywhere

**Verdict: NOT BUILT. NOT FROZEN. NOTHING SCORED.**
Build lane (Motif, coding) · 2026-10-15 · Base: `grok/walk-forward-2026-10-14` @ `7297f2f32ced7ff45429851b9d2799656a6be3a0`

The task was to freeze pre-registered candidate #1 — the pit_round2 joint — in code + hash, without scoring anything. Step 2 of the task required determining the joint's exact composition from the handoff. **No source document specifies how the four round-2 families combine.** Every document in the record either *authorizes* a joint, *defers* its definition to another document that does not contain it, or describes a *different* joint (round 1). Writing the module would require the builder to invent the candidate — the exact failure pre-registration exists to prevent. Per the task's hard fence, this report is the deliverable: the ambiguity, precisely, with the evidence.

Nothing was scored on any data, real or otherwise. `walk_forward.json` untouched. No module was written. **No `CANDIDATE-1-FREEZE.json` was created** — creating one would fabricate a freeze of a candidate that does not yet exist as a specification.

---

## 1. What candidate #1 is supposed to be

SPEC-A §9.1 (Claude draft, Motif file `claude-specs-future-filter-and-pick-2026-10-15.md`):

> "Candidate #1: pit_round2 joint (four solos frozen in code+hash before any future-filter scoring). The four solos are: family-2 (hetero β_T + atoms), total-quantile, and two others per the pit_round2 handoff."

The four solos, as landed in `dfs/walk_forward/pit_round2.py` + `pit_round2_result.json` (frozen filter, n=2,462, baseline 7.154021):

| # | Family | Solo CRPS | Δ vs baseline |
|---|---|---|---|
| 1 | Integer-support discretized Gaussian (σ=13.45 fixed, no fit) | 7.152200 | −0.001821 |
| 2 | Hetero-Gaussian σ=13.45·exp(β_T·T/44) + key-number atoms (p3, p7), PIT grid | 7.133199 | −0.020822 |
| 3 | Student-t, ν PIT-fit, variance-matched to σ=13.45 | 7.137978 | −0.016043 |
| 4 | Empirical-quantile scale on total (prior quartile bins) | 7.151542 | −0.002478 |

All four improved solo. That is the entire agreed content of "the joint": *these four, combined, somehow.*

## 2. Evidence sweep — every statement about the round-2 joint in the record

Sources searched on branch `grok/walk-forward-2026-10-14`: `research/PIT_ROUND2_2026-10-15.md`, `research/SESSION_HANDOFF_2026-10-15.md`, `research/wo1-audit-2026-10-15.md`, `research/crps-status-2026-10-15.json`, `research/gate-decision-2026-10-15.md`, `research/sigma-d-planning-2026-10-15.md`, `research/argon-rollup-2026-10-15.json`, `dfs/walk_forward/pit_round2.py`, `dfs/walk_forward/pit_round2_result.json`, `dfs/walk_forward/pit_joint.py`; plus the Motif-side SPEC-A/SPEC-B draft and Grok's WO-5 ledger (both in `~/workspace/your_files/`).

1. **`research/PIT_ROUND2_2026-10-15.md`** (the handoff named in the task): "Four solos improve → per the handoff a single joint is authorised; it was NOT scored in this run." — *Authorization only. No composition, no formula, no weights. It also defers to an unnamed prior "handoff."*
2. **`dfs/walk_forward/pit_round2_result.json`**: `"joint_scored": false`, `"joint_note": "not scored in this run; task scoped to the four solos"`. — *No composition.*
3. **`research/SESSION_HANDOFF_2026-10-15.md`** locks: "Solos separately; joint only after ≥2 solos improve, then **one** fit and **one** score." — *A procedural rule (when a joint may happen), not a definition (what it is). This document's own "the one joint" is the round-1 joint (see §3).*
4. **`research/wo1-audit-2026-10-15.md`** §2.0 — the closest thing in the record to a composition statement: "pit_round2's four solos all improved, which per the handoff authorizes ONE joint **hetero+atoms+Student-t...** construction". — *The sentence trails off with an ellipsis in the source itself. It names family 2's two mechanisms plus Student-t, omits families 1 and 4 entirely, and gives no weights, no order, no formula. It is an auditor's shorthand, not a spec — and even taken literally it covers at most 3 of the 4 families.*
5. **SPEC-A §9.1** (above): defers the membership to "the pit_round2 handoff," which (per item 1) does not define it. *The deferral is circular.*
6. **Grok WO-5 ledger**: family-2 row — "Pre-registered as candidate #1 on future filter. Spec to be frozen in code+hash. Joint NOT scored on frozen filter." — *In this row candidate #1 is family-2 alone; elsewhere the ledger treats candidate #1 as the joint. The record is not even internally consistent about the candidate's membership, let alone its combination rule.*
7. **`dfs/walk_forward/pit_round2.py`**: implements the four solos only. No joint function, no joint comment, no combination sketch anywhere in the file.

## 3. The round-1 joint is not a template

`pit_joint.py` (CRPS 7.142622) is sometimes liable to be misread as "the joint pattern." It is not transferable. Round 1's solos were three *scale modifiers of one Gaussian*, so "joint" had a canonical meaning: multiply the scale factors, σ = 13.45·exp(β_S·|S|/10 + β_T·T/44), fitted on one joint grid. Round 2's families are four **different distributional forms** — a lattice distribution, a continuous+atom mixture, a Student-t, and an empirically-scaled Gaussian. There is no analogous canonical operation, and importing round 1's by analogy would be a builder invention.

## 4. Why the four families do not compose canonically — the seven unanswered questions

- **Q1 — Scale conflict.** Three families define the per-game scale three different ways: F2's hetero σ = 13.45·exp(β_T·T/44); F4's empirical bin σ (quartile bins of total, median|resid|/0.6745); F3's variance-matched t-scale. A joint must pick one, stack them, or replace them — each choice is a different candidate. Nothing picks.
- **Q2 — Kernel shape.** Is the joint's continuous kernel Gaussian (F2/F4) or Student-t (F3)? If t, does F3's PIT-selected ν apply to whichever σ survives Q1?
- **Q3 — Atoms.** Do F2's ±3/±7 atoms (with the mean-preserving recentering c = μ/(1−p3−p7)) ride on the joint kernel, and if the kernel is a t or a lattice, on what exactly?
- **Q4 — Support.** Is the joint discretized to integer support (F1) or continuous? (The handoff itself calls F1's solo gain "mechanical… not a new signal" — whether the joint claims that mechanical gain is a spec decision, not a builder's.)
- **Q5 — Composition vs pooling.** Is the "joint" one composed distribution, or a pool (mixture) of the four predictive distributions? If a pool: equal weights, ΔCRPS-proportional weights, or PIT-selected weights per row? All are used in the literature; none is named.
- **Q6 — Parameter selection.** Each solo PIT-selects its own parameters per row from its own grid (F2: (β_T, p3, p7); F3: ν; F4: bin σ). A joint needs a selection rule: inherit solo picks, re-fit on a product grid, or something else. Unstated.
- **Q7 — Membership.** Does the joint include all four families? The audit's truncated phrase (§2 item 4) names at most three, and the WO-5 ledger (§2 item 6) once equates candidate #1 with family-2 alone.

## 5. The incompatible rules a builder could pick (proof of non-uniqueness)

Each of the following is defensible, each is used in practice, and each produces a **different distribution and a different future score** — i.e., a different candidate:

- **(a)** Sequential composition: F4 empirical σ → Student-t shape at that σ → F2 atoms on top → F1 discretization last.
- **(b)** Sequential composition with F2's hetero σ instead of F4's empirical σ (atoms, then discretization).
- **(c)** Equal-weight linear pool of the four predictive CDFs (the record's own corpus note — WIRED's ablation, cited in the session handoff — found equal weights beat adaptive weights elsewhere, which a builder could cite for (c) over (d)).
- **(d)** ΔCRPS-weighted or PIT-selected pool.

Freezing any one of these under the label "pre-registered candidate #1" would put the builder's invention into the registry under the spec's authority. That is precisely the stacked-winner's-curse / post-hoc-specification failure the freeze protocol (and Claude's Q2 ruling: freeze the spec in code+hash *as specified*) exists to prevent.

## 6. What unblocks this build

One short composition ruling from the specification authority (per the fleet's own allocation: the closure authority — Motif/Garrett — not Grok, who authored the plan, and not Hermes, who audited it) answering Q1–Q7, e.g. in the form: *"Candidate #1 = [pool | composition]; members = […]; σ = […]; kernel = […]; atoms = […]; support = […]; selection = […]."* The moment that ruling exists, this build resumes and completes in one pass: module → synthetic contract tests → `CANDIDATE-1-FREEZE.json` → land. No other input is missing: the solo code, grids, and locks are all landed and hash-verified (§7).

Until then the honest registry state for candidate #1 is: **PRE-REGISTRATION BLOCKED — composition unspecified** (not "terminated," not "frozen").

## 7. Verified hashes of the inherited sources (recorded now, so the eventual freeze detects any drift)

Branch `grok/walk-forward-2026-10-14` @ `7297f2f32ced7ff45429851b9d2799656a6be3a0`. Local copies verified byte-identical to remote (git blob SHA-1 match on every row):

| File | git blob (SHA-1) | SHA-256 |
|---|---|---|
| `dfs/walk_forward/pit_round2.py` | `81c6978b5b7afd8826b28085680ec654abece850` | `5c3bfede161e4e82d57caa4ffe09548f30e2e6f083ccfbf7d0881c0dea43ea6c` |
| `dfs/walk_forward/pit_round2_result.json` | `673c401575723312091fe53474cb5dc627d5fd64` | `0fa72d05639fbccbf7fa7172e252ddf4da71be3d7723605bb86a1c249df962c7` |
| `research/PIT_ROUND2_2026-10-15.md` | `ee0b1d3e8f60cec72eb7a717e7fdcb762e2921b5` | `ca4983b15681f85c65cd90a7d1796ddba1141fbf7c81269f4128bc1ff8a595ae` |
| `research/wo1-audit-2026-10-15.md` | `978f7b188883ae9a29d8654fbbf31d993210b87d` | `237a84be0a5edd2a60c584342660ca8af459ddb13084108ebb2c6624f9fa5cb2` |
| `dfs/walk_forward/pit_joint.py` (round-1; distinction only) | `200feb2ccb6d810fdc382d4238459f0e06bd66ee` | `5f932b6277451de5242270fa6a01ca242dc1e49f3903a7fbb2bb171be10267a6` |

Cross-check worth noting: the `pit_round2_result.json` SHA-256 above (`0fa72d05…`) matches the sigma-d job's independently regenerated byte-identical result — the solo artifacts the joint will inherit are stable.

SPEC-A/SPEC-B hashes: **PENDING-FREEZE-1** — the specs exist only as drafts inside the combined Motif working file `~/workspace/your_files/claude-specs-future-filter-and-pick-2026-10-15.md` (SHA-256 `4d33d201e6d7984ea29813a346a36a5dc617785b7de7e59849de66196501c8f1`), not as standalone landed files; there is nothing canonical to hash yet.

## 8. Fences honored

- Zero scoring runs — on real data or any data. No module written.
- The frozen filter was not touched; no games.csv/outcome file was read by this lane (only code, results, and docs).
- `walk_forward.json` untouched; emission remains ZERO_OBJECT.
- The local git clone of the branch timed out on network throughput and was abandoned; all reads were made through the GitHub contents API and verified by blob hash (table above). Landing uses the Git Database API path.

## 9. Landed artifacts of this (stopped) build

- This report: `~/workspace/your_files/pit-joint-freeze-2026-10-15.md` and, identically, branch `motif/pit-joint-freeze-2026-10-15` (off `7297f2f`) at `research/pit-joint-freeze-ambiguity-2026-10-15.md`.
- Agent-bus note: `outbox/from-motif/2026-10-15-pit-joint-freeze-ambiguity.md`.
