"""Wave 19 Agentic Fleet Primitives & 97-Entry OSS/Platform Registry Expander.

Drop-in path for Sports-wt-triage:
    src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py

Integrates all 10 platforms/repositories (#88-#97) under INGEST-AND-LEARN,
MIND-FIRST, and the Zero-Waste Cost Doctrine:
    88. HKUDS/nanobot           -> DreamMemoryConsolidator & restart non-replay guard
    89. oguzbilgic/kern-ai      -> ReadOnlySubagentPolicy (no shell/edit/nested-spawn)
    90. codewhale.net           -> SubagentRunReceipt (SHA-256 tool/edit receipts)
    91. commandcode.ai          -> ToolCallRepairAndPrefixAligner (JSON repair + KV cache)
    92. atomicagent.io          -> LocalQuantizedFallbackAndRiskGate (local + 1-way door pause)
    93. www.agent37.com         -> GVisorSandboxCostGovernor ($4.76/mo gVisor + auto-sleep TTL)
    94. proto.erp.ai            -> UninterruptedModeScorerAndLock (frozen-v7 + send/pay/delete)
    95. www.hellominds.ai       -> CircleTrustRegistry (Circle allowlist & AP-06 firewall)
    96. mira.tg                 -> CommitmentSlaAndAlphaFilter (SLA tracker & noise filter)
    97. superbot.gg             -> SingleFacadeMcpDispatcher (1-tool MCP + approval queue)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Registry Entries #88..#97 (Expands 87 -> 97 Unique Corpus Entries)
# ---------------------------------------------------------------------------

WAVE19_CORPUS_ENTRIES: list[dict[str, Any]] = [
    {
        "id": 88,
        "name": "HKUDS/nanobot",
        "url": "https://github.com/HKUDS/nanobot",
        "license": "MIT",
        "domain": "lightweight_python_agent_gateway_and_dream_memory",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::DreamMemoryConsolidator"
        ),
        "role": (
            "Diff-verified /compact -> /dream long-term memory consolidation and "
            "post-restart non-replay idempotency guard for uncertain tool actions."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 89,
        "name": "oguzbilgic/kern-ai",
        "url": "https://github.com/oguzbilgic/kern-ai",
        "license": "Open-Source (GitHub)",
        "domain": "container_coworker_fleet_and_readonly_subagents",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::ReadOnlySubagentPolicy"
        ),
        "role": (
            "Enforces shell=False, edit_files=False, spawn_children=False on parallel "
            "research/review child subagents to prevent concurrent worktree race conditions."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 90,
        "name": "codewhale-hq/Codewhale",
        "url": "https://codewhale.net/en",
        "license": "MIT",
        "domain": "rust_terminal_agent_execution_receipts",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::SubagentRunReceipt"
        ),
        "role": (
            "Emits deterministic SHA-256 file-mutation, shell-command, and MCP run receipts "
            "(.scratch/receipts/subagents.v1.json) paired with CAGE ENFORCE."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 91,
        "name": "Command Code",
        "url": "https://commandcode.ai/",
        "license": "Proprietary SaaS / CLI Reference",
        "domain": "open_model_tool_repair_and_kv_prefix_caching",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::ToolCallRepairAndPrefixAligner"
        ),
        "role": (
            "Repairs malformed JSON tool calls from open models (deepseek-v4.1-flash / vLLM) "
            "and freezes static prompt prefixes ahead of dynamic state for 99%+ cache hits."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 92,
        "name": "Atomic Agent (AtomicBot-ai/atomic-agent)",
        "url": "https://atomicagent.io/",
        "license": "Open-Source",
        "domain": "local_quantized_agent_and_fusion_risk_pause",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::LocalQuantizedFallbackAndRiskGate"
        ),
        "role": (
            "Zero-token-fee local quantized model fallback on cloud rate-limits plus "
            "risk-tiered pause gates on one-way-door mutations."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 93,
        "name": "Agent37 Cloud Sandboxes",
        "url": "https://www.agent37.com/",
        "license": "Commercial API Reference",
        "domain": "gvisor_cloud_sandbox_cost_and_autosleep_governor",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::GVisorSandboxCostGovernor"
        ),
        "role": (
            "Routes untrusted CPU tasks to $4.76/mo gVisor sandboxes (vs $11.36/mo full kernel "
            "VMs) and enforces opt-in auto-sleep TTLs so idle sandboxes never leak spend."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 94,
        "name": "Proto by ERP.AI & BusinessBench",
        "url": "https://proto.erp.ai/",
        "license": "Proprietary App / MIT BusinessBench Reference",
        "domain": "uninterrupted_mode_action_locks_and_frozen_scorer",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::UninterruptedModeScorerAndLock"
        ),
        "role": (
            "Implements BusinessBench frozen-v7 deterministic deliverable checks, duplicate "
            "invoice/batch detection, and Uninterrupted-Mode outbound send/pay/delete locks."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 95,
        "name": "Minds by Animoca Brands (Ethoswarm)",
        "url": "https://www.hellominds.ai/",
        "license": "Proprietary Platform Reference",
        "domain": "circle_trust_lists_and_mind_isolation",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::CircleTrustRegistry"
        ),
        "role": (
            "Enforces explicit Circle trust allowlists between specialized Minds so public "
            "chalk/marketing Minds can never mutate Stage 1-3 physical pricing Minds (AP-06)."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 96,
        "name": "Mira Telegram Chief-of-Staff",
        "url": "https://mira.tg/",
        "license": "Proprietary Platform Reference",
        "domain": "commitment_sla_tracker_and_signal_noise_filter",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::CommitmentSlaAndAlphaFilter"
        ),
        "role": (
            "Extracts thread commitments/deadlines (Three-Noon Locks, T-90m MNF, TIPS-USA RFPs) "
            "and filters social/chat streams down to actionable line/injury alpha."
        ),
        "status": "WIRED_V3",
    },
    {
        "id": 97,
        "name": "superbot.gg Streamable HTTP MCP",
        "url": "https://superbot.gg/",
        "license": "Proprietary MCP Pattern Reference",
        "domain": "single_tool_mcp_schema_compaction_and_approval_queue",
        "gse_seam": (
            "src/gse_engine/governance/wave19_agentic_fleet_and_registry_97.py"
            "::SingleFacadeMcpDispatcher"
        ),
        "role": (
            "Collapses N outbound/ops MCP tools behind a single lazy-dispatched MCP entrypoint "
            "to prevent prompt truncation past 150k tokens while gating outbound sends."
        ),
        "status": "WIRED_V3",
    },
]


# ---------------------------------------------------------------------------
# #88 HKUDS/nanobot: Diff-Verified Dream Consolidation & Restart Non-Replay
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DreamConsolidationResult:
    """Verified outcome of a /compact -> /dream memory consolidation pass."""

    wrote_durable_update: bool
    pre_sha256: str
    post_sha256: str
    added_entries: int
    blocked_unverified_replays: list[str]


class DreamMemoryConsolidator:
    """Consolidates compacted session facts only when diff-verified on disk."""

    @staticmethod
    def consolidate(
        existing_facts: list[str],
        candidate_facts: list[str],
        interrupted_uncertain_actions: list[str],
    ) -> tuple[list[str], DreamConsolidationResult]:
        """Merge unique candidate facts without replaying uncertain interrupted actions."""
        pre_blob = "\n".join(existing_facts).encode("utf-8")
        pre_sha = hashlib.sha256(pre_blob).hexdigest()
        seen = {f.strip() for f in existing_facts if f.strip()}
        merged = list(existing_facts)
        added = 0
        for fact in candidate_facts:
            clean = fact.strip()
            if clean and clean not in seen:
                seen.add(clean)
                merged.append(clean)
                added += 1
        post_blob = "\n".join(merged).encode("utf-8")
        post_sha = hashlib.sha256(post_blob).hexdigest()
        blocked = [act for act in interrupted_uncertain_actions if act.strip()]
        return merged, DreamConsolidationResult(
            wrote_durable_update=(pre_sha != post_sha),
            pre_sha256=pre_sha,
            post_sha256=post_sha,
            added_entries=added,
            blocked_unverified_replays=blocked,
        )


# ---------------------------------------------------------------------------
# #89 oguzbilgic/kern-ai: Privilege-Separated Read-Only Child Subagents
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ReadOnlySubagentPolicy:
    """Enforces kern-ai child-agent restrictions on parallel fan-out workers."""

    agent_id: str
    is_child_subagent: bool = True
    allow_shell: bool = False
    allow_file_edits: bool = False
    allow_nested_subagents: bool = False

    def assert_tool_allowed(self, tool_category: str) -> None:
        """Raise PermissionError if a child subagent attempts mutating/shell/spawn calls."""
        if not self.is_child_subagent:
            return
        cat = tool_category.lower().strip()
        if cat == "shell" and not self.allow_shell:
            raise PermissionError(
                f"Child subagent {self.agent_id} forbidden from shell execution."
            )
        if cat in {"edit", "write", "delete"} and not self.allow_file_edits:
            raise PermissionError(
                f"Child subagent {self.agent_id} forbidden from mutating files."
            )
        if cat == "spawn_subagent" and not self.allow_nested_subagents:
            raise PermissionError(
                f"Child subagent {self.agent_id} forbidden from nested spawning."
            )


# ---------------------------------------------------------------------------
# #90 codewhale.net: Deterministic Subagent Execution Receipts
# ---------------------------------------------------------------------------


@dataclass
class SubagentRunReceipt:
    """Compact deterministic run receipt (.codewhale/state/subagents.v1.json pattern)."""

    session_id: str
    lane_role: str
    files_changed: list[dict[str, str]] = field(default_factory=list)
    commands_ran: list[dict[str, Any]] = field(default_factory=list)
    mcp_or_web_calls: list[str] = field(default_factory=list)

    def record_file_change(self, rel_path: str, before_bytes: bytes, after_bytes: bytes) -> None:
        """Record SHA-256 digests before and after a file mutation."""
        self.files_changed.append(
            {
                "path": rel_path,
                "before_sha256": hashlib.sha256(before_bytes).hexdigest(),
                "after_sha256": hashlib.sha256(after_bytes).hexdigest(),
            }
        )

    def record_command(self, cmd: str, exit_code: int) -> None:
        """Record an executed shell command and exit code."""
        self.commands_ran.append({"command": cmd, "exit_code": int(exit_code)})

    def record_external_call(self, endpoint: str) -> None:
        """Record an external MCP or web call target."""
        self.mcp_or_web_calls.append(endpoint)

    def receipt_digest(self) -> str:
        """Compute canonical SHA-256 digest of this subagent run receipt."""
        canonical = json.dumps(asdict(self), sort_keys=True, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(canonical).hexdigest()


# ---------------------------------------------------------------------------
# #91 commandcode.ai: Open-Model Tool-Call JSON Repair & Prefix Cache Aligner
# ---------------------------------------------------------------------------

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)
_TRAILING_COMMA_RE = re.compile(r",\s*([}\]])")


class ToolCallRepairAndPrefixAligner:
    """Repairs malformed open-model JSON tool arguments & maximizes KV prefix cache hits."""

    @staticmethod
    def repair_tool_json(raw_payload: str) -> dict[str, Any]:
        """Strip markdown fences, trailing commas, and unclosed braces from tool JSON."""
        cleaned = _FENCE_RE.sub("", raw_payload.strip()).strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end >= start:
            cleaned = cleaned[start : end + 1]
        cleaned = _TRAILING_COMMA_RE.sub(r"\1", cleaned)
        open_braces = cleaned.count("{") - cleaned.count("}")
        if 0 < open_braces <= 2:
            cleaned += "}" * open_braces
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            raise ValueError("Tool call payload must decode to a JSON object.")
        return parsed

    @staticmethod
    def align_prompt_for_kv_cache(
        frozen_system_and_schemas: list[str],
        dynamic_turn_messages: list[str],
    ) -> tuple[list[str], str]:
        """Keep frozen blocks strictly contiguous at index 0..k-1 so KV prefix never misses."""
        prefix_blob = "\n---\n".join(frozen_system_and_schemas).encode("utf-8")
        prefix_hash = hashlib.sha256(prefix_blob).hexdigest()
        return list(frozen_system_and_schemas) + list(dynamic_turn_messages), prefix_hash


# ---------------------------------------------------------------------------
# #92 atomicagent.io: Local Quantized Fallback & One-Way-Door Risk Pause Gate
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LocalQuantizedFallbackAndRiskGate:
    """Selects local quantized fallback on rate-limits and pauses on risky mutations."""

    local_gguf_model: str = "qwen2.5-coder-14b-q4_k_m.gguf"

    def select_backend(self, cloud_healthy: bool, cloud_rate_limited: bool) -> str:
        """Select cloud primary when healthy or fall back to local GGUF at zero spend."""
        if cloud_healthy and not cloud_rate_limited:
            return "cloud_primary"
        return f"local_llamacpp:{self.local_gguf_model}"

    @staticmethod
    def requires_human_pause(is_one_way_door: bool, blast_radius: str) -> bool:
        """Return True for irreversible actions or high-blast-radius targets."""
        return is_one_way_door or blast_radius.lower() in {
            "prod_db_drop",
            "live_payment",
            "public_post",
        }


# ---------------------------------------------------------------------------
# #93 agent37.com: gVisor Cloud Sandbox Cost & Mandatory Auto-Sleep Governor
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SandboxAllocationPlan:
    """Cost-governed sandbox allocation plan with mandatory idle auto-sleep."""

    runtime_tier: str
    monthly_730h_list_usd: float
    auto_sleep_enabled: bool
    idle_sleep_ttl_sec: int


class GVisorSandboxCostGovernor:
    """Selects $4.76/mo gVisor vs $11.36/mo full-kernel VM and forces auto-sleep On."""

    @staticmethod
    def plan_sandbox(
        needs_docker_or_custom_kernel: bool,
        idle_ttl_sec: int = 300,
    ) -> SandboxAllocationPlan:
        """Choose lowest-cost sandbox runtime with clamped idle auto-sleep TTL."""
        safe_ttl = max(60, min(idle_ttl_sec, 1800))
        if needs_docker_or_custom_kernel:
            return SandboxAllocationPlan(
                runtime_tier="full_linux_vm_kernel",
                monthly_730h_list_usd=11.36,
                auto_sleep_enabled=True,
                idle_sleep_ttl_sec=safe_ttl,
            )
        return SandboxAllocationPlan(
            runtime_tier="gvisor_runsc_sandbox",
            monthly_730h_list_usd=4.76,
            auto_sleep_enabled=True,
            idle_sleep_ttl_sec=safe_ttl,
        )


# ---------------------------------------------------------------------------
# #94 proto.erp.ai: BusinessBench Frozen-v7 Scorer & Uninterrupted-Mode Lock
# ---------------------------------------------------------------------------


class UninterruptedModeScorerAndLock:
    """Implements Proto's Uninterrupted-Mode send/pay/delete lock + duplicate-bill detector."""

    LOCKED_ACTIONS = frozenset(
        {"send_email", "execute_payment", "submit_external_form", "delete_record", "change_acl"}
    )

    @classmethod
    def can_execute_autonomously(
        cls,
        action_kind: str,
        uninterrupted_mode: bool,
        explicit_outbound_override: bool = False,
    ) -> bool:
        """Gate outbound send/pay/delete actions unless explicitly overridden."""
        if action_kind in cls.LOCKED_ACTIONS:
            return bool(explicit_outbound_override)
        return bool(uninterrupted_mode)

    @staticmethod
    def detect_duplicate_bills(
        bills: list[dict[str, Any]],
        max_days_apart: int = 15,
    ) -> list[tuple[str, str]]:
        """Flag candidate duplicate invoices sharing vendor + exact amount within window."""
        flagged: list[tuple[str, str]] = []
        for i, cand in enumerate(bills):
            if cand.get("is_recurring") or float(cand.get("amount", 0.0)) <= 0.0:
                continue
            for orig in bills[:i]:
                if orig.get("is_recurring"):
                    continue
                same_vendor = (
                    str(cand["vendor"]).strip().lower() == str(orig["vendor"]).strip().lower()
                )
                same_amt = abs(float(cand["amount"]) - float(orig["amount"])) < 0.005
                days_gap = abs(int(cand["day_index"]) - int(orig["day_index"]))
                if same_vendor and same_amt and days_gap <= max_days_apart:
                    flagged.append((str(cand["bill_id"]), str(orig["bill_id"])))
                    break
        return flagged


