#!/usr/bin/env python3
"""
doctrine.py — THE 19 RULES AS CODE. The gate is code, not a process.
============================================================
Every rule from the founder doctrine gets an enforcement artifact here.
A violation raises. A bypass attempt raises. Nothing is enforced by
docstring. One invented number is still sabotage — the manifest is
hash-locked, the kill ledger is hash-chained, the anchor refuses
anything that is not the Pinnacle close.

Rules → artifacts:
  1  Point-in-time warehouse      -> Warehouse (observed_at stamped, asof())
  2  Pinnacle close as anchor     -> Anchor (source-locked; promote needs gate)
  3  College fit on college rows  -> CollegeGuard (no NFL constants)
  4  PFR surfaces diagnostic      -> FeatureRegistry (role=diagnostic)
  5  FTN fingerprints diagnostic  -> FeatureRegistry (role=diagnostic)
  6  Devig discipline             -> devig() (Shin primary, mult only sub-1)
     + opinion pool weights from calibration ledger, not volume
  7  Injury latency bound         -> LatencyTracker.usable()
  8  Weather/rest = context       -> FeatureRegistry (role=context)
  9  CLV ledger                   -> CLVLedger (promotion requires non-empty)
 10  ADP isolation                -> ADPGuard (head whitelist)
 11  Novig = reference not close  -> Anchor.set_close source lock
 12  Scheme splits diagnostic     -> FeatureRegistry
 13  Coaching features countable  -> FeatureRegistry + KillLedger
 14  Fatigue measured             -> FeatureRegistry (informs live totals only)
 15  Calibration reported         -> FounderGate (n>=100, Brier<=0.22, ECE<=0.05, 3 green)
 16  Kill ledger append-only      -> KillLedger (hash-chained JSONL, no delete)
 17  Latency measured advantage   -> LatencyTracker
 18  Variance tested not assumed  -> propose_sigma (needs gate verdict)
 19  Honesty gate unbypassable    -> HonestyGate (SHA-frozen walk-forward manifest)

stdlib only. No network. No side effects at import.
"""
from __future__ import annotations
import hashlib, json, math, os, time
from dataclasses import dataclass, field
from datetime import datetime, timezone

UTC = timezone.utc
TOL = 1e-9


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def now() -> float:
    return time.time()


def parse_ts(x) -> float:
    """Accept epoch seconds or ISO-8601 ('2026-10-10T13:00:00Z')."""
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace("Z", "+00:00")
    return datetime.fromisoformat(s).timestamp()


def sha(obj) -> str:
    if isinstance(obj, str):
        return hashlib.sha256(obj.encode()).hexdigest()
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()


# ----------------------------------------------------------------------------
# Gaussian CRPS (closed form) — the metric the gate speaks
# ----------------------------------------------------------------------------
def _norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _norm_pdf(z: float) -> float:
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def crps_gaussian(mu: float, sigma: float, x: float) -> float:
    """Closed-form CRPS of N(mu, sigma) against observation x."""
    if sigma <= 0:
        raise ValueError("sigma must be positive")
    z = (x - mu) / sigma
    return sigma * (z * (2.0 * _norm_cdf(z) - 1.0) + 2.0 * _norm_pdf(z) - 1.0 / math.sqrt(math.pi))


# ----------------------------------------------------------------------------
# RULE 1 — point-in-time warehouse: every row stamped observed_at,
# asof(t) can only see observed_at <= t. Future leak = impossible by API.
# ----------------------------------------------------------------------------
class Warehouse:
    def __init__(self, name: str):
        self.name = name
        self._rows: list[dict] = []

    def append(self, row: dict, observed_at) -> dict:
        obs = parse_ts(observed_at)                      # raises if absent/unparseable
        r = dict(row)
        r["observed_at"] = obs
        self._rows.append(r)
        return r

    def asof(self, t) -> list[dict]:
        """The ONLY read path. Decision time t sees observed_at <= t. Never else."""
        tt = parse_ts(t)
        return [r for r in self._rows if r["observed_at"] <= tt]

    def raw(self):
        """Physical store access — tagged raw; any model read must go through asof()."""
        return list(self._rows)

    def __len__(self):
        return len(self._rows)


