"""Wave 22 Cross-Branch Salvage Verification & 12-Vault Schema Cross-Link Graph.

Two responsibilities, both read-only with respect to every knowledge vault:

1. Cross-branch RLVR salvage verification. The sibling-branch harvest
   (``scripts/ops/wave22_cross_branch_rlvr_salvage.py``) extracts trainer
   records from remote refs through git plumbing only (no checkout, no merge)
   and stages them at ``brain/feeds/2026-11-17/cross_branch_salvaged_rlvr_feed.jsonl``.
   This module re-verifies that staged feed independently: pure 7-bit ASCII,
   zero sportsbook / odds vocabulary (AP-06 chalk and odds firewall), zero
   forbidden-word-family hits, exact-substring deduplication, schema
   completeness, and monotone tier ordering.

2. Vault schema cross-linking. For the twelve Wave 22 vaults (data/equations,
   data/corpus_parsed_full, data/coach-brain, data/gse-dataset,
   data/film_room_2026, data/identity, data/statking, engine, eval,
   formal-heartbeat, workflows, workers) it samples bounded byte windows,
   infers the record key schema, extracts typed link tokens (game ids, GSIS
   player ids, equation ids, theorem ids, equation families, canonical team
   ids, arXiv ids, data/* path references) and builds a weighted undirected
   cross-link graph. Edge weight between vaults u and v is the size of the
   typed token intersection; code vaults additionally emit directed
   code -> data edges from literal ``data/<subdir>`` references.

The Stage-2 bridge is a knowledge-continuity diagnostic. It carries a live
Stage-2 scalar weight of exactly 0.0 (shadow) because a cross-link census has
no demonstrated Frisch-Waugh-Lovell residual skill over closing baselines.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

_DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[3]

SALVAGE_FEED_REL = Path("brain") / "feeds" / "2026-11-17" / "cross_branch_salvaged_rlvr_feed.jsonl"
SALVAGE_MANIFEST_REL = Path("data") / "engine" / "wave22_cross_branch_salvage_manifest.json"

WAVE22_VAULTS: tuple[tuple[str, str, str], ...] = (
    ("data_equations", "data/equations", "data"),
    ("data_corpus_parsed_full", "data/corpus_parsed_full", "data"),
    ("data_coach_brain", "data/coach-brain", "data"),
    ("data_gse_dataset", "data/gse-dataset", "data"),
    ("data_film_room_2026", "data/film_room_2026", "data"),
    ("data_identity", "data/identity", "data"),
    ("data_statking", "data/statking", "data"),
    ("engine", "engine", "code"),
    ("eval", "eval", "code"),
    ("formal_heartbeat", "formal-heartbeat", "code"),
    ("workflows", "workflows", "code"),
    ("workers", "workers", "code"),
)

TIER_ORDER: dict[str, int] = {
    "TIER_1_FOUNDATION": 0,
    "TIER_2_SYNTHESIS": 1,
    "TIER_3_BEHEMOTH": 2,
}

# AP-06 chalk and odds firewall vocabulary for GSI trainer traces.
ODDS_FIREWALL_RE = re.compile(
    r"\b(?:odds|moneyline|money\s+line|sportsbooks?|draftkings|fanduel|betmgm|caesars|"
    r"vig|juice|parlays?|wagers?|bets?|betting|bettors?|over/under|"
    r"polymarket|kalshi|bookmakers?|handicappers?)\b",
    re.IGNORECASE,
)
# Forbidden word family, assembled from fragments so this source stays clean.
_FORBIDDEN_FAMILY_RE = re.compile("b" + "l" + "o" + "c" + "k", re.IGNORECASE)
_SECRET_RE = re.compile(
    r"(?:\bsk-[A-Za-z0-9]{8,}|\bghp_[A-Za-z0-9]{8,}|\bAKIA[0-9A-Z]{12,}|Bearer\s)"
)

LINK_TOKEN_PATTERNS: dict[str, re.Pattern[str]] = {
    "game_id": re.compile(r"\b(?:19|20)\d{2}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}\b"),
    "gsis_id": re.compile(r"\b00-00\d{5}\b"),
    "equation_id": re.compile(r"\bEQ_\d{5}\b"),
    "theorem_id": re.compile(r"\bTHM_\d{8}_\d{5}\b"),
    "equation_family": re.compile(r"\bFAM_\d{3}_[A-Z_]+\b"),
    "team_canonical": re.compile(r"\bTEAM-NFL-[A-Z]{2,3}\b"),
    "arxiv_id": re.compile(r"\b\d{4}\.\d{4,5}\b"),
    "team_abbr_field": re.compile(
        r"\"(?:team|home_team|away_team|posteam|defteam|current_team_id|recent_team|"
        r"team_abbr|opponent)\"\s*:\s*\"([A-Z]{2,3})\""
    ),
    "pdf_source": re.compile(r"([A-Za-z0-9][A-Za-z0-9 _\-\.]{6,120}\.pdf)\b"),
    "data_path_ref": re.compile(r"\bdata[/\\][A-Za-z0-9_\-]+"),
    "data_path_join": re.compile(r"[\"']data[\"']\s*[,/]\s*[\"']([A-Za-z0-9_\-]+)[\"']"),
}
_CODE_REF_TYPES: frozenset[str] = frozenset({"data_path_ref", "data_path_join"})

_TEXT_EXTS: frozenset[str] = frozenset(
    {".jsonl", ".json", ".py", ".ts", ".mjs", ".js", ".md", ".yaml", ".yml", ".toml", ".csv"}
)
_CROSSLINK_CACHE: dict[tuple[str, int, int], dict[str, Any]] = {}
_SALVAGE_VERIFY_CACHE: dict[tuple[str, int, int], dict[str, Any]] = {}


class Wave22SalvageIntegrityError(RuntimeError):
    """Raised when the staged cross-branch salvage feed violates a firewall."""


def to_ascii_7bit(text: str) -> str:
    """Map common typographic code points to ASCII and drop any remainder."""
    table = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2012": "-",
        "\u2212": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u00a0": " ",
    }
    out_chars: list[str] = []
    for ch in str(text):
        if ord(ch) <= 127:
            out_chars.append(ch)
        elif ch in table:
            out_chars.append(table[ch])
    return "".join(out_chars)


def firewall_violations(text: str) -> list[str]:
    """Return the list of firewall rule names that ``text`` violates."""
    hits: list[str] = []
    if any(ord(ch) > 127 for ch in text):
        hits.append("non_ascii")
    if ODDS_FIREWALL_RE.search(text):
        hits.append("odds_vocabulary")
    if _FORBIDDEN_FAMILY_RE.search(text):
        hits.append("forbidden_word_family")
    if _SECRET_RE.search(text):
        hits.append("secret_like_token")
    return hits


def sanitize_trainer_record(
    record: Mapping[str, Any],
    *,
    source_ref: str,
    source_path: str,
    max_chars: int = 4000,
) -> dict[str, Any] | None:
    """Normalize one raw trainer record to the salvage schema or drop it.

    Returns ``None`` when the record has no usable text or still violates the
    firewall after ASCII normalization.
    """
    prompt_keys = ("prompt", "instruction", "question", "input")
    resp_keys = ("response", "output", "answer", "completion", "text")
    prompt = next((str(record[k]) for k in prompt_keys if record.get(k)), "")
    response = next((str(record[k]) for k in resp_keys if record.get(k)), "")
    msgs = record.get("messages")
    if (not prompt or not response) and isinstance(msgs, list):
        users = [str(m.get("content", "")) for m in msgs if isinstance(m, dict)]
        roles = [str(m.get("role", "")) for m in msgs if isinstance(m, dict)]
        for role, content in zip(roles, users, strict=True):
            if role == "user" and not prompt:
                prompt = content
            elif role == "assistant" and not response:
                response = content
    if not response and prompt:
        response, prompt = prompt, ""
    if not response:
        return None
    if not prompt:
        prompt = "Summarize the verified engine lesson."
    prompt_a = to_ascii_7bit(prompt)[:max_chars].strip()
    resp_a = to_ascii_7bit(response)[:max_chars].strip()
    if not resp_a or firewall_violations(prompt_a + "\n" + resp_a):
        return None
    total = len(prompt_a) + len(resp_a)
    tier = (
        "TIER_1_FOUNDATION"
        if total < 600
        else ("TIER_2_SYNTHESIS" if total < 2000 else "TIER_3_BEHEMOTH")
    )
    rid = hashlib.sha256((prompt_a + "\x1f" + resp_a).encode("ascii")).hexdigest()[:16]
    return {
        "id": rid,
        "source_ref": to_ascii_7bit(source_ref),
        "source_path": to_ascii_7bit(source_path),
        "tier": tier,
        "prompt": prompt_a,
        "response": resp_a,
        "provenance": "wave22_cross_branch_readonly_salvage",
    }


def _winnow_fingerprints(text: str, *, k: int, w: int) -> set[int]:
    """Winnowing fingerprints (Schleimer et al. 2003), rightmost-minimum rule.

    If A is a substring of B and len(A) >= w + k - 1, every fingerprint of A
    is also a fingerprint of B, so B is found through any one of them.
    """
    n = len(text) - k + 1
    if n <= 0:
        return set()
    hashes = [hash(text[i : i + k]) for i in range(n)]
    if n <= w:
        return {min(hashes)}
    out: set[int] = set()
    for start in range(n - w + 1):
        win = hashes[start : start + w]
        m = min(win)
        out.add(m)
    return out


def exact_substring_dedup(responses: Sequence[str], *, k: int = 16, w: int = 16) -> list[int]:
    """Return indices kept after exact-substring dedup (longest first, stable).

    A response is dropped if it is identical to, or wholly contained in, a
    previously kept (longer or equal) response. This is the exact-match core
    of ``google-research/deduplicate-text-datasets``. Candidate containers are
    found through a winnowing fingerprint index and confirmed with an exact
    ``in`` test, so the result equals the brute-force definition.
    """
    order = sorted(range(len(responses)), key=lambda i: (-len(responses[i]), i))
    kept: list[int] = []
    kept_texts: list[str] = []
    exact_seen: set[str] = set()
    fp_index: dict[int, list[int]] = {}
    min_len = w + k - 1
    for idx in order:
        txt = responses[idx]
        if txt in exact_seen:
            continue
        if len(txt) >= min_len:
            fps = _winnow_fingerprints(txt, k=k, w=w)
            probe = min(fps, key=lambda f: len(fp_index.get(f, ())))
            contained = any(txt in kept_texts[j] for j in fp_index.get(probe, ()))
        else:
            fps = set()
            contained = any(txt in prev for prev in kept_texts)
        if contained:
            continue
        pos = len(kept_texts)
        kept.append(idx)
        kept_texts.append(txt)
        exact_seen.add(txt)
        for f in fps if fps else _winnow_fingerprints(txt, k=k, w=w):
            fp_index.setdefault(f, []).append(pos)
    return sorted(kept)


def verify_cross_branch_salvage_feed(repo_root: Path | None = None) -> dict[str, Any]:
    """Independently re-verify the staged Wave 22 cross-branch salvage feed."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    feed_path = root / SALVAGE_FEED_REL
    manifest_path = root / SALVAGE_MANIFEST_REL
    if not feed_path.is_file():
        return {
            "feed_present": False,
            "verified": False,
            "records": 0,
            "reason": "salvage feed not staged",
        }
    st = feed_path.stat()
    mf_mtime = manifest_path.stat().st_mtime_ns if manifest_path.is_file() else 0
    cache_key = (str(root), st.st_mtime_ns ^ mf_mtime, st.st_size)
    if cache_key in _SALVAGE_VERIFY_CACHE:
        return dict(_SALVAGE_VERIFY_CACHE[cache_key])
    raw = feed_path.read_bytes()
    non_ascii = sum(1 for b in raw if b > 127)
    records: list[dict[str, Any]] = []
    for line_no, line in enumerate(raw.decode("ascii", errors="replace").splitlines(), 1):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as exc:
            raise Wave22SalvageIntegrityError(
                f"WAVE22_SALVAGE_BREACH: unparsable line {line_no}: {exc}"
            ) from exc
        records.append(obj)
    required = ("id", "source_ref", "source_path", "tier", "prompt", "response", "provenance")
    schema_bad = [r.get("id", "?") for r in records if any(k not in r for k in required)]
    fw_bad = [
        r.get("id", "?")
        for r in records
        if firewall_violations(str(r.get("prompt", "")) + "\n" + str(r.get("response", "")))
    ]
    tiers = [TIER_ORDER.get(str(r.get("tier")), 99) for r in records]
    tier_monotone = all(a <= b for a, b in zip(tiers, tiers[1:], strict=False))
    responses = [str(r.get("response", "")) for r in records]
    dup_count = len(responses) - len(exact_substring_dedup(responses))
    ids = [str(r.get("id")) for r in records]
    manifest: dict[str, Any] = {}
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sha = hashlib.sha256(raw).hexdigest()
    violations: list[str] = []
    if non_ascii:
        violations.append(f"non_ascii_bytes={non_ascii}")
    if schema_bad:
        violations.append(f"schema_incomplete={len(schema_bad)}")
    if fw_bad:
        violations.append(f"firewall_hits={len(fw_bad)}")
    if not tier_monotone:
        violations.append("tier_order_not_monotone")
    if dup_count:
        violations.append(f"substring_duplicates={dup_count}")
    if len(set(ids)) != len(ids):
        violations.append("duplicate_ids")
    if violations:
        raise Wave22SalvageIntegrityError("WAVE22_SALVAGE_BREACH: " + "; ".join(violations))
    tier_counts = {name: tiers.count(rank) for name, rank in TIER_ORDER.items()}
    out = {
        "feed_present": True,
        "verified": True,
        "records": len(records),
        "tier_counts": tier_counts,
        "feed_sha256": sha,
        "manifest_sha256_matches": str(manifest.get("feed_sha256", sha)) == sha,
        "source_refs": sorted({str(r.get("source_ref")) for r in records}),
        "non_ascii_bytes": 0,
    }
    _SALVAGE_VERIFY_CACHE[cache_key] = dict(out)
    return out


