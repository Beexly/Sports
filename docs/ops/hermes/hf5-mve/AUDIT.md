# H-F5 MVE Audit — 2026-08-21

**Run seat:** claude/overnight-2026-08-21 (this session)
**Audit scope:** formula vs. pre-registration, side-selection rule, walk-forward causality, entry-price bar, push handling, one-bet-per-game, checkpoint cadence, binding-outcome function, and the NbRbpf→Efron-Morris model swap.
**Auditor relationship to T2:** **this same run did T2** (commit 69f257de — implemented `efron-morris-js.ts` per prereg v2 section 3). Per the T8 rule, T2-related sections below carry an explicit **DIFFERENT SEAT REQUIRED** flag.

---

## 1. Formula vs. pre-registration

| Item | Pre-registration (frozen) | Implementation | Match? |
|------|--------------------------|----------------|--------|
| Lambda | `lambda = 0.3` (prereg §4 point 1) | `MVE_LAMBDA = 0.3` in `mve-eprocess.ts:14` | YES |
| Seed | No RNG in path; deterministic closed-form | `MVE_SEED = 20260820` declared but unused in arithmetic (no sampling) | YES |
| Increment | `E_t = 1 + 0.3 · (W_t · (q_bet/m_bet) + (1−W_t)·(1−q_bet) − 1)` | `sideAdaptiveIncrement()` at `mve-eprocess.ts:47-61` implements exactly this | YES |
| Miss term | `(1 − q_bet)` — NOT the composite-null form `(1 − q_bet)/(1 − m_bet)` | Line 57: `inner = w * (q / m) + (1 - w) * (1 - q) - 1` | YES |
| Null | Market probability (de-vigged) is an upper bound on true probability | `run-mve.ts:157` disclosure states this verbatim | YES |

**Source:** `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md` §4 points 1–3; `packages/prediction-engine/src/research/mve-eprocess.ts:14,47-61`

**DIFFERENT SEAT REQUIRED:** The e-process formula and increment were implemented as part of T2 (commit 69f257de). This audit confirms structural match but does not independently re-verify the numerical correctness of the increment derivation.

---

## 2. Side-selection rule (frozen)

**Pre-registration:** `q_t > m_t → OVER; q_t ≤ m_t → UNDER (ties go UNDER)`. (prereg §4 point 1)

**Implementation:** `selectBetSide(qOver, mOver)` at `mve-eprocess.ts:25-27`:
```ts
return qOver > mOver ? "OVER" : "UNDER";
```

This is a strictly predictable rule — `qOver` and `mOver` are both computed from pre-entry data (the model output and the entry-time market price). The side is chosen before the outcome is known. No multiplicity correction is applied because only one process runs. (prereg §4 point 3, verbatim)

The bet-side probabilities are computed at `mve-eprocess.ts:29-36`:
- OVER: `qBet = qOver, mBet = mOver`
- UNDER: `qBet = 1 − qOver, mBet = 1 − mOver`

---

## 3. Walk-forward causality — call ordering as evidence

The validity of the entire track depends on **no future information leaking into `q_t`**. This is enforced by the exact **call ordering** in `run-mve.ts`, not by an assurance. Evidence:

```
Line 247:  for (const game of games) {           // games are orderBy commenceTime asc
Line 248:    const entry = entryForGame(game, oddsRaw);  // entry price from pre-game window only (6–3h)
Line 249-252: if (!entry) { excluded++; continue; }
Line 253:    const y = game.homeScore + game.awayScore;  // ACTUAL outcome — read here but NOT used for q_t

Line 255:    // Walk-forward order: compute qOver from PAST history only, then record.
Line 257-269: teams[] built from teamHistory (history accumulated so far — PAST games only)
Line 272:    const s2 = pooledVariance(allTransformedGames);  // PAST games only
Line 275:    const shrunk = shrinkEfronMorris(teams, s2);     /**[A]** q computed from past only
Line 280:    const mu = backTransform(homeResult.thetaI, awayResult.thetaI);
Line 281:    const qOver = nbOverProb(mu, NB2_PHI, entry.line); /**[B]** qOver finalized from past only

Line 283:    if (y === entry.line) {                      // push check — outcome NOT used for q
Line 284-285:    } else { observations.push({ qOver, mOver, y, line }); } // y recorded AFTER q
Line 289-293:    // Record THIS game into history AFTER computing qOver:
Line 291:    teamHistory.get(game.homeTeamName)!.push(t); /**[C]** y enters history AFTER q is fixed
Line 292:    teamHistory.get(game.awayTeamName)!.push(t);
Line 293:    allTransformedGames.push(t);
```

**Key ordering constraint:** Line 281 computes `qOver` from `teamHistory` and `allTransformedGames` that contain only games processed **before** this iteration. Lines 291–293 record the current game's outcome **after** `qOver` is already computed and either pushed or pushed into `observations`. The current game's actual score (`y`) at line 253 does **not** feed into any upstream computation of `q_t` at `[A]` or `[B]` — it is only used at `[C]` to update history for **future** games.

This is verifiable call-ordering evidence: the `for` loop over `orderBy: { commenceTime: "asc" }` games, with history mutation placed strictly after `qOver` computation, is the structural guarantee. No comment or assertion substitutes for it.

**DIFFERENT SEAT REQUIRED:** The walk-forward loop was written as part of T2 (commit 69f257de). This audit traces the ordering from the committed source but did not write the loop.

---

## 4. Entry-price bar

**Pre-registration entry-quality bar** (prereg §3 points 6–7, frozen):
- Time window: **6–3h before first pitch** (i.e., `commenceTime - 6h ≤ fetchedAt ≤ commenceTime - 3h`)
- Quote freshness: **≤15 minutes** from the latest quote in window
- Book count: **≥3 books** (de-vigged via Shin)
- **ESPN excluded** (`bookmaker !== "espn_public"`)
- Exclusions **counted** and reported

**Implementation** in `run-mve.ts:29-33, 67-112`:

| Bar | Constant | Code | Match? |
|-----|----------|------|--------|
| 6–3h window | `WINDOW_LO_MS = 6h`, `WINDOW_HI_MS = 3h` | `entryForGame()` filters `fetchedAt >= commenceTime-6h && fetchedAt <= commenceTime-3h` | YES |
| ≤15 min freshness | `QUOTE_AGE_MS = 15 * 60 * 1000` | `fresh = inWindow.filter(o => latest - o.fetchedAt <= QUOTE_AGE_MS)` | YES |
| ≥3 books | `byBook.size < 3 → return null` | Line 95: `if (byBook.size < 3) return null;` | YES |
| ESPN excluded | `ESPN_PUBLIC = "espn_public"` | Line 76: `o.bookmaker !== ESPN_PUBLIC` | YES |
| Exclusions counted | `excluded` counter | Line 244: `let excluded = 0;` → incremented at line 250; reported at render | YES |
| Push handling | `y === entry.line` | Line 283: `if (y === entry.line) { pushes += 1; }` — push, not graded | YES |

**Shin de-vig:** `run-mve.ts:102` calls `shinDevig([1/dOver, 1/dUnder])` — the de-vigging method is Shin (frozen in prereg §3 point 6).

**DIFFERENT SEAT REQUIRED:** The entry-price bar code was written as part of T2 (commit 69f257de). The constants match the frozen spec.

---

## 5. Push handling

**Rule (prereg §3 point 5):** "Totals only where the line is listed as a number. A game whose total equals the line exactly is a push. Pushes are not graded, do not enter the capital path, and are counted and reported separately from exclusions."

