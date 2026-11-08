#!/usr/bin/env python3
"""
WAVE 3 — LIVE RESEARCH CORPUS & BRAIN FEEDS RETRIEVAL READER
Binds data/corpus/research_records.jsonl AND brain/feeds/*.jsonl (waves 1-12)
directly to the GSE reasoning pipeline with full provenance citation (source_id, chunk_id, relevance_reason).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RECORDS_PATH = REPO_ROOT / "data" / "corpus" / "research_records.jsonl"
FALLBACK_PRIORITY_RECORDS_PATH = REPO_ROOT / "data" / "corpus" / "research_records_priority.jsonl"
DEFAULT_BRAIN_FEEDS_DIR = REPO_ROOT / "brain" / "feeds"

_RECORDS_QUERY_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_BRAIN_FEEDS_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_FULL_QUERY_CACHE: Dict[str, List[Dict[str, Any]]] = {}
MAX_BRAIN_FEED_FILE_BYTES = 10 * 1024 * 1024


def _tokenize(text: str) -> List[str]:
    return [t for t in re.findall(r"[a-z0-9_+-]+", text.lower()) if len(t) >= 2]


class ResearchCorpusReader:
    def __init__(
        self,
        records_path: Optional[Path] = None,
        brain_feeds_dir: Optional[Path] = None,
        include_brain_feeds: bool = True,
    ) -> None:
        if records_path:
            self.records_path = Path(records_path)
        elif FALLBACK_PRIORITY_RECORDS_PATH.exists():
            self.records_path = FALLBACK_PRIORITY_RECORDS_PATH
        else:
            self.records_path = DEFAULT_RECORDS_PATH
        self.brain_feeds_dir = Path(brain_feeds_dir) if brain_feeds_dir else DEFAULT_BRAIN_FEEDS_DIR
        self.include_brain_feeds = include_brain_feeds

    def _brain_feeds_cache_key(self) -> str:
        if not self.include_brain_feeds or not self.brain_feeds_dir.exists():
            return "disabled"
        parts: List[str] = []
        for p in sorted(self.brain_feeds_dir.rglob("*.jsonl")):
            try:
                st = p.stat()
                if st.st_size > MAX_BRAIN_FEED_FILE_BYTES:
                    continue
                parts.append(f"{p.name}:{st.st_mtime_ns}:{st.st_size}")
            except Exception:
                continue
        return "|".join(parts)

    def iter_brain_feed_records(self) -> List[Dict[str, Any]]:
        if not self.include_brain_feeds or not self.brain_feeds_dir.exists():
            return []
        bf_key = self._brain_feeds_cache_key()
        if bf_key in _BRAIN_FEEDS_CACHE:
            return _BRAIN_FEEDS_CACHE[bf_key]
        out: List[Dict[str, Any]] = []
        for p in sorted(self.brain_feeds_dir.rglob("*.jsonl")):
            try:
                if p.stat().st_size > MAX_BRAIN_FEED_FILE_BYTES:
                    continue
            except Exception:
                continue
            rel = str(p.relative_to(REPO_ROOT)).replace("\\", "/") if p.is_relative_to(REPO_ROOT) else str(p)
            try:
                for line_idx, line in enumerate(p.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                    if not line.strip():
                        continue
                    obj = json.loads(line)
                    cid = obj.get("id") or obj.get("record_id") or f"BRAIN-{p.stem}-{line_idx:04d}"
                    txt = obj.get("content") or obj.get("text") or obj.get("full_text") or json.dumps(obj)
                    title_str = str(obj.get("title") or p.name)
                    sec_str = str(obj.get("domain") or "mind_feed")
                    full_str = str(txt)
                    out.append(
                        {
                            "record_id": str(cid),
                            "chunk_id": f"{cid}#L{line_idx}",
                            "source_id": f"BRAIN-FEED-{p.stem}",
                            "item_id": f"BRAIN-{p.stem}",
                            "location": rel,
                            "category": "brain_mind_staging_feed",
                            "title": title_str,
                            "authors": "GSE Brain Mind Feed",
                            "year": 2026,
                            "section": sec_str,
                            "page_or_line": f"L{line_idx}",
                            "full_text": full_str,
                            "_haystack_lower": f"{title_str} {sec_str} {full_str}".lower(),
                        }
                    )
            except Exception:
                continue
        _BRAIN_FEEDS_CACHE[bf_key] = out
        return out

    def query(
        self,
        query_text: str,
        top_k: int = 5,
        category_filter: Optional[str] = None,
        priority_categories: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        q_tokens = _tokenize(query_text)
        if not q_tokens:
            return []
        q_set = set(q_tokens)
        q_lower = query_text.lower().strip()

        priority_cats = set(priority_categories or [
            "external_docx_schemes",
            "schemes_extracted_md",
            "schemes_executable_module",
            "motif_corpus_inbox",
            "book_ingest_manifest_record",
            "brain_mind_staging_feed",
            "arxiv_program",
            "docs_research",
            "docs_corpus",
        ])

        scored: List[Dict[str, Any]] = []

        # 1. Scan research_records.jsonl (cached on query + file mtime + size to avoid repeated 180MB disk scans)
        if self.records_path.exists():
            st = self.records_path.stat()
            cache_key = f"{self.records_path}:{st.st_mtime_ns}:{st.st_size}:{query_text}:{category_filter}:{top_k}"
            if cache_key in _RECORDS_QUERY_CACHE:
                scored.extend(_RECORDS_QUERY_CACHE[cache_key])
            else:
                file_hits: List[Dict[str, Any]] = []
                with self.records_path.open("r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        low_line = line.lower()
                        if not any(tok in low_line for tok in q_set):
                            continue
                        try:
                            rec = json.loads(line)
                        except Exception:
                            continue
                        cat = rec.get("category", "")
                        if category_filter and cat != category_filter:
                            continue
                        if not category_filter and cat == "repo_data_artifact" and len(file_hits) >= top_k * 3:
                            continue

                        full_txt = str(rec.get("full_text", ""))
                        title = str(rec.get("title", ""))
                        sec = str(rec.get("section", ""))
                        haystack = f"{title} {sec} {full_txt}".lower()

                        matched_tokens = [tok for tok in q_set if tok in haystack]
                        if not matched_tokens:
                            continue

                        exact_phrase_bonus = 3.5 if (len(q_lower) > 4 and q_lower in haystack) else 0.0
                        cat_bonus = 1.5 if cat in priority_cats else 0.25
                        freq_bonus = sum(min(3, haystack.count(tok)) * 0.25 for tok in matched_tokens)
                        score = round(len(matched_tokens) * 1.0 + exact_phrase_bonus + cat_bonus + freq_bonus, 4)

                        file_hits.append(
                            {
                                "source_id": rec.get("source_id", ""),
                                "chunk_id": rec.get("chunk_id", ""),
                                "item_id": rec.get("item_id", ""),
                                "title": title,
                                "location": rec.get("location", ""),
                                "category": cat,
                                "section": sec,
                                "page_or_line": rec.get("page_or_line", "L1"),
                                "sha256": rec.get("sha256", ""),
                                "relevance_score": score,
                                "relevance_reason": f"Matched {len(matched_tokens)}/{len(q_set)} query tokens ({', '.join(sorted(matched_tokens)[:6])}) in {cat}:{sec}",
                                "snippet": full_txt[:320].replace("\n", " ").strip(),
                            }
                        )
                file_hits.sort(key=lambda x: (-float(x["relevance_score"]), str(x["chunk_id"])))
                _RECORDS_QUERY_CACHE[cache_key] = file_hits[: max(top_k * 3, 15)]
                scored.extend(_RECORDS_QUERY_CACHE[cache_key])

        # 2. Scan brain/feeds/*.jsonl (cached on mtime/size so live feed edits immediately invalidate)
        if self.include_brain_feeds and (not category_filter or category_filter == "brain_mind_staging_feed"):
            bf_key = f"{self._brain_feeds_cache_key()}:{query_text}:{category_filter}:{top_k}"
            if bf_key in _FULL_QUERY_CACHE:
                scored.extend(_FULL_QUERY_CACHE[bf_key])
            else:
                bf_hits: List[Dict[str, Any]] = []
                for brec in self.iter_brain_feed_records():
                    haystack = brec.get("_haystack_lower") or f"{brec['title']} {brec['section']} {brec['full_text']}".lower()
                    matched_tokens = [tok for tok in q_set if tok in haystack]
                    if not matched_tokens:
                        continue
                    exact_phrase_bonus = 3.5 if (len(q_lower) > 4 and q_lower in haystack) else 0.0
                    score = round(len(matched_tokens) * 1.0 + exact_phrase_bonus + 1.5, 4)
                    bf_hits.append(
                        {
                            "source_id": brec["source_id"],
                            "chunk_id": brec["chunk_id"],
                            "item_id": brec["item_id"],
                            "title": brec["title"],
                            "location": brec["location"],
                            "category": brec["category"],
                            "section": brec["section"],
                            "page_or_line": brec["page_or_line"],
                            "sha256": "",
                            "relevance_score": score,
                            "relevance_reason": f"Matched {len(matched_tokens)}/{len(q_set)} query tokens ({', '.join(sorted(matched_tokens)[:6])}) in brain_feed:{brec['section']}",
                            "snippet": brec["full_text"][:320].replace("\n", " ").strip(),
                        }
                    )
                bf_hits.sort(key=lambda x: (-float(x["relevance_score"]), str(x["chunk_id"])))
                _FULL_QUERY_CACHE[bf_key] = bf_hits[: max(top_k * 3, 15)]
                scored.extend(_FULL_QUERY_CACHE[bf_key])

        scored.sort(key=lambda x: (-float(x["relevance_score"]), str(x["chunk_id"])))
        return scored[:top_k]


def query_research_corpus(
    query_text: str,
    top_k: int = 5,
    category_filter: Optional[str] = None,
    records_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    reader = ResearchCorpusReader(records_path=records_path)
    return reader.query(query_text=query_text, top_k=top_k, category_filter=category_filter)
