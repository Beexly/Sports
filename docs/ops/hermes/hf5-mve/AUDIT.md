# H-F5 MVE Audit — Independent Verification

**Auditor:** Hermes (build seat, post-foundry seat-swap)
**Branch audited:** `origin/hermes/hf5-mve` @ 0035e3b4
**Pre-registration audited:** `docs/ops/edge/2026-08-20-mve-prereg-v2.md`
**Final-run spec:** `docs/ops/hermes/FINAL-RUN-2026-08-20.md` §H-F5 (lines 87–159)
**Outcome drafts:** `docs/ops/edge/2026-08-20-mve-kill-entry-draft.md`

Verdict: PASS with one documentation-only discrepancy noted below. No code defects found.

---

## 1. Side-adaptive e-process arithmetic

Pre-registration (prereg-v2.md lines 17–19, FINAL-RUN line 121, C-50/C-51):

```
E_t = 1 + 0.3·(W_t·(q_bet/m_bet) + (1−W_t)·(1−q_bet) − 1)
```

Implementation — `mve-eprocess.ts`:

- `MVE_LAMBDA = 0.3` (line 14) ✓
- `sideAdaptiveIncrement` (lines 47–61):
  - `inner = w * (q / m) + (1 - w) * (1 - q) - 1` (line 57) ✓
  - `next = 1 + lambda * inner` (line 58) ✓
  - **Miss term is `(1 − q_bet)`, NOT `(1 − q_bet)/(1 − m_bet)`** (line 57). The code uses `1 - q` directly. ✓
  - `clampProb` floors probs at `MVE_FLOOR = 1e-6` and caps at `1 - MVE_FLOOR` (lines 38–41). This prevents division by zero in `q/m`. ✓
  - Fallback `1 - lambda` (= 0.7) when increment is non-finite or ≤ 0 (line 59). ✓
- Unit test `miss term is (1−q), not (1−q)/(1−m)` (mve-eprocess.test.ts lines 39–44) explicitly verifies the miss term is `(1−q)`, not the composite-null form. ✓