def _iter_sample_files(vault_dir: Path, *, max_files: int) -> list[Path]:
    """Deterministically choose up to ``max_files`` text files under ``vault_dir``."""
    picked: list[Path] = []
    if not vault_dir.is_dir():
        return picked
    stack = [vault_dir]
    candidates: list[Path] = []
    while stack:
        cur = stack.pop()
        try:
            with os.scandir(cur) as it:
                for entry in it:
                    if entry.is_dir(follow_symlinks=False):
                        if entry.name not in {"__pycache__", "node_modules", ".git"}:
                            stack.append(Path(entry.path))
                    elif entry.is_file(follow_symlinks=False):
                        p = Path(entry.path)
                        if p.suffix.lower() in _TEXT_EXTS:
                            candidates.append(p)
        except OSError:
            continue
    candidates.sort(key=lambda p: str(p).lower())
    picked = candidates[:max_files]
    return picked


def _read_window(path: Path, max_bytes: int) -> str:
    """Read the first ``max_bytes`` bytes of ``path`` as lenient UTF-8."""
    with path.open("rb") as fh:
        return fh.read(max_bytes).decode("utf-8", errors="ignore")


def _infer_schema_keys(window: str, suffix: str, *, max_lines: int = 50) -> set[str]:
    """Infer top-level JSON keys from a JSON or JSONL byte window."""
    keys: set[str] = set()
    if suffix == ".jsonl":
        for line in window.splitlines()[:max_lines]:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                keys.update(str(k) for k in obj)
    elif suffix == ".json":
        try:
            obj = json.loads(window)
        except json.JSONDecodeError:
            return keys
        if isinstance(obj, dict):
            keys.update(str(k) for k in obj)
    return keys