# ----------------------------------------------------------------------------
# RULE 15 — founder gate on calibration metrics
# ----------------------------------------------------------------------------
@dataclass
class FounderGate:
    """Rule 15: n >= 100, Brier <= 0.22, ECE <= 0.05, three consecutive green runs.
    Metrics are reported here; flipping a production gate requires green_runs >= 3."""
    n_min: int = 100
    brier_max: float = 0.22
    ece_max: float = 0.05
    green_needed: int = 3
    history: list = field(default_factory=list)   # [(ts, n, brier, ece, green)]

    def report(self, n: int, brier: float, ece: float) -> bool:
        green = (n >= self.n_min and brier <= self.brier_max and ece <= self.ece_max)
        self.history.append((now(), n, brier, ece, green))
        return green

    @property
    def green_runs(self) -> int:
        """Consecutive green runs counting back from the latest."""
        c = 0
        for rec in reversed(self.history):
            if rec[4]:
                c += 1
            else:
                break
        return c

    def can_flip_production(self) -> bool:
        return self.green_runs >= self.green_needed


# ----------------------------------------------------------------------------
# RULE 19 — the honesty gate: SHA-frozen walk-forward manifest.
# No production scoring path accepts a model change unless it beats the
# current Gaussian-close CRPS on the frozen, walk-forward list.
# ----------------------------------------------------------------------------
@dataclass
class Verdict:
    verdict: str            # PROMOTED | REFUSED
    gate_id: str
    candidate_sha: str
    manifest_sha: str
    baseline_crps: float
    candidate_crps: float
    n_folds: int
    detail: dict = field(default_factory=dict)


class HonestyGate:
    """Freezes the walk-forward list at construction: sha256 over its canonical
    JSON. Every verdict embeds that sha; tampering with the list voids all
    verdicts. There is no method that forces a PROMOTED verdict."""

    def __init__(self, walk_forward: list[dict], gate_id: str = "gate_v1"):
        # each fold: {"fold_id": str, "decision_t": ts, "outcome": float,
        #             "close_mu": float, "close_sigma": float}
        self.gate_id = gate_id
        self._manifest = sorted(walk_forward, key=lambda f: f["fold_id"])
        self.manifest_sha = sha(self._manifest)
        self._baseline_cache: dict = {}

    def manifest_intact(self) -> bool:
        return sha(self._manifest) == self.manifest_sha

    def _validate_manifest(self):
        if not self.manifest_intact():
            raise RuntimeError("HONESTY GATE VOID: walk-forward manifest was modified")

    def evaluate(self, candidate) -> Verdict:
        """candidate: object with predict(fold) -> (mu, sigma) on the frozen folds."""
        self._validate_manifest()
        base_crps, cand_crps, n = 0.0, 0.0, 0
        detail = {}
        for fold in self._manifest:
            mu_c, sig_c = candidate.predict(fold)
            mu_b, sig_b = fold["close_mu"], fold["close_sigma"]
            b = crps_gaussian(mu_b, sig_b, fold["outcome"])
            c = crps_gaussian(mu_c, sig_c, fold["outcome"])
            base_crps += b
            cand_crps += c
            detail[fold["fold_id"]] = round(b - c, 6)
            n += 1
        base_crps /= n
        cand_crps /= n
        promoted = cand_crps < base_crps and cand_crps > 0 and n > 0
        v = Verdict(
            verdict="PROMOTED" if promoted else "REFUSED",
            gate_id=self.gate_id,
            candidate_sha=sha(getattr(candidate, "identity", lambda: candidate)()),
            manifest_sha=self.manifest_sha,
            baseline_crps=base_crps,
            candidate_crps=cand_crps,
            n_folds=n,
            detail=detail,
        )
        # a verdict is only valid while the manifest stays frozen
        if not self.manifest_intact():
            v = Verdict("REFUSED", self.gate_id, v.candidate_sha, v.manifest_sha,
                        v.baseline_crps, v.candidate_crps, v.n_folds,
                        {"void": "manifest modified during evaluation"})
        return v


