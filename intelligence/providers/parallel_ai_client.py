"""Verified Parallel AI Client with Credit Governor, Privacy Boundary & Six-Tier Source Firewall.

Supports:
  - Parallel Search API: POST https://api.parallel.ai/v1beta/search
    (headers: x-api-key, parallel-beta: search-extract-2025-10-10)
  - Parallel Grounded Chat API: POST https://api.parallel.ai/chat/completions
    (header: Authorization: Bearer <key>, default model: "speed")

All network, secret, privacy, prompt-injection, and bitemporal safeguards fail closed.
"""
from __future__ import annotations

import html
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

if __package__ == "intelligence.providers":
    from intelligence.integration.providers import DataGapError
else:
    try:
        from integration.providers import DataGapError
    except ImportError:
        from intelligence.integration.providers import DataGapError

PARALLEL_SEARCH_ENDPOINT = "https://api.parallel.ai/v1beta/search"
PARALLEL_CHAT_ENDPOINT = "https://api.parallel.ai/chat/completions"
PARALLEL_BETA_SEARCH_HEADER = "search-extract-2025-10-10"
PARALLEL_DEFAULT_CHAT_MODEL = "speed"

DEFAULT_TOTAL_CEILING_USD = 20.0
DEFAULT_DAILY_CEILING_USD = 2.0
DEFAULT_PER_RUN_CEILING_USD = 0.50


class ParallelBudgetExceededError(RuntimeError):
    """Raised before dispatch when a Parallel AI call would breach credit ceilings."""


class PrivacyBoundaryError(ValueError):
    """Raised when an outbound query leaks secrets, PII, proprietary math, or gated odds."""


_RAW_SECRET_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\bnvapi-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"\bsk-di-[A-Za-z0-9]{12,}"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}"),
    re.compile(r"\bms-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I),
    re.compile(r"\bAmdJ[A-Za-z0-9]{12,}"),
)

_PII_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
)

_PROPRIETARY_KEYWORDS: Tuple[str, ...] = (
    "sinkhorn",
    "romano cqr",
    "tau_hat",
    "mind.jsonl",
    "foundry.db",
    "rlvr_batch",
    "conjunction gate",
    "cholesky",
    "288-bit",
    "market_calibration_heads",
)

_MARKET_LINE_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:over/under|moneyline|implied\s+prob|closing\s+line|sportsbook)\b", re.I),
    re.compile(r"\bspread\b", re.I),
    re.compile(r"\b[+-]\d{1,2}\.\d+\b"),
    re.compile(r"(?<![A-Za-z0-9_-])[+-][1-9]\d{2,3}\b"),
    re.compile(r"\b(?:o/u|total)\s+\d{2}\.\d\b", re.I),
)

_INJECTION_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"ignore\s+(?:all\s+)?previous\s+instructions", re.I),
    re.compile(r"disregard\s+(?:all\s+)?(?:prior|previous)\s+instructions", re.I),
    re.compile(r"system\s+prompt\s*[:=]", re.I),
    re.compile(r"reveal\s+(?:system\s+prompt|raw\s+env|secrets?)", re.I),
    re.compile(r"<\|im_start\|>|<\|system\|>|<\|endoftext\|>", re.I),
    re.compile(r"you\s+are\s+now\s+in\s+(?:developer|jailbreak|unrestricted)\s+mode", re.I),
    re.compile(r"bypass\s+(?:all\s+)?guardrails?", re.I),
)

_TIER1_DOMAINS = frozenset({
    "nfl.com",
    "operations.nfl.com",
    "nflcommunications.com",
    "weather.gov",
    "noaa.gov",
    "azcardinals.com",
    "atlantafalcons.com",
    "baltimoreravens.com",
    "buffalobills.com",
    "panthers.com",
    "chicagobears.com",
    "bengals.com",
    "clevelandbrowns.com",
    "dallascowboys.com",
    "denverbroncos.com",
    "detroitlions.com",
    "packers.com",
    "houstontexans.com",
    "colts.com",
    "jaguars.com",
    "chiefs.com",
    "raiders.com",
    "chargers.com",
    "therams.com",
    "miamidolphins.com",
    "vikings.com",
    "patriots.com",
    "neworleanssaints.com",
    "giants.com",
    "newyorkjets.com",
    "philadelphiaeagles.com",
    "steelers.com",
    "49ers.com",
    "seahawks.com",
    "buccaneers.com",
    "tennesseetitans.com",
    "commanders.com",
})