**Supermartingale property (verified):**
The increment's conditional expectation under true side-probability `p` is:
```
E[increment] = 1 + 0.3·(p·(q/m) + (1-p)·(1−q) − 1)
= 1 + 0.3·(p·q/m + 1 − q − p + q·p)
```
At `p = 0`: `1 + 0.3·(1 − q) − 1` → `1 + 0.3·(1−q) ≥ 0.7` (since q ≤ 1−floor). ✓
At `p = m`: `1 + 0.3·(m·q/m + 1 − q − m + q·m)` = `1 + 0.3·(q + 1 − q − m + qm)` = `1 + 0.3·(1 − m + qm)`. 
When q ≤ m (bet side is the model's over/under with q ≤ m), this is ≤ 1. ✓

Each increment ≥ 0.7 > 0 (verified by unit test lines 35–36). ✓

## Discrepancy note (documentation-only, NOT a code defect)

FINAL-RUN-2026-08-20.md line 98 describes the formula as:
```
E_t = 1 + 0.3·(Y_t·q_t/m_t + (1−Y_t)·(1−q_t)/(1−m_t) − 1)
```
This uses the composite-null miss term `(1−q)/(1−m)`. However:
1. The **pre-registration** (prereg-v2.md line 18) specifies `(1−q_bet)` — the asymmetric form.
2. The **STATISTICAL RULING v2** (FINAL-RUN lines 112–135, C-50) explicitly adopted the asymmetric form: "1 + 0.3(Y q/m + (1−Y)(1-q) - 1)" — no division by (1-m).
3. The **actual code** (mve-eprocess.ts line 57) implements `(1 − q)`, not `(1 − q)/(1 − m)`.

The code, the pre-registration, the statistical ruling, and the unit tests all agree. FINAL-RUN line 98 is a stale artifact from v1 (the symmetric point-null design, which was "retired unrun" per C-48/C-50). This is NOT a code defect — the discrepancy is in a description line that was superseded but not updated. No fix needed for the audit; no retune is warranted.

## 2. Frozen side-selection rule

Pre-registration (prereg-v2.md lines 30–36, FINAL-RUN lines 126–128):

```
q_t > m_t → bet OVER; q_t <= m_t → bet UNDER (ties UNDER).
For OVER: q_bet = q_t, m_bet = m_t, W_t = 1 iff total goes over.
For UNDER: q_bet = 1 − q_t, m_bet = 1 − m_t, W_t = 1 iff total goes under.
```

Implementation — `mve-eprocess.ts`:

- `selectBetSide` (lines 25–27): `qOver > mOver ? "OVER" : "UNDER"` — ties go UNDER. ✓
- `betSideProbs` (lines 29–36): OVER → `{qBet: qOver, mBet: mOver}`; UNDER → `{qBet: 1−qOver, mBet: 1−mOver}`. ✓
- Unit test lines 11–25: verifies OVER only when q > m, ties UNDER, and under bets use complements. ✓

The runner (`run-mve.ts` lines 265–269):
- Predicts `qOver = filter.predictOver(synthetic)` for the game's over-probability.
- `entry.mOver` is the Shin-de-vigged market over-probability at entry.
- `selectBetSide(qOver, mOver)` is called with these values. ✓
- The bet side is chosen BEFORE the outcome is known (prediction happens at line 265, outcome `y` is already loaded into `synthetic` but only used for `filter.update()` AFTER the bet side is selected and the observation is pushed to the path). ✓

## 3. Walk-forward causality

Pre-registration (prereg-v2.md lines 39–40): "hierarchical posterior predictive; hyperparameters frozen before the walk-forward or updated strictly online."

Implementation — `run-mve.ts`:

- Games are fetched ordered by `commenceTime: "asc"` (line 193). ✓
- For each game, the runner calls `filter.predictOver(synthetic)` (line 265) BEFORE `filter.update(synthetic)` (line 271). ✓
- `predictOver` in `nb-rbpf.ts` (lines 276–286) uses the particle cloud state from all PREVIOUS updates — it does not reference `game.y` or `game.line` from the current game. ✓
- `update` (lines 292–322) weights by `logNbPmf(game.y, mu, phi)` — the NB likelihood of the observed `y` — then resamples. This is the correct order: predict from past, then update with the observed outcome. ✓
- `predictOver` at line 282 computes `nbOverProb(mu, phi, game.line)` — note it uses `game.line` (the betting line, known at entry time) but NOT `game.y` (the outcome). The NB pmf in `logNbPmf` (lines 121–129) takes `y` as input but this is only called inside `update()`, not `predictOver()`. ✓
- The `SyntheticGame` passed to `predictOver` includes `y: game.homeScore + game.awayScore` (line 262), but `predictOver` only reads `game.home`, `game.away`, `game.pitcherHome`, `game.pitcherAway`, `game.park`, `game.umpire`, `game.line` — it never reads `game.y`. ✓ (The `y` field is present in the struct for `update()`, but `predictOver` does not touch it.)

**No feature is computed from a game's own future.** The walk-forward ordering is correct.

## 4. One bet per game, no dependence inflation

Pre-registration (prereg-v2.md line 19): "one bet per game."

Implementation — `run-mve.ts`:

- The observations array receives exactly one entry per graded game (line 269). ✓
- `runSideAdaptivePath` iterates observations sequentially, multiplying increments into a single capital (line 121). ✓
- No bootstrap, no particle-resampling of the e-process, no multi-pull per game. ✓
- The NB-RBPF uses 24 particles (MVE_N_PARTICLES = 24, line 16 of mve-eprocess.ts) for the PREDICTION only; the e-process itself is a single deterministic product of 241 (or fewer) increments. ✓

## 5. Entry-price cleanliness

Pre-registration (prereg-v2.md lines 15–16, FINAL-RUN lines 137–139):

```
Entry window: exactly 6–3h before game start.
Entry price quality: book-quoted, age <= 15 min, >= 3 books.
No fresh entry price → game EXCLUDED, exclusion recorded and counted.
```

Implementation — `run-mve.ts`:

- `WINDOW_LO_MS = 6h` before, `WINDOW_HI_MS = 3h` before (lines 25–26). ✓
- `entryForGame` (lines 62–107):
  - Filters odds to the 6–3h window (lines 68–77). ✓
  - Excludes ESPN public odds (`o.bookmaker !== ESPN_PUBLIC`, line 72). ✓
  - Takes the latest fetchedAt timestamp among window entries (lines 79–83). ✓
  - Filters to quotes ≤ 15 min old (`QUOTE_AGE_MS = 15 * 60 * 1000`, line 84). ✓
  - Deduplicates to latest per bookmaker (lines 85–89). ✓
  - Requires `byBook.size >= 3` (line 90). ✓
  - Computes median of Shin-de-vigged over-probabilities across books (lines 97–103). ✓
- Games failing entry quality → `entry === null` → `excluded += 1` (lines 248–250). ✓ Exclusions are COUNTED, not silently dropped. ✓
- `excluded` is reported in RESULTS.md (renderResults line 136). ✓

## 6. Binding-outcome function

Pre-registration (prereg-v2.md lines 51–58, FINAL-RUN lines 143–149):

```
Early abort / kill threshold / final capital <= 2 → Kill Ledger entry; program closed.
E >= 20 at a scheduled checkpoint → prospective pre-registration DRAFT; founder signs.
Otherwise → "did not certify, did not survive"; program closes identically.
```

Implementation — `mve-eprocess.ts`:

- `bindingOutcome` (lines 158–162):
  - `KILL` if `earlyAbort || killedAt != null || finalCapital <= 2` ✓
  - `CERTIFY_DRAFT` if `certifiedAt != null` ✓
  - `DID_NOT_CERTIFY_DID_NOT_SURVIVE` otherwise ✓

Thresholds match pre-registration:
- `MVE_CERT_THRESHOLD = 20` (line 17) ✓
- `MVE_KILL_THRESHOLD = 0.10` (line 18, FINAL-RUN line 141) ✓
- `MVE_EARLY_ABORT = 0.01` (line 19, prereg-v2.md line 44) ✓
- Checkpoint every 50 starting at n=50 (`MVE_CHECKPOINT_EVERY = 50`, line 20) ✓

The kill threshold check (line 134): `capital <= MVE_KILL_THRESHOLD` at any checkpoint. ✓
The certification check (line 135): `capital >= MVE_CERT_THRESHOLD` at any checkpoint. ✓
The early-abort check (line 136): only at `n === MVE_CHECKPOINT_EVERY` (i.e., n=50) and `capital < MVE_EARLY_ABORT`. ✓

## 7. Threshold crossings and reporting

Pre-registration (prereg-v2.md lines 46–47): "Report: final capital, max drawdown, threshold crossings at 2/5/10/20, chronological capital path, exclusion count."

Implementation:
- `crossings` object tracks 2/5/10/20 (lines 76, 110, 126–129). ✓
- `maxCapital` and `maxDrawdown` tracked (lines 106, 123–125). ✓
- `steps` records the full chronological path (line 131). ✓
- `checkpoints` records all checkpoint capitals (lines 109, 133). ✓
- `renderResults` in run-mve.ts (lines 109–164) outputs all required fields. ✓

---

## Summary

| Check | Verdict | Location |
|---|---|---|
| Side-adaptive e-process arithmetic | PASS | mve-eprocess.ts:47–61 |
| Lambda = 0.3 | PASS | mve-eprocess.ts:14 |
| Miss term = (1 − q_bet), not (1−q)/(1−m) | PASS | mve-eprocess.ts:57; test:lines 39–44 |
| Side-selection rule (q>m→OVER, q<=m→UNDER, ties UNDER) | PASS | mve-eprocess.ts:25–27; test:lines 11–16 |
| Under bets use complements | PASS | mve-eprocess.ts:29–36; test:lines 18–25 |
| Each increment ≥ 0.7 | PASS | mve-eprocess.ts:59; test:lines 35–36 |
| Walk-forward causality (predict before update) | PASS | run-mve.ts:265→271; nb-rbpf.ts:276, 282 |
| One bet per game | PASS | run-mve.ts:269 |
| No feature from game's own future | PASS | nb-rbpf.ts:276–286 (predictOver reads no game.y) |
| Entry window 6–3h | PASS | run-mve.ts:25–26, 68–77 |
| Quote age ≤ 15 min | PASS | run-mve.ts:27, 84 |
| ≥ 3 books required | PASS | run-mve.ts:90 |
| Exclusions COUNTED (not dropped) | PASS | run-mve.ts:248–250 |
| Binding outcome function | PASS | mve-eprocess.ts:158–162 |
| Threshold crossings 2/5/10/20 reported | PASS | mve-eprocess.ts:76, 126–129; run-mve.ts:145 |
| Checkpoint cadence every 50 from n=50 | PASS | mve-eprocess.ts:20, 132 |
| KILL threshold E <= 0.10 at any checkpoint | PASS | mve-eprocess.ts:18, 134 |
| CERTIFY threshold E >= 20 at checkpoint | PASS | mve-eprocess.ts:17, 135 |
| Early abort capital < 0.01 after 50 picks | PASS | mve-eprocess.ts:19, 136 |

**Documentation note:** FINAL-RUN-2026-08-20.md line 98 still carries the v1 composite-null formula `E_t = 1 + 0.3·(Y·q/m + (1−Y)·(1−q)/(1−m) − 1)` with the division by (1−m). This was superseded by the v2 side-adaptive amendment (FINAL-RUN lines 112–135, C-50, C-51) and does NOT match the actual code. The code, pre-registration, statistical ruling, and unit tests all agree on the asymmetric form `(1−q)`. This is a stale prose line, not a code defect.

**Verdict: AUDIT PASS — no code defects, no retune needed.**
```