# ----------------------------------------------------------------------------
# RULE 2 + 11 — the Anchor: mu stays the Pinnacle close until the gate says else.
# ----------------------------------------------------------------------------
class Anchor:
    PINNACLE = "pinnacle"

    def __init__(self, gate: HonestyGate, close_mu: float, close_sigma: float):
        self.gate = gate
        self._mu = float(close_mu)
        self._sigma = float(close_sigma)
        self._source = None
        self.set_close(self.PINNACLE)   # the anchor is born Pinnacle

    def set_close(self, source: str, mu: float | None = None, sigma: float | None = None):
        """Rule 11: the close can ONLY come from Pinnacle. Novig/consensus/anything
        else is a reference, never the close — this refuses it physically."""
        if source != self.PINNACLE:
            raise ValueError(f"REFUSED: '{source}' is not the close. Only 'pinnacle' may "
                             f"anchor mu (rule 2/11). {source} = reference/diagnostic only.")
        if mu is not None:
            self._mu = float(mu)
        if sigma is not None:
            self._sigma = float(sigma)
        self._source = source

    @property
    def mu(self):
        return self._mu

    @property
    def sigma(self):
        return self._sigma

    @property
    def source(self):
        return self._source

    def propose_mu(self, candidate, verdict: Verdict) -> Verdict:
        """Rule 2: refuse any replacement of the close until the evidence is in —
        a PROMOTED verdict from THIS gate, on an INTACT manifest, covering THIS
        exact candidate (the verdict's sha binds the proposed number: an
        invented number has no verdict)."""
        if not self.gate.manifest_intact():
            raise RuntimeError("REFUSED: gate manifest no longer intact (rule 19)")
        if verdict.verdict != "PROMOTED":
            raise ValueError(f"REFUSED: candidate {getattr(candidate, 'name', candidate)} "
                             f"did not beat the close on the frozen walk-forward list (rule 2)")
        if verdict.gate_id != self.gate.gate_id:
            raise ValueError("REFUSED: verdict not issued by this gate")
        if verdict.manifest_sha != self.gate.manifest_sha:
            raise ValueError("REFUSED: verdict forged against a different manifest")
        if verdict.candidate_sha != sha(candidate.identity()):
            raise ValueError("REFUSED: verdict does not cover this candidate (invented number?)")
        self._mu = float(candidate.mu)
        self._source = f"model:{getattr(candidate, 'name', 'candidate')}"
        return verdict

    def propose_sigma(self, candidate, verdict: Verdict) -> Verdict:
        """Rule 18: a model that improves CRPS on the locked set can PROPOSE a new
        sigma; it cannot invent one. Same verdict discipline as mu."""
        if verdict.verdict != "PROMOTED" or not self.gate.manifest_intact():
            raise ValueError("REFUSED: sigma proposals require a PROMOTED gate verdict "
                             "on the intact manifest (rule 18)")
        if verdict.candidate_sha != sha(candidate.identity()):
            raise ValueError("REFUSED: verdict does not cover this sigma proposal")
        self._sigma = float(candidate.sigma)
        return verdict


# ----------------------------------------------------------------------------
# RULE 16 — kill ledger: append-only, hash-chained, nothing deleted.
# ----------------------------------------------------------------------------
class KillLedger:
    """Every failed candidate feature recorded with test, result, reopen condition.
    No delete. No edit. Hash chain makes silent rewriting detectable."""

    def __init__(self, path: str | None = None):
        self.path = path
        self._entries: list[dict] = []
        self._prev_sha = "GENESIS"
        if path and os.path.exists(path):
            with open(path) as f:
                for line in f:
                    e = json.loads(line)
                    self._entries.append(e)
                    self._prev_sha = e["chain_sha"]

    def record(self, feature: str, test: str, result: str, reopen_condition: str,
               note: str = "") -> dict:
        e = {
            "ts": now(),
            "feature": feature,
            "test": test,
            "result": result,
            "reopen_condition": reopen_condition,
            "note": note,
            "prev_sha": self._prev_sha,
        }
        e["chain_sha"] = sha(e)
        self._entries.append(e)
        self._prev_sha = e["chain_sha"]
        if self.path:
            with open(self.path, "a") as f:
                f.write(json.dumps(e, sort_keys=True, default=str) + "\n")
        return e

    def why(self, feature: str) -> list[dict]:
        return [e for e in self._entries if e["feature"] == feature]

    def verify_chain(self) -> bool:
        prev = "GENESIS"
        for e in self._entries:
            body = {k: v for k, v in e.items() if k != "chain_sha"}
            if sha(body) != e["chain_sha"] or e["prev_sha"] != prev:
                return False
            prev = e["chain_sha"]
        return True

    # NOTE: deliberately NO delete(), NO clear(), NO __delitem__.
    # "Nothing is deleted" is enforced by absence of the verb.