_TIER2_DOMAINS = frozenset({
    "espn.com",
    "site.api.espn.com",
    "sports.yahoo.com",
    "cbssports.com",
    "nbcsports.com",
    "foxsports.com",
    "apnews.com",
    "reuters.com",
    "nytimes.com",
    "theathletic.com",
    "usatoday.com",
    "si.com",
})

_TIER3_DOMAINS = frozenset({
    "pro-football-reference.com",
    "nextgenstats.nfl.com",
    "ftnfantasy.com",
    "sumersports.com",
    "pff.com",
    "sharpfootballanalysis.com",
    "ourlads.com",
    "spotrac.com",
    "overthecap.com",
    "nflverse.com",
    "footballdb.com",
})

_TIER5_SOCIAL_DOMAINS = frozenset({
    "reddit.com",
    "x.com",
    "twitter.com",
    "bsky.app",
    "threads.net",
    "youtube.com",
    "tiktok.com",
    "facebook.com",
    "instagram.com",
    "discord.com",
    "substack.com",
})

_TIER6_BOOK_TOUT_DOMAINS = frozenset({
    "draftkings.com",
    "fanduel.com",
    "betmgm.com",
    "caesars.com",
    "espnbet.com",
    "bet365.com",
    "pointsbet.com",
    "hardrock.bet",
    "prizepicks.com",
    "underdogfantasy.com",
    "actionnetwork.com",
    "covers.com",
    "vegasinsider.com",
    "oddsshark.com",
    "pinnacle.com",
    "bovada.lv",
})


def mask_api_key(key: str | None) -> str:
    """Return strictly masked form `<first4>...<last4>` so raw keys never leak."""
    raw = (key or "").strip()
    if not raw:
        return ""
    if len(raw) <= 10:
        return "***"
    return f"{raw[:4]}...{raw[-4:]}"


def assert_no_raw_secrets(text: str, extra_secrets: Optional[Sequence[str]] = None) -> None:
    """Fail closed if any raw provider key or caller-supplied secret appears unmasked."""
    if not text:
        return
    for pat in _RAW_SECRET_PATTERNS:
        if pat.search(text):
            raise ValueError("Raw secret pattern detected in output/payload")
    if extra_secrets:
        for sec in extra_secrets:
            clean = (sec or "").strip()
            if len(clean) >= 8 and "..." not in clean and clean in text:
                raise ValueError("Raw secret token matched extra_secrets in output/payload")


def enforce_privacy_boundary(query: str, *, line_free_mode: bool = True) -> None:
    """Block secrets, PII, proprietary GSE equations, and (when line_free_mode) odds."""
    try:
        assert_no_raw_secrets(query)
    except ValueError as exc:
        raise PrivacyBoundaryError(f"Outbound query blocked: {exc}") from exc

    for pat in _PII_PATTERNS:
        if pat.search(query):
            raise PrivacyBoundaryError("Outbound query blocked: PII detected")

    lowered = query.lower()
    for kw in _PROPRIETARY_KEYWORDS:
        if kw in lowered:
            raise PrivacyBoundaryError(f"Outbound query blocked: proprietary symbol '{kw}'")

    if line_free_mode:
        for pat in _MARKET_LINE_PATTERNS:
            if pat.search(query):
                raise PrivacyBoundaryError("Outbound query blocked: market odds/line forbidden in line_free_mode")