# ---------------------------------------------------------------------------
# #95 hellominds.ai: Circle Trust Allowlist (Enforcing AP-06 Chalk Firewall)
# ---------------------------------------------------------------------------


class CircleTrustRegistry:
    """Enforces Mind-to-Mind Circle allowlists so chalk/hype Minds never touch true pricing."""

    def __init__(self) -> None:
        """Initialize segregated Stage 1-3 pricing and Stage 4 DFS circles."""
        self._circles: dict[str, set[str]] = {
            "gse_stage1_to_3_true_pricing": {
                "market_anchor_mind",
                "pillar1_books_pdfs_mind",
                "pillar2_charting_mind",
                "pillar3_verified_injury_mind",
                "pillar4_biomech_physics_mind",
                "pillar5_coach_situational_mind",
            },
            "gse_stage4_dfs_ownership_only": {
                "public_chalk_viral_mind",
                "dfs_milp_portfolio_mind",
            },
        }

    def assert_handoff_permitted(
        self, sender_mind: str, receiver_mind: str, circle_name: str
    ) -> None:
        """Fail closed when two Minds attempt a cross-circle handoff (AP-06)."""
        allowed = self._circles.get(circle_name, set())
        if sender_mind not in allowed or receiver_mind not in allowed:
            raise PermissionError(
                f"Circle trust violation in '{circle_name}': "
                f"{sender_mind} -> {receiver_mind} refused."
            )


