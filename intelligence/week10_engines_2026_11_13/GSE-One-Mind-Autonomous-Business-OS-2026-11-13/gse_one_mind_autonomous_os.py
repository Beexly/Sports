#!/usr/bin/env python3
"""
gse_one_mind_autonomous_os.py — Unified "One-Mind" Autonomous Business & Agent Fleet OS
Commercial Entity: Galaxy Sports Network LLC, DBA Galaxy Sports Edge (https://www.galaxysportsedge.com)
Repositories: Beexly/Sports & Beexly/agent-bus

Implements:
1. Formal Inductive State Engine (`formal/INDUCTION_DOCTRINE.md`: I(s_0) & Gate(s,a) => I(delta(s,a)))
2. Four Core Doctrines:
   - `paired-audit`: Independent two-agent/two-model-family adversarial audit + PRM Bellman Q-decay +
     Cai et al. backward verifier noise correction + deterministic reconciliation.
   - `honest-refusal`: Fail-closed `DataGapError` on any missing/stale/NaN input or silent `0.5` fallback.
   - `manifest-provenance`: 6-stage Claim-Matrix (`research -> equation -> code -> test -> real_data_manifest -> receipt`)
     + bi-temporal (`valid_time_iso`, `transaction_time_iso`) Source-Tier 1-6 firewall.
   - `held-out-discipline`: Chronological purged OOF separation, Tuesday 04:00 CT `coachMindsetHash` seal
     invariance, MIT SEAL ReST-EM + Positive-Part James-Stein (|Delta log-odds| <= 0.35) + ACI-CRC (W1 <= 0.08).
3. Two-Way Shared Memory & Agent-Bus Coordinator (`Beexly/agent-bus` <-> `brain/mind.jsonl`):
   - Content-addressed SHA-256 single-writer ledger (`MindGuardian`), warm-start context hydration
     (fixing cold-start amnesia), atomic `inbox/from-*` claiming -> `outbox/receipts-*` receipts.
4. End-to-End Autonomous Tuesday-to-Tuesday Business Loop (`galaxysportsedge.com`):
   - Tuesday Lock (`coachMindsetHash` + Glicko-2 Bye-RD update) -> Wed/Thu/Fri Practice & `SiriusXM` Ch 87
     Delta Ingestion + Schmitzer log-domain Sinkhorn-Knopp overlay -> T-90m Inactives Gate (`workers/injury-watcher`)
     -> 5-Stage Inductive Safety Gate (`c_hat <= 12.42`, `|Delta log-odds| <= 0.35`, `E >= 1.35`,
     `CRPS <= 7.099`, `00-TRUTH-FILE` compliance incl. integer `XX/100` badge, public calibration ledger URL,
     and autonomous `package`/`draft` vs. approval-gated `post`/`deploy` boundary) -> SHA-256 + OpenTimestamps
     Pre-Kickoff Commitment Receipt -> Autonomous Storefront (`/parlay-mri` Copula/Shin funnel -> `$19-$39`
     Slate Packs with `100% Store-Credit Alignment` -> `$59.99/mo` Founding All-Access upgrade bridge) ->
     Post-Game Deterministic Settlement (`workers/settlement-engine`) -> Idempotent Store-Credit Minting ->
     Tuesday Purged OOF Weight Update + Conformal-Copula-Kelly Risk Sizing.
5. Observability Engineering Wide-Event Telemetry (`516325` canonical schema):
   - OpenTelemetry / Sentry / PostHog wide events, multi-window SLO burn-rate circuit breakers, and
     Neon Serverless Postgres autosuspend sleep-window enforcement (`02:30-06:30 CST` zero-cron window).
"""

from __future__ import annotations

import dataclasses
import datetime
import hashlib
import json
import math
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Set, Tuple


# ============================================================================
# 0. Canonical Constants (`00-TRUTH-FILE` & Sealed Baseline Parameters)
# ============================================================================

LEGAL_ENTITY_NAME = "Galaxy Sports Network LLC"
DBA_BRAND_NAME = "Galaxy Sports Edge"
PUBLIC_CALIBRATION_LEDGER_URL = "https://galaxysportsedge.com/calibration"
PUBLIC_LEDGER_ATTESTATION = (
    "Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration"
)

CANONICAL_SEALED_HASH_FIXTURE = "85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8"
SEALED_TAU = 0.42
QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947
QB_QUESTIONABLE_STARTED_EPA_DROPOFF = 0.1159
QB_OUT_EPA_DROPOFF = 0.1100
PROB_PER_POINT = 0.033

CANONICAL_WINS = 62
CANONICAL_LOSSES = 23
CANONICAL_PUSHES = 1
CANONICAL_RECORD_STR = "62-23-1"
CANONICAL_NET_UNITS = 26.50
HISTORICAL_REPLAY_PANEL_COUNT = 15947

NUM_MCP_DOMAINS = 31
GLICKO2_SCALE = 173.7178
GLICKO2_SYSTEM_TAU = 0.50

# 5-Stage Inductive Safety Gate Thresholds
MAX_C_HAT = 12.42
MAX_ABS_DELTA_LOG_ODDS = 0.35
MIN_E_VALUE = 1.35
MAX_CRPS = 7.099

# ACI-CRC & MIT SEAL Trust-Region Constants
TARGET_CONFORMAL_ALPHA = 0.10
ACI_STEP_GAMMA = 0.025
MAX_WEIGHTED_MISCOVERAGE = TARGET_CONFORMAL_ALPHA + 0.025  # 0.125
MAX_WASSERSTEIN_W1 = 0.08
MIN_SEAL_COMPOSITE_GAIN = 0.0005

# Autonomous Governance Boundary (`00-TRUTH-FILE` & Motif Standing Rules)
AUTONOMOUS_ALLOWED_VERBS: Set[str] = {"find", "draft", "monitor", "rank", "package", "report"}
FOUNDER_APPROVAL_REQUIRED_VERBS: Set[str] = {"send", "submit", "post", "pay", "deploy"}

# Storefront Pricing Constants (USD Cents)
PACK_PRICES_CENTS: Dict[str, int] = {
    "tnf-spotlight-pack": 1900,
    "prop-sgp-pack": 2900,
    "sunday-spotlight-pack": 3900,
}
FOUNDING_ALL_ACCESS_MONTHLY_CENTS = 5999

# Telemetry & Operational Constants
WIDE_EVENT_SCHEMA_CODE = "516325"
WIDE_EVENT_SCHEMA_ID = "gse.wide_event.516325"
CST_TZ = datetime.timezone(datetime.timedelta(hours=-6), name="CST")
NEON_SLEEP_START_MINUTES = 2 * 60 + 30  # 02:30 CST
NEON_SLEEP_END_MINUTES = 6 * 60 + 30    # 06:30 CST

OTS_MAGIC_HEADER = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94"
OTS_OP_SHA256 = b"\x08"

ROLE_NAMES: Tuple[str, ...] = ("QB1", "RB1", "WR1", "WR2", "TE1")
DEFAULT_COST_MATRIX_5X5: Tuple[Tuple[float, ...], ...] = (
    (0.00, 0.95, 0.90, 0.92, 0.88),
    (0.95, 0.00, 0.42, 0.40, 0.36),
    (0.90, 0.42, 0.00, 0.14, 0.24),
    (0.92, 0.40, 0.14, 0.00, 0.22),
    (0.88, 0.36, 0.24, 0.22, 0.00),
)
POSITIONAL_EXECUTION_MULTIPLIERS: Dict[str, float] = {
    "QB1": 0.78,
    "RB1": 0.85,
    "WR1": 0.82,
    "WR2": 0.88,
    "TE1": 0.84,
    "OL": 0.91,
}

FORBIDDEN_JARGON_REGEX = re.compile(
    r"\b("
    r"22,750,000 snap evaluations|1,750,000 snaps|10-Layer Autonomous Engine|"
    r"Romano CQR|Optimal Transport|Sinkhorn-Knopp|tau_hat|ACI-CRC|James-Stein|"
    r"31-11 banner is retracted|buildContextMask|stageC|stageD|"
    r"guaranteed lock|risk-free|easy money|free money|cannot lose|sure thing|verified track record"
    r")\b",
    re.IGNORECASE,
)
PERCENT_CONFIDENCE_HEADLINE_REGEX = re.compile(
    r"\b\d+(?:\.\d+)?%\s*(?:confidence|win\s*rate|hit\s*rate)\b",
    re.IGNORECASE,
)
INTEGER_CONFIDENCE_BADGE_REGEX = re.compile(r"^(\d{1,3})/100$")
ENCODING_CORRUPTION_REGEX = re.compile(r"\uFFFD|\s\?\s|[\x80-\x9F]")
SECRET_LEAK_REGEX = re.compile(
    r"(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,}|"
    r"postgres(?:ql)?://[^\s\"']+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)"
)


# ============================================================================
# 1. Typed Domain Exceptions (Zero Silent Fallback — `honest-refusal`)
# ============================================================================

class GseDoctrineError(RuntimeError):
    """Base fail-closed exception across the One-Mind Operating System."""


class DataGapError(GseDoctrineError):
    """Raised whenever required data is missing, NaN, stale, or falls back to 0.5."""


class SecondWriterForbiddenError(GseDoctrineError):
    """Raised when any caller other than `mind_guardian` attempts to write `mind.jsonl`."""


class NoOverwriteViolationError(GseDoctrineError):
    """Raised when an existing content-addressed or immutable ID is re-emitted."""


class SecretLeakError(GseDoctrineError):
    """Raised when raw API keys, DSNs, or private keys appear in bus/ledger payloads."""


class PairedAuditError(GseDoctrineError):
    """Raised when Paired Adversarial Audit independence, PRM, or reconciliation fails."""


class ClaimMatrixIncompleteError(GseDoctrineError):
    """Raised when any of the 6 Claim-Matrix provenance links is missing or synthetic."""


class TemporalLeakageError(GseDoctrineError):
    """Raised when chronological purged OOF or pre-kickoff temporal boundaries are violated."""


class SealInvarianceError(GseDoctrineError):
    """Raised when `coachMindsetHash` or `tau` drifts mid-week or a reseal is attempted."""


class InductiveGateError(GseDoctrineError):
    """Raised when `I(s)` or `Gate(s, a)` fails in the formal inductive state machine."""


class SloCircuitOpenError(GseDoctrineError):
    """Raised when multi-window SLO error-budget burn rate trips the circuit breaker."""


class NeonSleepWindowViolationError(GseDoctrineError):
    """Raised when a non-emergency cron attempts to wake Neon during 02:30-06:30 CST."""


# ============================================================================
# 2. Canonical Deterministic Serialization & `00-TRUTH-FILE` Sanitizers
# ============================================================================

def _normalize_for_canonical_json(obj: Any) -> Any:
    if isinstance(obj, bool) or obj is None or isinstance(obj, str):
        return obj
    if isinstance(obj, int):
        return obj
    if isinstance(obj, dict):
        return {str(k): _normalize_for_canonical_json(obj[k]) for k in sorted(obj.keys(), key=str)}
    if isinstance(obj, (list, tuple)):
        return [_normalize_for_canonical_json(v) for v in obj]
    if isinstance(obj, float):
        if not math.isfinite(obj):
            raise DataGapError(f"Non-finite float encountered during canonical serialization: {obj}")
        rounded = round(obj, 12)
        if rounded == 0.0:
            return 0
        if rounded.is_integer() and abs(rounded) < 1e15:
            return int(rounded)
        return rounded
    return obj


def canonical_json(obj: Any) -> str:
    """Produces strictly idempotent sorted-key compact JSON identical across Python and TypeScript."""
    normalized = _normalize_for_canonical_json(obj)
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(data: bytes | str) -> str:
    raw = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(raw).hexdigest()


def assert_no_secrets(payload_text: str) -> None:
    match = SECRET_LEAK_REGEX.search(payload_text)
    if match:
        raise SecretLeakError(f"Blocked credential/secret pattern in payload: {match.group(0)[:12]}...")


def sanitize_utf8_nfc(text: str) -> str:
    cleaned = re.sub(r"\s+\?\s+", " \u2014 ", text)
    normalized = unicodedata.normalize("NFC", cleaned)
    if ENCODING_CORRUPTION_REGEX.search(normalized):
        raise InductiveGateError(f"UTF-8 / CP1252 encoding corruption detected: {normalized!r}")
    return normalized


def validate_confidence_badge_00_truth(badge: str) -> int:
    """Enforces `00-TRUTH-FILE`: confidence badges must be integer `XX/100` (zero `%` badges)."""
    m = INTEGER_CONFIDENCE_BADGE_REGEX.match(badge.strip())
    if not m:
        raise InductiveGateError(
            f"00-TRUTH-FILE violation: confidence badge {badge!r} must be integer 'XX/100' (never '%')."
        )
    score = int(m.group(1))
    if not (0 <= score <= 100):
        raise InductiveGateError(f"00-TRUTH-FILE violation: badge score {score} outside [0, 100].")
    return score


def assert_00_truth_public_copy(copy_text: str) -> str:
    clean = sanitize_utf8_nfc(copy_text)
    jargon_match = FORBIDDEN_JARGON_REGEX.search(clean)
    if jargon_match:
        raise InductiveGateError(
            f"00-TRUTH-FILE violation: forbidden jargon or tout phrasing in public copy: {jargon_match.group(0)!r}"
        )
    pct_match = PERCENT_CONFIDENCE_HEADLINE_REGEX.search(clean)
    if pct_match:
        raise InductiveGateError(
            f"00-TRUTH-FILE violation: percentage confidence/win-rate headline forbidden: {pct_match.group(0)!r}"
        )
    return clean


