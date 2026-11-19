"""Wave 22 read-only cross-branch RLVR salvage pipeline.

Scans read-only remote git refs via git plumbing, extracts trainer-style JSONL
records, sanitizes text to pure 7-bit ASCII, enforces trust-gate and odds/block
firewalls, normalizes to the RLVR prompt/response schema, performs deterministic
exact-substring deduplication, and writes the salvaged feed plus manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT: Path = Path(__file__).resolve().parents[2]

NAMED_TARGET_REFS: tuple[str, ...] = (
    "origin/motif/sweep-ingestion-2026-11-14",
    "origin/motif/nova-dossier-2026-11-07",
    "origin/feat/hermes-research-wiring-2026-11-11",
)

FILENAME_KEYWORDS: tuple[str, ...] = (
    "rlvr",
    "feed",
    "trainer",
    "sweep",
    "mind",
    "dossier",
    "autopsy",
    "lesson",
)

MAX_FILE_BYTES: int = 50 * 1024 * 1024
MAX_FIELD_CHARS: int = 4000
FIXED_DEFAULT_PROMPT: str = "Summarize the verified engine lesson."
PROVENANCE_TAG: str = "wave22_cross_branch_readonly_salvage"

TIER_1: str = "TIER_1_FOUNDATION"
TIER_2: str = "TIER_2_SYNTHESIS"
TIER_3: str = "TIER_3_BEHEMOTH"
TIER_ORDER: dict[str, int] = {
    TIER_1: 0,
    TIER_2: 1,
    TIER_3: 2,
}

DEFAULT_FEED_REL: Path = Path("brain/feeds/2026-11-17/cross_branch_salvaged_rlvr_feed.jsonl")
DEFAULT_MANIFEST_REL: Path = Path("data/engine/wave22_cross_branch_salvage_manifest.json")

ASCII_PUNCT_MAP: dict[str, str] = {
    "\u2010": "-",
    "\u2011": "-",
    "\u2012": "-",
    "\u2013": "-",
    "\u2014": "-",
    "\u2015": "-",
    "\u2212": "-",
    "\u2018": "'",
    "\u2019": "'",
    "\u201a": "'",
    "\u201b": "'",
    "\u2032": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u201e": '"',
    "\u201f": '"',
    "\u2033": '"',
    "\u2026": "...",
    "\u00a0": " ",
    "\u2002": " ",
    "\u2003": " ",
    "\u2009": " ",
    "\u202f": " ",
}
ASCII_TRANS: dict[int, str] = str.maketrans(ASCII_PUNCT_MAP)

FALLBACK_TRUST_GATE_WORD_PHRASES: tuple[str, ...] = (
    "lock",
    "AI picks",
    "AI pick",
    "AI-generated picks",
    "AI generated picks",
    "AI-generated pick",
    "AI generated pick",
)

FALLBACK_TRUST_GATE_SUBSTR_PHRASES: tuple[str, ...] = (
    "guaranteed",
    "sure thing",
    "risk-free",
    "risk free",
    "riskless",
    "easy money",
    "free money",
    "can't lose",
    "cant lose",
    "verified track record",
    "thousands of bettors",
    "trusted by serious bettors",
    "guaranteed profit",
    "guaranteed roi",
    "guaranteed winner",
    "lock of the day",
    "automatic winner",
    "beat the book",
    "insider information",
    "profitable system",
    "no risk",
    "100% chance",
    "sharp money",
    "smart money",
)

FALLBACK_POSITIONING_PHRASES: tuple[str, ...] = (
    "AI-powered",
    "AI powered",
    "powered by AI",
    "AI-driven",
    "AI driven",
    "AI-assisted",
    "AI assisted",
    "AI-based",
    "AI based",
    "AI-enabled",
    "AI enabled",
    "AI-generated",
    "AI generated",
    "AI-generated pick",
    "AI-generated picks",
    "AI generated pick",
    "AI generated picks",
    "AI picks",
    "AI pick",
    "our AI",
    "artificial intelligence",
    "machine learning",
    "machine learning model",
    "ML model",
    "AI agents",
    "multimodal intelligence",
    "22,750,000 snap evaluations",
    "10-Layer Autonomous Engine",
    "deep-math dossiers",
    "Romano CQR honest conformal intervals",
    "Optimal Transport certificates",
    "31-11 banner is retracted",
    "TNF card 14-6",
)

ODDS_FIREWALL_WORDS: tuple[str, ...] = (
    "odds",
    "moneyline",
    "sportsbook",
    "sportsbooks",
    "draftkings",
    "fanduel",
    "betmgm",
    "caesars",
    "vig",
    "juice",
    "parlay",
    "parlays",
    "wager",
    "wagers",
    "bet",
    "bets",
    "betting",
    "bettor",
    "bettors",
    "bookmaker",
    "bookmakers",
    "handicapper",
    "handicappers",
    "spread line",
    "over/under",
    "ats",
    "cover the spread",
    "lock of the day",
    "units",
    "stake",
    "polymarket",
    "kalshi",
)

SECRET_TOKEN_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bsk-[A-Za-z0-9_-]{8,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{8,}"),
    re.compile(r"\bAKIA[0-9A-Z]{12,}"),
    re.compile(r"Bearer\s"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._-]{12,}", re.IGNORECASE),
    re.compile(r"\bAIza[0-9A-Za-z_-]{20,}"),
    re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"\bglpat-[A-Za-z0-9_-]{16,}"),
    re.compile(r"\b(?:sk_live|sk_test|rk_live|rk_test|whsec)_[A-Za-z0-9]{12,}"),
    re.compile(r"-----BEGIN [A-Z0-9 ]+ PRIVATE KEY-----"),
    re.compile(
        r"(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['\"]?[A-Fa-f0-9]{24,}",
        re.IGNORECASE,
    ),
)

HASH_METADATA_KEYS: frozenset[str] = frozenset(
    {
        "sha256",
        "textSha256",
        "inputHash",
        "doc_hash",
        "source_doc_hash",
        "source_sha256_16",
        "record_id",
        "id",
    }
)

PROMPT_KEYS: tuple[str, ...] = (
    "prompt",
    "trainer_prompt",
    "instruction",
    "question",
    "input",
)

RESPONSE_KEYS: tuple[str, ...] = (
    "response",
    "trainer_completion",
    "output",
    "answer",
    "completion",
    "text",
)

TITLE_KEYS: tuple[str, ...] = (
    "title_or_hook",
    "title",
    "principle_name",
    "principle_or_feature",
    "name",
    "query",
    "section",
)

BODY_FALLBACK_KEYS: tuple[str, ...] = (
    "summary",
    "lesson_summary",
    "lesson",
    "content",
    "abstract",
    "full_text",
    "how_it_influences_reasoning",
    "influence_description",
    "operator_excerpt",
    "veto_excerpt",
    "evidence_quote",
    "mechanism_quote",
    "engineApplication",
    "engine_application",
    "coach_game_impact",
    "coach_scheme_application",
    "excerpt",
)


def to_pure_ascii(text: str) -> str:
    """Convert any string to pure 7-bit ASCII without loss of basic punctuation."""
    if text.isascii():
        if "\r" in text or "\x00" in text:
            text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
        return text.strip()
    cleaned = text.translate(ASCII_TRANS)
    if not cleaned.isascii():
        cleaned = unicodedata.normalize("NFKD", cleaned)
        cleaned = cleaned.encode("ascii", "ignore").decode("ascii")
    if "\r" in cleaned or "\x00" in cleaned:
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    return cleaned.strip()


def run_git_bytes(repo_root: Path, args: list[str], stdin_bytes: bytes | None = None) -> bytes:
    """Run a read-only git command and return raw stdout bytes."""
    proc = subprocess.run(
        ["git", "-c", "core.quotepath=false", *args],
        cwd=repo_root,
        input=stdin_bytes,
        capture_output=True,
        check=True,
    )
    return proc.stdout


def list_remote_refs(repo_root: Path) -> set[str]:
    """List existing remote refs via git branch -r without fetching."""
    raw = run_git_bytes(repo_root, ["branch", "-r", "--format=%(refname:short)"])
    refs: set[str] = set()
    for line in raw.decode("utf-8", errors="replace").splitlines():
        ref = line.strip()
        if ref and "->" not in ref:
            refs.add(ref)
    return refs


def resolve_target_refs(remote_refs: set[str]) -> tuple[list[str], list[str]]:
    """Resolve existing target refs and missing named target refs."""
    scanned: list[str] = []
    missing: list[str] = []
    seen: set[str] = set()

    for ref in NAMED_TARGET_REFS:
        if ref in remote_refs:
            scanned.append(ref)
            seen.add(ref)
        else:
            missing.append(ref)

    fix_refs = sorted(r for r in remote_refs if r.startswith("origin/fix/") and r not in seen)
    scanned.extend(fix_refs)
    return scanned, missing


def is_candidate_jsonl_path(path: str) -> bool:
    """Determine whether a repo-relative path matches trainer-style JSONL criteria."""
    low = path.lower().replace("\\", "/")
    if not low.endswith(".jsonl"):
        return False
    if low == "brain/mind.jsonl":
        return False
    if low.startswith("gse-ml-service/") or "/gse-ml-service/" in low:
        return False

    parts = low.split("/")
    if ".claude" in parts:
        return False
    if any(part.startswith(".env") for part in parts):
        return False

    if low.startswith("brain/feeds/"):
        return True
    if low.startswith("data/") and "/feeds/" in low:
        return True

    filename = parts[-1]
    return any(kw in filename for kw in FILENAME_KEYWORDS)


def list_ref_candidate_blobs(
    repo_root: Path, ref: str
) -> list[tuple[str, str, int]]:
    """List candidate (path, blob_sha, size) tuples on a ref using git plumbing."""
    tree_raw = run_git_bytes(repo_root, ["ls-tree", "-r", "--name-only", ref])
    candidates = [
        line.strip()
        for line in tree_raw.decode("utf-8", errors="replace").splitlines()
        if line.strip() and is_candidate_jsonl_path(line.strip())
    ]
    if not candidates:
        return []

    batch_in = "".join(f"{ref}:{p}\n" for p in candidates).encode("utf-8")
    batch_out = run_git_bytes(repo_root, ["cat-file", "--batch-check"], stdin_bytes=batch_in)
    lines = batch_out.decode("utf-8", errors="replace").splitlines()

    valid: list[tuple[str, str, int]] = []
    for path, meta_line in zip(candidates, lines, strict=False):
        parts = meta_line.split()
        if len(parts) >= 3 and parts[1] == "blob":
            try:
                size = int(parts[2])
            except ValueError:
                continue
            if 0 < size <= MAX_FILE_BYTES:
                valid.append((path, parts[0], size))
    return valid


def fetch_blobs_batch(repo_root: Path, shas: list[str]) -> dict[str, bytes]:
    """Fetch multiple git blobs by SHA in one git cat-file --batch call."""
    if not shas:
        return {}
    batch_in = "".join(f"{sha}\n" for sha in shas).encode("ascii")
    raw = run_git_bytes(repo_root, ["cat-file", "--batch"], stdin_bytes=batch_in)

    result: dict[str, bytes] = {}
    pos = 0
    total = len(raw)
    while pos < total:
        nl = raw.find(b"\n", pos)
        if nl == -1:
            break
        header = raw[pos:nl].decode("ascii", errors="replace")
        pos = nl + 1
        parts = header.split()
        if len(parts) >= 3 and parts[1] == "blob":
            sha = parts[0]
            size = int(parts[2])
            blob_bytes = raw[pos : pos + size]
            result[sha] = blob_bytes
            pos += size
            if pos < total and raw[pos : pos + 1] == b"\n":
                pos += 1
    return result


def build_firewall_regexes(repo_root: Path) -> tuple[re.Pattern[str], re.Pattern[str]]:
    """Build combined trust-gate, positioning-vocab, odds, and secret regexes."""
    alts: list[str] = []

    word_phrases: list[str] = list(FALLBACK_TRUST_GATE_WORD_PHRASES)
    substr_phrases: list[str] = list(FALLBACK_TRUST_GATE_SUBSTR_PHRASES)
    positioning_phrases: list[str] = list(FALLBACK_POSITIONING_PHRASES)

    trust_gate_path = repo_root / "scripts/guardrails/trust-gate.mjs"
    if trust_gate_path.is_file():
        try:
            tg_text = trust_gate_path.read_text(encoding="utf-8", errors="replace")
            for m in re.finditer(
                r'\{\s*phrase:\s*"([^"]+)"\s*,\s*wordBoundary:\s*(true|false)',
                tg_text,
            ):
                phrase = m.group(1)
                is_wb = m.group(2) == "true"
                if is_wb and phrase not in word_phrases:
                    word_phrases.append(phrase)
                elif not is_wb and phrase not in substr_phrases:
                    substr_phrases.append(phrase)
        except OSError:
            pass

    pos_vocab_path = repo_root / "apps/web/lib/positioning-vocab.json"
    if pos_vocab_path.is_file():
        try:
            pos_data = json.loads(pos_vocab_path.read_text(encoding="utf-8", errors="replace"))
            if isinstance(pos_data, dict):
                raw_list = pos_data.get("bannedPhrases")
                if isinstance(raw_list, list):
                    for item in raw_list:
                        if isinstance(item, str) and item not in positioning_phrases:
                            positioning_phrases.append(item)
        except (OSError, json.JSONDecodeError):
            pass

    for phrase in word_phrases:
        escaped = re.escape(to_pure_ascii(phrase))
        alts.append(rf"\b{escaped}\b")

    for phrase in substr_phrases:
        escaped = re.escape(to_pure_ascii(phrase))
        alts.append(escaped)

    for phrase in positioning_phrases:
        clean = to_pure_ascii(phrase)
        parts = [re.escape(tok) for tok in re.split(r"[\s-]+", clean) if tok]
        if parts:
            joined = r"[\s-]+".join(parts)
            alts.append(rf"\b{joined}\b")

    for term in ODDS_FIREWALL_WORDS:
        clean = to_pure_ascii(term)
        if " " in clean:
            parts = [re.escape(tok) for tok in clean.split()]
            alts.append(r"\b" + r"\s+".join(parts) + r"\b")
        else:
            alts.append(rf"\b{re.escape(clean)}\b")

    # Sort longest-first for deterministic alternation precedence.
    unique_alts = sorted(set(alts), key=len, reverse=True)
    term_regex = re.compile("|".join(unique_alts), re.IGNORECASE)
    secret_regex = re.compile("|".join(p.pattern for p in SECRET_TOKEN_PATTERNS), re.IGNORECASE)
    return term_regex, secret_regex


def collect_sanitized_strings(
    obj: Any,
    all_out: list[str],
    non_hash_out: list[str],
    in_hash_key: bool = False,
) -> None:
    """Collect string values in one pass into all_out and non_hash_out as pure ASCII."""
    if isinstance(obj, str):
        s = to_pure_ascii(obj)
        if s:
            all_out.append(s)
            if not in_hash_key:
                non_hash_out.append(s)
    elif isinstance(obj, list):
        for item in obj:
            collect_sanitized_strings(item, all_out, non_hash_out, in_hash_key=in_hash_key)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            is_hash = in_hash_key or (isinstance(k, str) and k in HASH_METADATA_KEYS)
            collect_sanitized_strings(v, all_out, non_hash_out, in_hash_key=is_hash)


def hits_firewall(
    record: dict[str, Any],
    prompt: str,
    response: str,
    patterns: tuple[re.Pattern[str], re.Pattern[str]],
) -> bool:
    """Return True if the record trips any trust-gate, odds, block, or secret rule."""
    term_regex, secret_regex = patterns
    all_strings: list[str] = [prompt, response]
    non_hash_strings: list[str] = [prompt, response]
    collect_sanitized_strings(record, all_strings, non_hash_strings)
    combined = "\n".join(all_strings)
    if "block" in combined.lower():
        return True

    if term_regex.search(combined):
        return True

    secret_combined = "\n".join(non_hash_strings)
    return bool(secret_regex.search(secret_combined))


def _first_nonempty_str(record: dict[str, Any], keys: tuple[str, ...]) -> str:
    """Return the first non-empty ASCII-sanitized string among candidate keys."""
    for key in keys:
        val = record.get(key)
        if isinstance(val, str):
            clean = to_pure_ascii(val)
            if clean:
                return clean
    return ""


def _extract_messages_pair(record: dict[str, Any]) -> tuple[str, str]:
    """Extract (user, assistant) pair from chat/SFT message lists if present."""
    for list_key in ("messages", "sft_messages"):
        msgs = record.get(list_key)
        if not isinstance(msgs, list):
            continue
        user_parts: list[str] = []
        asst_parts: list[str] = []
        for msg in msgs:
            if not isinstance(msg, dict):
                continue
            role = str(msg.get("role", "")).lower()
            content = msg.get("content")
            if not isinstance(content, str):
                continue
            clean = to_pure_ascii(content)
            if not clean:
                continue
            if role == "user":
                user_parts.append(clean)
            elif role == "assistant":
                asst_parts.append(clean)
        if asst_parts:
            return "\n".join(user_parts), "\n".join(asst_parts)

    dpo = record.get("dpo_grpo_pair")
    if isinstance(dpo, dict):
        p = to_pure_ascii(str(dpo.get("prompt", ""))) if isinstance(dpo.get("prompt"), str) else ""
        c = to_pure_ascii(str(dpo.get("chosen", ""))) if isinstance(dpo.get("chosen"), str) else ""
        if c:
            return p, c
    return "", ""


def extract_prompt_response(record: dict[str, Any]) -> tuple[str, str] | None:
    """Map a heterogeneous JSONL record to normalized (prompt, response)."""
    prompt = _first_nonempty_str(record, PROMPT_KEYS)
    response = _first_nonempty_str(record, RESPONSE_KEYS)

    if not prompt and not response:
        msg_prompt, msg_resp = _extract_messages_pair(record)
        prompt = msg_prompt
        response = msg_resp

    if not response:
        response = _first_nonempty_str(record, BODY_FALLBACK_KEYS)

    if not response:
        parts: list[str] = []
        for key in (
            "equationLatex",
            "equation_latex",
            "equation",
            "equations",
            "formula",
            "formula_latex",
            "latex",
            "verdict",
            "engine_training_value",
            "result",
            "payload",
        ):
            val = record.get(key)
            if isinstance(val, str):
                clean = to_pure_ascii(val)
                if clean:
                    parts.append(f"{key}: {clean}")
            elif isinstance(val, (dict, list)) and val:
                serialized = to_pure_ascii(json.dumps(val, ensure_ascii=True, sort_keys=True))
                if serialized and serialized not in ("{}", "[]"):
                    parts.append(f"{key}: {serialized}")
        if parts:
            response = "\n".join(parts)

    if not response:
        title_only = _first_nonempty_str(record, TITLE_KEYS)
        if not title_only:
            return None
        return FIXED_DEFAULT_PROMPT, title_only[:MAX_FIELD_CHARS]

    if not prompt:
        prompt = FIXED_DEFAULT_PROMPT

    return prompt[:MAX_FIELD_CHARS], response[:MAX_FIELD_CHARS]


def assign_tier(prompt: str, response: str) -> str:
    """Assign tier heuristic by total text length (<600 T1, <2000 T2, else T3)."""
    length = len(prompt) + len(response)
    if length < 600:
        return TIER_1
    if length < 2000:
        return TIER_2
    return TIER_3


def deduplicate_records(
    candidates: list[dict[str, str]],
) -> tuple[list[dict[str, str]], dict[str, int]]:
    """Drop records whose normalized response is identical to or contained in a kept one."""
    ordered = sorted(
        candidates,
        key=lambda r: (
            -len(r["response"]),
            r["response"],
            r["prompt"],
            r["id"],
            r["source_ref"],
            r["source_path"],
        ),
    )

    kept: list[dict[str, str]] = []
    seen_exact: set[str] = set()
    kept_responses: list[str] = []
    stride_k = 16
    min_indexed_len = 2 * stride_k - 1
    ngram_index: dict[str, list[int]] = {}
    dupes_per_ref: dict[str, int] = {}
    kept_blob: str | None = None

    for rec in ordered:
        resp = rec["response"]
        if resp in seen_exact:
            ref = rec["source_ref"]
            dupes_per_ref[ref] = dupes_per_ref.get(ref, 0) + 1
            continue

        is_sub = False
        rlen = len(resp)
        if rlen >= min_indexed_len:
            mid = (rlen - min_indexed_len) // 2
            windows = [resp[:min_indexed_len], resp[mid : mid + min_indexed_len]]
            if rlen >= min_indexed_len * 2:
                windows.append(resp[-min_indexed_len:])
            candidate_sets: list[set[int]] = []
            for window in windows:
                w_hits: set[int] = set()
                for j in range(stride_k):
                    gram = window[j : j + stride_k]
                    hits = ngram_index.get(gram)
                    if hits:
                        w_hits.update(hits)
                candidate_sets.append(w_hits)
                if not w_hits:
                    break
            candidate_ids = candidate_sets[0]
            for s in candidate_sets[1:]:
                candidate_ids = candidate_ids & s
                if not candidate_ids:
                    break
            for idx in candidate_ids:
                if resp in kept_responses[idx]:
                    is_sub = True
                    break
        else:
            if kept_blob is None:
                kept_blob = "\x00".join(kept_responses)
            if resp in kept_blob:
                is_sub = True

        if is_sub:
            ref = rec["source_ref"]
            dupes_per_ref[ref] = dupes_per_ref.get(ref, 0) + 1
            continue

        kept_idx = len(kept_responses)
        kept.append(rec)
        seen_exact.add(resp)
        kept_responses.append(resp)
        if kept_blob is not None:
            kept_blob = f"{kept_blob}\x00{resp}"

        if rlen >= stride_k:
            for pos in range(0, rlen - stride_k + 1, stride_k):
                gram = resp[pos : pos + stride_k]
                ngram_index.setdefault(gram, []).append(kept_idx)

    return kept, dupes_per_ref


def run_salvage(repo_root: Path, max_records: int) -> dict[str, Any]:
    """Execute read-only cross-branch salvage and write feed and manifest."""
    remote_refs = list_remote_refs(repo_root)
    refs_scanned, refs_missing = resolve_target_refs(remote_refs)
    firewall_patterns = build_firewall_regexes(repo_root)

    ref_file_map: dict[str, list[tuple[str, str, int]]] = {}
    all_shas: set[str] = set()
    for ref in refs_scanned:
        blobs = list_ref_candidate_blobs(repo_root, ref)
        ref_file_map[ref] = blobs
        for _, sha, _ in blobs:
            all_shas.add(sha)

    blob_cache = fetch_blobs_batch(repo_root, sorted(all_shas))

    # Cache per-blob parsed/filtered/extracted outcomes so shared blobs across
    # dozens of fix/* branches are evaluated once while per-ref stats stay exact.
    parsed_blob_cache: dict[
        str,
        tuple[int, int, int, int, list[tuple[str, str, str, str]]],
    ] = {}

    per_ref_stats: dict[str, dict[str, int]] = {}
    candidates: list[dict[str, str]] = []

    total_files = 0
    total_lines = 0
    total_unparsable = 0
    total_empty_no_text = 0
    total_dropped_firewall = 0

    for ref in refs_scanned:
        blobs = ref_file_map[ref]
        ref_stats: dict[str, int] = {
            "files_scanned": len(blobs),
            "lines_read": 0,
            "unparsable": 0,
            "empty_or_no_text": 0,
            "dropped_by_firewall": 0,
            "candidates_passed_firewall": 0,
            "dropped_dupes": 0,
            "kept": 0,
        }

        for path, sha, _size in blobs:
            if sha not in parsed_blob_cache:
                raw_bytes = blob_cache.get(sha, b"")
                text = raw_bytes.decode("utf-8", errors="replace")
                b_lines = 0
                b_unparsable = 0
                b_empty = 0
                b_firewall = 0
                b_records: list[tuple[str, str, str, str]] = []

                for line in text.splitlines():
                    stripped = line.strip()
                    if not stripped:
                        continue
                    b_lines += 1
                    try:
                        obj = json.loads(stripped)
                    except json.JSONDecodeError:
                        b_unparsable += 1
                        continue
                    if not isinstance(obj, dict):
                        b_unparsable += 1
                        continue

                    extracted = extract_prompt_response(obj)
                    if extracted is None:
                        b_empty += 1
                        continue
                    prompt, response = extracted

                    if hits_firewall(obj, prompt, response, firewall_patterns):
                        b_firewall += 1
                        continue

                    canonical_text = f"{prompt}\n{response}"
                    rec_id = hashlib.sha256(canonical_text.encode("ascii")).hexdigest()[:16]
                    tier = assign_tier(prompt, response)
                    b_records.append((rec_id, tier, prompt, response))

                parsed_blob_cache[sha] = (
                    b_lines,
                    b_unparsable,
                    b_empty,
                    b_firewall,
                    b_records,
                )

            b_lines, b_unparsable, b_empty, b_firewall, b_records = parsed_blob_cache[sha]
            ref_stats["lines_read"] += b_lines
            ref_stats["unparsable"] += b_unparsable
            ref_stats["empty_or_no_text"] += b_empty
            ref_stats["dropped_by_firewall"] += b_firewall
            ref_stats["candidates_passed_firewall"] += len(b_records)

            for rec_id, tier, prompt, response in b_records:
                candidates.append(
                    {
                        "id": rec_id,
                        "source_ref": ref,
                        "source_path": path,
                        "tier": tier,
                        "prompt": prompt,
                        "response": response,
                        "provenance": PROVENANCE_TAG,
                    }
                )

        per_ref_stats[ref] = ref_stats
        total_files += ref_stats["files_scanned"]
        total_lines += ref_stats["lines_read"]
        total_unparsable += ref_stats["unparsable"]
        total_empty_no_text += ref_stats["empty_or_no_text"]
        total_dropped_firewall += ref_stats["dropped_by_firewall"]

    deduped, dupes_per_ref = deduplicate_records(candidates)
    total_dropped_dupes = sum(dupes_per_ref.values())

    if max_records >= 0 and len(deduped) > max_records:
        selected = deduped[:max_records]
        truncated_by_max = len(deduped) - max_records
    else:
        selected = deduped
        truncated_by_max = 0

    final_records = sorted(
        selected,
        key=lambda r: (TIER_ORDER.get(r["tier"], 99), r["id"]),
    )

    for ref, d_cnt in dupes_per_ref.items():
        if ref in per_ref_stats:
            per_ref_stats[ref]["dropped_dupes"] = d_cnt
    for rec in final_records:
        ref = rec["source_ref"]
        if ref in per_ref_stats:
            per_ref_stats[ref]["kept"] += 1

    feed_path = repo_root / DEFAULT_FEED_REL
    feed_path.parent.mkdir(parents=True, exist_ok=True)
    with feed_path.open("w", encoding="ascii", newline="\n") as fh:
        for rec in final_records:
            fh.write(json.dumps(rec, ensure_ascii=True) + "\n")

    feed_bytes = feed_path.read_bytes()
    feed_sha256 = hashlib.sha256(feed_bytes).hexdigest()
    non_ascii_bytes = sum(1 for b in feed_bytes if b >= 0x80)

    tier_counts: dict[str, int] = {
        TIER_1: 0,
        TIER_2: 0,
        TIER_3: 0,
    }
    for rec in final_records:
        t = rec["tier"]
        tier_counts[t] = tier_counts.get(t, 0) + 1

    manifest: dict[str, Any] = {
        "provenance": PROVENANCE_TAG,
        "generated_utc": datetime.now(UTC).isoformat(),
        "feed_path": DEFAULT_FEED_REL.as_posix(),
        "sha256": feed_sha256,
        "non_ascii_bytes_in_feed": non_ascii_bytes,
        "refs_scanned": refs_scanned,
        "refs_missing": refs_missing,
        "files_scanned": total_files,
        "lines_read": total_lines,
        "unparsable": total_unparsable,
        "empty_or_no_text": total_empty_no_text,
        "dropped_by_firewall": total_dropped_firewall,
        "dropped_dupes": total_dropped_dupes,
        "truncated_by_max_records": truncated_by_max,
        "kept": len(final_records),
        "tier_counts": tier_counts,
        "per_ref": per_ref_stats,
    }

    manifest_path = repo_root / DEFAULT_MANIFEST_REL
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=True) + "\n",
        encoding="ascii",
    )
    return manifest


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Read-only cross-branch RLVR JSONL salvage script.",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=REPO_ROOT,
        help="Path to the repository root (defaults to detected repo root).",
    )
    parser.add_argument(
        "--max-records",
        type=int,
        default=20000,
        help="Maximum number of deduplicated records to keep (default: 20000).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point for Wave 22 cross-branch RLVR salvage."""
    args = parse_args(argv)
    manifest = run_salvage(args.repo_root.resolve(), args.max_records)
    summary = {
        "refs_scanned": len(manifest["refs_scanned"]),
        "refs_missing": len(manifest["refs_missing"]),
        "files_scanned": manifest["files_scanned"],
        "lines_read": manifest["lines_read"],
        "unparsable": manifest["unparsable"],
        "dropped_by_firewall": manifest["dropped_by_firewall"],
        "dropped_dupes": manifest["dropped_dupes"],
        "kept": manifest["kept"],
        "non_ascii_bytes_in_feed": manifest["non_ascii_bytes_in_feed"],
        "sha256": manifest["sha256"],
    }
    print(json.dumps(summary, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