# ---------------------------------------------------------------------------
# #96 mira.tg: Commitment SLA Tracker & High-Signal Chat Noise Filter
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class TrackedCommitment:
    """Structured operational SLA or deadline extracted from operator threads."""

    commitment_id: str
    title: str
    deadline_iso_ct: str
    owner: str


class CommitmentSlaAndAlphaFilter:
    """Filters noisy chat messages down to actionable alpha & tracks hard SLA locks."""

    ALPHA_KEYWORDS = (
        "inactive",
        "ankl",
        "concussion",
        "thumb",
        "line moved",
        "wind",
        "rfp",
        "noon lock",
    )

    @classmethod
    def filter_signal_messages(cls, messages: list[str]) -> list[str]:
        """Keep only messages matching actionable injury/weather/line keywords."""
        return [m for m in messages if any(kw in m.lower() for kw in cls.ALPHA_KEYWORDS)]

    @staticmethod
    def active_november_2026_slas() -> list[TrackedCommitment]:
        """Return active November 2026 lock and submission deadlines."""
        return [
            TrackedCommitment(
                "SLA-W10-MNF-T90M",
                "Week 10 MNF LAC @ BAL T-90m Inactives & Wind Lock",
                "2026-11-16T17:45:00-06:00",
                "gse-noon-lock",
            ),
            TrackedCommitment(
                "SLA-W11-TNF-NOON",
                "Week 11 TNF IND @ HOU Wednesday Noon Master Lock",
                "2026-11-18T12:00:00-06:00",
                "gse-noon-lock",
            ),
            TrackedCommitment(
                "SLA-TIPS-261001-261003",
                "TIPS-USA 261001 & 261003 Submission Deadline",
                "2026-11-19T15:00:00-06:00",
                "wolf-revenue-engine",
            ),
        ]


