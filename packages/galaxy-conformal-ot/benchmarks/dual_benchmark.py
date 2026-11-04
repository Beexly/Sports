"""
Dual-benchmark runner (SYNTHETIC validation harness).

Simulates a system drifting toward a tipping point (AR(1) coefficient ramps toward 1,
variance grows) versus stable controls. Compares:
  - baseline: naive fixed threshold on |x| (stand-in for static alerting)
  - galaxy: AdversarialSchrodingerActiveHazardEngine (CSD + SB + EFE + conformal gate)
Reports false-alarm rate on stable windows and detection rate on pre-transition windows.

The same code path serves both "domains" via different parameters. Results are
SYNTHETIC and prove only that the pipeline behaves as designed. They are NOT evidence
of sports-injury or clinical performance. Real-data loaders below must be filled in
with Big Data Bowl / nflverse and PhysioNet-MIMIC data (credentialed access) first.
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from galaxy_conformal_ot import AdversarialSchrodingerActiveHazardEngine  # noqa: E402

N = 5
HOMEO = np.full(N, 1.0 / N)


def stable_window(rng, n=12, sd=0.2):
    return rng.normal(0, sd, n)


def transitioning_window(rng, n=12, sd=0.2):
    x = np.zeros(n)
    for t in range(1, n):
        phi = 0.2 + 0.78 * t / (n - 1)
        x[t] = phi * x[t - 1] + rng.normal(0, sd * (1 + t / 4))
    return x


def loads(rng, stressed):
    if not stressed:
        return HOMEO.copy(), np.clip(HOMEO + rng.normal(0, 0.01, N), 0.01, None)
    tgt = np.array([0.45, 0.25, 0.15, 0.10, 0.05]) + rng.normal(0, 0.01, N)
    return HOMEO.copy(), np.clip(tgt, 0.01, None)


def evaluate(domain, seed, alpha=0.05, trials=300, noise=0.2):
    rng = np.random.default_rng(seed)
    engine = AdversarialSchrodingerActiveHazardEngine(alpha_false_alarm_bound=alpha)
    amb = np.full(N, 0.2)

    def run(win, stressed, cal):
        src, tgt = loads(rng, stressed)
        return engine.evaluate_phase_transition_warning(
            win, noise ** 2, src, tgt, HOMEO, amb, cal)

    # calibration set: composite hazard on held-out stable windows
    cal = []
    for _ in range(200):
        r = run(stable_window(rng, sd=noise), False, np.array([1.0] * 20))
        cal.append(r["composite_hazard_score"])
    cal = np.array(cal)

    fa = hit = base_fa = base_hit = 0
    thr = 3 * noise
    for _ in range(trials):
        s, t = stable_window(rng, sd=noise), transitioning_window(rng, sd=noise)
        fa += run(s, False, cal)["phase_transition_alert"]
        hit += run(t, True, cal)["phase_transition_alert"]
        base_fa += bool(np.max(np.abs(s)) > thr)
        base_hit += bool(np.max(np.abs(t)) > thr)
    return {
        "domain": domain, "synthetic": True, "alpha": alpha, "trials": trials,
        "galaxy_false_alarm_rate": fa / trials, "galaxy_detection_rate": hit / trials,
        "baseline_false_alarm_rate": base_fa / trials,
        "baseline_detection_rate": base_hit / trials,
    }


def load_real_sports():  # TODO: Big Data Bowl tracking + nflverse injuries
    raise NotImplementedError("Provide NGS tracking + injury labels; not bundled.")


def load_real_clinical():  # TODO: PhysioNet / MIMIC-IV (credentialed access, DUA)
    raise NotImplementedError("Requires PhysioNet credentialing and DUA.")


if __name__ == "__main__":
    out = [evaluate("sports_22agent_synthetic", 11, noise=0.2),
           evaluate("icu_6organ_synthetic", 23, noise=0.35)]
    print(json.dumps(out, indent=2))
    Path(__file__).with_name("results_synthetic.json").write_text(json.dumps(out, indent=2))
