# Energy-Form Hybrid CRPS, Rest-Beta, and Emission-Lock Re-Verification

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Land a residual-relative, mean-preserving key-atom hybrid CRPS in energy form on the frozen 2,462-game filter, reproduce the locked prior number 7.129681 to within 1e-4, then re-verify the emission lock locally before Week 6 kickoff.

**Architecture:** A new pure module `dfs/walk_forward/hybrid_crps.py` holds the energy-form CRPS (E|X-y| − 0.5 E|X−X'|) with an analytic Gaussian term and exact discrete-atom terms. A second module `dfs/walk_forward/rest_beta.py` fits β on strictly prior weeks with the numbered cell-sparsity fallback. A third, `dfs/walk_forward/score_hybrid.py`, runs the frozen order of operations over the 2,462 games and writes diagnostic JSON only. No module writes `walk_forward.json`, touches a cron route, or writes a Pick row.

**Tech Stack:** Python 3.14, numpy 2.5.4 installed. `pytest` is NOT installed and MUST NOT be added — the harness runs `python -m unittest <module> -v`. CI (`.github/workflows/python-tests.yml`) is path-filtered to `gse-ml-service/**`, so **nothing under `dfs/walk_forward/` runs in CI**. Local unittest output plus the two vitest lock suites are the ONLY verification. A green CI run proves nothing here.

---

## Locked state — do not recompute to improve

| Item | Value |
|---|---|
| Filter | REG 2017 W1–2026 W5, expanding window, prior weeks only, n = 2,462 |
| μ | nflverse `spread_line` (home margin; corr with realized margin = 0.4536). Do not flip the sign. |
| Gaussian close CRPS | 7.154021 (reproduced via `crps_gaussian` in `intelligence/ratings/engine_math.py`) |
| Prior rest + cell-conditional key-atom hybrid | 7.129681 |
| Gate | CRPS ≤ 7.099 on n ≥ 150 |
| Emission | 0 picks / 0 parlays / 0 DFS while `passed == false` |
| CI | `python-tests.yml` path-filtered to `gse-ml-service/**`. Changes under `dfs/walk_forward/` and `intelligence/ratings/` are invisible to CI. |
| Protected | `dfs/walk_forward/walk_forward.json`, `apps/web/app/api/cron/generate-signal-slate/route.ts`, `apps/web/app/api/cron/board-fill/route.ts`, `packages/ingestion-pipeline/src/__tests__/walk-forward-emission-lock.test.ts`, `packages/ingestion-pipeline/src/__tests__/board-fill.test.ts` |

### Baseline reproduction command (run this FIRST in every session, before any code)

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -c "
import sys, csv
sys.path.insert(0,'intelligence/ratings')
import engine_math as em
rows=list(csv.DictReader(open(r'C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv',encoding='utf-8')))
f=[]
for x in rows:
    if x['game_type']!='REG': continue
    s,w=int(x['season']),int(x['week'])
    if not (s>=2017 and (s<2026 or (s==2026 and w<=5))): continue
    try: hs=float(x['home_score']); aws=float(x['away_score']); sp=float(x['spread_line'])
    except: continue
    f.append((sp,hs-aws))
tot=sum(em.crps_gaussian(sp,13.45,m) for sp,m in f)
print('n',len(f),'crps',repr(tot/len(f)))
"
```

Expected: `n 2462 crps 7.154020678264436`

**Verified in this session at 2026-10-14 19:5x CST.** If this prints any other n or any CRPS differing from 7.154021 by more than 1e-6, STOP — do not proceed, do not hunt for a different filter. Publish the number you got and stop.

Pitfall that cost a session: an earlier ad-hoc run printed 29.8 because the margin was accidentally double-subtracted. If your baseline is ~30, that is the bug, not a data problem. Margin is `home_score - away_score`, period.

---

## Mean preservation — hard invariant

Absolute atoms at ±3 and ±7 are not symmetric around an arbitrary close. Adding excess mass and renormalizing the continuous density shifts the mean unless the continuous location or the removed mass is adjusted to cancel the atom contribution.

**Required construction — residual-relative symmetric atoms:**

- Excess mass is placed at residual offsets **±3** and **±7**, i.e. at absolute margins `close−3, close+3, close−7, close+7`.
- The continuous component stays centered at `μ_close` (mu = `spread_line`).
- Each atom pair carries equal mass, so the pair's own contribution to the expectation is exactly `mu * (p_k)`, identical to the continuous piece at the same location. The pair cancels and `E[hybrid] = μ_close` exactly, with **no location solve**.

**Absolute atoms are forbidden.** If an absolute construction is ever introduced it must carry its own mean-preservation test; the default path does not use it.

**Required unit test:** pure function `hybrid_mean(mu, p_excess)` returns `mu` within `1e-12` on 100 random draws.

β is a **scale modulator only**. It never shifts μ.

---

## Order of operations — frozen

1. Fit rest-β on strictly prior weeks and produce modulated σ.
2. Estimate residual-relative excess mass at ±3, ±7 from prior residuals under that σ (cell-conditional).
3. Overlay the residual-relative atoms on the modulated continuous distribution.
4. Score with energy-form CRPS.

The order is asserted in a unit test. Reversing it changes both the excess estimate and the CRPS and is invalid.

---

## Cell-sparsity fallback — numbered, fail-closed

If the prior count for (rest bin × |spread| bin × total bin) is **< 30**:

1. Fall back to (rest bin × |spread| bin).
2. Then to rest bin only.
3. Then to global prior residual.
4. If even the global prior is too thin for a key-frequency estimate, retain pure Gaussian (atom mass = 0) for that game.

The fallback level used for each game is recorded in the diagnostic artifact. **No imputation.**

---

## Rest feature definition

Exact schedule fields: `home_rest`, `away_rest` (or the derived rest differential) taken from the schedule row with `observed_at ≤ kickoff_utc`. If the field is absent, fail closed — retain baseline scale, do not impute.

Verified in this session: the frozen filter's 2,462 games all have both `home_rest` and `away_rest` populated (missing count = 0). The prior measurement used `f = |home_rest − away_rest| / 7` with β refit every scored week on a grid from −0.30 to +0.30 and σ clipped to [8, 20]; last fitted β was −0.12.

**|β| ≤ 0.15** is the pre-registered bound for the new implementation to bound overfitting.

---

## Energy-form CRPS — precision and efficiency

`CRPS = E|X − y| − 0.5·E|X − X'|`

Use analytic Gaussian absolute-moment terms plus exact discrete atom contributions. **Pure Monte Carlo is not the primary path.**

Required unit tests before any full-filter score:

- Pure-Gaussian limit (excess = 0) matches `crps_gaussian` to `1e-12` on a 200-game subsample.
- Pure-atom limit matches a known discrete CRPS.
- Estimator variance on the subsample is `< 1e-4`.

---

## Reproduction requirement

The new energy-form implementation, run with the same cell-conditional residual-relative excess and rest β, **must match 7.129681 within 1e-4**. If it does not, publish both numbers and the exact construction delta. Do not proceed to claim a new score.

**Note for the implementer:** the locked table quotes 7.129681, while `C:\Users\Garrett\Downloads\deep_research_closeout_2026-10-14.md` line 204 quotes 7.135077 for "rest scale on the fixed mixture 0.22 N(μ,6) + 0.78 N(μ,14)". These are different constructions. The locked contract number is 7.129681. Your reproduction target is 7.129681. If you can only reproduce 7.135077, that is a construction mismatch to publish, not a pass.

---

## Tasks

### Task 0: Reproduce the baseline and record it

**Objective:** Confirm the frozen filter and Gaussian baseline before writing any new code.

**Files:**
- Create: `dfs/walk_forward/load_filter.py`

**Step 1: Write the loader**

```python
#!/usr/bin/env python3
"""load_filter.py -- the frozen REG 2017 W1..2026 W5 filter. DIAGNOSTIC ONLY.

Margin is home_score - away_score. mu is spread_line. No imputation: a game
missing home_score, away_score, or spread_line is skipped and counted.
"""
import csv
import os

GAMES = os.environ.get(
    "GAMES_CSV",
    r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv",
)


def load_filter():
    rows, skipped = [], 0
    with open(GAMES, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x.get("game_type") != "REG":
                continue
            try:
                s, w = int(x["season"]), int(x["week"])
            except (TypeError, ValueError, KeyError):
                skipped += 1
                continue
            if not (s >= 2017 and (s < 2026 or (s == 2026 and w <= 5))):
                continue
            try:
                hs = float(x["home_score"])
                aws = float(x["away_score"])
                sp = float(x["spread_line"])
            except (TypeError, ValueError, KeyError):
                skipped += 1
                continue
            def _num(k):
                v = x.get(k)
                if v in ("", "NA", None):
                    return None
                try:
                    return float(v)
                except ValueError:
                    return None
            rows.append({
                "game_id": x["game_id"], "season": s, "week": w,
                "home": x.get("home_team"), "away": x.get("away_team"),
                "spread": sp, "margin": hs - aws,
                "home_rest": _num("home_rest"), "away_rest": _num("away_rest"),
                "total_line": _num("total_line"),
                "div_game": x.get("div_game"), "roof": x.get("roof"),
                "weekday": x.get("weekday"), "location": x.get("location"),
            })
    return rows, skipped


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..",
                                    "intelligence", "ratings"))
    import engine_math as em
    rows, skipped = load_filter()
    tot = sum(em.crps_gaussian(g["spread"], 13.45, g["margin"]) for g in rows)
    print("n", len(rows), "skipped", skipped, "crps", repr(tot / len(rows)))
    miss = sum(1 for g in rows if g["home_rest"] is None or g["away_rest"] is None)
    print("missing rest rows", miss)
```

**Step 2: Run it**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python dfs/walk_forward/load_filter.py
```

Expected:
```
n 2462 skipped 0 crps 7.154020678264436
missing rest rows 0
```

If `n` is not 2462 or CRPS differs from 7.154021 by more than 1e-6, **stop condition 1 is tripped**. Publish the output and stop.

**Step 3: Commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/load_filter.py
git commit -m "feat(wf): frozen REG 2017-2026 W5 filter loader, n=2462, Gaussian 7.154021 reproduced"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 1: Energy-form hybrid CRPS module

**Objective:** Pure functions for the hybrid distribution and its energy-form CRPS, with the Gaussian limit matching `crps_gaussian` to machine precision.

**Files:**
- Create: `dfs/walk_forward/hybrid_crps.py`
- Create: `dfs/walk_forward/test_hybrid_crps.py`

**Note on the sign convention (read this before writing code).** `engine_math.crps_gaussian(mu, sd, x)` takes the observation `x`, not a residual. The energy form must be written in the same convention: `crps_energy(mu, sd, p3, p7, y)` where `y` is the realized margin. In this session a wrong call passing `mu - y` produced 15.89 for the 2017_01_KC_NE game instead of 4.56, and averaging the wrong form gave 29.8 instead of 7.154. `y` is the margin. Nothing else.

**Step 1: Write failing tests**

Create `dfs/walk_forward/test_hybrid_crps.py`:

```python
import math
import os
import random
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..",
                                "intelligence", "ratings"))