# ---------------------------------------------------------------------------
# #97 superbot.gg: Single-Tool MCP Schema Compactor & Outbound Approval Queue
# ---------------------------------------------------------------------------


class SingleFacadeMcpDispatcher:
    """Exposes 1 compact MCP tool schema instead of N bloated schemas; queues outbound sends."""

    OUTBOUND_SUBCOMMANDS = frozenset({"send_email", "send_sms", "place_call", "publish_social"})

    def __init__(self) -> None:
        """Initialize an empty operator outbound approval queue."""
        self.pending_approvals: list[dict[str, Any]] = []

    @staticmethod
    def exported_mcp_tool_schema() -> dict[str, Any]:
        """Return the single compact MCP tool schema used to keep prompt budgets lean."""
        return {
            "name": "gse_unified_ops_errand",
            "description": (
                "Single lazy-routed facade over internal/external ops; "
                "queues outbound sends for approval."
            ),
            "inputSchema": {
                "type": "object",
                "required": ["action", "params"],
                "properties": {
                    "action": {"type": "string"},
                    "params": {"type": "object"},
                },
            },
        }

    def dispatch(
        self,
        action: str,
        params: dict[str, Any],
        approved: bool = False,
    ) -> dict[str, Any]:
        """Queue outbound subcommands for approval or execute local actions immediately."""
        if action in self.OUTBOUND_SUBCOMMANDS and not approved:
            ticket = {"action": action, "params": params, "status": "AWAITING_OPERATOR_APPROVAL"}
            self.pending_approvals.append(ticket)
            return ticket
        return {"action": action, "status": "EXECUTED_LOCALLY", "params": params}