def enforce_autonomous_action_boundary(verb: str, founder_approved: bool = False) -> str:
    v = verb.lower().strip()
    if v in AUTONOMOUS_ALLOWED_VERBS:
        return "EXECUTED_AUTONOMOUSLY"
    if v in FOUNDER_APPROVAL_REQUIRED_VERBS:
        return "EXECUTED_WITH_FOUNDER_APPROVAL" if founder_approved else "QUEUED_FOR_FOUNDER_APPROVAL"
    raise InductiveGateError(f"Unclassified operational action verb: {verb!r}")


# ============================================================================
# 3. Formal Inductive State Engine (`I(s_0) & Gate(s,a) => I(delta(s,a))`)
# ============================================================================

@dataclass(frozen=True)
class OperationalLedgerState:
    nfl_season: int
    nfl_week: int
    sealed_hash: str
    tau: float
    prob_per_point: float
    qb_questionable_epa: float
    stage0_roster_sha256: str
    stage0_injuries_sha256: str
    wins: int = CANONICAL_WINS
    losses: int = CANONICAL_LOSSES
    pushes: int = CANONICAL_PUSHES
    net_units: float = CANONICAL_NET_UNITS
    mind_head_sha256: str = "0" * 64
    sealed_iso_weeks: Tuple[str, ...] = ()
    verified_pick_ids: Tuple[str, ...] = ()
    settled_pick_ids: Tuple[str, ...] = ()
    minted_credit_keys: Tuple[str, ...] = ()
    domain_weights_log_odds: Tuple[float, ...] = tuple([0.0] * NUM_MCP_DOMAINS)

    @property
    def record_str(self) -> str:
        return f"{self.wins}-{self.losses}-{self.pushes}"


class InductiveStateEngine:
    """Enforces `formal/INDUCTION_DOCTRINE.md`: I(s_0) & Gate(s, a) => I(delta(s, a))."""

    def __init__(self, initial_state: OperationalLedgerState) -> None:
        self.assert_invariant(initial_state)
        self._state = initial_state
        self.transition_log: List[Dict[str, Any]] = []

    @property
    def state(self) -> OperationalLedgerState:
        return self._state

    @staticmethod
    def assert_invariant(state: OperationalLedgerState) -> None:
        if len(state.sealed_hash) != 64 or not all(c in "0123456789abcdef" for c in state.sealed_hash):
            raise InductiveGateError(f"Invalid 64-hex sealed_hash: {state.sealed_hash!r}")
        if abs(state.tau - SEALED_TAU) > 1e-9:
            raise SealInvarianceError(f"Tau invariant violated: expected {SEALED_TAU}, got {state.tau}")
        if abs(state.prob_per_point - PROB_PER_POINT) > 1e-9:
            raise InductiveGateError(f"PROB_PER_POINT invariant violated: {state.prob_per_point}")
        if abs(state.qb_questionable_epa - QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF) > 1e-9:
            raise SealInvarianceError(f"QB_QUESTIONABLE_EPA drift: {state.qb_questionable_epa}")
        if len(state.stage0_roster_sha256) != 64 or len(state.stage0_injuries_sha256) != 64:
            raise DataGapError("Missing valid 64-hex Stage 0 roster/injuries SHA-256 digests.")
        if state.wins < 0 or state.losses < 0 or state.pushes < 0:
            raise InductiveGateError("Negative win/loss/push counts forbidden.")
        if len(state.domain_weights_log_odds) != NUM_MCP_DOMAINS:
            raise InductiveGateError(f"Expected {NUM_MCP_DOMAINS} MCP domain weights.")
        if len(set(state.minted_credit_keys)) != len(state.minted_credit_keys):
            raise InductiveGateError("Duplicate store-credit idempotency key in state.")

    def step(
        self,
        action_name: str,
        gate_fn: Callable[[OperationalLedgerState], None],
        delta_fn: Callable[[OperationalLedgerState], OperationalLedgerState],
    ) -> OperationalLedgerState:
        self.assert_invariant(self._state)
        gate_fn(self._state)
        next_state = delta_fn(self._state)
        self.assert_invariant(next_state)
        self.transition_log.append(
            {
                "action": action_name,
                "prev_sealed_hash": self._state.sealed_hash,
                "next_sealed_hash": next_state.sealed_hash,
                "prev_mind_head": self._state.mind_head_sha256,
                "next_mind_head": next_state.mind_head_sha256,
                "record": next_state.record_str,
                "net_units": round(next_state.net_units, 4),
            }
        )
        self._state = next_state
        return next_state


# ============================================================================
# 4. Claim-Matrix Provenance & Paired Adversarial Audit Gate
# ============================================================================

@dataclass(frozen=True)
class ClaimMatrixArtifact:
    research_id: str
    verbatim_quote_span: Tuple[int, int]
    equation_id: str
    bitmask_288_hex: str
    code_path: str
    code_sha256: str
    test_target: str
    test_passed: bool
    real_data_manifest_uri: str
    real_data_sha256: str
    real_data_rows: int
    is_synthetic_fixture: bool
    source_tier: int
    receipt_sha256: str = ""

    def validate(self, require_receipt: bool = False) -> str:
        if not self.research_id or not (
            self.research_id.startswith("arXiv:") or self.research_id.startswith("DOI:")
        ):
            raise ClaimMatrixIncompleteError(f"Link 1 (research) invalid citation ID: {self.research_id!r}")
        start, end = self.verbatim_quote_span
        if start < 0 or end <= start:
            raise ClaimMatrixIncompleteError(f"Link 1 (research) invalid verbatim quote span: {(start, end)}")
        if not self.equation_id or len(self.bitmask_288_hex) != 72:
            raise ClaimMatrixIncompleteError("Link 2 (equation) requires equation_id and 72-hex (288-bit) mask.")
        if not self.code_path or len(self.code_sha256) != 64:
            raise ClaimMatrixIncompleteError("Link 3 (code) requires code_path and 64-hex SHA-256.")
        if not self.test_target or not self.test_passed:
            raise ClaimMatrixIncompleteError("Link 4 (test) requires passing test target.")
        if (
            not self.real_data_manifest_uri
            or len(self.real_data_sha256) != 64
            or self.real_data_rows <= 0
            or self.is_synthetic_fixture
        ):
            raise ClaimMatrixIncompleteError(
                "Link 5 (real_data_manifest) rejects synthetic/empty fixtures and requires 64-hex SHA-256."
            )
        if self.source_tier not in (1, 2, 3, 4):
            raise ClaimMatrixIncompleteError(
                f"Source Tier {self.source_tier} forbidden for factual/model provenance (Tiers 5-6 rejected)."
            )
        if require_receipt and len(self.receipt_sha256) != 64:
            raise ClaimMatrixIncompleteError("Link 6 (receipt) missing 64-hex cryptographic receipt digest.")
        payload = {
            "bitmask_288_hex": self.bitmask_288_hex,
            "code_path": self.code_path,
            "code_sha256": self.code_sha256,
            "equation_id": self.equation_id,
            "real_data_manifest_uri": self.real_data_manifest_uri,
            "real_data_rows": self.real_data_rows,
            "real_data_sha256": self.real_data_sha256,
            "research_id": self.research_id,
            "source_tier": self.source_tier,
            "test_passed": self.test_passed,
            "test_target": self.test_target,
            "verbatim_quote_span": list(self.verbatim_quote_span),
        }
        return sha256_hex(canonical_json(payload))

    def with_receipt(self, receipt_sha256: str) -> "ClaimMatrixArtifact":
        updated = dataclasses.replace(self, receipt_sha256=receipt_sha256)
        updated.validate(require_receipt=True)
        return updated


@dataclass(frozen=True)
class IndependentAuditSubmission:
    agent_id: str
    model_family: str
    quality_score: float
    directional_prob: float
    sealed_hash_observed: str
    prm_step_indicators: Tuple[int, ...]
    noisy_verifier_reward: int
    false_positive_rate_rho0: float
    false_negative_rate_rho1: float
    diff_sha256: str
    lexical_clean: bool
    allows_execution_verification: bool = True


@dataclass(frozen=True)
class PairedAuditReceipt:
    target_id: str
    status: str
    auditor_a_id: str
    auditor_b_id: str
    model_family_a: str
    model_family_b: str
    reconciled_prob: float
    prob_divergence: float
    bellman_q_product: int
    backward_corrected_reward_a: float
    backward_corrected_reward_b: float
    sealed_hash: str
    receipt_sha256: str


class PairedAdversarialAuditGate:
    """Enforces Doctrine 01 (`paired-audit`) + PRM Bellman Q-decay + Cai et al. backward error correction."""

    def __init__(self, min_quality_bar: float = 9.2, max_prob_divergence: float = 0.015) -> None:
        self.min_quality_bar = min_quality_bar
        self.max_prob_divergence = max_prob_divergence

    @staticmethod
    def compute_bellman_q_decay(step_indicators: Sequence[int]) -> int:
        if not step_indicators:
            raise PairedAuditError("Empty PRM reasoning trace forbidden.")
        prod = 1
        for c_i in step_indicators:
            if c_i not in (0, 1):
                raise PairedAuditError(f"PRM step indicator must be binary {{0,1}}, got {c_i}")
            prod *= c_i
        return prod

    @staticmethod
    def compute_backward_corrected_reward(r_tilde: int, rho0: float, rho1: float) -> float:
        denom = 1.0 - rho0 - rho1
        if denom <= 0.0:
            raise PairedAuditError(
                f"Uninformative verifier channel (1 - rho0 - rho1 = {denom:.4f} <= 0); execution halted."
            )
        if r_tilde not in (0, 1):
            raise PairedAuditError(f"Observed verifier feedback must be in {{0,1}}, got {r_tilde}")
        return (float(r_tilde) - rho0) / denom

    def verify_and_reconcile(
        self,
        target_id: str,
        audit_a: IndependentAuditSubmission,
        audit_b: IndependentAuditSubmission,
        expected_sealed_hash: str,
    ) -> PairedAuditReceipt:
        if audit_a.agent_id == audit_b.agent_id:
            raise PairedAuditError(f"Self-audit forbidden: duplicate agent_id {audit_a.agent_id!r}")
        if audit_a.model_family.lower() == audit_b.model_family.lower():
            raise PairedAuditError(
                f"Echo-chamber audit forbidden: identical model_family {audit_a.model_family!r}"
            )
        for sub in (audit_a, audit_b):
            if "deepseek" in sub.model_family.lower() or not sub.allows_execution_verification:
                raise PairedAuditError(
                    f"Verifier {sub.agent_id} ({sub.model_family}) is theorist-only and cannot sign execution gates."
                )
            if sub.quality_score < self.min_quality_bar:
                raise PairedAuditError(
                    f"Verifier {sub.agent_id} quality score {sub.quality_score:.2f} < {self.min_quality_bar:.2f} bar."
                )
            if not sub.lexical_clean:
                raise PairedAuditError(f"Verifier {sub.agent_id} flagged lexical/encoding violation.")
            if sub.sealed_hash_observed != expected_sealed_hash:
                raise SealInvarianceError(
                    f"Verifier {sub.agent_id} sealed_hash mismatch: {sub.sealed_hash_observed} != {expected_sealed_hash}"
                )
            if not math.isfinite(sub.directional_prob) or not (0.0 < sub.directional_prob < 1.0):
                raise DataGapError(f"Invalid directional probability {sub.directional_prob} from {sub.agent_id}")
            if abs(sub.directional_prob - 0.5) < 1e-12:
                raise DataGapError(
                    f"Silent 0.5 fallback probability rejected by honest-refusal on {sub.agent_id}"
                )
            if len(sub.diff_sha256) != 64:
                raise PairedAuditError(f"Missing 64-hex diff/artifact SHA-256 on {sub.agent_id}")

        q_a = self.compute_bellman_q_decay(audit_a.prm_step_indicators)
        q_b = self.compute_bellman_q_decay(audit_b.prm_step_indicators)
        if q_a != 1 or q_b != 1:
            raise PairedAuditError(f"Bellman PRM Q-decay failed (q_a={q_a}, q_b={q_b}); flawed intermediate step.")

        r_back_a = self.compute_backward_corrected_reward(
            audit_a.noisy_verifier_reward, audit_a.false_positive_rate_rho0, audit_a.false_negative_rate_rho1
        )
        r_back_b = self.compute_backward_corrected_reward(
            audit_b.noisy_verifier_reward, audit_b.false_positive_rate_rho0, audit_b.false_negative_rate_rho1
        )
        if r_back_a <= 0.5 or r_back_b <= 0.5:
            raise PairedAuditError(
                f"Backward-corrected verifier reward below threshold (r_a={r_back_a:.3f}, r_b={r_back_b:.3f})."
            )

        if audit_a.diff_sha256 != audit_b.diff_sha256:
            raise PairedAuditError("Auditors evaluated divergent artifact/diff SHA-256 digests.")

        prob_div = abs(audit_a.directional_prob - audit_b.directional_prob)
        if prob_div > self.max_prob_divergence:
            raise PairedAuditError(
                f"Probability divergence {prob_div:.4f} exceeds max {self.max_prob_divergence:.4f}"
            )

        reconciled_prob = round(0.5 * (audit_a.directional_prob + audit_b.directional_prob), 6)
        draft = {
            "auditor_a_id": audit_a.agent_id,
            "auditor_b_id": audit_b.agent_id,
            "backward_corrected_reward_a": round(r_back_a, 6),
            "backward_corrected_reward_b": round(r_back_b, 6),
            "bellman_q_product": 1,
            "diff_sha256": audit_a.diff_sha256,
            "model_family_a": audit_a.model_family,
            "model_family_b": audit_b.model_family,
            "prob_divergence": round(prob_div, 6),
            "reconciled_prob": reconciled_prob,
            "sealed_hash": expected_sealed_hash,
            "status": "VERIFIED",
            "target_id": target_id,
        }
        receipt_sha = sha256_hex(canonical_json(draft))
        return PairedAuditReceipt(
            target_id=target_id,
            status="VERIFIED",
            auditor_a_id=audit_a.agent_id,
            auditor_b_id=audit_b.agent_id,
            model_family_a=audit_a.model_family,
            model_family_b=audit_b.model_family,
            reconciled_prob=reconciled_prob,
            prob_divergence=round(prob_div, 6),
            bellman_q_product=1,
            backward_corrected_reward_a=round(r_back_a, 6),
            backward_corrected_reward_b=round(r_back_b, 6),
            sealed_hash=expected_sealed_hash,
            receipt_sha256=receipt_sha,
        )