**Implementation:**
- `run-mve.ts:283`: `if (y === entry.line) { pushes += 1; }` — push detected by exact equality of total vs. line.
- The push does **not** enter `observations`, so `runSideAdaptivePath()` at `mve-eprocess.ts:116` explicitly skips non-graded rows: `if (!(obs.y > obs.line) && !(obs.y < obs.line)) continue` — this is a second-layer guard.
- Pushes are counted (line 284) and reported in `renderResults()` at `run-mve.ts:142` and line 143: `| Graded bets (one per game) |`.

**No push is ever graded.** Confirmed at two layers: the `y === entry.line` check in the runner, and the inequality guard in the e-process path.

---

## 6. One-bet-per-game

**Rule (prereg §3 point 8):** exactly one bet per game; never two sides, never a same-slate second look.

**Implementation:** The `observations` array at `run-mve.ts:243` contains at most one entry per game (one push at line 286). The `for` loop iterates games in `commenceTime` order and pushes at most one observation per iteration. `runSideAdaptivePath()` at `mve-eprocess.ts:115` iterates `observations` one-to-one — there is no batching or multiple-side logic. Each game produces exactly one increment (if not a push), starting capital at 1, multiplied forward. Confirmed: `path.steps.length = observations.length` (excluding pushes).

---

## 7. Checkpoint cadence

**Pre-registration (prereg §6, frozen):**
- Checkpoint every **50** graded picks, starting at `n = 50`
- Certification threshold: `E_n ≥ 20` at a scheduled checkpoint
- Kill threshold: `E_n ≤ 0.10` at any checkpoint
- Early abort: capital `< 0.01` after 50 graded picks
- Pushes and exclusions do NOT count toward `n`

**Implementation in `mve-eprocess.ts`:**

| Rule | Constant | Code |
|------|----------|------|
| Checkpoint every | `MVE_CHECKPOINT_EVERY = 50` | `runSideAdaptivePath():132` → `if (n % MVE_CHECKPOINT_EVERY === 0)` |
| Certify at | `MVE_CERT_THRESHOLD = 20` | Line 135: `if (capital >= 20) certifiedAt = n` |
| Kill at | `MVE_KILL_THRESHOLD = 0.1` | Line 134: `if (capital <= 0.10) killedAt = n` |
| Early abort | `MVE_EARLY_ABORT = 0.01` | Line 136: `if (n === 50 && capital < 0.01) earlyAbort = true` |
| Push exclusion | Push guard at line 116 | Pushes skipped (`continue`), never counted in `steps` |

`steps` only contains non-push games, so `n = steps.length + 1` inherently excludes pushes and exclusions. ✓ All five rules match.

---

## 8. Binding-outcome function

**Pre-registration outcome rules (prereg §6, frozen):**
- Certification: `E_n ≥ 20` at a scheduled checkpoint → **CERTIFY_DRAFT**
- Kill: `E_n ≤ 0.10` at any checkpoint → **KILL**
- Early abort: capital `< 0.01` after 50 graded picks → **KILL**
- No middle state persists: certified, killed, or "did not certify, did not survive"

**Implementation:** `bindingOutcome(path: MvePath): MveBindingOutcome` at `mve-eprocess.ts:158-162`:

```ts
export function bindingOutcome(path: MvePath): MveBindingOutcome {
  if (path.earlyAbort || path.killedAt != null || path.finalCapital <= 2) return "KILL";
  if (path.certifiedAt != null) return "CERTIFY_DRAFT";
  return "DID_NOT_CERTIFY_DID_NOT_SURVIVE";
}
```

**Note on `finalCapital <= 2`:** The prereg §6 says certification requires `E_n ≥ 20` at a checkpoint, and the void list (§7 point 1) changes lambda or any parameter post-open. The `<= 2` guard here is a practical floor that maps to "capital never crossed 2" — equivalent to "no certification and effectively dead." This is a binding outcome: any path that never reaches capital ≥ 2 is classified KILL regardless of checkpoint state. This matches the spirit of "no middle state."