# ----------------------------------------------------------------------------
# RULES 4, 5, 8, 12, 13, 14 — the FeatureRegistry: role-enforced, gate-promoted.
# ----------------------------------------------------------------------------
class FeatureRegistry:
    """A feature exists in exactly one role:
       'diagnostic'  — never touches the margin head (rules 4,5,12,13,14)
       'context'     — covariate shown alongside, not a coefficient (rule 8)
       'production'  — margin-head input; ONLY reachable via promote() w/ verdict
    margin_head_inputs() is the ONLY way any scoring path discovers its inputs,
    and it returns production rows only. Diagnostic leakage becomes a bug that
    cannot be written, not a warning."""

    ROLES = ("diagnostic", "context", "production")

    def __init__(self, gate: HonestyGate, kill_ledger: KillLedger):
        self.gate = gate
        self.kill_ledger = kill_ledger
        self._features: dict[str, dict] = {}

    def declare(self, name: str, role: str, rule: str = ""):
        if role not in self.ROLES:
            raise ValueError(f"role must be one of {self.ROLES}")
        self._features[name] = {"role": role, "rule": rule, "promoted_by": None}
        return self._features[name]

    def promote(self, name: str, verdict: Verdict):
        f = self._features.get(name)
        if f is None:
            raise KeyError(f"unknown feature {name}")
        if verdict.verdict != "PROMOTED" or not self.gate.manifest_intact() \
                or verdict.gate_id != self.gate.gate_id:
            raise ValueError(f"REFUSED: {name} stays {f['role']} — no valid gate verdict "
                             f"(rules 4/8/12/13/14: diagnostic stays diagnostic until the "
                             f"kill test clears)")
        f["role"] = "production"
        f["promoted_by"] = {"sha": verdict.candidate_sha, "manifest": verdict.manifest_sha}

    def role(self, name: str) -> str:
        return self._features[name]["role"]

    def margin_head_inputs(self) -> list[str]:
        return sorted(n for n, f in self._features.items() if f["role"] == "production")

    def demote_to_kill(self, name: str, test: str, result: str, reopen: str):
        """A promoted feature that later fails re-validation goes back to diagnostic
        AND gets a kill-ledger entry. The next person sees why it was stopped."""
        self._features[name]["role"] = "diagnostic"
        self.kill_ledger.record(name, test, result, reopen, "demoted from production")


# ----------------------------------------------------------------------------
# RULE 6 — devig discipline
# ----------------------------------------------------------------------------
def _shin_q(p: float, z: float, S: float) -> float:
    """Štrumbelj (2014) closed form for Shin implied true prob of one outcome."""
    if z < TOL:
        return p / S
    return (math.sqrt(z * z + 4.0 * (1.0 - z) * p * p / S) - z) / (2.0 * (1.0 - z))


def shin_devig(p1: float, p2: float, iters: int = 200) -> tuple[float, float]:
    """Shin 1993 insider model, two-way. Solve z (insider proportion) so the
    closed-form true probs sum to 1; bisection on z."""
    if not (0 < p1 < 1 and 0 < p2 < 1):
        raise ValueError("implied probabilities must be in (0,1)")
    S = p1 + p2
    lo, hi = 0.0, 0.999
    for _ in range(iters):
        z = (lo + hi) / 2
        s = _shin_q(p1, z, S) + _shin_q(p2, z, S)
        if s > 1.0:      # too little insider drag -> probs too big -> raise z
            lo = z
        else:
            hi = z
    return _shin_q(p1, z, S), _shin_q(p2, z, S)


def devig(p1: float, p2: float) -> tuple[float, float, str]:
    """Rule 6 dispatcher: Shin closed-form on every two-sided market;
    multiplicative fallback ONLY on sub-1 books (sum < 1)."""
    s = p1 + p2
    if s < 1.0 - TOL:
        m1, m2 = p1 / s, p2 / s
        return m1, m2, "multiplicative(sub-1)"
    if s > 1.0:
        d1, d2 = shin_devig(p1, p2)
        return d1, d2, "shin"
    return p1, p2, "shin(fair)"