def strip_html_boilerplate(raw_text: str) -> str:
    """Remove scripts, styles, comments, and HTML tags while unescaping entities."""
    if not raw_text:
        return ""
    text = re.sub(r"<script\b[^>]*>.*?</script>", " ", raw_text, flags=re.I | re.S)
    text = re.sub(r"<style\b[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _detect_prompt_injection(text: str) -> List[str]:
    hits: List[str] = []
    for pat in _INJECTION_PATTERNS:
        if pat.search(text):
            hits.append(pat.pattern)
    return hits


def screen_passages_for_prompt_injection(passages: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Scan raw and HTML-cleaned passage text for prompt-injection directives."""
    safe_passages: List[Dict[str, Any]] = []
    flagged_passages: List[Dict[str, Any]] = []

    for item in passages:
        raw_excerpt = item.get("excerpt") or ""
        if not raw_excerpt and isinstance(item.get("excerpts"), list):
            raw_excerpt = " ".join(str(x) for x in item.get("excerpts", []))
        title = str(item.get("title") or "")
        combined_raw = f"{title} {raw_excerpt}".strip()
        cleaned = strip_html_boilerplate(raw_excerpt)
        reasons = _detect_prompt_injection(combined_raw) or _detect_prompt_injection(cleaned)
        if reasons:
            flagged_passages.append({**item, "cleaned_excerpt": cleaned, "injection_reasons": reasons})
        else:
            safe_passages.append({**item, "cleaned_excerpt": cleaned})

    return {
        "safe_passages": safe_passages,
        "flagged_passages": flagged_passages,
        "injection_blocked_count": len(flagged_passages),
    }


def _extract_host(url: str) -> str:
    parsed = urllib.parse.urlparse(url or "")
    host = (parsed.netloc or "").lower().split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    return host


def _domain_matches(host: str, domain_set: frozenset[str]) -> bool:
    if not host:
        return False
    if host in domain_set:
        return True
    return any(host.endswith(f".{dom}") for dom in domain_set)


def classify_source_tier(url: str) -> Dict[str, Any]:
    """Six-Tier Source Firewall: Tiers 1-4 factual, Tier 5 watchlist-only, Tier 6 rejected."""
    host = _extract_host(url)
    if _domain_matches(host, _TIER6_BOOK_TOUT_DOMAINS):
        return {"url": url, "host": host, "tier": 6, "label": "sportsbook_or_tout", "factual_allowed": False, "watchlist_only": False, "rejected": True}
    if _domain_matches(host, _TIER5_SOCIAL_DOMAINS):
        return {"url": url, "host": host, "tier": 5, "label": "social_or_forum", "factual_allowed": False, "watchlist_only": True, "rejected": False}
    if _domain_matches(host, _TIER1_DOMAINS):
        return {"url": url, "host": host, "tier": 1, "label": "official_league_or_team", "factual_allowed": True, "watchlist_only": False, "rejected": False}
    if _domain_matches(host, _TIER2_DOMAINS):
        return {"url": url, "host": host, "tier": 2, "label": "major_wire_or_broadcast", "factual_allowed": True, "watchlist_only": False, "rejected": False}
    if _domain_matches(host, _TIER3_DOMAINS):
        return {"url": url, "host": host, "tier": 3, "label": "structured_stats_charting", "factual_allowed": True, "watchlist_only": False, "rejected": False}
    return {"url": url, "host": host, "tier": 4, "label": "beat_or_general_web", "factual_allowed": True, "watchlist_only": False, "rejected": False}


def _parse_iso_utc(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    s = value.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def filter_bitemporal_results(
    items: Sequence[Dict[str, Any]],
    *,
    as_of_utc: str,
    require_timestamp: bool = True,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Keep only items whose `published_at` is not after `as_of_utc`."""
    cutoff = _parse_iso_utc(as_of_utc)
    if cutoff is None:
        raise ValueError(f"Invalid as_of_utc timestamp: {as_of_utc!r}")

    kept: List[Dict[str, Any]] = []
    dropped: List[Dict[str, Any]] = []
    for item in items:
        ts_raw = item.get("published_at") or item.get("publish_date")
        parsed = _parse_iso_utc(ts_raw)
        if parsed is None:
            if require_timestamp:
                dropped.append({**item, "drop_reason": "missing_or_invalid_published_at"})
            else:
                kept.append(dict(item))
            continue
        if parsed <= cutoff:
            kept.append(dict(item))
        else:
            dropped.append({**item, "drop_reason": f"post_cutoff:{parsed.isoformat()}>{cutoff.isoformat()}"})
    return kept, dropped


@dataclass
class CreditBudgetGovernor:
    """Enforces $20.00 total, $2.00/day, and $0.50/run Parallel AI spend caps."""

    total_ceiling_usd: float = DEFAULT_TOTAL_CEILING_USD
    daily_ceiling_usd: float = DEFAULT_DAILY_CEILING_USD
    per_run_ceiling_usd: float = DEFAULT_PER_RUN_CEILING_USD
    state_path: Optional[Path] = None
    total_spent_usd: float = 0.0
    daily_spent_usd: Dict[str, float] = field(default_factory=dict)
    history: List[Dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.state_path is not None:
            self.state_path = Path(self.state_path)
            if self.state_path.is_file():
                raw = json.loads(self.state_path.read_text(encoding="utf-8"))
                self.total_spent_usd = float(raw.get("total_spent_usd") or 0.0)
                self.daily_spent_usd = {
                    str(k): float(v) for k, v in (raw.get("daily_spent_usd") or {}).items()
                }
                self.history = list(raw.get("history") or [])

    @property
    def remaining_total_usd(self) -> float:
        return round(max(0.0, self.total_ceiling_usd - self.total_spent_usd), 6)

    def _today(self, as_of_date: Optional[str]) -> str:
        if as_of_date:
            return as_of_date[:10]
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def authorize(self, *, estimated_cost_usd: float, as_of_date: Optional[str] = None) -> None:
        if estimated_cost_usd < 0:
            raise ValueError("estimated_cost_usd must be non-negative")
        if estimated_cost_usd > self.per_run_ceiling_usd + 1e-9:
            raise ParallelBudgetExceededError(
                f"Estimated cost ${estimated_cost_usd:.4f} exceeds per-run ceiling ${self.per_run_ceiling_usd:.2f}"
            )
        day = self._today(as_of_date)
        day_spent = self.daily_spent_usd.get(day, 0.0)
        if day_spent + estimated_cost_usd > self.daily_ceiling_usd + 1e-9:
            raise ParallelBudgetExceededError(
                f"Projected daily spend ${day_spent + estimated_cost_usd:.4f} exceeds daily ceiling ${self.daily_ceiling_usd:.2f}"
            )
        if self.total_spent_usd + estimated_cost_usd > self.total_ceiling_usd + 1e-9:
            raise ParallelBudgetExceededError(
                f"Projected total spend ${self.total_spent_usd + estimated_cost_usd:.4f} exceeds total ceiling ${self.total_ceiling_usd:.2f}"
            )

    def record_spend(
        self,
        *,
        actual_cost_usd: float,
        as_of_date: Optional[str] = None,
        purpose: str = "parallel_call",
    ) -> Dict[str, Any]:
        day = self._today(as_of_date)
        cost = max(0.0, float(actual_cost_usd))
        self.total_spent_usd = round(self.total_spent_usd + cost, 6)
        self.daily_spent_usd[day] = round(self.daily_spent_usd.get(day, 0.0) + cost, 6)
        entry = {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "date": day,
            "cost_usd": cost,
            "purpose": purpose,
        }
        self.history.append(entry)
        self._persist()
        return entry

    def _persist(self) -> None:
        if self.state_path is None:
            return
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "total_ceiling_usd": self.total_ceiling_usd,
            "daily_ceiling_usd": self.daily_ceiling_usd,
            "per_run_ceiling_usd": self.per_run_ceiling_usd,
            "total_spent_usd": self.total_spent_usd,
            "remaining_total_usd": self.remaining_total_usd,
            "daily_spent_usd": self.daily_spent_usd,
            "history": self.history[-200:],
        }
        self.state_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _default_urllib_transport(
    url: str, headers: Dict[str, str], payload: Dict[str, Any], timeout: float
) -> Tuple[int, Dict[str, Any]]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url=url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            body = json.loads(resp.read().decode("utf-8"))
            return int(status), body
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Parallel AI HTTP {exc.code} at {url}: {err_body[:300]}") from exc


class ParallelAIClient:
    """Production client for Parallel AI Search + Grounded Chat endpoints."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        budget_governor: Optional[CreditBudgetGovernor] = None,
        transport: Optional[Callable[[str, Dict[str, str], Dict[str, Any], float], Tuple[int, Dict[str, Any]]]] = None,
        timeout_seconds: float = 20.0,
    ) -> None:
        resolved = (api_key if api_key is not None else os.environ.get("PARALLEL_API_KEY", "")).strip()
        if not resolved:
            raise DataGapError("parallel_ai", "PARALLEL_API_KEY is not configured in environment")
        self._api_key = resolved
        self.masked_key_fingerprint = mask_api_key(resolved)
        self.budget_governor = budget_governor or CreditBudgetGovernor()
        self._transport = transport or _default_urllib_transport
        self.timeout_seconds = timeout_seconds

    def search(
        self,
        *,
        objective: str,
        search_queries: List[str],
        max_results: int = 8,
        as_of_utc: Optional[str] = None,
        estimated_cost_usd: float = 0.02,
        line_free_mode: bool = True,
        require_timestamp: bool = False,
    ) -> Dict[str, Any]:
        enforce_privacy_boundary(objective, line_free_mode=line_free_mode)
        for q in search_queries:
            enforce_privacy_boundary(q, line_free_mode=line_free_mode)

        as_of_date = as_of_utc[:10] if as_of_utc else None
        self.budget_governor.authorize(estimated_cost_usd=estimated_cost_usd, as_of_date=as_of_date)

        headers = {
            "x-api-key": self._api_key,
            "parallel-beta": PARALLEL_BETA_SEARCH_HEADER,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "objective": objective,
            "search_queries": search_queries,
            "max_results": max_results,
            "excerpts": {"max_chars_per_result": 1200},
        }
        status, body = self._transport(PARALLEL_SEARCH_ENDPOINT, headers, payload, self.timeout_seconds)
        if status >= 400:
            raise RuntimeError(f"Parallel Search API returned HTTP {status}")

        actual_cost = float((body.get("usage") or {}).get("cost_usd", estimated_cost_usd))
        self.budget_governor.record_spend(actual_cost_usd=actual_cost, as_of_date=as_of_date, purpose="parallel_search")

        raw_results = list(body.get("results") or [])
        dropped_bitemporal: List[Dict[str, Any]] = []
        if as_of_utc:
            raw_results, dropped_bitemporal = filter_bitemporal_results(
                raw_results, as_of_utc=as_of_utc, require_timestamp=require_timestamp
            )

        inj = screen_passages_for_prompt_injection(raw_results)
        factual_results: List[Dict[str, Any]] = []
        watchlist_results: List[Dict[str, Any]] = []
        rejected_results: List[Dict[str, Any]] = [
            *[{**d, "rejection_category": "bitemporal"} for d in dropped_bitemporal],
            *[{**f, "rejection_category": "prompt_injection"} for f in inj["flagged_passages"]],
        ]

        for item in inj["safe_passages"]:
            tier_info = classify_source_tier(str(item.get("url") or ""))
            enriched = {**item, **tier_info}
            if tier_info["rejected"]:
                rejected_results.append({**enriched, "rejection_category": "tier6_sportsbook_or_tout"})
            elif tier_info["watchlist_only"]:
                watchlist_results.append(enriched)
            else:
                factual_results.append(enriched)

        return {
            "search_id": body.get("search_id"),
            "masked_key_fingerprint": self.masked_key_fingerprint,
            "factual_results": factual_results,
            "watchlist_results": watchlist_results,
            "rejected_results": rejected_results,
            "injection_blocked_count": inj["injection_blocked_count"],
            "cost_usd": actual_cost,
            "remaining_total_usd": self.budget_governor.remaining_total_usd,
        }

    def chat_grounded(
        self,
        *,
        prompt: str,
        model: str = PARALLEL_DEFAULT_CHAT_MODEL,
        as_of_utc: Optional[str] = None,
        estimated_cost_usd: float = 0.03,
        line_free_mode: bool = True,
    ) -> Dict[str, Any]:
        enforce_privacy_boundary(prompt, line_free_mode=line_free_mode)
        as_of_date = as_of_utc[:10] if as_of_utc else None
        self.budget_governor.authorize(estimated_cost_usd=estimated_cost_usd, as_of_date=as_of_date)

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
        }
        status, body = self._transport(PARALLEL_CHAT_ENDPOINT, headers, payload, self.timeout_seconds)
        if status >= 400:
            raise RuntimeError(f"Parallel Chat API returned HTTP {status}")

        actual_cost = float((body.get("usage") or {}).get("cost_usd", estimated_cost_usd))
        self.budget_governor.record_spend(actual_cost_usd=actual_cost, as_of_date=as_of_date, purpose="parallel_chat")

        choices = body.get("choices") or []
        raw_content = ""
        if choices and isinstance(choices[0], dict):
            raw_content = str(((choices[0].get("message") or {}).get("content")) or "")
        screened = screen_passages_for_prompt_injection([{"url": PARALLEL_CHAT_ENDPOINT, "excerpt": raw_content}])
        if screened["injection_blocked_count"] > 0:
            raise PrivacyBoundaryError("Grounded chat response flagged for prompt injection")
        clean_content = screened["safe_passages"][0]["cleaned_excerpt"] if screened["safe_passages"] else ""

        citations = []
        for c in (body.get("basis") or []):
            if isinstance(c, dict) and c.get("citation"):
                tier_info = classify_source_tier(str(c["citation"]))
                citations.append(tier_info)

        return {
            "id": body.get("id"),
            "model": body.get("model") or model,
            "masked_key_fingerprint": self.masked_key_fingerprint,
            "content": clean_content,
            "citations": citations,
            "cost_usd": actual_cost,
            "remaining_total_usd": self.budget_governor.remaining_total_usd,
        }
