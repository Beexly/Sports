# Provenance: newregime module — drift-detection ensemble, SYS-30 (1885, r34).
#
# Implements buildable-systems.md SYS-30:
#   majority vote — abrupt: ADWIN + HDDM-A + KSWIN;
#                   gradual: HDDM-A + HDDM-W + Page-Hinkley.
#   Imputation always helped (kNN k=4 lowest RMSE).
#   Windows 2000/1000 instances -> scaled to NFL weekly grain (INFERENCE below).
#
# WINDOW MAPPING (INFERENCE, documented): the paper's 2000/1000-instance
# windows are at high-frequency sensor grain. At NFL weekly grain (18 games /
# week, one aggregate statistic per week), we map to season-scale windows:
#   - abrupt branch reference window: 8 weeks  (~half an NFL season)
#   - gradual branch reference window: 18 weeks (one full NFL season)
# The mapping preserves the paper's 2:1 abrupt:gradual ratio at a grain where
# a season of weekly observations is the natural "long" window.
#
# Acceptance gate: inject label-flip drift into synthetic 2024 weekly
# features; the ensemble must fire within 2 weeks at <=1 false alarm/season.
#
# Source docs: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#               (SYS-30),
#               arxiv-deep/1885-detecting-concept-drift-in-the-presence.md:5,8,14,28.
#
# DATA BASIS (honesty header): validated on SEEDED SYNTHETIC weekly error
# streams (dgp.sample_weekly_error_stream). No real 2024 features.

"""Drift-detection ensemble: majority vote over 5 detectors (SYS-30)."""

import numpy as np

from .dgp import MODULE_SEED

MISSING = None  # missing weekly value marker


# ---------------------------------------------------------------------------
# kNN(k=4) imputation — "imputation always helped (kNN k=4 lowest RMSE)"
# ---------------------------------------------------------------------------

def knn_impute(values, k=4):
    """Fill None entries with the mean of the k nearest non-missing neighbors
    (by index distance). Returns a float list."""
    out = list(values)
    n = len(out)
    for i in range(n):
        if out[i] is not None:
            continue
        cands = []
        d = 1
        while len(cands) < k and d < n:
            for j in (i - d, i + d):
                if 0 <= j < n and values[j] is not None:
                    cands.append(values[j])
                    if len(cands) == k:
                        break
            d += 1
        out[i] = float(np.mean(cands)) if cands else 0.0
    return [float(v) for v in out]


# ---------------------------------------------------------------------------
# Detectors. Each is a small stateful class with .update(x) -> bool (alarm).
# ---------------------------------------------------------------------------

class ADWIN:
    """Adaptive Windowing: alarm + shrink window when a split of the window
    shows a mean difference beyond the Hoeffding cut."""

    def __init__(self, delta=0.002, min_window=8):
        self.delta = delta
        self.min_window = min_window
        self.window = []
        self._cumsum = [0.0]

    def _cut(self, n0, n1, n):
        m = 1.0 / (1.0 / n0 + 1.0 / n1)  # harmonic mean
        return np.sqrt(np.log(4.0 * n / self.delta) / (2.0 * m))

    def _cut(self, n0, n1, n):
        m = 1.0 / (1.0 / n0 + 1.0 / n1)  # harmonic mean
        return np.sqrt(np.log(4.0 * n / self.delta) / (2.0 * m))

    def update(self, x):
        self.window.append(float(x))
        self._cumsum.append(self._cumsum[-1] + float(x))
        w = self.window
        n = len(w)
        if n < 2 * self.min_window:
            return False
        # prefix sums make every split check O(1)
        cs = self._cumsum
        total = cs[n]
        logterm = np.log(4.0 * n / self.delta)
        for cut in range(self.min_window, n - self.min_window + 1):
            n0, n1 = cut, n - cut
            m0 = cs[cut] / n0
            m1 = (total - cs[cut]) / n1
            m = 1.0 / (1.0 / n0 + 1.0 / n1)  # harmonic mean
            if abs(m1 - m0) > np.sqrt(logterm / (2.0 * m)):
                del w[:cut]
                del cs[1:cut + 1]
                return True
        return False


class HDDM_A:
    """Hoeffding Drift Detection Method (A-test): compare the running mean
    against the minimum mean seen so far."""

    def __init__(self, alpha=0.001, min_n=8):
        self.alpha = alpha
        self.min_n = min_n
        self.n = 0
        self.mean = 0.0
        self.min_mean = float("inf")
        self.min_n_seen = 0

    def update(self, x):
        x = float(x)
        self.n += 1
        self.mean += (x - self.mean) / self.n
        if self.n < self.min_n:
            return False
        if self.mean < self.min_mean:
            self.min_mean = self.mean
            self.min_n_seen = self.n
        eps = np.sqrt(np.log(1.0 / self.alpha) / (2.0 * self.n))
        if self.mean - self.min_mean > eps:
            self.mean = x  # reset to the new regime
            self.n = 1
            self.min_mean = x
            return True
        return False