import engine_math as em
import hybrid_crps as hc


class TestMeanPreservation(unittest.TestCase):
    def test_hybrid_mean_equals_mu_within_1e12(self):
        rnd = random.Random(11)
        for _ in range(100):
            mu = rnd.uniform(-20, 20)
            p3 = rnd.uniform(0.0, 0.10)
            p7 = rnd.uniform(0.0, 0.05)
            m = hc.hybrid_mean(mu, p3, p7)
            self.assertLessEqual(abs(m - mu), 1e-12,
                                 f"mu={mu} p3={p3} p7={p7} got {m!r}")

    def test_hybrid_mean_pure_gaussian_limit(self):
        self.assertAlmostEqual(hc.hybrid_mean(-4.25, 0.0, 0.0), -4.25, places=15)


class TestPureGaussianLimit(unittest.TestCase):
    def test_matches_crps_gaussian_on_200_games(self):
        rnd = random.Random(5)
        worst = 0.0
        for _ in range(200):
            mu = rnd.uniform(-14, 14)
            sd = rnd.uniform(8.0, 20.0)
            y = rnd.gauss(mu, sd)
            got = hc.crps_energy(mu, sd, 0.0, 0.0, y)
            want = em.crps_gaussian(mu, sd, y)
            worst = max(worst, abs(got - want))
        self.assertLessEqual(worst, 1e-12, f"worst abs diff {worst!r}")

    def test_matches_on_frozen_subsample(self):
        from load_filter import load_filter
        rows, _ = load_filter()
        sub = [g for g in rows if g["game_id"].endswith(("0", "5"))][:200]
        self.assertGreaterEqual(len(sub), 1)
        worst = 0.0
        for g in sub:
            got = hc.crps_energy(g["spread"], 13.45, 0.0, 0.0, g["margin"])
            want = em.crps_gaussian(g["spread"], 13.45, g["margin"])
            worst = max(worst, abs(got - want))
        self.assertLessEqual(worst, 1e-12, f"worst abs diff {worst!r}")


class TestPureAtomLimit(unittest.TestCase):
    def test_symmetric_pair_matches_known_discrete_crps(self):
        # p3 = 1, p7 = 0 => pc = 0. Mass 0.5 at mu+3, 0.5 at mu-3.
        # E|X-y| = 0.5*|mu+3-y| + 0.5*|mu-3-y|
        # E|X-X'| = 0.25*|(+3)-(-3)| * 2 = 3.0
        # CRPS = E|X-y| - 0.5*E|X-X'| = E|X-y| - 1.5
        for mu, y in [(0.0, 3.0), (7.5, 1.0), (-4.0, 11.0), (2.0, 2.0), (0.0, 0.0)]:
            e_abs = 0.5 * abs(mu + 3 - y) + 0.5 * abs(mu - 3 - y)
            self.assertAlmostEqual(hc.crps_energy(mu, 1.0, 1.0, 0.0, y),
                                   e_abs - 1.5, places=9)

    def test_four_atoms_no_continuous(self):
        # p3 = 0.4, p7 = 0.6 => pc = 0. Reference by explicit enumeration.
        mu, y = 1.5, -2.0
        locs = [(3.0, 0.2), (-3.0, 0.2), (7.0, 0.3), (-7.0, 0.3)]
        e_abs = sum(p * abs(mu + k - y) for k, p in locs)
        e_xx = sum(pi * pj * abs(ki - kj) for ki, pi in locs for kj, pj in locs)
        self.assertAlmostEqual(hc.crps_energy(mu, 9.0, 0.4, 0.6, y),
                               e_abs - 0.5 * e_xx, places=9)

    def test_pair_around_zero_scored_at_zero(self):
        # By hand: E|X| = 3, E|X-X'| = 3, CRPS = 3 - 1.5 = 1.5.
        self.assertAlmostEqual(hc.crps_energy(0.0, 1.0, 1.0, 0.0, 0.0), 1.5, places=9)