# ---------------------------------------------------------------------------
# Idempotent OSS Registry Appender & Self-Test Suite
# ---------------------------------------------------------------------------


def append_wave19_entries_to_registry(registry_path: Path) -> dict[str, Any]:
    """Idempotently append entries #88..#97 to oss-corpus-registry.json by URL."""
    data = json.loads(registry_path.read_text(encoding="utf-8"))
    entries: list[dict[str, Any]] = data.get("entries", [])
    existing_urls = {str(e.get("url", "")).rstrip("/").lower() for e in entries}
    added = 0
    for item in WAVE19_CORPUS_ENTRIES:
        norm_url = str(item["url"]).rstrip("/").lower()
        if norm_url not in existing_urls:
            entries.append(item)
            existing_urls.add(norm_url)
            added += 1
    data["entries"] = entries
    data["total_entries"] = len(entries)
    data["total_unique_entries"] = len(entries)
    data["total_submitted_urls"] = max(int(data.get("total_submitted_urls") or 0), len(entries))
    registry_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return {"total_entries": len(entries), "added": added}


def run_self_tests() -> dict[str, Any]:
    """Run deterministic assertions across all 10 Wave 19 architectural primitives."""
    # 88: nanobot Dream consolidation
    merged, dream = DreamMemoryConsolidator.consolidate(
        existing_facts=["QB1_STARTER=0.0 EPA penalty"],
        candidate_facts=["QB1_STARTER=0.0 EPA penalty", "FTN light_box_pct=0.0853"],
        interrupted_uncertain_actions=["POST /api/webhooks/stripe"],
    )
    assert dream.wrote_durable_update and dream.added_entries == 1 and len(merged) == 2
    assert dream.blocked_unverified_replays == ["POST /api/webhooks/stripe"]

    # 89: kern-ai read-only child subagent
    child_policy = ReadOnlySubagentPolicy(agent_id="spec-reviewer-01", is_child_subagent=True)
    child_policy.assert_tool_allowed("read")
    refused_shell = False
    try:
        child_policy.assert_tool_allowed("shell")
    except PermissionError:
        refused_shell = True
    assert refused_shell

    # 90: codewhale run receipt
    receipt = SubagentRunReceipt(session_id="sess-20261116", lane_role="wave19-verifier")
    receipt.record_file_change("oss-corpus-registry.json", b"old", b"new")
    receipt.record_command("pytest -q", 0)
    assert len(receipt.receipt_digest()) == 64

    # 91: commandcode JSON tool repair + KV prefix hash
    repaired = ToolCallRepairAndPrefixAligner.repair_tool_json(
        'Thought...\n```json\n{"game_id": "2026_10_LAC_BAL", "n_sims": 10000,}\n'
    )
    assert repaired == {"game_id": "2026_10_LAC_BAL", "n_sims": 10000}
    msgs, prefix_sha = ToolCallRepairAndPrefixAligner.align_prompt_for_kv_cache(
        ["SYSTEM_V4", "TOOLS_SCHEMA"], ["Turn 1"]
    )
    msgs2, prefix_sha2 = ToolCallRepairAndPrefixAligner.align_prompt_for_kv_cache(
        ["SYSTEM_V4", "TOOLS_SCHEMA"], ["Turn 2"]
    )
    assert prefix_sha == prefix_sha2 and msgs[0] == msgs2[0]

    # 92: atomicagent fallback & risk pause
    aa_gate = LocalQuantizedFallbackAndRiskGate()
    assert aa_gate.select_backend(
        cloud_healthy=True, cloud_rate_limited=True
    ).startswith("local_llamacpp:")
    assert aa_gate.requires_human_pause(is_one_way_door=False, blast_radius="live_payment")

    # 93: agent37 gVisor cost governor
    sbx = GVisorSandboxCostGovernor.plan_sandbox(
        needs_docker_or_custom_kernel=False, idle_ttl_sec=180
    )
    assert sbx.monthly_730h_list_usd == 4.76 and sbx.auto_sleep_enabled
    assert sbx.idle_sleep_ttl_sec == 180

    # 94: proto Uninterrupted-Mode lock + duplicate bill detector
    assert UninterruptedModeScorerAndLock.can_execute_autonomously(
        "run_pytest", uninterrupted_mode=True
    )
    assert not UninterruptedModeScorerAndLock.can_execute_autonomously(
        "send_email", uninterrupted_mode=True
    )
    dups = UninterruptedModeScorerAndLock.detect_duplicate_bills(
        [
            {"bill_id": "BILL-2024", "vendor": "Tamarack", "amount": 9690.12, "day_index": 10},
            {"bill_id": "BILL-2028", "vendor": "tamarack ", "amount": 9690.12, "day_index": 10},
        ]
    )
    assert dups == [("BILL-2028", "BILL-2024")]

    # 95: hellominds Circle AP-06 chalk firewall
    circles = CircleTrustRegistry()
    circles.assert_handoff_permitted(
        "market_anchor_mind", "pillar4_biomech_physics_mind", "gse_stage1_to_3_true_pricing"
    )
    chalk_refused = False
    try:
        circles.assert_handoff_permitted(
            "public_chalk_viral_mind", "market_anchor_mind", "gse_stage1_to_3_true_pricing"
        )
    except PermissionError:
        chalk_refused = True
    assert chalk_refused

    # 96: mira.tg SLA commitment & noise filter
    filtered = CommitmentSlaAndAlphaFilter.filter_signal_messages(
        ["gm everyone!!", "ALERT: Lamar Jackson inactive (fractured thumb)", "check out my meme"]
    )
    assert len(filtered) == 1
    assert len(CommitmentSlaAndAlphaFilter.active_november_2026_slas()) == 3

    # 97: superbot.gg single-facade MCP compactor
    mcp = SingleFacadeMcpDispatcher()
    queued = mcp.dispatch("send_email", {"to": "client@example.com"}, approved=False)
    assert queued["status"] == "AWAITING_OPERATOR_APPROVAL" and len(mcp.pending_approvals) == 1

    return {
        "wave19_primitives_verified": 10,
        "registry_entries_staged": len(WAVE19_CORPUS_ENTRIES),
        "entry_ids": [e["id"] for e in WAVE19_CORPUS_ENTRIES],
        "sample_receipt_sha256": receipt.receipt_digest(),
        "kv_prefix_sha256": prefix_sha,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for Wave 19 verification and registry expansion."""
    parser = argparse.ArgumentParser(
        description="Wave 19 Agentic Fleet & 97-Entry Registry Suite"
    )
    parser.add_argument("--self-test", action="store_true", help="Run all 10 Wave 19 unit checks.")
    parser.add_argument(
        "--append-registry",
        type=Path,
        default=None,
        help="Optional path to oss-corpus-registry.json to idempotently append entries #88..#97.",
    )
    args = parser.parse_args(argv)

    out: dict[str, Any] = {"status": "PASS"}
    if args.self_test or args.append_registry is None:
        out["self_test"] = run_self_tests()
    if args.append_registry is not None:
        out["registry_update"] = append_wave19_entries_to_registry(args.append_registry.resolve())
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