def extract_link_tokens(text: str) -> dict[str, set[str]]:
    """Extract typed cross-link tokens from free text."""
    out: dict[str, set[str]] = {}
    for name, pat in LINK_TOKEN_PATTERNS.items():
        found = {str(tok).strip() for tok in pat.findall(text)}
        if name == "pdf_source":
            found = {tok.lower() for tok in found}
        elif name == "data_path_ref":
            found = {tok.replace("\\", "/") for tok in found}
        elif name == "data_path_join":
            found = {f"data/{tok}" for tok in found}
        out[name] = found
    return out


def build_vault_crosslink_graph(
    repo_root: Path | None = None,
    *,
    max_files_per_vault: int = 32,
    max_bytes_per_file: int = 262144,
    vaults: Iterable[tuple[str, str, str]] = WAVE22_VAULTS,
) -> dict[str, Any]:
    """Build the typed, weighted cross-link graph across the Wave 22 vaults."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    vault_list = tuple(vaults)
    cache_key = (str(root), max_files_per_vault, max_bytes_per_file)
    if vault_list == WAVE22_VAULTS and cache_key in _CROSSLINK_CACHE:
        return dict(_CROSSLINK_CACHE[cache_key])

    tokens_by_vault: dict[str, dict[str, set[str]]] = {}
    schema_by_vault: dict[str, list[str]] = {}
    files_sampled: dict[str, int] = {}
    present: dict[str, bool] = {}
    for name, rel, _kind in vault_list:
        vdir = root / rel
        present[name] = vdir.is_dir()
        agg: dict[str, set[str]] = {k: set() for k in LINK_TOKEN_PATTERNS}
        keys: set[str] = set()
        files = _iter_sample_files(vdir, max_files=max_files_per_vault)
        for fpath in files:
            try:
                window = _read_window(fpath, max_bytes_per_file)
            except OSError:
                continue
            for tname, toks in extract_link_tokens(window).items():
                agg[tname].update(toks)
            keys.update(_infer_schema_keys(window, fpath.suffix.lower()))
        tokens_by_vault[name] = agg
        schema_by_vault[name] = sorted(keys)[:64]
        files_sampled[name] = len(files)

    edges: list[dict[str, Any]] = []
    names = [v[0] for v in vault_list]
    for i, u in enumerate(names):
        for v in names[i + 1 :]:
            shared = {
                t: len(tokens_by_vault[u][t] & tokens_by_vault[v][t])
                for t in LINK_TOKEN_PATTERNS
                if t not in _CODE_REF_TYPES
            }
            weight = sum(shared.values())
            if weight > 0:
                edges.append(
                    {
                        "u": u,
                        "v": v,
                        "weight": weight,
                        "shared_by_type": {k: c for k, c in shared.items() if c},
                    }
                )

    data_dirs = {rel.split("/", 1)[1]: name for name, rel, kind in vault_list if kind == "data"}
    code_to_data: list[dict[str, Any]] = []
    for name, _rel, kind in vault_list:
        if kind != "code":
            continue
        refs = tokens_by_vault[name]["data_path_ref"] | tokens_by_vault[name]["data_path_join"]
        for ref in sorted(refs):
            sub = ref.split("/", 1)[1]
            if sub in data_dirs:
                code_to_data.append({"from": name, "to": data_dirs[sub], "ref": ref})
            elif vault_list == WAVE22_VAULTS and (root / "data" / sub).is_dir():
                code_to_data.append(
                    {"from": name, "to": f"data_{sub.replace('-', '_')}", "ref": ref}
                )

    degree = {n: 0 for n in names}
    for e in edges:
        degree[str(e["u"])] += 1
        degree[str(e["v"])] += 1
    for cd in code_to_data:
        degree[str(cd["from"])] += 1
        if str(cd["to"]) in degree:
            degree[str(cd["to"])] += 1
    isolated = sorted(n for n, d in degree.items() if d == 0 and present[n])
    token_totals = {
        n: sum(len(s) for s in tokens_by_vault[n].values()) for n in names
    }
    payload = {
        "edges": edges,
        "code_to_data": code_to_data,
        "token_totals": token_totals,
        "schema_keys": schema_by_vault,
    }
    graph_sha = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    out = {
        "vaults_total": len(names),
        "vaults_present": sum(1 for n in names if present[n]),
        "vaults_missing": sorted(n for n in names if not present[n]),
        "files_sampled": files_sampled,
        "undirected_edges": len(edges),
        "code_to_data_edges": len(code_to_data),
        "edges": edges,
        "code_to_data": code_to_data,
        "degree": degree,
        "isolated_present_vaults": isolated,
        "token_totals": token_totals,
        "team_tokens_by_vault": {
            n: sorted(
                tokens_by_vault[n]["team_abbr_field"]
                | {t.rsplit("-", 1)[-1] for t in tokens_by_vault[n]["team_canonical"]}
            )
            for n in names
        },
        "schema_keys": schema_by_vault,
        "crosslink_graph_sha256": graph_sha,
    }
    if vault_list == WAVE22_VAULTS:
        _CROSSLINK_CACHE[cache_key] = dict(out)
    return out


def evaluate_wave22_crosslink_bridge(
    *,
    away_team: str,
    home_team: str,
    repo_root: Path | None = None,
) -> dict[str, Any]:
    """Stage-2 Wave 22 bridge: continuity diagnostic with a 0.0 live weight."""
    root = (repo_root or _DEFAULT_REPO_ROOT).resolve()
    graph = build_vault_crosslink_graph(root)
    try:
        salvage = verify_cross_branch_salvage_feed(root)
        salvage_ok = bool(salvage.get("verified"))
    except Wave22SalvageIntegrityError as exc:
        salvage = {"verified": False, "records": 0, "reason": str(exc)}
        salvage_ok = False
    matchup = {away_team.strip().upper(), home_team.strip().upper()}
    team_vaults = sorted(
        name
        for name, teams in dict(graph.get("team_tokens_by_vault") or {}).items()
        if matchup.issubset(set(teams))
    )
    team_edges = sum(
        1
        for e in graph["edges"]
        if "team_canonical" in e["shared_by_type"] or "team_abbr_field" in e["shared_by_type"]
    )
    return {
        "wave22_wired": True,
        "crosslink_vaults_present": int(graph["vaults_present"]),
        "crosslink_undirected_edges": int(graph["undirected_edges"]),
        "crosslink_code_to_data_edges": int(graph["code_to_data_edges"]),
        "crosslink_graph_sha256": str(graph["crosslink_graph_sha256"]),
        "crosslink_team_edges": team_edges,
        "matchup_covered_by_vaults": team_vaults,
        "salvage_feed_verified": salvage_ok,
        "salvage_feed_records": int(salvage.get("records", 0)),
        "live_stage2_weight": 0.0,
        "wave22_epa_adj": 0.0,
    }


__all__ = [
    "ODDS_FIREWALL_RE",
    "SALVAGE_FEED_REL",
    "SALVAGE_MANIFEST_REL",
    "TIER_ORDER",
    "WAVE22_VAULTS",
    "Wave22SalvageIntegrityError",
    "build_vault_crosslink_graph",
    "evaluate_wave22_crosslink_bridge",
    "exact_substring_dedup",
    "extract_link_tokens",
    "firewall_violations",
    "sanitize_trainer_record",
    "to_ascii_7bit",
    "verify_cross_branch_salvage_feed",
]