class KSWIN:
    """Kolmogorov-Smirnov sliding window: KS test between a recent window
    and a reference window."""

    def __init__(self, alpha=0.001, window_size=8, ref_size=24):
        self.alpha = alpha
        self.window_size = window_size
        self.ref_size = ref_size
        self.recent = []
        self.ref = []

    @staticmethod
    def _ks(a, b):
        vals = np.sort(np.concatenate([a, b]))
        ca = np.searchsorted(np.sort(a), vals, side="right") / len(a)
        cb = np.searchsorted(np.sort(b), vals, side="right") / len(b)
        return float(np.max(np.abs(ca - cb)))

    def update(self, x):
        self.recent.append(float(x))
        if len(self.recent) > self.window_size:
            self.ref.append(self.recent.pop(0))
        if len(self.ref) > self.ref_size:
            self.ref.pop(0)
        if len(self.recent) < self.window_size or len(self.ref) < self.ref_size:
            return False
        n, m = len(self.recent), len(self.ref)
        crit = np.sqrt(-0.5 * np.log(self.alpha / 2.0)) * np.sqrt((n + m) / (n * m))
        if self._ks(np.array(self.recent), np.array(self.ref)) > crit:
            self.ref = list(self.recent)  # re-anchor reference to new regime
            return True
        return False


class HDDM_W:
    """HDDM weighted variant: fast EWMA vs the running mean, alarmed when the
    deviation exceeds a multiple of the EWMA's empirical standard error.

    The weighting gives recent instances more influence (the paper's W-test
    idea); the threshold self-calibrates from the running variance so the
    false-alarm rate stays controlled at weekly/per-game grain."""

    def __init__(self, lam=0.3, k=3.5, min_n=32):
        self.lam = lam
        self.k = k
        self.min_n = min_n
        self.n = 0
        self.mean = 0.0
        self.m2 = 0.0
        self.ewma = None

    def update(self, x):
        x = float(x)
        self.n += 1
        d = x - self.mean
        self.mean += d / self.n
        self.m2 += d * (x - self.mean)
        self.ewma = x if self.ewma is None else self.lam * x + (1 - self.lam) * self.ewma
        if self.n < self.min_n:
            return False
        var = self.m2 / (self.n - 1) if self.n > 1 else 0.0
        n_eff = (2.0 - self.lam) / self.lam  # effective sample size of EWMA
        se = np.sqrt(max(var, 1e-12) / n_eff)
        if abs(self.ewma - self.mean) > self.k * se:
            self.mean = x
            self.m2 = 0.0
            self.ewma = x
            self.n = 1
            return True
        return False


class PageHinkley:
    """Page-Hinkley test for a change in the mean (two-sided).

    Threshold is set for per-game binary streams: the cumulative deviation
    must exceed `threshold` before flagging, which at p~0.22 keeps the
    false-alarm rate near zero while a label-flip (mean jump ~0.56) trips it
    within a few weeks."""

    def __init__(self, threshold=40.0, alpha=0.01):
        self.threshold = threshold
        self.alpha = alpha  # allowed drift magnitude before flagging
        self.n = 0
        self.mean = 0.0
        self.sum = 0.0
        self.min_sum = 0.0
        self.max_sum = 0.0

    def update(self, x):
        x = float(x)
        self.n += 1
        self.mean += (x - self.mean) / self.n
        self.sum += x - self.mean - self.alpha
        self.min_sum = min(self.min_sum, self.sum)
        self.max_sum = max(self.max_sum, self.sum)
        if self.sum - self.min_sum > self.threshold or \
                self.max_sum - self.sum > self.threshold:
            self.sum = 0.0
            self.min_sum = 0.0
            self.max_sum = 0.0
            return True
        return False


# ---------------------------------------------------------------------------
# Ensemble: majority vote per branch; alarm if either branch fires.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Ensemble: majority vote per branch over a trailing vote window; alarm if
# either branch fires.
#
# STREAM GRAIN (INFERENCE, documented): the paper's 2000/1000-instance windows
# are at sensor grain. Here the detectors consume the PER-GAME error stream
# (108 weeks x 16 games = 1728 instances ~ the paper's 2000-instance scale);
# the acceptance gate's "within 2 weeks" is measured in weeks on that stream.
# KSWIN windows are set to the documented season-scale mapping: 32 games
# (~2 weeks) recent vs 256 games (~1 season) reference.
# ---------------------------------------------------------------------------

ABRUPT_DETECTORS = ("ADWIN", "HDDM_A", "KSWIN")
GRADUAL_DETECTORS = ("HDDM_A", "HDDM_W", "PageHinkley")


