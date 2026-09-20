# HANDOFF TO A TESTING AGENT — edge-inadmissibility certificate (N1)

**From:** Hermes · **Date:** 2026-09-15 · **Status of the code:** implemented, unit-tested,
**not yet fitted to real data.**

## Why you are being asked, and not me

I cannot complete N1 on this host, for three concrete reasons — none of them "it was hard":

1. **No package installs.** Law 7 forbids them. `pdftotext`, `pypdf`, `pdfminer`, `fitz` are all
   absent, which is why I wrote a zlib-based PDF extractor to read the source papers at all.
2. **No repository test run.** `npm install` cannot complete here (npm's rename-over-directory
   fails with `ENOTEMPTY, errno -39`; tarballs drop with `ECONNRESET`; long processes are killed
   at ~180 s). So the TS side of this cannot be executed by me.
3. **No database access — by rule.** The standing laws say an agent must never touch a database.
   N1's calibration constants live in the production odds archive. I did not query it, and I am
   not asking you to break that rule either: run these as **SELECT-only**, on a read-only role.

## What is already done and verified

- `inadmissibility.py` — the criterion, with the derivation in the module docstring.
- `test_inadmissibility.py` — **18 assertions, all green**, including:
  - a positive control that the fitter recovers a known `(s, α)` to 1e-9;
  - a fixture that must be held (tight market, long window) and one that must be admitted
    (wide market, near kickoff);
  - the arithmetic identity `threshold = vig_half + z·σ` checked on the returned object;
  - a negative control proving the harness itself can record a failure.
- Run it: `python3 test_inadmissibility.py` → `PASS=18 FAIL=0`, exit 0.

**What is NOT done:** `s` and `α` are still unset. The module deliberately refuses to assume them.

## Step 1 — measure α and s (this is the whole job)

The criterion needs `σ_move(τ) = s·τ^α`, where τ is hours to kickoff and σ is the standard
deviation of the **de-vigged consensus** fair probability over that window.

The archive to use (per ledger C-37 / C-62, read-only):
- `odds` — append-only price history, ~1.37M rows; every refresh INSERTs, nothing overwrites,
  so the intraday path is reconstructible.
- `odds_line_snapshots` — ~37k rows with OPEN/INTERIM/CLOSE phase tagging.

SELECT-only sketch (adapt names to the live schema; do **not** run writes):

```sql
-- one row per (game, lead-time bucket): the de-vigged consensus probability
-- and how much it moves over the next bucket
SELECT g."commenceTime",
       o."capturedAt",
       EXTRACT(EPOCH FROM (g."commenceTime" - o."capturedAt")) / 3600.0 AS tau_hours,
       -- de-vig the two-way pair you reconstruct from the same capture
       (1.0 / o."homeDecimal") / ((1.0/o."homeDecimal") + (1.0/o."awayDecimal")) AS p_home_fair
FROM ...   -- join odds captures to games
WHERE o."capturedAt" < g."commenceTime"
ORDER BY g.id, o."capturedAt";
```

Then, for a set of lead-time buckets τ ∈ {1, 2, 4, 8, 16, 24, 48, 72} h, compute the sd of the
*change* in `p_home_fair` across that bucket, and fit:

```python
from inadmissibility import fit_similarity
s_hat, alpha_hat = fit_similarity(taus, sigmas)
```

**Acceptance for step 1:** α recovered with a fit you can defend (report n, and the residual
scatter). Publish the number even if it is far from 0.5 — a measured α ≠ 0.5 is a finding about
the market, not a failed fit.

## Step 2 — test the four falsifiable predictions in `SPEC.md`

| # | prediction | how it dies |
|---|---|---|
| 1 | α ≈ 0.5 | measured α far from 0.5 *and* unstable across sports |
| 2 | certificate is **conservative**: picks it holds beat the close **at or below** the all-pick rate | held picks beat the close more often than admitted ones |
| 3 | certificate is **not vacuous**: it admits the wide-market/short-window tail | it holds (almost) everything |
| 4 | α is stable across sports | α swings wildly by sport with no microstructural story |

Prediction 2 is the one that matters. It needs settled picks joined to realised CLV:

```sql
-- beat-close rate split by certificate verdict (computed offline from the fitted s, alpha)
SELECT verdict, COUNT(*) AS n,
       AVG(CASE WHEN beat_close THEN 1.0 ELSE 0 END) AS beat_rate
FROM picks_with_certificate
GROUP BY verdict;
```

## Step 3 — port to TypeScript, if step 2 survives

Only if prediction 2 holds. Then mirror `inadmissibility.py` into the prediction engine,
**additive**, with the same test names so the proofs carry over. Do not touch a gate, a floor,
or `MODEL_VERSION`.

## Two things to be careful about

- **Do not lower a floor or flip a flag to make a number look better.** If the certificate is
  not conservative, that is the result.
- **Do not resurrect the "odds vorticity" analogy** from a 2026-09-13 note. It was a metaphor,
  not a mechanism; it is retired in `SPEC.md` §0. If you find yourself building a fluid-dynamics
  story about prices, stop and re-read that section.