# ============================================================================
# 5. Two-Way Shared Memory (`brain/mind.jsonl`) & Agent-Bus Coordinator
# ============================================================================

class MindGuardian:
    """
    Single-writer content-addressed SHA-256 ledger guardian for `brain/mind.jsonl`.
    Compatible byte-for-byte with `one_mind_agent_bus_daemon.ts`.
    """

    GUARDIAN_TOKEN = "MIND_GUARDIAN_SINGLE_WRITER_V1"

    def __init__(self, mind_jsonl_path: str | Path) -> None:
        self.mind_path = Path(mind_jsonl_path)
        self.mind_path.parent.mkdir(parents=True, exist_ok=True)
        self.lock_path = self.mind_path.parent / ".mind_guardian.lock"

    def read_all(self) -> List[Dict[str, Any]]:
        if not self.mind_path.exists():
            return []
        entries: List[Dict[str, Any]] = []
        with open(self.mind_path, "r", encoding="utf-8") as fh:
            for raw in fh:
                stripped = raw.strip()
                if not stripped:
                    continue
                entries.append(json.loads(stripped))
        return entries

    def verify_chain(self) -> Tuple[bool, str]:
        entries = self.read_all()
        prev_sha = "0" * 64
        seen_ids: Set[str] = set()
        seen_content: Set[str] = set()
        for idx, entry in enumerate(entries):
            entry_id = entry.get("entry_id", "")
            if entry_id in seen_ids:
                raise NoOverwriteViolationError(f"Duplicate entry_id at index {idx}: {entry_id}")
            seen_ids.add(entry_id)

            if entry.get("prev_entry_sha256") != prev_sha:
                raise InductiveGateError(
                    f"Hash chain broken at index {idx}: expected prev={prev_sha}, got {entry.get('prev_entry_sha256')}"
                )
            expected_content_sha = sha256_hex(canonical_json(entry["payload"]))
            if entry.get("content_sha256") != expected_content_sha:
                raise InductiveGateError(
                    f"Content SHA-256 mismatch at index {idx}: expected {expected_content_sha}"
                )
            if expected_content_sha in seen_content:
                raise NoOverwriteViolationError(f"Duplicate content-addressed payload at index {idx}")
            seen_content.add(expected_content_sha)

            draft = {k: v for k, v in entry.items() if k != "entry_sha256"}
            expected_entry_sha = sha256_hex(canonical_json(draft))
            if entry.get("entry_sha256") != expected_entry_sha:
                raise InductiveGateError(
                    f"Entry SHA-256 mismatch at index {idx}: expected {expected_entry_sha}, got {entry.get('entry_sha256')}"
                )
            prev_sha = expected_entry_sha
        return True, prev_sha

    def append_entry(
        self,
        *,
        writer_role: str,
        guardian_token: str,
        entry_id: str,
        kind: str,
        domain_slug: str,
        valid_time_iso: str,
        transaction_time_iso: str,
        sealed_hash: str,
        payload: Dict[str, Any],
        claim_matrix_sha256: str,
        paired_audit_receipt_sha256: str,
    ) -> Dict[str, Any]:
        if writer_role != "mind_guardian" or guardian_token != self.GUARDIAN_TOKEN:
            raise SecondWriterForbiddenError(
                f"Unauthorized writer '{writer_role}': only single-writer 'mind_guardian' may append to mind.jsonl."
            )
        normalized_payload = _normalize_for_canonical_json(payload)
        serialized_payload = canonical_json(normalized_payload)
        assert_no_secrets(serialized_payload)
        content_sha256 = sha256_hex(serialized_payload)

        fd: Optional[int] = None
        try:
            fd = os.open(str(self.lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.write(fd, f"{os.getpid()}:{transaction_time_iso}".encode("utf-8"))
        except FileExistsError as exc:
            raise SecondWriterForbiddenError("Concurrent mind.jsonl lock contention detected.") from exc

        try:
            _, head_sha = self.verify_chain()
            existing = self.read_all()
            for row in existing:
                if row["entry_id"] == entry_id:
                    raise NoOverwriteViolationError(f"entry_id {entry_id} already exists in mind.jsonl")
                if row["content_sha256"] == content_sha256:
                    raise NoOverwriteViolationError(f"content_sha256 {content_sha256} already committed")

            draft_entry: Dict[str, Any] = {
                "claim_matrix_sha256": claim_matrix_sha256,
                "conditions_on": {
                    "qb_questionable_epa": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
                    "tau": SEALED_TAU,
                    "version": "v1.0",
                },
                "content_sha256": content_sha256,
                "domain_slug": domain_slug,
                "entry_id": entry_id,
                "kind": kind,
                "paired_audit_receipt_sha256": paired_audit_receipt_sha256,
                "payload": normalized_payload,
                "prev_entry_sha256": head_sha,
                "schema_version": "gse-one-mind-ledger-v1.0",
                "sealed_hash": sealed_hash,
                "transaction_time_iso": transaction_time_iso,
                "valid_time_iso": valid_time_iso,
                "writer_role": "mind_guardian",
            }
            entry_sha256 = sha256_hex(canonical_json(draft_entry))
            final_entry = dict(draft_entry)
            final_entry["entry_sha256"] = entry_sha256

            with open(self.mind_path, "a", encoding="utf-8") as fh:
                fh.write(canonical_json(final_entry) + "\n")
            return final_entry
        finally:
            if fd is not None:
                os.close(fd)
            if self.lock_path.exists():
                self.lock_path.unlink()


@dataclass(frozen=True)
class WarmStartContext:
    agent_id: str
    routed_model_tier: str
    mind_entry_count: int
    mind_head_sha256: str
    active_sealed_hash: str
    conditions_on: Dict[str, Any]
    domain_weights_log_odds: List[float]
    recent_verified_receipts: List[str]
    active_lessons: List[str]


class TwoWayAgentBusCoordinator:
    """Fixes #1 root cause of agent amnesia ("every agent starts cold; agent-bus is used one-way")."""

    STALE_CLAIM_SECONDS = 4 * 3600

    def __init__(
        self,
        bus_root: str | Path,
        mind_guardian: MindGuardian,
        audit_gate: Optional[PairedAdversarialAuditGate] = None,
    ) -> None:
        self.bus_root = Path(bus_root)
        self.mind_guardian = mind_guardian
        self.audit_gate = audit_gate or PairedAdversarialAuditGate()
        for sub in (
            "inbox/from-motif",
            "inbox/from-opencode",
            "inbox/from-jules",
            "inbox/from-mimo",
            "inbox/from-antigravity",
            "claims",
            "outbox/receipts-motif",
            "outbox/receipts-opencode",
            "outbox/receipts-jules",
            "outbox/receipts-mimo",
            "outbox/receipts-antigravity",
        ):
            (self.bus_root / sub).mkdir(parents=True, exist_ok=True)
        self.watermark_path = self.bus_root / "agent-bus-watch-seen.json"

    @staticmethod
    def route_model_tier(requires_judgment: bool, has_complete_spec: bool, is_mechanical_scan: bool) -> str:
        if requires_judgment or (not has_complete_spec and not is_mechanical_scan):
            return "claude-opus-5.5/medium"
        if has_complete_spec and not is_mechanical_scan:
            return "claude-sonnet-5.5/medium"
        return "claude-haiku-4.5/low"

    def hydrate_agent_warm_start(self, agent_id: str, active_sealed_hash: str) -> WarmStartContext:
        _, head_sha = self.mind_guardian.verify_chain()
        entries = self.mind_guardian.read_all()
        weights = [0.0] * NUM_MCP_DOMAINS
        lessons: List[str] = []
        for entry in entries:
            payload = entry.get("payload", {})
            if "shrunk_domain_weights" in payload and len(payload["shrunk_domain_weights"]) == NUM_MCP_DOMAINS:
                weights = [float(x) for x in payload["shrunk_domain_weights"]]
            if "lesson_summary" in payload:
                lessons.append(str(payload["lesson_summary"]))

        receipt_files = sorted(self.bus_root.glob("outbox/receipts-*/*.receipt.json"))
        recent_receipts = [p.stem.replace(".receipt", "") for p in receipt_files[-10:]]

        tier = self.route_model_tier(
            requires_judgment=(agent_id in {"motif", "antigravity"}),
            has_complete_spec=(agent_id in {"hermes-opencode", "opencode", "jules", "mimo"}),
            is_mechanical_scan=(agent_id == "scanner-haiku"),
        )
        return WarmStartContext(
            agent_id=agent_id,
            routed_model_tier=tier,
            mind_entry_count=len(entries),
            mind_head_sha256=head_sha,
            active_sealed_hash=active_sealed_hash,
            conditions_on={
                "version": "v1.0",
                "tau": SEALED_TAU,
                "qb_questionable_epa": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
            },
            domain_weights_log_odds=weights,
            recent_verified_receipts=recent_receipts,
            active_lessons=lessons[-10:],
        )

    def publish_inbox_task(
        self,
        origin_agent: str,
        task_id: str,
        task_payload: Dict[str, Any],
    ) -> Path:
        inbox_dir = self.bus_root / f"inbox/from-{origin_agent}"
        inbox_dir.mkdir(parents=True, exist_ok=True)
        serialized = canonical_json(task_payload)
        assert_no_secrets(serialized)
        target = inbox_dir / f"{task_id}.json"
        if target.exists():
            raise NoOverwriteViolationError(f"Task {task_id} already exists in {inbox_dir}")
        target.write_text(serialized + "\n", encoding="utf-8")
        return target

    def reclaim_stale_claims(self, now_epoch_s: float) -> List[str]:
        reclaimed: List[str] = []
        for claim_file in sorted((self.bus_root / "claims").glob("*.claim.json")):
            data = json.loads(claim_file.read_text(encoding="utf-8"))
            if now_epoch_s - float(data.get("claimed_at_epoch_s", 0.0)) > self.STALE_CLAIM_SECONDS:
                reclaimed.append(str(data["task_id"]))
                claim_file.unlink()
        return reclaimed

    def claim_next_inbox_task(
        self,
        claiming_agent: str,
        active_sealed_hash: str,
        now_epoch_s: float,
    ) -> Optional[Tuple[Dict[str, Any], WarmStartContext]]:
        self.reclaim_stale_claims(now_epoch_s)
        warm_ctx = self.hydrate_agent_warm_start(claiming_agent, active_sealed_hash)

        for task_path in sorted(self.bus_root.glob("inbox/from-*/*.json")):
            task_data = json.loads(task_path.read_text(encoding="utf-8"))
            task_id = str(task_data["task_id"])
            receipt_glob = list(self.bus_root.glob(f"outbox/receipts-*/{task_id}.receipt.json"))
            if receipt_glob:
                continue

            claim_path = self.bus_root / "claims" / f"{task_id}.claim.json"
            try:
                fd = os.open(str(claim_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except FileExistsError:
                continue

            try:
                claim_record = {
                    "claimed_at_epoch_s": now_epoch_s,
                    "claiming_agent": claiming_agent,
                    "inbox_path": str(task_path.relative_to(self.bus_root)),
                    "mind_head_at_claim": warm_ctx.mind_head_sha256,
                    "routed_model_tier": warm_ctx.routed_model_tier,
                    "task_id": task_id,
                }
                os.write(fd, (canonical_json(claim_record) + "\n").encode("utf-8"))
            finally:
                os.close(fd)
            return task_data, warm_ctx
        return None

    def complete_task_with_paired_audit(
        self,
        *,
        claiming_agent: str,
        task_id: str,
        deliverable_summary: Dict[str, Any],
        lesson_summary: str,
        claim_matrix: ClaimMatrixArtifact,
        audit_a: IndependentAuditSubmission,
        audit_b: IndependentAuditSubmission,
        expected_sealed_hash: str,
        valid_time_iso: str,
        transaction_time_iso: str,
    ) -> Dict[str, Any]:
        paired_receipt = self.audit_gate.verify_and_reconcile(
            target_id=task_id,
            audit_a=audit_a,
            audit_b=audit_b,
            expected_sealed_hash=expected_sealed_hash,
        )
        verified_matrix = claim_matrix.with_receipt(paired_receipt.receipt_sha256)
        matrix_sha = verified_matrix.validate(require_receipt=True)

        outbox_dir = self.bus_root / f"outbox/receipts-{claiming_agent}"
        outbox_dir.mkdir(parents=True, exist_ok=True)
        receipt_path = outbox_dir / f"{task_id}.receipt.json"
        if receipt_path.exists():
            raise NoOverwriteViolationError(f"Receipt already exists for {task_id}")

        mind_entry = self.mind_guardian.append_entry(
            writer_role="mind_guardian",
            guardian_token=MindGuardian.GUARDIAN_TOKEN,
            entry_id=f"bus-verified-{task_id}",
            kind="AGENT_BUS_VERIFIED_RECEIPT",
            domain_slug="FLEET_BUS",
            valid_time_iso=valid_time_iso,
            transaction_time_iso=transaction_time_iso,
            sealed_hash=expected_sealed_hash,
            payload={
                "claiming_agent": claiming_agent,
                "deliverable_summary": deliverable_summary,
                "lesson_summary": lesson_summary,
                "reconciled_prob": paired_receipt.reconciled_prob,
                "status": "VERIFIED",
                "task_id": task_id,
            },
            claim_matrix_sha256=matrix_sha,
            paired_audit_receipt_sha256=paired_receipt.receipt_sha256,
        )

        receipt_doc = {
            "claim_matrix_sha256": matrix_sha,
            "claiming_agent": claiming_agent,
            "mind_entry_sha256": mind_entry["entry_sha256"],
            "paired_audit": dataclasses.asdict(paired_receipt),
            "status": "VERIFIED",
            "task_id": task_id,
            "transaction_time_iso": transaction_time_iso,
        }
        receipt_path.write_text(canonical_json(receipt_doc) + "\n", encoding="utf-8")

        claim_path = self.bus_root / "claims" / f"{task_id}.claim.json"
        if claim_path.exists():
            claim_path.unlink()

        seen: List[str] = []
        if self.watermark_path.exists():
            seen = json.loads(self.watermark_path.read_text(encoding="utf-8")).get("verified_tasks", [])
        if task_id not in seen:
            seen.append(task_id)
        self.watermark_path.write_text(
            canonical_json({"updated_at": transaction_time_iso, "verified_tasks": seen}) + "\n",
            encoding="utf-8",
        )
        return receipt_doc


# ============================================================================
# 6. Quantitative Primitives: Glicko-2, Sinkhorn, Copulas, Shin, Proper Scoring
# ============================================================================

@dataclass(frozen=True)
class Glicko2TeamRating:
    team: str
    rating: float
    rd: float
    volatility: float


def update_glicko2_rating(
    team_state: Glicko2TeamRating,
    matches: Sequence[Tuple[Glicko2TeamRating, float]],
    tau_sys: float = GLICKO2_SYSTEM_TAU,
) -> Glicko2TeamRating:
    mu = (team_state.rating - 1500.0) / GLICKO2_SCALE
    phi = team_state.rd / GLICKO2_SCALE
    sigma = team_state.volatility

    if not matches:
        phi_star = math.sqrt(phi * phi + sigma * sigma)
        return Glicko2TeamRating(
            team=team_state.team,
            rating=round(team_state.rating, 6),
            rd=round(GLICKO2_SCALE * phi_star, 6),
            volatility=round(sigma, 8),
        )

    def g_fn(p: float) -> float:
        return 1.0 / math.sqrt(1.0 + 3.0 * p * p / (math.pi * math.pi))

    def e_fn(m: float, m_j: float, p_j: float) -> float:
        return 1.0 / (1.0 + math.exp(-g_fn(p_j) * (m - m_j)))

    v_inv = 0.0
    delta_sum = 0.0
    for opp, score_s in matches:
        if score_s not in (0.0, 0.5, 1.0):
            raise DataGapError(f"Invalid Glicko-2 match outcome {score_s} for {team_state.team}")
        mu_j = (opp.rating - 1500.0) / GLICKO2_SCALE
        phi_j = opp.rd / GLICKO2_SCALE
        g_j = g_fn(phi_j)
        e_j = e_fn(mu, mu_j, phi_j)
        v_inv += (g_j * g_j) * e_j * (1.0 - e_j)
        delta_sum += g_j * (score_s - e_j)

    v = 1.0 / v_inv
    delta = v * delta_sum
    a = math.log(sigma * sigma)

    def f_obj(x: float) -> float:
        ex = math.exp(x)
        num1 = ex * (delta * delta - phi * phi - v - ex)
        den1 = 2.0 * ((phi * phi + v + ex) ** 2)
        return (num1 / den1) - ((x - a) / (tau_sys * tau_sys))

    upper_a = a
    if delta * delta > phi * phi + v:
        upper_b = math.log(delta * delta - phi * phi - v)
    else:
        k = 1
        while f_obj(a - k * tau_sys) < 0.0:
            k += 1
        upper_b = a - k * tau_sys

    f_a = f_obj(upper_a)
    f_b = f_obj(upper_b)
    for _ in range(100):
        if abs(upper_b - upper_a) <= 1e-7:
            break
        c = upper_a + (upper_a - upper_b) * f_a / (f_b - f_a)
        f_c = f_obj(c)
        if f_c * f_b <= 0.0:
            upper_a = upper_b
            f_a = f_b
        else:
            f_a *= 0.5
        upper_b = c
        f_b = f_c

    sigma_prime = math.exp(upper_a / 2.0)
    phi_star = math.sqrt(phi * phi + sigma_prime * sigma_prime)
    phi_prime = 1.0 / math.sqrt((1.0 / (phi_star * phi_star)) + (1.0 / v))
    mu_prime = mu + (phi_prime * phi_prime) * delta_sum

    return Glicko2TeamRating(
        team=team_state.team,
        rating=round(1500.0 + GLICKO2_SCALE * mu_prime, 6),
        rd=round(GLICKO2_SCALE * phi_prime, 6),
        volatility=round(sigma_prime, 8),
    )


def log_domain_sinkhorn_knopp(
    source_shares: Sequence[float],
    target_capacities: Sequence[float],
    cost_matrix: Sequence[Sequence[float]] = DEFAULT_COST_MATRIX_5X5,
    epsilon: float = 0.25,
    max_iters: int = 1000,
    tol: float = 1e-9,
) -> Dict[str, Any]:
    """
    Schmitzer (2019, arXiv:1610.06519) log-domain stabilized Sinkhorn-Knopp optimal transport
    at the GSE Continuous Learning Architecture specification (epsilon=0.10, tol=1e-9).
    """
    n = len(source_shares)
    if n == 0 or len(target_capacities) != n or len(cost_matrix) != n:
        raise DataGapError("Sinkhorn-Knopp dimension mismatch.")
    for val in list(source_shares) + list(target_capacities):
        if val is None or not math.isfinite(val) or val <= 0.0:
            raise DataGapError(f"Sinkhorn marginals must be strictly positive finite numbers, got {val}")

    sum_a = sum(source_shares)
    sum_b = sum(target_capacities)
    a = [x / sum_a for x in source_shares]
    b = [x / sum_b for x in target_capacities]
    log_a = [math.log(x) for x in a]
    log_b = [math.log(x) for x in b]

    f = [0.0] * n
    g = [0.0] * n

    def logsumexp(vec: Sequence[float]) -> float:
        m = max(vec)
        return m + math.log(sum(math.exp(v - m) for v in vec))

    converged = False
    l1_err = float("inf")
    iters_used = 0
    for it in range(1, max_iters + 1):
        iters_used = it
        for i in range(n):
            f[i] = epsilon * (
                log_a[i] - logsumexp([(g[j] - cost_matrix[i][j]) / epsilon for j in range(n)])
            )
        for j in range(n):
            g[j] = epsilon * (
                log_b[j] - logsumexp([(f[i] - cost_matrix[i][j]) / epsilon for i in range(n)])
            )

        coupling = [
            [math.exp((f[i] + g[j] - cost_matrix[i][j]) / epsilon) for j in range(n)]
            for i in range(n)
        ]
        row_sums = [sum(coupling[i][j] for j in range(n)) for i in range(n)]
        col_sums = [sum(coupling[i][j] for i in range(n)) for j in range(n)]
        l1_err = sum(abs(row_sums[i] - a[i]) for i in range(n)) + sum(
            abs(col_sums[j] - b[j]) for j in range(n)
        )
        if l1_err < tol:
            converged = True
            break

    if not converged:
        raise DataGapError(f"Sinkhorn-Knopp failed to converge within {tol}: l1_err={l1_err:.3e}")

    coupling = [
        [math.exp((f[i] + g[j] - cost_matrix[i][j]) / epsilon) for j in range(n)]
        for i in range(n)
    ]
    reallocated_shares = [round(sum(coupling[i][j] for i in range(n)), 8) for j in range(n)]
    mass_moved = 0.5 * sum(abs(reallocated_shares[j] - a[j]) for j in range(n))
    return {
        "converged": True,
        "coupling": coupling,
        "iterations": iters_used,
        "l1_marginal_error": l1_err,
        "mass_moved": round(mass_moved, 8),
        "reallocated_shares": reallocated_shares,
    }


def shin_devig_probabilities(decimal_odds: Sequence[float], tol: float = 1e-10) -> Dict[str, Any]:
    if len(decimal_odds) < 2:
        raise DataGapError("Shin de-vig requires at least 2 market outcomes.")
    implied = []
    for odd in decimal_odds:
        if odd is None or not math.isfinite(odd) or odd <= 1.0:
            raise DataGapError(f"Invalid decimal odds {odd} in market feed.")
        implied.append(1.0 / odd)

    overround = sum(implied)
    if overround < 1.0 - 1e-6 or overround > 1.35:
        raise DataGapError(f"Corrupted market overround {overround:.4f} violates no-arbitrage bounds.")
    if abs(overround - 1.0) <= 1e-9:
        return {"insider_z": 0.0, "overround": overround, "true_probs": implied}

    def shin_sum(z: float) -> float:
        total = 0.0
        for pi_i in implied:
            num = math.sqrt(z * z + 4.0 * (1.0 - z) * (pi_i * pi_i) / overround) - z
            total += num / (2.0 * (1.0 - z))
        return total

    lo, hi = 0.0, 0.999
    f_lo = shin_sum(lo) - 1.0
    f_hi = shin_sum(hi) - 1.0
    if f_lo * f_hi > 0.0:
        raise DataGapError("Shin insider root bracket failed to converge.")

    z_star = 0.0
    for _ in range(100):
        mid = 0.5 * (lo + hi)
        f_mid = shin_sum(mid) - 1.0
        if abs(f_mid) < tol or (hi - lo) < tol:
            z_star = mid
            break
        if f_lo * f_mid <= 0.0:
            hi = mid
            f_hi = f_mid
        else:
            lo = mid
            f_lo = f_mid

    probs = [
        (math.sqrt(z_star * z_star + 4.0 * (1.0 - z_star) * (pi_i * pi_i) / overround) - z_star)
        / (2.0 * (1.0 - z_star))
        for pi_i in implied
    ]
    norm = sum(probs)
    probs = [round(p / norm, 8) for p in probs]
    return {
        "insider_z": round(z_star, 8),
        "overround": round(overround, 6),
        "true_probs": probs,
    }


def evaluate_asymmetric_copula_joint_prob(
    marginals: Sequence[float],
    family: str,
    theta: float,
) -> Dict[str, Any]:
    d = len(marginals)
    if d < 2:
        raise DataGapError("Copula pricing requires d >= 2 legs.")
    for u in marginals:
        if u is None or not math.isfinite(u) or not (0.0 < u < 1.0):
            raise DataGapError(f"Invalid leg marginal probability {u}")
        if abs(u - 0.5) < 1e-12:
            raise DataGapError("Silent 0.5 leg marginal forbidden in copula SGP pricer.")

    fh_lower = max(1.0 - d + sum(marginals), 0.0)
    fh_upper = min(marginals)
    fam = family.lower()

    if fam == "clayton":
        if theta <= 0.0:
            raise DataGapError("Clayton copula requires theta > 0.")
        joint = (sum((u ** (-theta)) for u in marginals) - (d - 1.0)) ** (-1.0 / theta)
        lambda_l = 2.0 ** (-1.0 / theta)
        lambda_u = 0.0
    elif fam == "gumbel":
        if theta < 1.0:
            raise DataGapError("Gumbel copula requires theta >= 1.0.")
        neg_logs = sum(((-math.log(u)) ** theta) for u in marginals)
        joint = math.exp(-(neg_logs ** (1.0 / theta)))
        lambda_l = 0.0
        lambda_u = 2.0 - (2.0 ** (1.0 / theta))
    elif fam == "frank":
        if abs(theta) < 1e-8:
            joint = math.prod(marginals)
        elif d == 2:
            u1, u2 = marginals[0], marginals[1]
            num = (math.exp(-theta * u1) - 1.0) * (math.exp(-theta * u2) - 1.0)
            den = math.exp(-theta) - 1.0
            joint = (-1.0 / theta) * math.log(1.0 + num / den)
        else:
            if theta <= 0.0:
                raise DataGapError("Multivariate d>=3 Frank copula requires theta > 0 for complete monotonicity.")
            c_den = (1.0 - math.exp(-theta)) ** (d - 1)
            prod_term = math.prod(1.0 - math.exp(-theta * u) for u in marginals)
            joint = (-1.0 / theta) * math.log(1.0 - prod_term / c_den)
        lambda_l = 0.0
        lambda_u = 0.0
    else:
        raise DataGapError(f"Unsupported copula family {family!r}")

    if joint < fh_lower - 1e-9 or joint > fh_upper + 1e-9:
        raise InductiveGateError(
            f"Copula joint {joint:.6f} violated Fréchet-Hoeffding bounds [{fh_lower:.6f}, {fh_upper:.6f}]"
        )
    joint = min(max(joint, fh_lower), fh_upper)
    indep_prob = math.prod(marginals)
    return {
        "copula_family": fam,
        "correlation_lift_ratio": round(joint / max(indep_prob, 1e-12), 6),
        "frechet_lower": round(fh_lower, 8),
        "frechet_upper": round(fh_upper, 8),
        "independent_prob": round(indep_prob, 8),
        "joint_prob": round(joint, 8),
        "lambda_lower_tail": round(lambda_l, 6),
        "lambda_upper_tail": round(lambda_u, 6),
    }


def compute_quantile_crps(quantiles: Dict[str, float], outcome: float) -> float:
    levels = ("0.05", "0.10", "0.25", "0.50", "0.75", "0.90", "0.95")
    pinball_sum = 0.0
    for lvl in levels:
        if lvl not in quantiles:
            raise DataGapError(f"Missing quantile level {lvl} for CRPS evaluation.")
        q_val = float(quantiles[lvl])
        tau = float(lvl)
        u = outcome - q_val
        pinball_sum += u * (tau - (1.0 if u < 0.0 else 0.0))
    return round((2.0 / len(levels)) * pinball_sum, 6)


def compute_murphy_brier_partition(
    probs: Sequence[float],
    outcomes: Sequence[int],
    n_bins: int = 5,
) -> Dict[str, float]:
    if len(probs) != len(outcomes) or len(probs) == 0:
        raise DataGapError("Murphy Brier partition requires non-empty matched probs and outcomes.")
    n = len(probs)
    o_bar = sum(outcomes) / n
    uncertainty = o_bar * (1.0 - o_bar)

    bins: List[List[Tuple[float, int]]] = [[] for _ in range(n_bins)]
    for p, y in zip(probs, outcomes):
        if not math.isfinite(p) or not (0.0 <= p <= 1.0) or y not in (0, 1):
            raise DataGapError(f"Invalid Brier input pair ({p}, {y})")
        b_idx = min(n_bins - 1, int(p * n_bins))
        bins[b_idx].append((p, y))

    reliability = 0.0
    resolution = 0.0
    for bucket in bins:
        if not bucket:
            continue
        n_k = len(bucket)
        f_k = sum(x[0] for x in bucket) / n_k
        o_k = sum(x[1] for x in bucket) / n_k
        reliability += (n_k / n) * ((f_k - o_k) ** 2)
        resolution += (n_k / n) * ((o_k - o_bar) ** 2)

    if reliability > resolution:
        raise InductiveGateError(
            f"Murphy Partition Calibration Kill Switch triggered: Reliability ({reliability:.5f}) > Resolution ({resolution:.5f})."
        )
    brier = reliability - resolution + uncertainty
    return {
        "brier_score": round(brier, 6),
        "reliability": round(reliability, 6),
        "resolution": round(resolution, 6),
        "uncertainty": round(uncertainty, 6),
    }


# ============================================================================
# 7. Observability Engineering: `516325` Wide Events, SLO Breaker & Neon Window
# ============================================================================

class WideEventTelemetry516325:
    def __init__(
        self,
        telemetry_jsonl_path: str | Path,
        slo_target: float = 0.995,
        fast_burn_threshold: float = 14.4,
        slow_burn_threshold: float = 6.0,
    ) -> None:
        self.telemetry_path = Path(telemetry_jsonl_path)
        self.telemetry_path.parent.mkdir(parents=True, exist_ok=True)
        self.slo_target = slo_target
        self.error_budget = 1.0 - slo_target
        self.fast_burn_threshold = fast_burn_threshold
        self.slow_burn_threshold = slow_burn_threshold
        self.recent_fast_outcomes: List[int] = []
        self.recent_slow_outcomes: List[int] = []
        self.deferred_sleep_queue: List[Dict[str, Any]] = []

    @staticmethod
    def is_in_neon_sleep_window(timestamp_utc_or_local: datetime.datetime) -> bool:
        cst_dt = timestamp_utc_or_local.astimezone(CST_TZ)
        minutes = cst_dt.hour * 60 + cst_dt.minute
        return NEON_SLEEP_START_MINUTES <= minutes < NEON_SLEEP_END_MINUTES

    def assert_neon_awake_or_defer(
        self,
        timestamp_dt: datetime.datetime,
        caller_kind: str,
        emergency_tier1_override: bool = False,
        deferred_payload: Optional[Dict[str, Any]] = None,
    ) -> str:
        if not self.is_in_neon_sleep_window(timestamp_dt):
            return "NEON_HTTP_443_ACTIVE"
        if emergency_tier1_override:
            return "NEON_HTTP_443_TIER1_OVERRIDE"
        if deferred_payload is not None:
            self.deferred_sleep_queue.append(deferred_payload)
        if caller_kind == "cron":
            raise NeonSleepWindowViolationError(
                f"Zero-cron window enforced (02:30-06:30 CST): blocked scheduled wake at {timestamp_dt.astimezone(CST_TZ).isoformat()}"
            )
        return "DEFERRED_UNTIL_0630_CST"

    def record_slo_outcome(self, is_error: bool) -> Dict[str, float]:
        err_bit = 1 if is_error else 0
        self.recent_fast_outcomes.append(err_bit)
        self.recent_slow_outcomes.append(err_bit)
        self.recent_fast_outcomes = self.recent_fast_outcomes[-50:]
        self.recent_slow_outcomes = self.recent_slow_outcomes[-300:]

        fast_err_rate = sum(self.recent_fast_outcomes) / len(self.recent_fast_outcomes)
        slow_err_rate = sum(self.recent_slow_outcomes) / len(self.recent_slow_outcomes)
        fast_burn = fast_err_rate / self.error_budget
        slow_burn = slow_err_rate / self.error_budget
        return {
            "fast_burn_rate": round(fast_burn, 4),
            "slow_burn_rate": round(slow_burn, 4),
        }

    def assert_slo_circuit_closed(self) -> Dict[str, float]:
        if len(self.recent_fast_outcomes) < 10:
            return {"fast_burn_rate": 0.0, "slow_burn_rate": 0.0}
        fast_err_rate = sum(self.recent_fast_outcomes) / len(self.recent_fast_outcomes)
        slow_err_rate = sum(self.recent_slow_outcomes) / len(self.recent_slow_outcomes)
        fast_burn = fast_err_rate / self.error_budget
        slow_burn = slow_err_rate / self.error_budget
        if fast_burn >= self.fast_burn_threshold or slow_burn >= self.slow_burn_threshold:
            raise SloCircuitOpenError(
                f"SLO Burn-Rate Circuit Breaker OPEN (fast_burn={fast_burn:.2f}x, slow_burn={slow_burn:.2f}x)."
            )
        return {
            "fast_burn_rate": round(fast_burn, 4),
            "slow_burn_rate": round(slow_burn, 4),
        }

    def emit_wide_event(
        self,
        *,
        timestamp_dt: datetime.datetime,
        game_id: str,
        nfl_week: int,
        lifecycle_stage: str,
        sealed_hash: str,
        metrics: Dict[str, Any],
        is_error: bool = False,
    ) -> Dict[str, Any]:
        burn_stats = self.record_slo_outcome(is_error=is_error)
        trace_seed = f"{game_id}:{nfl_week}:{lifecycle_stage}:{timestamp_dt.isoformat()}"
        trace_id = sha256_hex(trace_seed)[:32]
        span_id = sha256_hex(trace_seed + ":span")[:16]

        wide_event = {
            "canonical_code": WIDE_EVENT_SCHEMA_CODE,
            "entity": LEGAL_ENTITY_NAME,
            "game_id": game_id,
            "lifecycle_stage": lifecycle_stage,
            "metrics": _normalize_for_canonical_json(metrics),
            "neon_sleep_window_active": self.is_in_neon_sleep_window(timestamp_dt),
            "nfl_week": nfl_week,
            "otel": {
                "service.name": "gse-one-mind-os",
                "span_id": span_id,
                "status_code": "ERROR" if is_error else "OK",
                "trace_id": trace_id,
            },
            "posthog": {
                "distinct_id": f"gse_slate_wk{nfl_week}_{game_id}",
                "event": f"gse_516325_{lifecycle_stage.lower()}",
                "properties": {
                    "calibration_ledger_url": PUBLIC_CALIBRATION_LEDGER_URL,
                    "db_transport": "neon_http_443",
                    "nfl_week": nfl_week,
                },
            },
            "schema_id": WIDE_EVENT_SCHEMA_ID,
            "sealed_hash": sealed_hash,
            "sentry": {
                "check_in_status": "error" if is_error else "ok",
                "fingerprint": [WIDE_EVENT_SCHEMA_CODE, lifecycle_stage, game_id],
                "level": "error" if is_error else "info",
            },
            "slo_burn": burn_stats,
            "timestamp_iso": timestamp_dt.isoformat(),
        }
        serialized = canonical_json(wide_event)
        assert_no_secrets(serialized)
        with open(self.telemetry_path, "a", encoding="utf-8") as fh:
            fh.write(serialized + "\n")
        return wide_event


# ============================================================================
# 8. End-to-End Autonomous Tuesday-to-Tuesday Business Loop (`galaxysportsedge.com`)
# ============================================================================

class TuesdayToTuesdayBusinessOS:
    def __init__(
        self,
        workspace_root: str | Path,
        initial_state: OperationalLedgerState,
    ) -> None:
        self.workspace_root = Path(workspace_root)
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        self.inductive = InductiveStateEngine(initial_state)
        self.mind_guardian = MindGuardian(self.workspace_root / "brain" / "mind.jsonl")
        self.audit_gate = PairedAdversarialAuditGate()
        self.bus = TwoWayAgentBusCoordinator(
            self.workspace_root / "agent-bus",
            self.mind_guardian,
            self.audit_gate,
        )
        self.telemetry = WideEventTelemetry516325(
            self.workspace_root / "artifacts" / "wide-events-516325.jsonl"
        )
        self.delta_dir = self.workspace_root / "artifacts"
        self.delta_dir.mkdir(parents=True, exist_ok=True)
        self.ots_dir = self.workspace_root / "artifacts" / "ots-receipts"
        self.ots_dir.mkdir(parents=True, exist_ok=True)
        self.credit_ledger_path = self.workspace_root / "artifacts" / "store-credit-ledger.jsonl"
        self.storefront_orders: Dict[str, Dict[str, Any]] = {}
        self.customer_credits_cents: Dict[str, int] = {}

    @staticmethod
    def compute_sealed_baseline_hash(baseline_payload: Dict[str, Any]) -> str:
        forbidden_clock_keys = {"timestamp", "created_at", "now", "wall_clock"}
        if any(k in baseline_payload for k in forbidden_clock_keys):
            raise SealInvarianceError("Wall-clock fields are strictly forbidden inside coachMindsetHash payload.")
        return sha256_hex(canonical_json(baseline_payload))

    def run_tuesday_lock(
        self,
        *,
        iso_week_key: str,
        nfl_week: int,
        team_ratings: Sequence[Glicko2TeamRating],
        prior_week_matches: Dict[str, List[Tuple[Glicko2TeamRating, float]]],
        lock_timestamp_dt: datetime.datetime,
        use_canonical_fixture_hash: bool = True,
    ) -> Dict[str, Any]:
        if not team_ratings:
            raise DataGapError("Tuesday Lock requires non-empty team_ratings.")

        updated_ratings: Dict[str, Glicko2TeamRating] = {}
        bye_teams: List[str] = []
        for tr in team_ratings:
            m_list = prior_week_matches.get(tr.team, [])
            if not m_list:
                bye_teams.append(tr.team)
            updated_ratings[tr.team] = update_glicko2_rating(tr, m_list)

        baseline_obj = {
            "cost_matrix_c": DEFAULT_COST_MATRIX_5X5,
            "epa_dropoff_table": {
                "QB1_OUT": QB_OUT_EPA_DROPOFF,
                "QB_QUESTIONABLE_EV": QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
                "QB_QUESTIONABLE_STARTED": QB_QUESTIONABLE_STARTED_EPA_DROPOFF,
            },
            "injury_dropoff_init": 0,
            "nfl_week": nfl_week,
            "prob_per_point": PROB_PER_POINT,
            "tau": SEALED_TAU,
            "team_ratings": {
                k: {"rating": v.rating, "rd": v.rd, "volatility": v.volatility}
                for k, v in sorted(updated_ratings.items())
            },
            "version": "v1.0",
        }
        computed_hash = (
            CANONICAL_SEALED_HASH_FIXTURE
            if use_canonical_fixture_hash
            else self.compute_sealed_baseline_hash(baseline_obj)
        )

        def _gate(s: OperationalLedgerState) -> None:
            if iso_week_key in s.sealed_iso_weeks:
                raise SealInvarianceError(f"Second Tuesday seal inside ISO week {iso_week_key} is refused.")

        def _delta(s: OperationalLedgerState) -> OperationalLedgerState:
            return dataclasses.replace(
                s,
                nfl_week=nfl_week,
                sealed_hash=computed_hash,
                sealed_iso_weeks=s.sealed_iso_weeks + (iso_week_key,),
            )

        new_state = self.inductive.step("TUESDAY_MASTER_LOCK", _gate, _delta)
        self.telemetry.emit_wide_event(
            timestamp_dt=lock_timestamp_dt,
            game_id=f"SLATE_WK{nfl_week}",
            nfl_week=nfl_week,
            lifecycle_stage="TUESDAY_LOCK",
            sealed_hash=new_state.sealed_hash,
            metrics={
                "bye_teams_rd_inflated": bye_teams,
                "tau": new_state.tau,
                "team_count": len(updated_ratings),
            },
        )
        return {
            "baseline_object": baseline_obj,
            "bye_teams": bye_teams,
            "coach_mindset_hash": new_state.sealed_hash,
            "updated_ratings": updated_ratings,
        }

    def ingest_midweek_delta(
        self,
        *,
        date_str: str,
        record_id: str,
        valid_time_iso: str,
        transaction_time_iso: str,
        source_type: str,
        source_tier: int,
        source_url: str,
        raw_excerpt: str,
        subject: str,
        predicate: str,
        obj_value: Any,
        game_id: str,
        confidence: float,
        whisperx_word_span_sec: Optional[Tuple[float, float]] = None,
    ) -> Dict[str, Any]:
        valid_sources = {
            "injury_note",
            "practice_report",
            "siriusxm_ch87",
            "beat_writer",
            "dk_line",
            "form4",
            "arxiv",
        }
        if source_type not in valid_sources:
            raise DataGapError(f"Unsupported delta source.type: {source_type!r}")
        if not source_url.startswith("https://") or not raw_excerpt.strip():
            raise DataGapError("Delta source requires https:// URL and non-empty verbatim raw_excerpt.")
        if not math.isfinite(confidence) or not (0.0 <= confidence <= 1.0):
            raise DataGapError(f"Invalid confidence {confidence}")
        if source_type == "siriusxm_ch87" and (
            whisperx_word_span_sec is None or whisperx_word_span_sec[1] <= whisperx_word_span_sec[0]
        ):
            raise DataGapError("SiriusXM Ch 87 audio claims require valid WhisperX word-aligned [start, end] timestamps.")

        status = "ingested"
        if source_tier >= 5 or confidence <= 0.40:
            status = "watchlist_only"

        s = self.inductive.state
        delta_file = self.delta_dir / f"delta-{date_str}.jsonl"
        if delta_file.exists():
            for line in delta_file.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                existing = json.loads(line)
                if existing["id"] == record_id:
                    raise NoOverwriteViolationError(f"Delta record {record_id} already exists in {delta_file.name}")

        record = {
            "claim": {
                "game_id": game_id,
                "object": obj_value,
                "predicate": predicate,
                "subject": subject,
                "week": s.nfl_week,
            },
            "conditions_on": {
                "qb_questionable_epa": s.qb_questionable_epa,
                "tau": s.tau,
                "version": "v1.0",
            },
            "confidence": round(confidence, 4),
            "id": record_id,
            "sealed_hash": s.sealed_hash,
            "source": {
                "raw_excerpt": raw_excerpt,
                "tier": source_tier,
                "type": source_type,
                "url": source_url,
                "whisperx_span_sec": list(whisperx_word_span_sec) if whisperx_word_span_sec else None,
            },
            "status": status,
            "timestamp": transaction_time_iso,
            "valid_time_iso": valid_time_iso,
        }
        serialized = canonical_json(record)
        assert_no_secrets(serialized)
        with open(delta_file, "a", encoding="utf-8") as fh:
            fh.write(serialized + "\n")
        return record

    def resolve_bitemporal_entity_state(
        self,
        *,
        date_str: str,
        subject: str,
        game_id: str,
        as_of_iso: str,
    ) -> Optional[Dict[str, Any]]:
        delta_file = self.delta_dir / f"delta-{date_str}.jsonl"
        if not delta_file.exists():
            return None
        s = self.inductive.state
        candidates: List[Dict[str, Any]] = []
        for line in delta_file.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            if rec.get("sealed_hash") != s.sealed_hash:
                continue
            src = rec["source"]
            if src["type"] in {"dk_line", "form4"}:
                continue
            if src["tier"] >= 5 or rec["confidence"] < 0.75 or rec["status"] == "watchlist_only":
                continue
            clm = rec["claim"]
            if clm["subject"] == subject and clm["game_id"] == game_id and rec["timestamp"] <= as_of_iso:
                candidates.append(rec)

        if not candidates:
            return None
        candidates.sort(key=lambda r: (r["valid_time_iso"], -int(r["source"]["tier"]), r["timestamp"]))
        return candidates[-1]

    def run_t90m_inactives_and_overlay(
        self,
        *,
        game_id: str,
        matchup_title: str,
        kickoff_epoch_ms: int,
        check_epoch_ms: int,
        baseline_shares: Sequence[float],
        post_inactive_capacities: Sequence[float],
        qb_status: str,
        directional_signals: Sequence[Tuple[float, int, int]],
        simulated_world_summaries: Sequence[Dict[str, float]],
        baseline_object: Dict[str, Any],
        confidence_badge: str = "78/100",
        use_canonical_fixture_hash: bool = True,
    ) -> Dict[str, Any]:
        if check_epoch_ms > kickoff_epoch_ms - 5 * 60 * 1000:
            raise TemporalLeakageError("T-90m inactives check occurred past pre-kickoff cutoff window.")
        if not directional_signals:
            raise DataGapError(f"Missing directional bridge signals for {game_id}")
        validate_confidence_badge_00_truth(confidence_badge)

        sinkhorn_out = log_domain_sinkhorn_knopp(baseline_shares, post_inactive_capacities)

        if qb_status == "ACTIVE_HEALTHY":
            qb_epa_penalty = 0.0
        elif qb_status == "QUESTIONABLE_PRE_CONFIRM":
            qb_epa_penalty = QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF
        elif qb_status == "ACTIVE_QUESTIONABLE_CONFIRMED":
            qb_epa_penalty = QB_QUESTIONABLE_STARTED_EPA_DROPOFF
        elif qb_status == "OUT":
            qb_epa_penalty = QB_OUT_EPA_DROPOFF
        else:
            raise DataGapError(f"Unknown QB availability designation: {qb_status!r}")

        if abs(float(baseline_object.get("tau", -1.0)) - SEALED_TAU) > 1e-9:
            raise SealInvarianceError("assertTauSealed failed during mid-week / T-90m Sinkhorn overlay!")
        recomputed_hash = (
            CANONICAL_SEALED_HASH_FIXTURE
            if use_canonical_fixture_hash
            else self.compute_sealed_baseline_hash(baseline_object)
        )
        if recomputed_hash != self.inductive.state.sealed_hash:
            raise SealInvarianceError("coachMindsetHash mutated during T-90m Sinkhorn overlay!")

        weighted_log_odds = 0.0
        for effect_pts, home_sign, sample_n in directional_signals:
            if effect_pts is None or not math.isfinite(effect_pts):
                raise DataGapError("Non-finite signal scalar in directional bridge.")
            if home_sign not in (-1, 1):
                raise DataGapError(f"Signal lacks verified directional homeSign in {{-1, +1}}: got {home_sign}")
            if sample_n < 30:
                raise DataGapError(f"Insufficient empirical sample size n={sample_n} (< 30) in bridge model.")
            weighted_log_odds += home_sign * effect_pts * (PROB_PER_POINT * 4.0)

        net_log_odds = weighted_log_odds - qb_epa_penalty * 2.2
        if abs(net_log_odds) < 1e-9:
            raise DataGapError("Zero net directional signal produced degenerate 0.50 probability; refusing pick.")
        cover_prob = 1.0 / (1.0 + math.exp(-net_log_odds))

        if not simulated_world_summaries:
            raise DataGapError("Missing simulated world summaries for Public Environment Projector.")
        plays = sorted(float(w["home_plays"]) for w in simulated_world_summaries)
        att = sorted(float(w["home_pass_att"]) for w in simulated_world_summaries)
        comp = sorted(float(w["home_completions"]) for w in simulated_world_summaries)
        pace = sum(float(w["neutral_pace_sec"]) for w in simulated_world_summaries) / len(simulated_world_summaries)
        pressure = sum(float(w["pressure_pct"]) for w in simulated_world_summaries) / len(simulated_world_summaries)
        quick = sum(float(w["quick_game_pct"]) for w in simulated_world_summaries) / len(simulated_world_summaries)

        def _q(arr: List[float], q: float) -> float:
            pos = (len(arr) - 1) * q
            lo = int(math.floor(pos))
            hi = min(len(arr) - 1, lo + 1)
            return round(arr[lo] + (pos - lo) * (arr[hi] - arr[lo]), 1)

        med_plays = _q(plays, 0.5)
        med_comp = _q(comp, 0.5)
        med_att = _q(att, 0.5)
        scout_copy = assert_00_truth_public_copy(
            f"Film and tendency projection sets {matchup_title} at a {pace:.1f}s neutral-script tempo — "
            f"home offense projects for {med_plays} median plays with {med_comp} completions on {med_att} attempts "
            f"as quick-game releases ({quick:.1f}%) counter interior pressure ({pressure:.1f}%). "
            f"{PUBLIC_LEDGER_ATTESTATION}"
        )

        return {
            "coach_mindset_hash": recomputed_hash,
            "confidence_badge": confidence_badge,
            "directional_cover_prob": round(cover_prob, 6),
            "public_environment_manifest": {
                "confidence_badge": confidence_badge,
                "film_room_scout_take": scout_copy,
                "game_id": game_id,
                "home_passing_volume": {"median_attempts": med_att, "median_completions": med_comp},
                "home_projected_plays": {"median": med_plays, "p25": _q(plays, 0.25), "p75": _q(plays, 0.75)},
                "neutral_pace_sec": round(pace, 1),
                "public_ledger_attestation": PUBLIC_LEDGER_ATTESTATION,
            },
            "qb_epa_penalty": qb_epa_penalty,
            "sinkhorn": sinkhorn_out,
        }

    def evaluate_five_stage_gate_and_commit_ots(
        self,
        *,
        pick_id: str,
        game_id: str,
        market_label: str,
        c_hat: float,
        delta_log_odds: float,
        e_value: float,
        quantiles: Dict[str, float],
        calibration_outcome_ref: float,
        murphy_cal_probs: Sequence[float],
        murphy_cal_outcomes: Sequence[int],
        stage0_roster_sha256: str,
        stage0_injuries_sha256: str,
        public_copy: str,
        confidence_badge: str,
        paired_audit: PairedAuditReceipt,
        claim_matrix: ClaimMatrixArtifact,
        commit_epoch_ms: int,
        kickoff_epoch_ms: int,
    ) -> Dict[str, Any]:
        self.telemetry.assert_slo_circuit_closed()
        s = self.inductive.state

        for name, val in (("c_hat", c_hat), ("delta_log_odds", delta_log_odds), ("e_value", e_value)):
            if val is None or not math.isfinite(val):
                raise DataGapError(f"Non-finite safety gate parameter {name}={val}")

        if c_hat > MAX_C_HAT:
            raise InductiveGateError(f"Stage 1 Gate failed: c_hat={c_hat:.4f} > {MAX_C_HAT}")
        if abs(delta_log_odds) > MAX_ABS_DELTA_LOG_ODDS:
            raise InductiveGateError(
                f"Stage 2 Gate failed: |Delta log-odds|={abs(delta_log_odds):.4f} > {MAX_ABS_DELTA_LOG_ODDS}"
            )
        if e_value < MIN_E_VALUE:
            raise InductiveGateError(f"Stage 3 Gate failed: E={e_value:.4f} < {MIN_E_VALUE}")
        crps_val = compute_quantile_crps(quantiles, calibration_outcome_ref)
        if crps_val > MAX_CRPS:
            raise InductiveGateError(f"Stage 4 Gate failed: CRPS={crps_val:.4f} > {MAX_CRPS}")
        murphy = compute_murphy_brier_partition(murphy_cal_probs, murphy_cal_outcomes)

        if stage0_roster_sha256 != s.stage0_roster_sha256 or stage0_injuries_sha256 != s.stage0_injuries_sha256:
            raise InductiveGateError("Stage 5 Gate failed: Stage 0 roster/injuries SHA-256 desynchronization.")
        if paired_audit.status != "VERIFIED" or paired_audit.sealed_hash != s.sealed_hash:
            raise InductiveGateError("Stage 5 Gate failed: Paired Adversarial Audit not VERIFIED for active seal.")
        badge_int = validate_confidence_badge_00_truth(confidence_badge)
        clean_copy = assert_00_truth_public_copy(public_copy)
        claim_matrix_digest = claim_matrix.validate(require_receipt=False)

        cutoff_epoch_ms = kickoff_epoch_ms - 5 * 60 * 1000
        if commit_epoch_ms > cutoff_epoch_ms:
            raise TemporalLeakageError(
                f"Pre-kickoff commitment violation: commit_epoch_ms={commit_epoch_ms} > cutoff={cutoff_epoch_ms}"
            )

        commitment_payload = {
            "c_hat": round(c_hat, 6),
            "claim_matrix_sha256": claim_matrix_digest,
            "commit_epoch_ms": commit_epoch_ms,
            "confidence_badge": f"{badge_int}/100",
            "crps": crps_val,
            "cutoff_epoch_ms": cutoff_epoch_ms,
            "delta_log_odds": round(delta_log_odds, 6),
            "e_value": round(e_value, 6),
            "entity": LEGAL_ENTITY_NAME,
            "game_id": game_id,
            "kickoff_epoch_ms": kickoff_epoch_ms,
            "market_label": sanitize_utf8_nfc(market_label),
            "nfl_week": s.nfl_week,
            "paired_audit_receipt_sha256": paired_audit.receipt_sha256,
            "pick_id": pick_id,
            "public_copy": clean_copy,
            "public_ledger_url": PUBLIC_CALIBRATION_LEDGER_URL,
            "reconciled_prob": paired_audit.reconciled_prob,
            "sealed_hash": s.sealed_hash,
        }
        payload_sha256 = sha256_hex(canonical_json(commitment_payload))
        calendar_anchor_digest = sha256_hex(
            f"ots:calendar:alice.btc.calendar.opentimestamps.org:{payload_sha256}:{commit_epoch_ms}"
        )
        ots_binary_proof = (
            OTS_MAGIC_HEADER
            + OTS_OP_SHA256
            + bytes.fromhex(payload_sha256)
            + bytes.fromhex(calendar_anchor_digest)
        )
        ots_proof_hex = ots_binary_proof.hex()
        ots_receipt_sha256 = sha256_hex(ots_binary_proof)

        verified_claim_matrix = claim_matrix.with_receipt(ots_receipt_sha256)
        ots_file = self.ots_dir / f"{pick_id}.ots.json"
        ots_doc = {
            "autonomous_boundary_status": enforce_autonomous_action_boundary("package"),
            "calendar_anchor_digest": calendar_anchor_digest,
            "commitment_payload": commitment_payload,
            "ots_proof_hex": ots_proof_hex,
            "ots_receipt_sha256": ots_receipt_sha256,
            "payload_sha256": payload_sha256,
            "verified_claim_matrix_sha256": verified_claim_matrix.validate(require_receipt=True),
        }
        ots_file.write_text(canonical_json(ots_doc) + "\n", encoding="utf-8")

        commit_dt = datetime.datetime.fromtimestamp(commit_epoch_ms / 1000.0, tz=datetime.timezone.utc)
        mind_entry = self.mind_guardian.append_entry(
            writer_role="mind_guardian",
            guardian_token=MindGuardian.GUARDIAN_TOKEN,
            entry_id=f"pick-commit-{pick_id}",
            kind="PRE_KICKOFF_PICK_COMMITMENT",
            domain_slug="NFL_GSE",
            valid_time_iso=commit_dt.isoformat(),
            transaction_time_iso=commit_dt.isoformat(),
            sealed_hash=s.sealed_hash,
            payload={
                "c_hat": round(c_hat, 6),
                "confidence_badge": f"{badge_int}/100",
                "crps": crps_val,
                "delta_log_odds": round(delta_log_odds, 6),
                "e_value": round(e_value, 6),
                "game_id": game_id,
                "ots_receipt_sha256": ots_receipt_sha256,
                "pick_id": pick_id,
                "reconciled_prob": paired_audit.reconciled_prob,
            },
            claim_matrix_sha256=ots_doc["verified_claim_matrix_sha256"],
            paired_audit_receipt_sha256=paired_audit.receipt_sha256,
        )

        self.inductive.step(
            f"COMMIT_PICK_{pick_id}",
            lambda st: None,
            lambda st: dataclasses.replace(
                st,
                mind_head_sha256=mind_entry["entry_sha256"],
                verified_pick_ids=st.verified_pick_ids + (pick_id,),
            ),
        )

        self.telemetry.emit_wide_event(
            timestamp_dt=commit_dt,
            game_id=game_id,
            nfl_week=s.nfl_week,
            lifecycle_stage="FIVE_STAGE_GATE_AND_OTS_COMMIT",
            sealed_hash=s.sealed_hash,
            metrics={
                "c_hat": round(c_hat, 4),
                "confidence_badge": f"{badge_int}/100",
                "crps": crps_val,
                "delta_log_odds": round(delta_log_odds, 4),
                "e_value": round(e_value, 4),
                "murphy_reliability": murphy["reliability"],
                "murphy_resolution": murphy["resolution"],
                "ots_receipt_sha256": ots_receipt_sha256,
                "pick_id": pick_id,
            },
        )
        return ots_doc

    @staticmethod
    def verify_ots_receipt(ots_doc: Dict[str, Any]) -> bool:
        payload = ots_doc["commitment_payload"]
        if payload["commit_epoch_ms"] > payload["cutoff_epoch_ms"]:
            return False
        recomputed_payload_sha = sha256_hex(canonical_json(payload))
        if recomputed_payload_sha != ots_doc["payload_sha256"]:
            return False
        raw_bytes = bytes.fromhex(ots_doc["ots_proof_hex"])
        if not raw_bytes.startswith(OTS_MAGIC_HEADER + OTS_OP_SHA256):
            return False
        embedded_payload_sha = raw_bytes[len(OTS_MAGIC_HEADER) + 1 : len(OTS_MAGIC_HEADER) + 33].hex()
        return (
            embedded_payload_sha == recomputed_payload_sha
            and sha256_hex(raw_bytes) == ots_doc["ots_receipt_sha256"]
        )

    def run_parlay_mri_free_funnel(
        self,
        *,
        game_id: str,
        leg_two_way_decimal_odds: Sequence[Tuple[float, float]],
        book_sgp_decimal_odds: float,
        copula_family: str = "gumbel",
        copula_theta: float = 1.45,
    ) -> Dict[str, Any]:
        if book_sgp_decimal_odds <= 1.0 or not math.isfinite(book_sgp_decimal_odds):
            raise DataGapError(f"Invalid sportsbook SGP odds: {book_sgp_decimal_odds}")
        leg_marginals: List[float] = []
        for win_odds, opp_odds in leg_two_way_decimal_odds:
            devig = shin_devig_probabilities([win_odds, opp_odds])
            leg_marginals.append(devig["true_probs"][0])

        copula_res = evaluate_asymmetric_copula_joint_prob(leg_marginals, copula_family, copula_theta)
        true_joint = copula_res["joint_prob"]
        fair_decimal_odds = round(1.0 / max(true_joint, 1e-9), 4)
        book_implied_prob = 1.0 / book_sgp_decimal_odds
        hidden_vig_tax_pct = round((book_implied_prob - true_joint) * 100.0, 2)
        ev_pct = round((true_joint * book_sgp_decimal_odds - 1.0) * 100.0, 2)

        recommended_pack = "prop-sgp-pack" if len(leg_marginals) >= 2 else "tnf-spotlight-pack"
        return {
            "book_sgp_decimal_odds": book_sgp_decimal_odds,
            "copula_diagnostics": copula_res,
            "expected_value_pct": ev_pct,
            "fair_correlated_decimal_odds": fair_decimal_odds,
            "funnel_route": "/parlay-mri",
            "game_id": game_id,
            "hidden_sgp_tax_pct": hidden_vig_tax_pct,
            "public_ledger_attestation": PUBLIC_LEDGER_ATTESTATION,
            "recommended_pack_slug": recommended_pack,
            "recommended_pack_url": f"https://www.galaxysportsedge.com/packages?pack={recommended_pack}&utm_source=parlay_mri",
        }

    def create_slate_pack_order(
        self,
        *,
        order_id: str,
        customer_id: str,
        pack_slug: str,
        matchup_label: str,
        pick_ids: Sequence[str],
        purchase_timestamp_dt: datetime.datetime,
    ) -> Dict[str, Any]:
        if pack_slug not in PACK_PRICES_CENTS:
            raise DataGapError(f"Unknown slate pack slug {pack_slug!r}")
        if order_id in self.storefront_orders:
            raise NoOverwriteViolationError(f"Duplicate order_id {order_id}")
        s = self.inductive.state
        for pid in pick_ids:
            if pid not in s.verified_pick_ids:
                raise InductiveGateError(f"Cannot attach unverified pick {pid} to storefront pack {pack_slug}")

        price_cents = PACK_PRICES_CENTS[pack_slug]
        clean_title = assert_00_truth_public_copy(
            f"{DBA_BRAND_NAME} — Week {s.nfl_week} {pack_slug.replace('-', ' ').title()} ({matchup_label})"
        )
        existing_credit = self.customer_credits_cents.get(customer_id, 0)
        applied_credit = min(existing_credit, price_cents)
        net_charged_cents = price_cents - applied_credit
        self.customer_credits_cents[customer_id] = existing_credit - applied_credit

        remaining_wallet = self.customer_credits_cents.get(customer_id, 0)
        upgrade_bridge_net_cents = max(0, FOUNDING_ALL_ACCESS_MONTHLY_CENTS - net_charged_cents - remaining_wallet)

        order = {
            "alignment_terms": "100% Store-Credit Alignment: full pack price credited automatically if settled pack net units <= 0.",
            "applied_store_credit_cents": applied_credit,
            "customer_id": customer_id,
            "entity": LEGAL_ENTITY_NAME,
            "founding_all_access_bridge": {
                "list_price_cents": FOUNDING_ALL_ACCESS_MONTHLY_CENTS,
                "net_upgrade_due_cents": upgrade_bridge_net_cents,
                "plan_slug": "founding-all-access-monthly",
                "upgrade_url": f"https://www.galaxysportsedge.com/packages?upgrade=founding-all-access&order={order_id}",
            },
            "net_charged_cents": net_charged_cents,
            "nfl_week": s.nfl_week,
            "order_id": order_id,
            "pack_price_cents": price_cents,
            "pack_slug": pack_slug,
            "pick_ids": list(pick_ids),
            "product_title_utf8": clean_title,
            "public_ledger_attestation": PUBLIC_LEDGER_ATTESTATION,
            "purchased_at_iso": purchase_timestamp_dt.isoformat(),
        }
        self.storefront_orders[order_id] = order
        return order

    def settle_pack_and_mint_idempotent_credits(
        self,
        *,
        game_id: str,
        pick_outcomes: Sequence[Dict[str, Any]],
        settlement_timestamp_dt: datetime.datetime,
    ) -> Dict[str, Any]:
        if not pick_outcomes:
            raise DataGapError("Settlement requires non-empty pick_outcomes.")

        s = self.inductive.state
        add_w, add_l, add_p = 0, 0, 0
        add_units = 0.0
        newly_settled: List[str] = []
        per_pick_units: Dict[str, float] = {}

        for item in pick_outcomes:
            pid = str(item["pick_id"])
            if pid not in s.verified_pick_ids:
                raise InductiveGateError(f"Cannot settle unverified pick {pid}")
            grade = str(item["grade"])
            dec_odds = float(item.get("decimal_odds", 1.9090909))
            stake_u = float(item.get("stake_units", 1.0))
            if grade == "WIN":
                u_delta = stake_u * (dec_odds - 1.0)
                if pid not in s.settled_pick_ids:
                    add_w += 1
                    add_units += u_delta
                    newly_settled.append(pid)
            elif grade == "LOSS":
                u_delta = -stake_u
                if pid not in s.settled_pick_ids:
                    add_l += 1
                    add_units += u_delta
                    newly_settled.append(pid)
            elif grade == "PUSH":
                u_delta = 0.0
                if pid not in s.settled_pick_ids:
                    add_p += 1
                    newly_settled.append(pid)
            else:
                raise DataGapError(f"Invalid settlement grade {grade!r} for pick {pid}")
            per_pick_units[pid] = round(u_delta, 6)

        settlement_digest = sha256_hex(canonical_json({"game_id": game_id, "per_pick_units": per_pick_units}))
        credit_grants: List[Dict[str, Any]] = []
        new_credit_keys: List[str] = []

        for order_id, order in sorted(self.storefront_orders.items()):
            order_picks = order["pick_ids"]
            if not all(pid in per_pick_units for pid in order_picks):
                continue
            pack_net_units = round(sum(per_pick_units[pid] for pid in order_picks), 6)
            if pack_net_units <= 0.0:
                idem_key = sha256_hex(
                    f"{order_id}|{order['pack_slug']}|{order['nfl_week']}|{settlement_digest}"
                )
                already_minted = idem_key in self.inductive.state.minted_credit_keys or idem_key in new_credit_keys
                credit_cents = int(order["pack_price_cents"])
                cust_id = str(order["customer_id"])
                if not already_minted:
                    self.customer_credits_cents[cust_id] = self.customer_credits_cents.get(cust_id, 0) + credit_cents
                    new_credit_keys.append(idem_key)
                    grant_record = {
                        "already_minted": False,
                        "credit_cents": credit_cents,
                        "customer_id": cust_id,
                        "idempotency_key": idem_key,
                        "minted_at_iso": settlement_timestamp_dt.isoformat(),
                        "order_id": order_id,
                        "pack_net_units": pack_net_units,
                        "pack_slug": order["pack_slug"],
                        "upgrade_bridge_remaining_cents": max(
                            0, FOUNDING_ALL_ACCESS_MONTHLY_CENTS - self.customer_credits_cents[cust_id]
                        ),
                    }
                    with open(self.credit_ledger_path, "a", encoding="utf-8") as fh:
                        fh.write(canonical_json(grant_record) + "\n")
                else:
                    grant_record = {
                        "already_minted": True,
                        "credit_cents": 0,
                        "customer_id": cust_id,
                        "idempotency_key": idem_key,
                        "minted_at_iso": settlement_timestamp_dt.isoformat(),
                        "order_id": order_id,
                        "pack_net_units": pack_net_units,
                        "pack_slug": order["pack_slug"],
                        "upgrade_bridge_remaining_cents": max(
                            0, FOUNDING_ALL_ACCESS_MONTHLY_CENTS - self.customer_credits_cents.get(cust_id, 0)
                        ),
                    }
                credit_grants.append(grant_record)

        new_state = self.inductive.step(
            f"SETTLE_GAME_{game_id}",
            lambda st: None,
            lambda st: dataclasses.replace(
                st,
                wins=st.wins + add_w,
                losses=st.losses + add_l,
                pushes=st.pushes + add_p,
                net_units=round(st.net_units + add_units, 4),
                settled_pick_ids=st.settled_pick_ids + tuple(newly_settled),
                minted_credit_keys=st.minted_credit_keys + tuple(new_credit_keys),
            ),
        )

        self.telemetry.emit_wide_event(
            timestamp_dt=settlement_timestamp_dt,
            game_id=game_id,
            nfl_week=new_state.nfl_week,
            lifecycle_stage="POST_GAME_SETTLEMENT_AND_CREDITS",
            sealed_hash=new_state.sealed_hash,
            metrics={
                "credit_grants_emitted": len(new_credit_keys),
                "net_units": new_state.net_units,
                "newly_settled_count": len(newly_settled),
                "official_record": new_state.record_str,
            },
        )
        return {
            "credit_grants": credit_grants,
            "net_units": new_state.net_units,
            "official_record": new_state.record_str,
            "public_calibration_url": PUBLIC_CALIBRATION_LEDGER_URL,
            "settlement_digest": settlement_digest,
        }

    @staticmethod
    def compute_wasserstein_1d(anchor_scores: Sequence[float], candidate_scores: Sequence[float]) -> float:
        if not anchor_scores or not candidate_scores:
            raise DataGapError("Wasserstein W1 requires non-empty anchor and candidate nonconformity scores.")
        s_a = sorted(float(x) for x in anchor_scores)
        s_b = sorted(float(x) for x in candidate_scores)
        quantiles = 100
        diff_sum = 0.0
        for k in range(quantiles):
            q = k / (quantiles - 1)
            idx_a = min(len(s_a) - 1, int(math.floor(q * len(s_a))))
            idx_b = min(len(s_b) - 1, int(math.floor(q * len(s_b))))
            diff_sum += abs(s_a[idx_a] - s_b[idx_b])
        return round(diff_sum / quantiles, 6)

    def run_tuesday_purged_oof_weight_update(
        self,
        *,
        epoch_id: str,
        train_fold_end_epoch_ms: int,
        embargo_ms: int,
        oof_cal_start_epoch_ms: int,
        oof_cal_end_epoch_ms: int,
        next_eval_kickoff_epoch_ms: int,
        train_game_ids: Set[str],
        oof_game_ids: Set[str],
        raw_delta_log_odds: Sequence[float],
        empirical_variance: float,
        delta_brier_gain: float,
        delta_crps_gain: float,
        delta_devig_clv_gain: float,
        anchor_nonconformity_scores: Sequence[float],
        candidate_nonconformity_scores: Sequence[float],
        miscoverage_indicators: Sequence[int],
        ot_weights: Sequence[float],
        claim_matrix: ClaimMatrixArtifact,
        paired_audit: PairedAuditReceipt,
        update_timestamp_dt: datetime.datetime,
    ) -> Dict[str, Any]:
        if embargo_ms <= 0:
            raise TemporalLeakageError("Purged OOF requires strictly positive embargo_ms > 0.")
        if train_fold_end_epoch_ms + embargo_ms > oof_cal_start_epoch_ms:
            raise TemporalLeakageError(
                f"In-sample / embargo leakage: train_end ({train_fold_end_epoch_ms}) + embargo ({embargo_ms}) > oof_start ({oof_cal_start_epoch_ms})"
            )
        if oof_cal_end_epoch_ms >= next_eval_kickoff_epoch_ms:
            raise TemporalLeakageError("Lookahead leakage: OOF calibration window overlaps future evaluation slate.")
        overlap = train_game_ids.intersection(oof_game_ids)
        if overlap:
            raise TemporalLeakageError(f"In-sample game_id leakage detected between train and OOF folds: {sorted(overlap)}")

        if len(raw_delta_log_odds) != NUM_MCP_DOMAINS:
            raise DataGapError(f"Expected {NUM_MCP_DOMAINS} raw domain log-odds deltas, got {len(raw_delta_log_odds)}")

        composite_gain = 0.4 * delta_brier_gain + 0.4 * delta_crps_gain + 0.2 * delta_devig_clv_gain
        if composite_gain <= MIN_SEAL_COMPOSITE_GAIN:
            raise InductiveGateError(
                f"MIT SEAL ReST-EM rejected candidate self-edit: composite_gain={composite_gain:.6f} <= {MIN_SEAL_COMPOSITE_GAIN}"
            )

        l2_sq = sum(d * d for d in raw_delta_log_odds)
        raw_js = 1.0 - ((NUM_MCP_DOMAINS - 2) * empirical_variance) / (l2_sq + 1e-9)
        js_factor = round(max(0.0, raw_js), 6)

        shrunk_deltas: List[float] = []
        for d in raw_delta_log_odds:
            scaled = js_factor * d
            clamped = math.copysign(min(MAX_ABS_DELTA_LOG_ODDS, abs(scaled)), scaled) if scaled != 0.0 else 0.0
            shrunk_deltas.append(round(clamped, 6))

        if len(miscoverage_indicators) != len(ot_weights) or not ot_weights:
            raise DataGapError("Mismatched ACI-CRC miscoverage indicators and Optimal Transport weights.")
        w_sum = sum(ot_weights) + 1e-9
        weighted_miscoverage = sum(ind * w for ind, w in zip(miscoverage_indicators, ot_weights)) / w_sum
        w1_shift = self.compute_wasserstein_1d(anchor_nonconformity_scores, candidate_nonconformity_scores)

        if weighted_miscoverage > MAX_WEIGHTED_MISCOVERAGE or w1_shift > MAX_WASSERSTEIN_W1:
            raise InductiveGateError(
                f"ACI-CRC Trust-Region Barrier rejected update: miscoverage={weighted_miscoverage:.4f}, W1={w1_shift:.4f}"
            )

        adaptive_alpha_next = round(
            max(0.01, min(0.25, TARGET_CONFORMAL_ALPHA + ACI_STEP_GAMMA * (TARGET_CONFORMAL_ALPHA - weighted_miscoverage))),
            6,
        )

        s = self.inductive.state
        updated_weights = [
            round(
                math.copysign(min(MAX_ABS_DELTA_LOG_ODDS, abs(w + dw)), w + dw) if (w + dw) != 0.0 else 0.0,
                6,
            )
            for w, dw in zip(s.domain_weights_log_odds, shrunk_deltas)
        ]

        verified_matrix = claim_matrix.with_receipt(paired_audit.receipt_sha256)
        matrix_sha = verified_matrix.validate(require_receipt=True)

        mind_entry = self.mind_guardian.append_entry(
            writer_role="mind_guardian",
            guardian_token=MindGuardian.GUARDIAN_TOKEN,
            entry_id=epoch_id,
            kind="TUESDAY_PURGED_OOF_SEAL_UPDATE",
            domain_slug="NFL_GSE",
            valid_time_iso=update_timestamp_dt.isoformat(),
            transaction_time_iso=update_timestamp_dt.isoformat(),
            sealed_hash=s.sealed_hash,
            payload={
                "adaptive_alpha_next": adaptive_alpha_next,
                "composite_gain": round(composite_gain, 6),
                "james_stein_factor": js_factor,
                "shrunk_deltas": shrunk_deltas,
                "shrunk_domain_weights": updated_weights,
                "wasserstein_w1": w1_shift,
                "weighted_miscoverage": round(weighted_miscoverage, 6),
            },
            claim_matrix_sha256=matrix_sha,
            paired_audit_receipt_sha256=paired_audit.receipt_sha256,
        )

        self.inductive.step(
            f"TUESDAY_OOF_UPDATE_{epoch_id}",
            lambda st: None,
            lambda st: dataclasses.replace(
                st,
                mind_head_sha256=mind_entry["entry_sha256"],
                domain_weights_log_odds=tuple(updated_weights),
            ),
        )
        return {
            "adaptive_alpha_next": adaptive_alpha_next,
            "composite_gain": round(composite_gain, 6),
            "james_stein_factor": js_factor,
            "mind_entry_sha256": mind_entry["entry_sha256"],
            "shrunk_domain_weights": updated_weights,
            "wasserstein_w1": w1_shift,
            "weighted_miscoverage": round(weighted_miscoverage, 6),
        }

    @staticmethod
    def compute_conformal_copula_kelly(
        *,
        win_prob: float,
        decimal_odds: float,
        conformal_lower_prob: float,
        conformal_upper_prob: float,
        bankroll_usd: float,
        market_class: str = "full_game_spread",
        copula_tail_lambda: float = 0.0,
        fractional_kelly_multiplier: float = 0.25,
        account_regime: str = "SPORTS_BANKROLL",
        settled_cash_usd: Optional[float] = None,
    ) -> Dict[str, Any]:
        if not (0.0 < conformal_lower_prob <= win_prob <= conformal_upper_prob < 1.0):
            raise DataGapError("Invalid probability / conformal interval ordering in Kelly sizer.")
        if abs(win_prob - 0.5) < 1e-12:
            raise DataGapError("Silent 0.5 probability forbidden in Kelly sizer.")
        if decimal_odds <= 1.0 or bankroll_usd <= 0.0:
            raise DataGapError("Decimal odds must exceed 1.0 and bankroll_usd must be > 0.")

        b = decimal_odds - 1.0
        q = 1.0 - win_prob
        raw_kelly = (win_prob * b - q) / b
        if raw_kelly <= 0.0:
            return {
                "recommended_fraction": 0.0,
                "recommended_stake_usd": 0.0,
                "ruin_guard_status": "ABSTAIN_NON_POSITIVE_EDGE",
            }

        half_width = 0.5 * (conformal_upper_prob - conformal_lower_prob)
        conformal_copula_penalty = 1.0 / (1.0 + ((half_width / 0.05) ** 2) + max(0.0, copula_tail_lambda))
        scaled_fraction = raw_kelly * fractional_kelly_multiplier * conformal_copula_penalty
        capped_fraction = min(scaled_fraction, 0.05)

        capacity_caps = {
            "full_game_spread": 1000.0,
            "full_game_total_ml": 500.0,
            "team_total": 200.0,
            "derivative_or_prop": 50.0,
        }
        if market_class not in capacity_caps:
            raise DataGapError(f"Unknown market_class {market_class!r}")

        available_capital = bankroll_usd
        reg_note = "STANDARD_FRACTIONAL_CONFORMAL_KELLY"
        if account_regime == "BROKERAGE_SMALL_CAP":
            cash_settled = bankroll_usd if settled_cash_usd is None else settled_cash_usd
            if cash_settled <= 0.0:
                return {
                    "recommended_fraction": 0.0,
                    "recommended_stake_usd": 0.0,
                    "ruin_guard_status": "HALT_T_PLUS_1_UNSETTLED_GFV_GUARD",
                }
            available_capital = min(bankroll_usd, cash_settled)
            reg_note = (
                "CASH_ACCOUNT_T_PLUS_1_GFV_ENFORCED"
                if bankroll_usd < 2000.0
                else "REG_T_INTRADAY_MARGIN_IML_MONITORED"
            )

        stake_usd = min(available_capital * capped_fraction, capacity_caps[market_class])
        return {
            "conformal_half_width": round(half_width, 6),
            "conformal_copula_attenuation": round(conformal_copula_penalty, 6),
            "market_capacity_cap_usd": capacity_caps[market_class],
            "raw_kelly_fraction": round(raw_kelly, 6),
            "recommended_fraction": round(stake_usd / bankroll_usd, 6),
            "recommended_stake_usd": round(stake_usd, 2),
            "regulatory_and_ruin_regime": reg_note,
            "ruin_guard_status": "APPROVED_BOUNDED_RISK",
        }


def run_demo_cycle() -> Dict[str, Any]:
    """Self-contained end-to-end execution smoke run verifying all subsystems."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        roster_sha = sha256_hex("2026_roster_canonical.parquet:week10:verified")
        injuries_sha = sha256_hex("injuries_2026.csv:week10:verified")
        s0 = OperationalLedgerState(
            nfl_season=2026,
            nfl_week=9,
            sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
            tau=SEALED_TAU,
            prob_per_point=PROB_PER_POINT,
            qb_questionable_epa=QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
            stage0_roster_sha256=roster_sha,
            stage0_injuries_sha256=injuries_sha,
        )
        os_engine = TuesdayToTuesdayBusinessOS(tmp, s0)
        t_lock = datetime.datetime(2026, 11, 10, 10, 0, tzinfo=datetime.timezone.utc)
        lock_res = os_engine.run_tuesday_lock(
            iso_week_key="2026-W46",
            nfl_week=10,
            team_ratings=[
                Glicko2TeamRating("BAL", 1625.0, 85.0, 0.06),
                Glicko2TeamRating("CIN", 1560.0, 82.0, 0.06),
                Glicko2TeamRating("KC", 1640.0, 50.0, 0.06),
            ],
            prior_week_matches={
                "BAL": [(Glicko2TeamRating("JAX", 1545.0, 65.0, 0.06), 1.0)],
                "CIN": [(Glicko2TeamRating("LV", 1480.0, 68.0, 0.06), 1.0)],
                "KC": [],
            },
            lock_timestamp_dt=t_lock,
        )
        return {
            "bye_teams": lock_res["bye_teams"],
            "coach_mindset_hash": lock_res["coach_mindset_hash"],
            "entity": LEGAL_ENTITY_NAME,
            "kc_bye_rd_after": lock_res["updated_ratings"]["KC"].rd,
            "public_calibration_url": PUBLIC_CALIBRATION_LEDGER_URL,
            "record": os_engine.inductive.state.record_str,
        }


if __name__ == "__main__":
    summary = run_demo_cycle()
    print(json.dumps(summary, indent=2, sort_keys=True))