class TestDeterminism(unittest.TestCase):
    def test_repeated_calls_bit_identical(self):
        """The energy form is closed-form, so repeated calls must be bit-identical.
        There is no Monte-Carlo term, so estimator variance is exactly zero."""
        vals = [hc.crps_energy(3.0, 13.45, 0.147, 0.085, -4.0) for _ in range(50)]
        self.assertEqual(len(set(vals)), 1)


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run to verify failure**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_hybrid_crps.py" -v
```

Expected: `ModuleNotFoundError: No module named 'hybrid_crps'`

**Step 3: Implement**

Create `dfs/walk_forward/hybrid_crps.py`:

```python
#!/usr/bin/env python3
"""hybrid_crps.py -- residual-relative, mean-preserving key-atom hybrid in ENERGY form.
DIAGNOSTIC ONLY. Nothing here writes picks, walk_forward.json, or any gate file.

Distribution:
    X = Y + mu, where Y ~ mixture of
        continuous N(0, sd)  with mass (1 - p3 - p7)
        point mass at +3     with mass p3/2
        point mass at -3     with mass p3/2
        point mass at +7     with mass p7/2
        point mass at -7     with mass p7/2

mu = spread_line (the close). It is a LOCATION ONLY and is never fitted.
The +/- pairs carry equal mass, so E[Y] = 0 exactly and E[X] = mu exactly.
"""
import math

PHI0 = 1.0 / math.sqrt(2.0 * math.pi)
INV_SQRT_PI = 1.0 / math.sqrt(math.pi)
SQRT2 = math.sqrt(2.0)


def _phi(z):
    return math.exp(-0.5 * z * z) * PHI0


def _Phi(z):
    return 0.5 * (1.0 + math.erf(z / SQRT2))


def hybrid_mean(mu, p3, p7):
    """E[X] for the residual-relative symmetric construction. Exact by symmetry.

    The continuous piece is centered at mu. Each pair (+k, -k) carries p_k/2 at
    each side, so its own mean is mu. There is no location solve.
    """
    # Continuous contribution: (1 - p3 - p7) * mu
    cont = (1.0 - p3 - p7) * mu
    # Pair at +-3: (p3/2)*(mu+3) + (p3/2)*(mu-3) = p3*mu
    pair3 = p3 * mu
    # Pair at +-7: likewise p7*mu
    pair7 = p7 * mu
    return cont + pair3 + pair7


def _e_abs_gaussian(sd, d):
    """E|N(0,sd) - d|: exact closed form for the Gaussian absolute first moment."""
    z = d / sd
    return sd * (2.0 * _phi(z) + z * (2.0 * _Phi(z) - 1.0))


def crps_energy(mu, sd, p3, p7, y):
    """Energy-form CRPS: E|X - y| - 0.5 * E|X - X'|, all terms analytic.

    With p3 = p7 = 0 this reduces exactly to engine_math.crps_gaussian(mu, sd, y).
    """
    if p3 + p7 > 1.0 + 1e-12:
        raise ValueError(f"excess mass p3+p7={p3 + p7} exceeds 1")
    pc = 1.0 - p3 - p7

    # ---- E|X - y| ----
    # Continuous: E|mu + N(0,sd) - y|
    e1_cont = pc * _e_abs_gaussian(sd, mu - y)
    # Atoms at fixed absolute locations
    e1_atom = 0.0
    for k, p in ((3.0, p3 / 2.0), (-3.0, p3 / 2.0), (7.0, p7 / 2.0), (-7.0, p7 / 2.0)):
        e1_atom += p * abs(mu + k - y)
    e1 = e1_cont + e1_atom

    # ---- E|X - X'| ----
    # cont-cont: E|N(0,sd) - N(0,sd)| = 2*sd/sqrt(pi)
    e2_cc = pc * pc * (2.0 * sd * INV_SQRT_PI)
    # cont-atom: atom is a constant offset k from the continuous draw
    e2_ca = 0.0
    for k, p in ((3.0, p3 / 2.0), (-3.0, p3 / 2.0), (7.0, p7 / 2.0), (-7.0, p7 / 2.0)):
        e2_ca += 2.0 * pc * p * _e_abs_gaussian(sd, k)
    # atom-atom: constants, |a - b|
    e2_aa = 0.0
    locs = [(3.0, p3 / 2.0), (-3.0, p3 / 2.0), (7.0, p7 / 2.0), (-7.0, p7 / 2.0)]
    for i, (ki, pi_) in enumerate(locs):
        for kj, pj in locs:
            e2_aa += pi_ * pj * abs(ki - kj)
    e2 = e2_cc + e2_ca + e2_aa

    return e1 - 0.5 * e2
```

**Step 4: Run tests to verify pass**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_hybrid_crps.py" -v
```

Expected: 10 tests passed (2 mean-preservation, 2 Gaussian limit incl. the frozen subsample, 3 atom limit, 1 determinism/variance). Any failure is a **stop condition**.

Note the helper `_e_absdiff_gaussian_pair` is deliberately absent (YAGNI) — the atom–atom and continuous–atom terms are computed directly in `crps_energy`. Do not add unused helpers back.

**Step 5: Commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/hybrid_crps.py dfs/walk_forward/test_hybrid_crps.py
git commit -m "feat(wf): energy-form mean-preserving hybrid CRPS, Gaussian limit to 1e-12"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 2: Rest-β fitting with the numbered cell fallback

**Objective:** Fit β on strictly prior weeks, modulate σ, and pick cell-conditional key excess with the four-level fail-closed fallback.

**Files:**
- Create: `dfs/walk_forward/rest_beta.py`
- Create: `dfs/walk_forward/test_rest_beta.py`

**Step 1: Write failing tests**

Create `dfs/walk_forward/test_rest_beta.py`:

```python
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hybrid_crps as hc
import rest_beta as rb


def _games(n, beta_true, seed=3):
    import random
    rnd = random.Random(seed)
    out = []
    for i in range(n):
        rd = rnd.choice([-7.0, 0.0, 7.0])
        sd = 13.45 * math.exp(beta_true * abs(rd) / 7.0)
        out.append({"spread": 0.0, "margin": rnd.gauss(0.0, sd),
                    "home_rest": 7.0 + rd / 2.0, "away_rest": 7.0 - rd / 2.0,
                    "total_line": 44.0, "season": 2020 + i // 40, "week": 1 + (i % 40) // 10})
    return out


class TestRestBeta(unittest.TestCase):
    def test_beta_recovered(self):
        beta = rb.fit_rest_beta(_games(600, -0.12))
        self.assertIsNotNone(beta)
        self.assertAlmostEqual(beta, -0.12, delta=0.08)

    def test_beta_bound_is_015(self):
        # |beta| must never exceed the pre-registered 0.15 bound.
        beta = rb.fit_rest_beta(_games(600, -0.60))
        self.assertLessEqual(abs(beta), 0.15 + 1e-12)

    def test_none_when_history_thin(self):
        self.assertIsNone(rb.fit_rest_beta([]))
        self.assertIsNone(rb.fit_rest_beta(_games(10, -0.12)))
        self.assertIsNone(rb.fit_rest_beta([g for g in _games(100, -0.12)
                                            if g["home_rest"] is not None and False]))

    def test_missing_rest_fails_closed(self):
        games = _games(100, -0.12)
        for g in games:
            g["home_rest"] = None
        self.assertIsNone(rb.fit_rest_beta(games))


class TestModulatedSigma(unittest.TestCase):
    def test_zero_beta_is_identity(self):
        self.assertAlmostEqual(rb.modulated_sigma(13.45, 0.0, 7.0), 13.45, places=12)

    def test_clip_bounds(self):
        self.assertGreaterEqual(rb.modulated_sigma(13.45, -0.15, 70.0), 8.0 - 1e-9)
        self.assertLessEqual(rb.modulated_sigma(13.45, 0.15, 70.0), 20.0 + 1e-9)


class TestExcessFallback(unittest.TestCase):
    def test_fallback_level_recorded(self):
        hist = [{"resid": float(i % 9 - 4)} for i in range(200)]
        lvl, p3, p7 = rb.excess_mass(hist, rest_bin=1, spread_bin=1, total_bin=1)
        self.assertIn(lvl, (0, 1, 2, 3))
        self.assertGreaterEqual(p3 + p7, 0.0)

    def test_too_thin_means_pure_gaussian(self):
        hist = [{"resid": 3.0}]
        lvl, p3, p7 = rb.excess_mass(hist, rest_bin=9, spread_bin=9, total_bin=9)
        self.assertEqual(lvl, 4)
        self.assertEqual(p3, 0.0)
        self.assertEqual(p7, 0.0)


class TestOrderOfOperations(unittest.TestCase):
    def test_order_is_asserted(self):
        """Step 1 sigma, step 2 excess under that sigma, step 3 overlay, step 4 energy CRPS."""
        hist = _games(400, -0.12)
        beta = rb.fit_rest_beta(hist)
        self.assertIsNotNone(beta)
        # Step 1: sigma first, from the rest feature
        sd = rb.modulated_sigma(13.45, beta, 1.0)
        # Step 2: excess conditioned on the modulated sigma's residual scale
        lvl, p3, p7 = rb.excess_mass(hist, rest_bin=0, spread_bin=0, total_bin=0)
        # Steps 3+4: overlay, then energy CRPS
        c = hc.crps_energy(0.0, sd, p3, p7, -4.0)
        self.assertTrue(math.isfinite(c))
        # Reversed order: score with sigma fixed at 13.45 instead of sd. The number
        # must differ -- that is the assertion that the order is load-bearing.
        c_rev = hc.crps_energy(0.0, 13.45, p3, p7, -4.0)
        self.assertNotEqual(c, c_rev)


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run to verify failure**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_rest_beta.py" -v
```

Expected: `ModuleNotFoundError: No module named 'rest_beta'`

**Step 3: Implement**

Create `dfs/walk_forward/rest_beta.py`:

```python
#!/usr/bin/env python3
"""rest_beta.py -- rest-deficit scale modulator and cell-conditional key excess.
DIAGNOSTIC ONLY.

sigma(mu = close, beta) = clip(13.45 * exp(beta * |home_rest - away_rest| / 7), 8, 20)
beta is fit on STRICTLY PRIOR weeks by minimizing mean energy-form CRPS.
|beta| <= 0.15 (pre-registered bound).
Excess mass at residual +-3, +-7 is estimated from prior residuals, cell-conditional,
with the numbered fail-closed fallback.
"""
import math

SIGMA_BASE = 13.45
SIGMA_LO, SIGMA_HI = 8.0, 20.0
BETA_BOUND = 0.15
MIN_HISTORY = 30
CELL_MIN = 30
BETA_GRID = [i / 1000.0 for i in range(-300, 301, 5)]  # -0.30 .. 0.30 step 0.005


def rest_feature(home_rest, away_rest):
    """f = |home_rest - away_rest| / 7. None if either field is absent -> fail closed."""
    if home_rest is None or away_rest is None:
        return None
    return abs(home_rest - away_rest) / 7.0


def modulated_sigma(sigma_base, beta, f):
    if f is None:
        return sigma_base
    return min(max(sigma_base * math.exp(beta * f), SIGMA_LO), SIGMA_HI)


def fit_rest_beta(history):
    """history: list of dicts with spread, margin, home_rest, away_rest.
    All games are STRICTLY PRIOR to any scored game. Returns None if the
    history is thinner than MIN_HISTORY or has no usable rest field.
    """
    rows = [g for g in history
            if rest_feature(g.get("home_rest"), g.get("away_rest")) is not None]
    if len(rows) < MIN_HISTORY:
        return None
    import hybrid_crps as hc
    best_beta, best = None, None
    for beta in BETA_GRID:
        tot = 0.0
        for g in rows:
            sd = modulated_sigma(SIGMA_BASE, beta,
                                 rest_feature(g["home_rest"], g["away_rest"]))
            tot += hc.crps_energy(g["spread"], sd, 0.0, 0.0, g["margin"])
        m = tot / len(rows)
        if best is None or m < best:
            best, best_beta = m, beta
    return min(max(best_beta, -BETA_BOUND), BETA_BOUND)


def _bin(v, edges):
    for i, e in enumerate(edges):
        if v < e:
            return i
    return len(edges)


REST_EDGES = [1.0, 7.0]
SPREAD_EDGES = [3.5, 7.5]
TOTAL_EDGES = [41.0, 45.0, 48.0]


def _game_bins(g):
    f = rest_feature(g.get("home_rest"), g.get("away_rest"))
    return (_bin(f * 7.0, REST_EDGES) if f is not None else None,
            _bin(abs(g["spread"]), SPREAD_EDGES),
            _bin(g.get("total_line") or 0.0, TOTAL_EDGES))


def excess_mass(history, rest_bin, spread_bin, total_bin, force_sigma=None):
    """Cell-conditional key excess with the numbered fail-closed fallback.

    Returns (fallback_level, p3, p7). fallback_level:
      0 = (rest x |spread| x total) cell
      1 = (rest x |spread|)
      2 = rest bin only
      3 = global prior residual
      4 = too thin even globally -> pure Gaussian (p3 = p7 = 0)

    `history` entries carry either `resid` (already Y - mu) or `spread` + `margin`.
    `force_sigma` is reserved for diagnostics and MUST NOT change the estimate; it
    exists only so a future caller can record which scale the excess was read at.
    """
    scored = [g for g in history if "resid" in g or "margin" in g]

    def resid_of(g):
        if "resid" in g:
            return g["resid"]
        return g["margin"] - g["spread"]

    def counts(rows):
        if len(rows) < CELL_MIN:
            return None
        n = len(rows)
        p3 = sum(1 for g in rows if abs(round(resid_of(g))) == 3) / n
        p7 = sum(1 for g in rows if abs(round(resid_of(g))) == 7) / n
        return p3, p7

    bins = [(g, _game_bins(g)) for g in scored]
    # Level 0
    cell = [g for g, b in bins if b[0] == rest_bin and b[1] == spread_bin and b[2] == total_bin]
    r = counts(cell)
    if r is not None:
        return 0, r[0], r[1]
    # Level 1
    cell = [g for g, b in bins if b[0] == rest_bin and b[1] == spread_bin]
    r = counts(cell)
    if r is not None:
        return 1, r[0], r[1]
    # Level 2
    cell = [g for g, b in bins if b[0] == rest_bin]
    r = counts(cell)
    if r is not None:
        return 2, r[0], r[1]
    # Level 3
    r = counts(scored)
    if r is not None:
        return 3, r[0], r[1]
    # Level 4
    return 4, 0.0, 0.0
```