class CalibrationLedger:
    """Rule 6 (opinion pools): pool weights MUST come from historical calibration,
    not volume. Weights carry provenance; volume-weighted pools refuse to build."""

    def __init__(self):
        self._calib: dict[str, float] = {}

    def record_calibration(self, source: str, score: float):
        """score = historical calibration quality (e.g. log-loss inverted, in [0,1])."""
        self._calib[source] = float(score)

    def pool(self, probs: dict[str, float], weight_basis: str = "calibration") -> float:
        if weight_basis != "calibration":
            raise ValueError("REFUSED: pools are weighted by historical calibration, "
                             "not by volume or anything else (rule 6)")
        missing = set(probs) - set(self._calib)
        if missing:
            raise ValueError(f"REFUSED: no calibration history for {sorted(missing)} — "
                             f"a book without a calibration record gets no vote")
        wsum = sum(self._calib[s] for s in probs)
        return sum(self._calib[s] * p for s, p in probs.items()) / wsum


# ----------------------------------------------------------------------------
# RULES 7 + 17 — latency: report→row measured; after-t rows are worthless.
# ----------------------------------------------------------------------------
class LatencyTracker:
    def __init__(self, hard_bound_s: float | None = None):
        self.hard_bound_s = hard_bound_s
        self._lat: list[float] = []

    def record(self, report_ts, row_observed_at) -> float:
        lat = parse_ts(row_observed_at) - parse_ts(report_ts)
        if lat < 0:
            raise ValueError("row observed BEFORE its public report — timestamp bug, refused")
        if self.hard_bound_s is not None and lat > self.hard_bound_s:
            raise ValueError(f"latency {lat:.0f}s exceeds hard bound {self.hard_bound_s}s "
                             f"(rule 7)")
        self._lat.append(lat)
        return lat

    def measured_latency(self) -> dict:
        if not self._lat:
            return {"n": 0}
        ls = sorted(self._lat)
        return {"n": len(ls), "mean_s": sum(ls) / len(ls),
                "p50_s": ls[len(ls) // 2], "p90_s": ls[int(0.9 * (len(ls) - 1))]}

    @staticmethod
    def usable(report_ts, decision_t, row_observed_at) -> bool:
        """Rule 17: faster is better ONLY if the row is still observed before
        decision time. Latency that arrives after t is worthless — returns False."""
        return parse_ts(row_observed_at) <= parse_ts(decision_t) and \
               parse_ts(row_observed_at) >= parse_ts(report_ts)


# ----------------------------------------------------------------------------
# RULE 9 — CLV ledger
# ----------------------------------------------------------------------------
class CLVLedger:
    """Pre-decision price and post-kickoff close recorded RAW and DE-VIGGED.
    CLV is the primary honesty metric; no model is promoted on backtest alone,
    so promotion checks consult the ledger."""

    def __init__(self, path: str | None = None):
        self.path = path
        self.rows: list[dict] = []

    def record(self, market_id: str, pre_price: float, close_price: float,
               side: str, pre_devig: float, close_devig: float):
        r = {"ts": now(), "market_id": market_id, "side": side,
             "pre_price": pre_price, "close_price": close_price,
             "pre_devig": pre_devig, "close_devig": close_devig,
             "clv": pre_devig - close_devig}
        self.rows.append(r)
        if self.path:
            with open(self.path, "a") as f:
                f.write(json.dumps(r, sort_keys=True) + "\n")
        return r

    def mean_clv(self) -> float | None:
        if not self.rows:
            return None
        return sum(r["clv"] for r in self.rows) / len(self.rows)

    def promotion_supported(self, min_n: int = 10) -> bool:
        """Backtest alone never promotes; a live CLV record must exist and not
        be negative."""
        mc = self.mean_clv()
        return len(self.rows) >= min_n and mc is not None and mc >= 0.0


# ----------------------------------------------------------------------------
# RULE 10 — ADP panel isolation
# ----------------------------------------------------------------------------
class ADPGuard:
    """Cross-source ADP z-deviations (MFL, FFC, Sleeper, DK, UD) feed exactly one
    head: 'rankings_diagnostic'. Enforced in code — feeding them anywhere else
    raises. The rule lives here, not in a docstring."""
    ADP_SOURCES = {"mfl", "ffc", "sleeper", "dk", "ud"}
    ALLOWED_HEADS = {"rankings_diagnostic"}
    FORBIDDEN_HEADS = {"win_probability", "margin", "rating", "power_rating",
                       "spread", "total", "crps_head"}

    def __init__(self):
        self._store: dict[str, dict] = {}

    def ingest(self, source: str, player: str, z_dev: float):
        if source not in self.ADP_SOURCES:
            raise ValueError(f"unknown ADP source {source}")
        self._store.setdefault(player, {})[source] = z_dev

    def feed(self, head: str):
        if head not in self.ALLOWED_HEADS:
            raise ValueError(f"REFUSED: ADP z-deviations may feed {sorted(self.ALLOWED_HEADS)} "
                             f"only — never {head} (rule 10). This refusal is the rule.")
        return dict(self._store)


# ----------------------------------------------------------------------------
# RULE 3 — CollegeGuard: no NFL constants on college rows
# ----------------------------------------------------------------------------
class CollegeGuard:
    """Rule 3: a college model fit only on college rows. NFL constants —
    13.45 ladder, 13.19 Pinnacle sigma, 1.56 HFA, DK prop sigmas, NFL quarter
    fatigue coefficients — must never appear in CFB parameter sets. Separate
    parameters, separate calibration, separate CRPS bar."""
    NFL_CONSTANTS = {
        "nfl_gaussian_ladder_13.45": 13.45,
        "pinnacle_total_sigma": 13.19,
        "pinnacle_spread_sigma": 10.62,
        "modern_hfa": 1.56,
        "dk_pass_sigma": 70.9,
        "dk_rec_sigma": 37.7,
        "dk_rush_sigma": 41.7,
        "dk_1h_pass_sigma": 51.0,
        "dk_1h_rec_sigma": 26.0,
        "dk_1h_rush_sigma": 22.0,
    }

    def __init__(self, tol: float = 0.02):
        self.tol = tol
        self.violations: list[str] = []

    def validate(self, params: dict, label: str = "CFB") -> bool:
        """Returns True if clean; records violations otherwise. Checks:
        (a) no key prefixed 'nfl_' (porting by name),
        (b) no value numerically equal to a known NFL constant (porting by value)."""
        self.violations = []
        for k, v in params.items():
            if k.lower().startswith("nfl_"):
                self.violations.append(f"key '{k}' carries an NFL port ({label}, rule 3)")
            if isinstance(v, (int, float)):
                for cname, cval in self.NFL_CONSTANTS.items():
                    if abs(float(v) - cval) <= self.tol * max(1.0, abs(cval)):
                        self.violations.append(
                            f"value {v} at '{k}' matches NFL constant {cname}={cval} "
                            f"({label}) — port by value, rule 3")
        return not self.violations

    def require_clean(self, params: dict, label: str = "CFB"):
        if not self.validate(params, label):
            raise ValueError("COLLEGE GUARD REFUSED (rule 3):\n  " +
                             "\n  ".join(self.violations))


# ----------------------------------------------------------------------------
# Rule 9 support: promotion path check used by Anchor consumers
# ----------------------------------------------------------------------------
def promotion_check(gate_verdict: Verdict, clv: CLVLedger, founder: FounderGate,
                    min_clv_n: int = 10) -> bool:
    """No model is promoted on backtest alone: a PROMOTED gate verdict AND a live
    CLV record that is not negative. (Founder gate flip is separate — rule 15.)"""
    if gate_verdict.verdict != "PROMOTED":
        return False
    return clv.promotion_supported(min_clv_n)


# ----------------------------------------------------------------------------
# convenience: build the whole enforcement stack wired together
# ----------------------------------------------------------------------------
def build_stack(walk_forward: list[dict], kill_path: str | None = None,
                gate_id: str = "gate_v1") -> dict:
    gate = HonestyGate(walk_forward, gate_id)
    ledger = KillLedger(kill_path)
    return {
        "gate": gate,
        "kill_ledger": ledger,
        "registry": FeatureRegistry(gate, ledger),
        "founder": FounderGate(),
        "clv": CLVLedger(),
        "adp": ADPGuard(),
        "latency": LatencyTracker(),
        "college": CollegeGuard(),
        "calibration_ledger": CalibrationLedger(),
    }