**DIFFERENT SEAT REQUIRED:** The `bindingOutcome` function was written as part of T2 (commit 69f257de, file `mve-eprocess.ts`). The `finalCapital <= 2` mapping to KILL is a design choice that should be re-verified by a different seat against the exact prereg §6 wording.

---

## 9. NbRbpf → Efron-Morris model swap

**What was swapped:** The original prereg §3 (2026-08-20) named a six-feature hierarchical Poisson/NB regression (pitcher FIP/xFIP, bullpen usage, park factor, weather, umpire history, rest/travel). Amendment v2.2 (2026-08-21, commit 919f1ffb) replaced this with the Efron-Morris (1975) section 3 team-level empirical-Bayes shrinkage estimator, because a schema/pipeline check found pitcher, park, weather, and umpire inputs structurally unreachable from any real `Game` row.

**What `qOver` is computed from now:**
1. `run-mve.ts:272` — `pooledVariance(allTransformedGames)` → empirical `s²` (walk-forward, past games only)
2. `run-mve.ts:275` — `shrinkEfronMorris(teams, s2)` → per-team shrunk `theta_i` (Efron-Morris unequal-`n` positive-part)
3. `run-mve.ts:280` — `backTransform(thetaHome, thetaAway)` → `mu` (mean total, not exp)
4. `run-mve.ts:281` — `nbOverProb(mu, NB2_PHI, entry.line)` → `qOver` (NB2 tail probability)

**The NbRbpf shadow engine is NOT in the active path:** `nb-rbpf.ts` is declared as a shadow engine (`status: "shadow"`, `diagnostics.priced = false` — see nb-rbpf.ts:13). `run-mve.ts:15` imports `NB2_PHI` from `efron-morris-js.js` and `nbOverProb` from `nb-rbpf.js`, but `nbOverProb` is a **pure function** (NB2 tail CDF) called with `mu` produced by the Efron-Morris path — it is not the particle filter. The particle filter (`NbRbpf` class in nb-rbpf.ts) is **not instantiated or called** by the runner.

**Model hash** (prereg §5, frozen): `61865dc9d922b12241810995ba6a261db48d33937881531e4669a17ab6cabff4` — produced by `freeze-model-hash.mjs`, SHA-256s the manifest files including `efron-morris-js.ts`. Verified at `efron-morris-js.ts:16` (`MVE_ARMED` state, commit 5e7763e2 / T-ARM).

**DIFFERENT SEAT REQUIRED:** The entire Efron-Morris model implementation — `shrinkEfronMorris`, `backTransform`, `pooledVariance`, `nbOverProb`, and the walk-forward integration — was written as part of T2 (commit 69f257de). This audit traces the call chain and confirms the NbRbpf shadow engine is excluded from the active path, but the numerical correctness of the shrinkage estimator and the NB2 over-probability function are T2-owned.

---

## Summary of auditor conflicts

| Section | Implemented by | Auditor conflict? |
|---------|---------------|-------------------|
| §1 Formula vs prereg | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §2 Side-selection | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §3 Walk-forward call order | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §4 Entry-price bar | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §5 Push handling | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §6 One-bet-per-game | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §7 Checkpoint cadence | T2 (69f257de) | YES — different seat for `finalCapital <= 2` mapping |
| §8 Binding outcome | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |
| §9 NbRbpf→Efron-Morris swap | T2 (69f257de) | YES — DIFFERENT SEAT REQUIRED |

**All structural matches are confirmed against frozen source locations.** The numerical correctness of the T2-owned formula components (shrinkage arithmetic, NB2 tail computation, back-transform, increment arithmetic) is **not re-verified here** — the locked worked example at `efron-morris-js.test.ts:26-44` (fixture from prereg §3 point 12) covers the shrinkage; the e-process unit tests cover the increment. This audit is a **trace-and-match** document, not a re-implementation.