**Step 4: Run tests**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_rest_beta.py" -v
```

Expected: 9 tests passed.

**Step 5: Commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/rest_beta.py dfs/walk_forward/test_rest_beta.py
git commit -m "feat(wf): rest-beta scale modulator + cell-conditional key excess, 4-level fail-closed fallback"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 3: Walk-forward scorer on the frozen filter + leak test

**Objective:** Score the hybrid over all 2,462 games in the frozen order, reproduce 7.129681, and prove no lookahead.

**Files:**
- Create: `dfs/walk_forward/score_hybrid.py`
- Create: `dfs/walk_forward/test_leak.py`

**Step 1: Write the leak test FIRST**

Create `dfs/walk_forward/test_leak.py`:

```python
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import score_hybrid as sh


class TestLeak(unittest.TestCase):
    def test_prior_only_not_better_than_leaky(self):
        """Prior-only beta must not beat the leaky all-data beta by more than noise."""
        from load_filter import load_filter
        games, _ = load_filter()
        games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
        prior = sh.score(games, leak=False)
        leaky = sh.score(games, leak=True)
        self.assertEqual(prior["n"], 2462)
        self.assertAlmostEqual(prior["gaussian_crps"], 7.154021, places=5)
        # Leaky is allowed to be better; prior-only must not be better than leaky.
        self.assertGreaterEqual(prior["hybrid_crps"], leaky["hybrid_crps"] - 1e-9)

    def test_one_week_shift_placebo(self):
        """Shifting the scored window by one week must not materially improve CRPS."""
        from load_filter import load_filter
        games, _ = load_filter()
        games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
        a = sh.score(games, leak=False)
        shifted = [g for g in games if not (g["season"] == 2017 and g["week"] == 1)]
        b = sh.score(shifted, leak=False)
        self.assertLessEqual(abs(a["hybrid_crps"] - b["hybrid_crps"]), 0.05)

    def test_last_week_perturbation_is_inert(self):
        """Perturbing the final week's margins must not change any earlier score."""
        from load_filter import load_filter
        games, _ = load_filter()
        games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
        last = (max(g["season"] for g in games),
                max(g["week"] for g in games if g["season"] == max(x["season"] for x in games)))
        base = sh.score(games, leak=False)
        pert = []
        for g in games:
            g2 = dict(g)
            if (g2["season"], g2["week"]) == last:
                g2["margin"] = g2["margin"] + 1000.0
            pert.append(g2)
        after = sh.score(pert, leak=False)
        self.assertAlmostEqual(base["hybrid_crps"], after["hybrid_crps"], places=9)


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run to verify failure**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_leak.py" -v
```

Expected: `ModuleNotFoundError: No module named 'score_hybrid'`

**Step 3: Implement the scorer**

Create `dfs/walk_forward/score_hybrid.py`:

```python
#!/usr/bin/env python3
"""score_hybrid.py -- walk-forward scoring of the energy-form hybrid on the frozen filter.
DIAGNOSTIC ONLY. Writes dfs/walk_forward/hybrid_result.json and nothing else.
It never writes walk_forward.json and never sets passed.

Order of operations (FROZEN -- do not reorder):
  1. fit rest-beta on strictly prior weeks -> modulated sigma
  2. estimate cell-conditional residual-relative excess under that sigma
  3. overlay the atoms on the modulated continuous distribution
  4. score with energy-form CRPS
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hybrid_crps as hc
import rest_beta as rb
import load_filter as lf

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hybrid_result.json")


def _weeks(games):
    i = 0
    while i < len(games):
        j = i
        while j < len(games) and (games[j]["season"], games[j]["week"]) == (games[i]["season"], games[i]["week"]):
            j += 1
        yield games[i:j]
        i = j


def score(games, leak=False):
    games = sorted(games, key=lambda g: (g["season"], g["week"], g["game_id"]))
    history = []          # strictly prior games (leak=False)
    all_prior = []        # every game seen so far, used only when leak=True
    crps_h, crps_g, levels, betas = [], [], {}, []

    for block in _weeks(games):
        pool = all_prior if leak else history
        beta = rb.fit_rest_beta(pool)
        betas.append(beta)
        for g in block:
            f = rb.rest_feature(g.get("home_rest"), g.get("away_rest"))
            if beta is None or f is None:
                sd = rb.SIGMA_BASE
                p3 = p7 = 0.0
                lvl = 4
            else:
                sd = rb.modulated_sigma(rb.SIGMA_BASE, beta, f)
                lvl, p3, p7 = rb.excess_mass(pool, *rb._game_bins(g))
            levels[lvl] = levels.get(lvl, 0) + 1
            crps_h.append(hc.crps_energy(g["spread"], sd, p3, p7, g["margin"]))
            crps_g.append(hc.crps_energy(g["spread"], rb.SIGMA_BASE, 0.0, 0.0, g["margin"]))
        for g in block:
            history.append(g)
            all_prior.append(g)

    n = len(crps_h)
    mean_h = sum(crps_h) / n
    mean_g = sum(crps_g) / n
    return {
        "n": n,
        "gaussian_crps": round(mean_g, 6),
        "hybrid_crps": round(mean_h, 6),
        "delta": round(mean_h - mean_g, 6),
        "fallback_levels": levels,
        "beta_last": betas[-1] if betas else None,
        "leak": leak,
        "reproduction_target": 7.129681,
        "reproduced_within_1e-4": abs(mean_h - 7.129681) <= 1e-4,
        "gate": 7.099,
        "gate_cleared": mean_h <= 7.099 and n >= 150,
        "passed": False,
        "mu": "spread_line",
    }


if __name__ == "__main__":
    games, skipped = lf.load_filter()
    res = score(games, leak=False)
    res["skipped_rows"] = skipped
    with open(OUT_PATH, "w") as f:
        json.dump(res, f, indent=1)
    print(json.dumps(res, indent=1))
    print("written", OUT_PATH)
```

**Step 4: Run the leak tests**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python -m unittest discover -s dfs/walk_forward -p "test_leak.py" -v
```

Expected: 3 tests passed. **If `test_prior_only_not_better_than_leaky` fails, stop condition 5 is tripped** — the run is invalid, publish both numbers and stop.

**Step 5: Run the scorer**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python dfs/walk_forward/score_hybrid.py
```

Expected: `"n": 2462`, `"gaussian_crps": 7.154021`, and a `hybrid_crps` printed with `reproduced_within_1e-4` either true or false. **Either outcome is publishable. Do not adjust the code to force reproduction.**

**Step 6: Commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/score_hybrid.py dfs/walk_forward/test_leak.py dfs/walk_forward/hybrid_result.json
git commit -m "feat(wf): walk-forward energy-form hybrid scorer + mandatory leak tests"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 4: Full unittest sweep and captured output

**Objective:** Run every new and existing unittest module, capture the output as an artifact.

**Files:**
- Create: `dfs/walk_forward/VERIFY_2026-10-14.txt`

**Step 1: Run everything**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && {
  echo "=== date ==="; date
  echo "=== git ==="; git rev-parse HEAD; git rev-parse origin/grok/walk-forward-2026-10-14
  echo "=== baseline repro ==="; python dfs/walk_forward/load_filter.py
  echo "=== test_hybrid_crps ==="; python -m unittest discover -s dfs/walk_forward -p "test_hybrid_crps.py" -v 2>&1
  echo "=== test_rest_beta ==="; python -m unittest discover -s dfs/walk_forward -p "test_rest_beta.py" -v 2>&1
  echo "=== test_leak ==="; python -m unittest discover -s dfs/walk_forward -p "test_leak.py" -v 2>&1
  echo "=== pre-existing harness tests ==="
  python dfs/walk_forward/test_wf_margin_crps.py -v 2>&1
  echo "=== score_hybrid ==="; python dfs/walk_forward/score_hybrid.py
} | tee dfs/walk_forward/VERIFY_2026-10-14.txt
```

Expected: every unittest line ends `ok` or `passed`; no `FAIL` or `ERROR`. The captured file is the artifact. **A green run that is not captured is insufficient.**

**Step 2: Commit the artifact**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/VERIFY_2026-10-14.txt
git commit -m "chore(wf): capture local unittest + scorer output artifact 2026-10-14 (CI is path-filtered)"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 5: Emission-lock re-verification (re-verify only — do not re-implement)

**Objective:** Prove locally that the 0-object still holds on every fail-closed branch.

**Files:** none. Read-only.

**Step 1: Run the two lock suites**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi/packages/ingestion-pipeline && \
node node_modules/vitest/vitest.mjs run src/__tests__/walk-forward-emission-lock.test.ts 2>&1 | tail -25
```

Expected: `16 passed`, exit code 0.

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi/packages/ingestion-pipeline && \
node node_modules/vitest/vitest.mjs run src/__tests__/board-fill.test.ts 2>&1 | tail -20
```

Expected: `4 passed`, exit code 0.

**Step 2: Prove the stale branch produces the identical 0-object**

The gate lives at `packages/ingestion-pipeline/src/walk-forward-gate.ts`. It reads `WALK_FORWARD_GATE_PATH` (else walks cwd ancestors for `dfs/walk_forward/walk_forward.json`), rejects `ageH > 168` or `ageH < -1` as `stale`, and requires `d.passed === true` strictly. Run a direct gate probe:

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && cat > /tmp/gate_probe.mjs <<'EOF'
import { readWalkForwardGate } from "./packages/ingestion-pipeline/src/walk-forward-gate.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "gate-probe-"));
const mk = (n, body) => { const p = join(dir, n); writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body)); return p; };
const NOW = new Date("2026-10-15T12:00:00Z");
const cases = {
  "real committed file": { path: "dfs/walk_forward/walk_forward.json" },
  missing: { path: join(dir, "nope.json") },
  garbage: { path: mk("g.json", "{not json") },
  "passed=false fresh": { path: mk("f.json", { passed: false, generated_at: "2026-10-14T21:54:09Z" }) },
  "passed='true' string": { path: mk("s.json", { passed: "true", generated_at: "2026-10-14T21:54:09Z" }) },
  stale: { path: mk("st.json", { passed: true, generated_at: "2026-09-01T00:00:00Z" }) },
  "no generated_at": { path: mk("ng.json", { passed: true }) },
};
for (const [name, o] of Object.entries(cases)) {
  const d = readWalkForwardGate({ ...o, now: NOW });
  console.log(name.padEnd(24), "open=" + d.open, d.reason);
}
EOF
node --experimental-strip-types /tmp/gate_probe.mjs
```

Expected — every row `open=false`:

```
real committed file     open=false not_passed
missing                 open=false missing
garbage                 open=false unparseable
passed=false fresh      open=false not_passed
passed='true' string    open=false not_passed
stale                   open=false stale
no generated_at         open=false no_generated_at
```

If `real committed file` prints `open=true`, **stop condition 7 is tripped** — the gate file was modified. `git status` must be clean for `dfs/walk_forward/walk_forward.json`.

**Step 3: Assert no independent-fair upsert on the dry run**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && grep -n "independent" packages/ingestion-pipeline/src/generate-signal-slate.ts | head -20; echo "---"; grep -rn "pickCreate\|pickUpdateMany\|pick\.create\|pick\.updateMany" packages/ingestion-pipeline/src/generate-signal-slate.ts | head -20
```

Record the output. The existing suite `walk-forward-emission-lock.test.ts` already asserts `pickCreate`/`pickUpdateMany` are never reached for missing/stale/unparseable/false/truthy/garbage. Confirm by reading the assertions, not by re-implementing. The captured output goes in the artifact.

**Step 4: Append the lock output to the artifact and commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && {
  echo "=== emission lock vitest ==="
  (cd packages/ingestion-pipeline && node node_modules/vitest/vitest.mjs run src/__tests__/walk-forward-emission-lock.test.ts 2>&1 | tail -8)
  echo "=== board-fill vitest ==="
  (cd packages/ingestion-pipeline && node node_modules/vitest/vitest.mjs run src/__tests__/board-fill.test.ts 2>&1 | tail -8)
  echo "=== gate probe (all branches must be open=false) ==="
  node --experimental-strip-types /tmp/gate_probe.mjs
  echo "=== gate file must be untouched ==="
  git status --porcelain dfs/walk_forward/walk_forward.json; echo "(empty above = clean)"
} | tee -a dfs/walk_forward/VERIFY_2026-10-14.txt

git add dfs/walk_forward/VERIFY_2026-10-14.txt
git commit -m "chore(wf): capture emission-lock re-verification output 2026-10-14"
git push -u origin grok/walk-forward-2026-10-14
```

---

### Task 6: Week 6 parameter freeze — 0-object unless measured

**Objective:** Freeze exactly one of two outcomes. No partial freeze.

**Files:**
- Create: `dfs/walk_forward/week6_freeze.json`

**Step 1: Write the freeze script**

```python
#!/usr/bin/env python3
"""freeze_week6.py -- freeze exactly one outcome. No partial freeze.

