# MOVE-37 code regression ledger (E.11)

Every code-level defect caught across the audit passes (2026-09-14/15), as a
checkable assertion. A future script resubmission in this family should be run
against every row below before being called "ready" — most rows are already
mechanically checkable with `import_construct_probe.py`; the rest are manual
checks noted as such. This does not replace the v4 gate amendment
(`minis-grout-prompt-v4-gate-amendment.md`, which governs family-level
SUPPORTED/killed verdicts) — this ledger is one level lower, at the individual
script's code correctness.

| # | Defect | First caught | Check | Status on this branch |
|---|---|---|---|---|
| 1 | `GradientBoostingRegressor(max_iter=...)` is not a valid constructor call — that kwarg belongs to `HistGradientBoostingRegressor` | `deepseek-irl-sendback-02.md`, re-confirmed independently this pass | `python import_construct_probe.py <file>.py` — exits 1 if present | Still present in `move37_irl_prelec.py` (theorist-verbatim, correctly left unfixed there per the "do not silently fix, document" rule); fixed in the lab's own `move37_irl_cara_fix1.py` |
| 2 | Kick-miss / punt yardline sign flip: `100-yl+8` should be `100-yl-8`; `100-yl-40` should be `100-yl+40` (touchback handling) | `deepseek-irl-sendback-02.md` FATAL 1 | Manual: grep the two exact expressions, confirm the corrected form in any lab execution copy | Present (undocumented as a defect, by design) in the theorist-verbatim `move37_irl_prelec.py`; fixed in `move37_irl_cara_fix1.py`'s header-documented lab fixes |
| 3 | Opponent's win-probability scored on some decision branches instead of the decision-maker's (missing `1-wp` flip) | Gap-scan finding on `deepseek-move37-repair-01.md` | Manual: trace each of the 5 decision branches for a `1-wp` flip where the branch evaluates the opponent's continuation | Fixed in repair-01's onward chain per gap-scan; not independently re-verified against `move37_irl_prelec.py` in this pass — recommend a manual trace before that file's next repair round |
| 4 | ~5-yard conversion-gain constant hardcoded (`np.maximum(yl - 5, 1)`) instead of computed via groupby/mean on the training sample | Gap-scan finding on `move37_irl_prelec.py` | Manual: confirm the constant is assigned from a computed aggregate, not a literal | Fixed in `move37_irl_cara_fix1.py` (`empirical_conversion_gain`, see its own header note); NOT fixed in the theorist-verbatim `move37_irl_prelec.py` (correctly left as documented, not silently patched) |
| 5 | Verdict gate computes N pre-registered criteria but the boolean pass/fail only reads a subset | Original Charge 1 (family-level SUPPORTED verdict); recurred at script level in `move37_irl_cara_fix1.py` (c2 excluded) | `grep -n '"verdict":' <file>.py` then manually confirm every printed `c*_*` criterion appears in the boolean expression | `move37_irl_cara_fix1.py`: fixed this pass (see commit `c0c6468`). `move37_irl_prelec.py`: does not apply — its own verdict field is a static string (`"QUARANTINED_PENDING_REVIEW"`), not a computed gate, so this defect class cannot recur there in its current form |
| 6 | Citation misattribution: real paper, wrong author(s) named, or two citations that are actually one source split in two | `round05-verification-report.md` (5 instances); Charge 6 (DeCaro/Beilock); `repair-03-lab-report.md` (N-41/N-42) | Manual, one external lookup per citation — no mechanical check exists for this | 7+ confirmed instances across the corpus's history; DeCaro/Beilock fix explicitly noted "fix pending" in AGENTS.md as of this pass |
| 7 | "Blocked" data claim with no logged HTTP status/error | Original Charge 4; re-confirmed live in `minis-heavy-work-order-2026-09-14.md` H2 (`player_stats` claimed blocked, no error shown) | Manual: any "blocked" claim must cite the actual failure (status code, exception, or explicit rate-limit response), not just the word "blocked" | Independently reproduced externally this pass: `player_stats`/`snap_counts` are live, current nflverse-data release assets (renamed to `stats_player`/`stats_team` upstream, old tag deprecated but still resolving 200). H2 work order already queues the correct remedy (retry with the exact working release pattern, log the real error if it still fails) |

## What this ledger deliberately does not cover

Family-level statistical verdicts (T3/T7/T9/W1-W8/IRL pass-fail) are governed
by the v4 gate amendment and the family status table in `AGENTS.md`'s MOVE-37
section — this ledger only tracks code-correctness defects (a script that
crashes, silently drops a criterion, or hardcodes something it claims to
compute), which is a narrower and mechanically-checkable slice.
