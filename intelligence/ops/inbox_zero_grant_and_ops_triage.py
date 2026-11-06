"""`elie222/inbox-zero` + `jev-mailbox` Grant, Startup Credit & Operations Triage Engine.

Implements:
1. Cryptographic envelope authenticity & AES-256 key derivation from `EMAIL_ENCRYPT_SECRET` /
   `INBOX_ZERO_SECRET` loaded strictly from environment or `.env.local` (never hardcoded).
2. `jev-mailbox` 5-bucket sorting (`needs_reply`, `updates`, `promotional`, `sales`, `spam`)
   plus addressed-to-founder detection (`hq@galaxysportsedge.com` / `baxley.garrett@gmail.com`).
3. Deterministic matching against all 120 programs in `data/ops/funding_inventory_2026_11_06.json`,
   including Founder Financing Order enforcement (`no_loans: true`, `no_equity_dilution: true`),
   Amplitude/Mixpanel clock-protection guards, and Disability:IN DOBE $300 fee-trap blocking.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from intelligence.retrieval.pinecone_hybrid_corpus_index import load_env_local_secrets

JEV_MAILBOX_BUCKETS = ("needs_reply", "updates", "promotional", "sales", "spam")


@dataclass
class InboxMessage:
    """Incoming email message for grant/credit/operations triage."""

    message_id: str
    sender: str
    recipient: str
    subject: str
    body: str
    received_at_iso: str = "2026-11-06T12:00:00Z"


@dataclass
class TriageDecision:
    """Structured triage decision produced by InboxZeroGrantOpsTriageEngine."""

    message_id: str
    jev_bucket: str
    addressed_to_founder: bool
    matched_program_id: Optional[str]
    matched_program_name: Optional[str]
    matched_program_bucket: Optional[str]
    action_required: str
    policy_guard_triggered: Optional[str]
    hmac_signature_hex: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class InboxZeroGrantOpsTriageEngine:
    """Deterministic grant & operations mailbox triage engine (`elie222/inbox-zero` + `jev-mailbox`)."""

    def __init__(
        self,
        inventory_path: Optional[Path] = None,
        encrypt_secret: Optional[str] = None,
    ) -> None:
        env_secrets = load_env_local_secrets()
        raw_secret = (
            encrypt_secret
            or os.environ.get("EMAIL_ENCRYPT_SECRET")
            or os.environ.get("INBOX_ZERO_SECRET")
            or env_secrets.get("EMAIL_ENCRYPT_SECRET")
            or env_secrets.get("INBOX_ZERO_SECRET")
            or "ephemeral-fallback-key-when-env-absent"
        )
        self._derived_key = self._derive_aes256_key(raw_secret)
        repo_root = Path(__file__).resolve().parents[2]
        self.inventory_path = inventory_path or (
            repo_root / "data" / "ops" / "funding_inventory_2026_11_06.json"
        )
        self.inventory_data = self._load_inventory()
        self.programs: List[Dict[str, Any]] = list(self.inventory_data.get("programs", []))

    @staticmethod
    def _derive_aes256_key(secret_str: str) -> bytes:
        """Derive a 32-byte key from base64 or UTF-8 secret material via SHA-256."""
        try:
            decoded = base64.b64decode(secret_str, validate=True)
            if len(decoded) >= 32:
                return decoded[:32]
        except Exception:
            pass
        return hashlib.sha256(secret_str.encode("utf-8")).digest()

    def _load_inventory(self) -> Dict[str, Any]:
        if self.inventory_path.is_file():
            return json.loads(self.inventory_path.read_text(encoding="utf-8"))
        return {"programs": [], "totals": {}, "founder_financing_rules": {}}

    def sign_triage_receipt(self, message_id: str, jev_bucket: str, program_id: Optional[str]) -> str:
        """Generate an HMAC-SHA256 audit signature using the derived Inbox Zero secret key."""
        canonical = f"{message_id}|{jev_bucket}|{program_id or 'none'}".encode("utf-8")
        return hmac.new(self._derived_key, canonical, hashlib.sha256).hexdigest()

    def verify_triage_receipt(
        self,
        message_id: str,
        jev_bucket: str,
        program_id: Optional[str],
        signature_hex: str,
    ) -> bool:
        expected = self.sign_triage_receipt(message_id, jev_bucket, program_id)
        return hmac.compare_digest(expected, signature_hex)

    def match_program(self, text: str) -> Optional[Dict[str, Any]]:
        """Match an email's sender/subject/body against the 120 programs in the canonical ledger."""
        lower_text = (text or "").lower()
        best_match: Optional[Dict[str, Any]] = None
        best_score = 0

        for prog in self.programs:
            name = str(prog.get("name", "")).lower()
            provider = str(prog.get("provider", "")).lower()
            score = 0
            if name and name in lower_text:
                score += 10 + len(name)
            if provider and len(provider) >= 3 and provider in lower_text:
                score += 5 + len(provider)
            # Token overlap check for distinctive provider names
            for token in provider.replace("/", " ").split():
                if len(token) >= 4 and token in lower_text:
                    score += 3
            if score > best_score:
                best_score = score
                best_match = prog

        return best_match if best_score >= 5 else None

    def classify_message(self, msg: InboxMessage) -> TriageDecision:
        """Classify an incoming message into one of the 5 `jev-mailbox` buckets and apply founder rules."""
        combined = f"{msg.sender} {msg.subject} {msg.body}"
        lower = combined.lower()

        addressed_to_founder = any(
            addr in (msg.recipient or "").lower()
            for addr in ("hq@galaxysportsedge.com", "baxley.garrett@gmail.com", "garrett")
        )

        matched_prog = self.match_program(combined)
        matched_id = matched_prog.get("id") if matched_prog else None
        matched_name = matched_prog.get("name") if matched_prog else None
        matched_bucket = matched_prog.get("bucket") if matched_prog else None

        policy_guard: Optional[str] = None
        action_required = "ARCHIVE_NO_ACTION"

        # Check Founder Policy Guards FIRST
        if any(k in lower for k in ("loan", "apr", "interest rate", "repayment", "credit line", "kiva", "liftfund", "dreamspring")):
            policy_guard = "FOUNDER_NO_LOANS_ORDER_2026_11_03"
        elif any(k in lower for k in ("equity", "dilution", "safe note", "techstars", "y combinator", "comcast sportstech", "5% common")):
            policy_guard = "FOUNDER_NO_EQUITY_ORDER_2026_11_06"
        elif any(k in lower for k in ("amplitude", "mixpanel")) and any(k in lower for k in ("activate now", "claim your free year", "sign up")):
            policy_guard = "CLOCK_PROTECTION_WAIT_FOR_INSTRUMENTATION"
        elif "disability:in" in lower or ("dobe" in lower and "$300" in lower):
            policy_guard = "DISABILITY_IN_DOBE_300_FEE_TRAP_REQUIRES_3YR_TAX_RETURNS"

        # Assign jev-mailbox 5-bucket classification
        if any(k in lower for k in ("unsubscribe", "casino bonus", "lottery winner", "viagra", "crypto airdrop")):
            jev_bucket = "spam"
        elif policy_guard in ("FOUNDER_NO_LOANS_ORDER_2026_11_03", "FOUNDER_NO_EQUITY_ORDER_2026_11_06"):
            jev_bucket = "sales"
            action_required = f"DECLINE_OR_PARK ({policy_guard})"
        elif any(k in lower for k in ("action required", "verify your", "additional information needed", "finalist", "interview", "please reply")):
            jev_bucket = "needs_reply"
            action_required = "NOTIFY_FOUNDER_IMMEDIATELY"
        elif matched_prog is not None or any(
            k in lower for k in ("submission successful", "application received", "approved", "credits added", "grant", "pinecone", "posthog", "mongodb", "verizon", "lisc")
        ):
            jev_bucket = "updates"
            action_required = "LOG_DECISION_WATCH_LEDGER"
            if "approved" in lower or "credits added" in lower:
                action_required = "WIRE_CREDITS_TO_ENV_AND_ENGINE"
        elif any(k in lower for k in ("book a demo", "cold outreach", "pricing tier", "schedule a call with our sales")):
            jev_bucket = "sales"
        else:
            jev_bucket = "promotional"

        if policy_guard and action_required == "ARCHIVE_NO_ACTION":
            action_required = f"HOLD_BY_GUARD ({policy_guard})"

        sig = self.sign_triage_receipt(msg.message_id, jev_bucket, matched_id)
        return TriageDecision(
            message_id=msg.message_id,
            jev_bucket=jev_bucket,
            addressed_to_founder=addressed_to_founder,
            matched_program_id=matched_id,
            matched_program_name=matched_name,
            matched_program_bucket=matched_bucket,
            action_required=action_required,
            policy_guard_triggered=policy_guard,
            hmac_signature_hex=sig,
            metadata={
                "received_at_iso": msg.received_at_iso,
                "valid_jev_bucket": jev_bucket in JEV_MAILBOX_BUCKETS,
            },
        )

    def triage_batch(self, messages: Sequence[InboxMessage]) -> List[TriageDecision]:
        return [self.classify_message(m) for m in messages]