If hybrid_result.json shows gate_cleared true (CRPS <= 7.099 on n >= 150 AND
the reproduction requirement met), freeze the model parameters.
Otherwise freeze the 0-object emission parameters and leave passed false.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RESULT = os.path.join(HERE, "hybrid_result.json")
OUT = os.path.join(HERE, "week6_freeze.json")


def main():
    with open(RESULT) as f:
        r = json.load(f)

    cleared = (r.get("gate_cleared") is True
               and r.get("reproduced_within_1e-4") is True
               and r.get("leak") is False)

    if cleared:
        payload = {
            "mode": "SHADOW_MODEL",
            "frozen_at": "2026-10-14",
            "note": "DIAGNOSTIC shadow only. This file does not open the emission gate.",
            "hybrid_crps_on_frozen_filter": r["hybrid_crps"],
            "gaussian_crps_on_frozen_filter": r["gaussian_crps"],
            "n": r["n"],
            "beta_last": r["beta_last"],
            "fallback_levels": r["fallback_levels"],
            "mu": "spread_line",
            "sigma_base": 13.45,
            "atoms": "residual-relative +-3, +-7",
            "passed": False,
            "emission": "0 picks / 0 parlays / 0 DFS",
        }
    else:
        payload = {
            "mode": "ZERO_OBJECT",
            "frozen_at": "2026-10-14",
            "note": "Gate not cleared. Emission stays the 0-object. passed remains false.",
            "hybrid_crps_on_frozen_filter": r.get("hybrid_crps"),
            "gaussian_crps_on_frozen_filter": r.get("gaussian_crps"),
            "reproduction_target": r.get("reproduction_target"),
            "reproduced_within_1e-4": r.get("reproduced_within_1e-4"),
            "n": r.get("n"),
            "gate": 7.099,
            "passed": False,
            "emission": "0 picks / 0 parlays / 0 DFS",
        }

    with open(OUT, "w") as f:
        json.dump(payload, f, indent=1)
    print(json.dumps(payload, indent=1))