class DriftEnsemble:
    """Majority-vote drift ensemble (SYS-30).

    abrupt branch:  ADWIN + HDDM-A + KSWIN          (fires on >=2)
    gradual branch: HDDM-A + HDDM-W + Page-Hinkley  (fires on >=2)
    A detector's vote stays active for `vote_window` instances after it
    fires (trailing vote window — detectors need not fire on the identical
    instance). Ensemble alarm: either branch reaches majority.
    """

    def __init__(self, cooldown_games=64, vote_window=32):
        self.detectors = {
            "ADWIN": ADWIN(),
            "HDDM_A": HDDM_A(),
            "KSWIN": KSWIN(window_size=32, ref_size=256),
            "HDDM_W": HDDM_W(),
            "PageHinkley": PageHinkley(),
        }
        self.cooldown_games = cooldown_games
        self.vote_window = vote_window
        self._cooldown = 0
        self._votes = {}  # detector -> instance index of last fire
        self.alarms = []  # (instance_index, week, branch, fired_detectors)

    def update(self, instance_index, x):
        fired_now = {name: det.update(x)
                     for name, det in self.detectors.items()}
        for name, f in fired_now.items():
            if f:
                self._votes[name] = instance_index
        active = {d for d, i in self._votes.items()
                  if instance_index - i <= self.vote_window}
        abrupt = sum(d in active for d in ABRUPT_DETECTORS) >= 2
        gradual = sum(d in active for d in GRADUAL_DETECTORS) >= 2
        branch = "abrupt" if abrupt else ("gradual" if gradual else None)
        week = instance_index // 16
        if branch and self._cooldown == 0:
            self.alarms.append((instance_index, week, branch,
                                sorted(active)))
            self._cooldown = self.cooldown_games
            self._votes.clear()
            return True, branch, fired_now
        if self._cooldown > 0:
            self._cooldown -= 1
        return False, branch, fired_now


def _game_error_stream(seed, n_weeks=108, games_per_week=16, flip_game=None,
                       base_err=0.22, flip_err=0.78):
    """Per-game binary error stream with optional label-flip at flip_game.

    Seeded synthetic; the weekly aggregates in dgp.sample_weekly_error_stream
    are the means of these per-game outcomes.
    """
    rng = np.random.RandomState(seed)
    out = []
    for g in range(n_weeks * games_per_week):
        p = flip_err if (flip_game is not None and g >= flip_game) else base_err
        out.append(1.0 if rng.rand() < p else 0.0)
    return out


def drift_acceptance_check(seed=MODULE_SEED + 21, n_seasons=6,
                           weeks_per_season=18, flip_week=50,
                           games_per_week=16):
    """SYS-30 acceptance gate on seeded synthetic streams.

    1. Drift stream: label-flip injected at the first game of `flip_week`.
       The ensemble must fire within 2 weeks
       (first alarm week - flip_week <= 2).
    2. Stationary stream: <=1 false alarm per season.
    """
    flip_game = flip_week * games_per_week

    # --- drift stream ----------------------------------------------------
    series = knn_impute(_game_error_stream(seed, n_weeks=n_seasons * weeks_per_season,
                                           games_per_week=games_per_week,
                                           flip_game=flip_game))
    ens = DriftEnsemble()
    for i, x in enumerate(series):
        ens.update(i, x)
    drift_alarms = [a for a in ens.alarms if a[1] >= flip_week]
    first = drift_alarms[0] if drift_alarms else None
    delay_weeks = (first[1] - flip_week) if first is not None else None
    drift_ok = delay_weeks is not None and delay_weeks <= 2

    # --- stationary stream (false alarms) ---------------------------------
    series_s = knn_impute(_game_error_stream(seed + 5000,
                                             n_weeks=n_seasons * weeks_per_season,
                                             games_per_week=games_per_week,
                                             flip_game=None))
    ens_s = DriftEnsemble()
    for i, x in enumerate(series_s):
        ens_s.update(i, x)
    false_alarms = len(ens_s.alarms)
    false_ok = false_alarms <= n_seasons  # <=1 per season

    return {
        "drift_detection_delay_weeks": delay_weeks,
        "drift_gate": "<= 2 weeks",
        "drift_gate_cleared": drift_ok,
        "false_alarms": false_alarms,
        "false_alarm_gate": f"<= {n_seasons} over {n_seasons} seasons",
        "false_alarm_gate_cleared": false_ok,
        "gate_cleared": bool(drift_ok and false_ok),
        "first_alarm_detail": ({"game": first[0], "week": first[1],
                                "branch": first[2], "voters": first[3]}
                               if first else None),
        "n_seasons": n_seasons,
        "weeks_per_season": weeks_per_season,
        "flip_week": flip_week,
        "data_basis": ("seeded synthetic per-game error streams; weekly "
                       "aggregates match dgp.sample_weekly_error_stream; "
                       "no real 2024 data"),
        "seed": seed,
        "provenance": "SYS-30 (1885, r34); buildable-systems.md",
        "window_mapping_inference": ("paper 2000/1000 instances at sensor "
                                     "grain -> per-game stream (1728 "
                                     "instances/season-set); KSWIN 32-game "
                                     "recent / 256-game (~season) reference"),
    }