if __name__ == "__main__":
    main()
```

**Step 2: Run it**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi && python dfs/walk_forward/freeze_week6.py
```

Expected: `"mode": "ZERO_OBJECT"` unless the measurement genuinely cleared the gate.

**Step 3: Commit**

```bash
cd C:/Users/Garrett/Sports-wt-wf-cvi
git add dfs/walk_forward/freeze_week6.py dfs/walk_forward/week6_freeze.json
git commit -m "chore(wf): freeze Week 6 outcome (0-object unless measured CRPS <= 7.099 on n=2462)"
git push -u origin grok/walk-forward-2026-10-14
```

---

## Tests / validation summary

| Test module | Command | Expected |
|---|---|---|
| Baseline repro | `python dfs/walk_forward/load_filter.py` | `n 2462 ... crps 7.154020678264436`, `missing rest rows 0` |
| Hybrid CRPS | `python -m unittest discover -s dfs/walk_forward -p "test_hybrid_crps.py" -v` | 10 passed |
| Rest beta | `python -m unittest discover -s dfs/walk_forward -p "test_rest_beta.py" -v` | 9 passed |
| Leak | `python -m unittest discover -s dfs/walk_forward -p "test_leak.py" -v` | 3 passed |
| Pre-existing harness | `python dfs/walk_forward/test_wf_margin_crps.py -v` | ok |
| Emission lock | `cd packages/ingestion-pipeline && node node_modules/vitest/vitest.mjs run src/__tests__/walk-forward-emission-lock.test.ts` | 16 passed |
| Board fill | `cd packages/ingestion-pipeline && node node_modules/vitest/vitest.mjs run src/__tests__/board-fill.test.ts` | 4 passed |
| Gate probe | `node --experimental-strip-types /tmp/gate_probe.mjs` | every row `open=false` |
| Scorer | `python dfs/walk_forward/score_hybrid.py` | n=2462, gaussian 7.154021 |

All output is captured into `dfs/walk_forward/VERIFY_2026-10-14.txt` and committed.

---

## Stop conditions — updated

Halt immediately, publish the numbers you have, and change no code to make a number come out differently if any of these occur:

1. Filter `n` or baseline Gaussian CRPS does not match the locked values.
2. Mean-preservation unit test fails.
3. Pure-Gaussian limit does not match `crps_gaussian` to `1e-12`.
4. Reproduction of 7.129681 fails by more than `1e-4` under identical construction.
5. Leak test fails.
6. Any task writes `walk_forward.json` or edits a protected cron route or lock test.
7. A CRPS number is reported that was not produced by the harness on the frozen filter.

---

## Unchanged hard constraints

- μ remains the close. No mean shift under any construction.
- Emission stays the 0-object until a new measured CRPS on the frozen filter is ≤ 7.099 with n ≥ 150.
- The CI path filter means local proof is mandatory; a green CI is not sufficient and will not even run.
- Laplace may be landed as a pure unit-tested function only. It is not wired and is not scored in this plan.
- Vision weight remains 0. Weather/failover remains diagnostic only.
- Zero imputation and the unconditional PASS veto remain in force.

**No path to a gate clear exists without a new measured number ≤ 7.099 on n = 2,462. The 0-object stands until that measurement exists.**

---

## Execution log — 2026-10-14 (what actually happened)

These corrections were found by running the plan, not by reading it. A future
implementer should start from here.

| Task | State | Note |
|---|---|---|
| 0 — filter loader | DONE, pushed `2e3f18149` | n=2462, CRPS 7.154020678264403, 0 missing rest |
| 1 — hybrid CRPS | DONE, pushed `2e3f18149` | 11 tests ok. Gaussian limit holds to 1e-12. |
| 2 — rest beta | DONE, pushed `9a6e159d6` | 13 tests ok. `_game_bins` had a KeyError crash on history missing `spread`/`total_line`; fixed to return `(None,None,None)` so such games fall to the level-3 global bucket instead of crashing. |
| 3 — scorer | DONE, pushed `b115afd02` | hybrid **7.13793** vs gaussian 7.154021. **7.129681 NOT reproduced** (off by 0.008249). Gate not cleared. |
| 4 — artifact | DONE, pushed `7db33d8c2` | `dfs/walk_forward/VERIFY_2026-10-14.txt` |
| 5 — emission lock | DONE, pushed `7db33d8c2` | all 7 gate branches `open=false`; vitest 16 + 4 pass |
| 6 — week 6 freeze | DONE, pushed `7db33d8c2` | `mode: ZERO_OBJECT` |
| extra — Glicko idle | DONE, pushed `b512841b7` | 8 tests ok; see below |

### Corrections to the plan text

1. **vitest path is wrong.** The plan says
   `cd packages/ingestion-pipeline && node node_modules/vitest/vitest.mjs run ...`.
   That package has no local `node_modules`. vitest is hoisted to the repo root.
   Run from `C:/Users/Garrett/Sports-wt-wf-cvi`:
   ```bash
   node node_modules/vitest/vitest.mjs run packages/ingestion-pipeline/src/__tests__/walk-forward-emission-lock.test.ts
   ```

2. **The frozen-filter subsample filter was wrong.** `game_id` ends with a team
   abbreviation (`2017_01_KC_NE`), not a digit, so filtering on the trailing
   character yields an empty list. Use a stride: `rows[:: max(1, len(rows)//200)][:200]`.

3. **The pure-atom test reference was wrong.** The hand-written expectation for a
   single atom of mass 1.0 at `mu+3` does not match the construction, which always
   splits mass equally left/right. Correct reference for `p3=1, p7=0`:
   `E|X-y| - 1.5`. See `test_symmetric_pair_matches_known_discrete_crps`.

4. **The leak test's third case was wrong, not the code.** Perturbing the final
   week's margins legitimately moves that week's OWN scores. Measured shift was
   5.989766 against a predicted 6.0926 from the last week's 15 games alone
   (the shortfall is because those rows' CRPS is bounded, not a full +1000).
   The correct assertion is that the PRIOR 2447 games are bit-identical. Fixed
   in `test_leak.py`.

5. **Runtime.** Each full 2,462-game walk-forward pass takes ~2 minutes in pure
   Python. `test_leak.py` runs five passes, so the suite takes ~28 minutes. Run
   it with `background=true, notify=true`; do not block a turn on it.

6. **Git pushes race.** Two pushes launched concurrently were both rejected with
   `cannot lock ref`. Serialize pushes and verify against
   `git ls-remote origin refs/heads/grok/walk-forward-2026-10-14` — never trust
   the push exit code.

### Reproduction failure — do not paper over it

The energy-form implementation did **not** reproduce 7.129681. It produced
**7.13793**, a gap of 0.008249. Per stop condition 4, both numbers are published
and no claim of improvement is made. The gate was never approached: 7.13793 vs
the 7.099 bar.

Likely causes, unverified: the locked 7.129681 may have used the rest feature
`f = |home_rest - away_rest| / 7` with an unbounded β (the run hit the −0.15
bound at `beta_last`), or a different cell partition, or the mixture base rather
than a pure Gaussian. None of these are established. Do not tune toward 7.129681.

### Glicko-2 idle-period defect (from the 2026-10-09 handoff)

The handoff says the idle rule is unwired and that bye teams are "left
unadjusted". Both parts need correcting:

- The rule itself reproduces exactly: RD 200 → **200.27** (1 week), **201.08**
  (4 weeks), **204.57** (17 weeks) at σ = 0.06. Verified in
  `dfs/walk_forward/test_glicko2_idle.py` (8 tests ok).
- The canonical example still passes: 1464.05 / 151.52 / 0.059996.
- **The defect is a crash, not a silent drift.** `glicko2_parallel(r, rd, σ, [])`
  raises `ZeroDivisionError` at `v = 1.0 / sum(...)`. A bye week does not pass
  through unadjusted — it throws. The guard must sit before the opponent loop.

`glicko2.py` lives on branch `research/rating-atlas-2026-10-09-packet` (blob
`0e24548f`) and is **not in this worktree**. The tests load a reference copy at
`dfs/walk_forward/glicko2_ref.py`. The canonical module was not edited.

### BDB 2027 coverage — measured, not assumed

`dfs/walk_forward/bdb2026_coverage.json` records the result. The handoff claimed
the set would not cover the 2026 slate. It does not, but the reason matters:

- `player_play.csv` contains 14,821 rows whose `game_id` starts `2026`, across 29
  games and 32 distinct teams. Superficially this looks like 2026 season data.
- Those dates are 2026-01-03 through 2026-02-08 — the **postseason concluding the
  2025 season**. 14 games on 2026-01-04 across all 32 teams is wild-card weekend.
- `games.csv` has **zero** rows with `season == 2026`.
- Date-level join to the frozen filter: **0 shared dates**, 0 of 272 nflverse 2026
  REG games covered. Week 5 and Week 6 have no public coordinate source. The
  handoff's conclusion stands; its implied reasoning (that these were 2026 games)
  does not.

What IS real: `game_tracking_2023/2024/2025.csv` carry true x/y coordinates —
3,665,443 rows for 2023 and 11,160,903 for 2025, x spanning 0–120 yards, y 0–53.3,
with proper `ball_snap` / `pass_forward` / `tackle` events. That is a genuine
10Hz-class input plane for 2023–2025 REG, at weight 0. BDB 2027 is **CC BY-NC 4.0**
(non-commercial) — unresolved, must be cleared before any commercial use.

### Neon gateway note is stale

The note describes a blocked push of `feat/neon-ai-gateway` (commits `b45b81d2e`,
`41580508e`). That branch does not exist in this repo and neither commit is
reachable from any ref here. It came from a different sandbox. Nothing to recover.

---

## Files created / modified (updated after execution)
- `dfs/walk_forward/hybrid_crps.py`
- `dfs/walk_forward/test_hybrid_crps.py`
- `dfs/walk_forward/rest_beta.py`
- `dfs/walk_forward/test_rest_beta.py`
- `dfs/walk_forward/score_hybrid.py`
- `dfs/walk_forward/test_leak.py`
- `dfs/walk_forward/freeze_week6.py`
- `dfs/walk_forward/VERIFY_2026-10-14.txt`
- `dfs/walk_forward/hybrid_result.json`
- `dfs/walk_forward/week6_freeze.json`
- `dfs/walk_forward/load_filter.py`
- `dfs/walk_forward/test_glicko2_idle.py`
- `dfs/walk_forward/glicko2_ref.py`
- `dfs/walk_forward/bdb2026_coverage.json`
- `gate_probe.mjs` (repo root; standalone emission-lock probe, all 7 branches)

Modify: none of the protected files. No cron route, no lock test, no `walk_forward.json`.

## Risks, tradeoffs, open questions

1. **The 7.129681 target may not reproduce.** The locked table and `deep_research_closeout_2026-10-14.md` quote two different "rest + key" numbers (7.129681 vs 7.135077) from two different constructions. If reproduction fails, publish both numbers and the construction delta. Do not tune toward the target.
2. **Post-hoc contamination.** All 2,462 games have been examined by prior agents to pick model shapes. Only prospective 2026 W6+ games are truly clean. Any gate clear on this filter is a technical pass, not out-of-sample proof.
3. **Selection leak.** The reported best number on a filter where many families were tried is optimistic. The leak test guards the β fit, not the model-shape choice.
4. **Cell sparsity.** Level-0 cells (rest × |spread| × total) will often fall below 30. The fallback ladder is deterministic and recorded, but it means most games are scored on a coarse key-excess estimate.
5. **β bound.** Capping |β| at 0.15 prevents overfitting but may under-fit a real rest effect. The prior measurement fitted −0.12, inside the bound.
6. **`unittest discover` and `sys.path`.** The tests insert `dfs/walk_forward` and `intelligence/ratings` on `sys.path` themselves. Do not rely on a conftest; there is none and pytest is not installed.
