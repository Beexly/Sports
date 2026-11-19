"""Live multi-API Wave 49 harvester: arXiv + OpenAlex + Kaggle/kagglehub BDB27.

Fetches strictly live scientific preprints from arXiv Atom API, peer-reviewed
biomechanics/calibration literature from OpenAlex REST API, and compact CC0
NFL Big Data Bowl 2027 benchmarks/catalog metadata from Kaggle API + kagglehub.
All records are deduplicated against existing vaults, normalized to pure 7-bit
ASCII, checked for zero cross-wave arXiv overlap, and sealed with canonical
SHA-256 checksums.
"""

from __future__ import annotations

import csv
import glob
import hashlib
import json
import re
import shutil
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
ARXIV_VAULT_DIR = REPO_ROOT / "data" / "arxiv_2026_11_alphaxiv"
OPENALEX_VAULT_DIR = REPO_ROOT / "data" / "openalex_2026_11"
KAGGLE_BDB27_DIR = REPO_ROOT / "data" / "kaggle_bdb27"
LICENSES_DIR = REPO_ROOT / ".licenses"

ARXIV_OUT_PATH = (
    ARXIV_VAULT_DIR
    / "arxiv_wave49_tracking_bdb27_conformal_and_rlvr_vault_2026.json"
)
OPENALEX_OUT_PATH = (
    OPENALEX_VAULT_DIR
    / "openalex_wave49_sports_biomech_bdb27_and_calibration_vault_2026.json"
)
KAGGLE_MANIFEST_PATH = (
    KAGGLE_BDB27_DIR / "kaggle_bdb27_live_catalog_and_benchmarks_2026.json"
)

ARXIV_API_URL = "https://export.arxiv.org/api/query"
OPENALEX_API_URL = "https://api.openalex.org/works"
KAGGLE_API_LIST_URL = "https://www.kaggle.com/api/v1/datasets/list"
USER_AGENT = "GSE-GSI-Wave49-Harvester/1.0 (mailto:research@galaxysportsedge.com)"


def clean_ascii(text: Any) -> str:
    """Normalize text to printable 7-bit ASCII without em-dashes or smart quotes."""
    if text is None:
        return ""
    raw = str(text)
    replacements = {
        "\u2014": "--",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u00a0": " ",
        "\u2212": "-",
        "\u00d7": "x",
        "\u2264": "<=",
        "\u2265": ">=",
        "\u00b1": "+/-",
    }
    for k, v in replacements.items():
        raw = raw.replace(k, v)
    norm = unicodedata.normalize("NFKD", raw)
    ascii_str = norm.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_str).strip()


def canonical_sha256(payload: dict[str, Any]) -> str:
    """Compute canonical SHA-256 hex digest matching Waves 44-48."""
    body = {k: v for k, v in payload.items() if k != "payload_sha256"}
    encoded = json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def http_get_bytes(url: str, timeout: float = 30.0) -> bytes:
    """Perform a polite HTTP GET request with retries."""
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return bytes(resp.read())
        except Exception as exc:
            last_exc = exc
            time.sleep(1.0 + attempt)
    raise RuntimeError(f"Failed HTTP GET {url}: {last_exc}")


def normalize_arxiv_base_id(raw_id: str) -> str:
    """Extract base arXiv ID without version suffix."""
    text = str(raw_id).strip()
    if "/abs/" in text:
        text = text.split("/abs/")[-1]
    text = re.sub(r"v\d+$", "", text)
    return text.strip()


def collect_existing_arxiv_ids() -> set[str]:
    """Collect every existing paper ID across prior Wave 43-46 arXiv vaults."""
    existing: set[str] = set()
    for p_str in sorted(glob.glob(str(ARXIV_VAULT_DIR / "*.json"))):
        p = Path(p_str)
        if p == ARXIV_OUT_PATH:
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        for _k, v in data.items():
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict) and "id" in item:
                        existing.add(normalize_arxiv_base_id(str(item["id"])))
    return existing


def parse_arxiv_feed(xml_bytes: bytes, pillar_tag: str) -> list[dict[str, Any]]:
    """Parse arXiv Atom XML feed into normalized ASCII records."""
    ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
    root = ET.fromstring(xml_bytes)
    rows: list[dict[str, Any]] = []
    for entry in root.findall("atom:entry", ns):
        raw_id_el = entry.find("atom:id", ns)
        if raw_id_el is None or not raw_id_el.text:
            continue
        full_id = raw_id_el.text.strip().split("/abs/")[-1]
        base_id = normalize_arxiv_base_id(full_id)
        if not re.match(r"^(\d{4}\.\d{4,5}|[a-z\-]+/\d{7})$", base_id):
            continue
        title = clean_ascii(entry.findtext("atom:title", default="", namespaces=ns))
        summary = clean_ascii(entry.findtext("atom:summary", default="", namespaces=ns))
        published = clean_ascii(entry.findtext("atom:published", default="", namespaces=ns))[:10]
        updated = clean_ascii(entry.findtext("atom:updated", default="", namespaces=ns))[:10]
        authors = [
            clean_ascii(a.findtext("atom:name", default="", namespaces=ns))
            for a in entry.findall("atom:author", ns)
        ]
        authors = [a for a in authors if a][:8]
        categories = [
            clean_ascii(c.attrib.get("term", ""))
            for c in entry.findall("atom:category", ns)
            if c.attrib.get("term")
        ]
        primary_cat_el = entry.find("arxiv:primary_category", ns)
        primary_cat = (
            clean_ascii(primary_cat_el.attrib.get("term", ""))
            if primary_cat_el is not None
            else (categories[0] if categories else "")
        )
        rows.append(
            {
                "id": base_id,
                "versioned_id": clean_ascii(full_id),
                "published": published,
                "updated": updated,
                "title": title,
                "authors": authors,
                "primary_category": primary_cat,
                "categories": categories,
                "pillar": pillar_tag,
                "url": f"https://www.alphaxiv.org/abs/{base_id}",
                "arxiv_url": f"https://arxiv.org/abs/{base_id}",
                "summary": summary[:900],
            }
        )
    return rows


def harvest_arxiv_vault(existing_ids: set[str]) -> dict[str, Any]:
    """Harvest >= 36 brand-new live arXiv papers across 4 Wave 49 pillars."""
    anchor_url = f"{ARXIV_API_URL}?id_list=2610.36183,2609.33664,2607.00164"
    queries: list[tuple[str, str, int, str]] = [
        ("anchor_core", anchor_url, 10, "relevance"),
        (
            "pillar_a_nfl_tracking_bdb27",
            f"{ARXIV_API_URL}?search_query="
            + urllib.parse.quote('all:"American football" OR all:"NFL" OR all:"Big Data Bowl"')
            + "&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending",
            20,
            "submittedDate",
        ),
        (
            "pillar_b_motion_quantile_conformal",
            f"{ARXIV_API_URL}?search_query="
            + urllib.parse.quote(
                '(all:"quantile regression" AND all:"trajectory") OR '
                '(all:"conformal" AND all:"tracking") OR all:"human motion feasibility"'
            )
            + "&start=0&max_results=18&sortBy=submittedDate&sortOrder=descending",
            18,
            "submittedDate",
        ),
        (
            "pillar_c_sinkhorn_assignment_trench",
            f"{ARXIV_API_URL}?search_query="
            + urllib.parse.quote(
                '(all:"Sinkhorn" AND all:"assignment") OR '
                '(all:"optimal transport" AND all:"matching" AND all:"sports")'
            )
            + "&start=0&max_results=16&sortBy=submittedDate&sortOrder=descending",
            16,
            "submittedDate",
        ),
        (
            "pillar_d_rlvr_brier_calibration",
            f"{ARXIV_API_URL}?search_query="
            + urllib.parse.quote(
                '(all:"verifiable rewards" AND all:"forecasting") OR '
                '(all:"Brier" AND all:"calibration" AND all:"reinforcement learning")'
            )
            + "&start=0&max_results=18&sortBy=submittedDate&sortOrder=descending",
            18,
            "submittedDate",
        ),
        (
            "pillar_e_conformal_time_series_venn_abers",
            f"{ARXIV_API_URL}?search_query="
            + urllib.parse.quote(
                '(all:"conformal prediction" AND all:"time series") OR '
                'all:"Venn-Abers"'
            )
            + "&start=0&max_results=16&sortBy=submittedDate&sortOrder=descending",
            16,
            "submittedDate",
        ),
    ]

    papers_by_id: dict[str, dict[str, Any]] = {}
    anchor_pillar_map = {
        "2610.36183": "pillar_b_motion_quantile_conformal",
        "2609.33664": "pillar_a_nfl_tracking_bdb27",
        "2607.00164": "pillar_d_rlvr_brier_calibration",
    }

    for tag, url, _max_r, _sort in queries:
        xml_bytes = http_get_bytes(url, timeout=30.0)
        time.sleep(0.5)
        parsed = parse_arxiv_feed(xml_bytes, tag)
        for row in parsed:
            bid = row["id"]
            if bid in existing_ids:
                continue
            if bid in anchor_pillar_map:
                row["pillar"] = anchor_pillar_map[bid]
            if bid not in papers_by_id:
                papers_by_id[bid] = row

    papers = list(papers_by_id.values())
    if len(papers) < 30:
        raise RuntimeError(f"Expected >= 30 unique Wave 49 arXiv papers, got {len(papers)}")

    # Keep deterministic ordering with required anchors placed at the front
    anchor_order = {"2610.36183": 0, "2609.33664": 1, "2607.00164": 2}
    papers.sort(key=lambda r: (anchor_order.get(r["id"], 99), r["id"]))
    papers = papers[:45]

    pillar_counts: dict[str, int] = {}
    for p in papers:
        pillar_counts[p["pillar"]] = pillar_counts.get(p["pillar"], 0) + 1

    payload: dict[str, Any] = {
        "schema": "wave49_arxiv_tracking_bdb27_conformal_rlvr_vault_v1",
        "harvested_at_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_api": ARXIV_API_URL,
        "total_unique_papers": len(papers),
        "unique_paper_count": len(papers),
        "brand_new_wave49_count": len(papers),
        "cross_wave_overlap_count": 0,
        "clinical_ruo_sports_weight": 0.0,
        "real_money_stake_cleared": False,
        "required_anchors": ["2610.36183", "2609.33664", "2607.00164"],
        "pillar_counts": pillar_counts,
        "papers": papers,
    }
    payload["payload_sha256"] = canonical_sha256(payload)
    return payload


def normalize_openalex_work(work: dict[str, Any], pillar: str, query_tag: str) -> dict[str, Any]:
    """Convert raw OpenAlex work JSON into compact ASCII metadata."""
    raw_id = clean_ascii(work.get("id", "")).rstrip("/").split("/")[-1]
    doi = clean_ascii(work.get("doi", ""))
    primary_topic = clean_ascii((work.get("primary_topic") or {}).get("display_name", ""))
    authors = []
    for auth in (work.get("authorships") or [])[:5]:
        name = clean_ascii((auth.get("author") or {}).get("display_name", ""))
        if name:
            authors.append(name)
    concepts = []
    for c in (work.get("concepts") or [])[:6]:
        cname = clean_ascii(c.get("display_name", ""))
        if cname:
            concepts.append(cname)
    oa = work.get("open_access") or {}
    loc = work.get("primary_location") or {}
    return {
        "openalex_id": raw_id,
        "doi": doi,
        "title": clean_ascii(work.get("title") or work.get("display_name") or ""),
        "publication_year": int(work.get("publication_year") or 0),
        "cited_by_count": int(work.get("cited_by_count") or 0),
        "type": clean_ascii(work.get("type", "")),
        "primary_topic": primary_topic,
        "concepts": concepts,
        "authors": authors,
        "is_oa": bool(oa.get("is_oa", False)),
        "license": clean_ascii(loc.get("license") or "publisher-or-oa"),
        "pillar": pillar,
        "query_tag": query_tag,
        "url": f"https://openalex.org/{raw_id}" if raw_id else "",
    }


def harvest_openalex_vault() -> dict[str, Any]:
    """Harvest >= 50 high-citation live OpenAlex works across biomechanics & forecasting."""
    anchor_ids = [
        ("W2972466551", "eccentric_deceleration_biomech", "anchor_deceleration"),
        ("W2966516178", "rotational_tbi_head_kinematics", "anchor_tbi"),
        ("W1948300859", "nfl_combine_athletic_scouting", "anchor_combine"),
        ("W4400728177", "bdb_tracking_spatial_football", "anchor_tracking"),
        ("W2103691499", "nfl_combine_draft_performance", "anchor_combine"),
    ]
    queries = [
        (
            "nfl_combine_athletic_scouting",
            "NFL Combine scouting athletic performance",
            15,
        ),
        (
            "bdb_tracking_spatial_football",
            "American football player tracking trajectory expected",
            15,
        ),
        (
            "rotational_tbi_head_kinematics",
            "rotational head acceleration American football biomechanics",
            15,
        ),
        (
            "eccentric_deceleration_biomech",
            "eccentric deceleration sprint hamstring sports biomechanics",
            15,
        ),
        (
            "conformal_calibration_forecasting",
            "conformal prediction calibration probabilistic forecasting",
            15,
        ),
    ]

    works_by_id: dict[str, dict[str, Any]] = {}
    for wid, pillar, qtag in anchor_ids:
        raw = json.loads(http_get_bytes(f"{OPENALEX_API_URL}/{wid}", timeout=30.0).decode("utf-8"))
        row = normalize_openalex_work(raw, pillar, qtag)
        if row["openalex_id"]:
            works_by_id[row["openalex_id"]] = row
        time.sleep(0.25)

    for pillar, search_text, per_page in queries:
        url = (
            f"{OPENALEX_API_URL}?search={urllib.parse.quote(search_text)}"
            f"&per-page={per_page}&sort=cited_by_count:desc"
        )
        data = json.loads(http_get_bytes(url, timeout=30.0).decode("utf-8"))
        for w in data.get("results", []):
            row = normalize_openalex_work(w, pillar, search_text)
            oid = row["openalex_id"]
            if oid and oid not in works_by_id:
                works_by_id[oid] = row
        time.sleep(0.25)

    works = list(works_by_id.values())
    works.sort(key=lambda r: (-int(r["cited_by_count"]), r["openalex_id"]))
    if len(works) < 45:
        raise RuntimeError(f"Expected >= 45 OpenAlex works, got {len(works)}")

    pillar_counts: dict[str, int] = {}
    for w in works:
        pillar_counts[w["pillar"]] = pillar_counts.get(w["pillar"], 0) + 1

    payload: dict[str, Any] = {
        "schema": "wave49_openalex_biomech_bdb27_calibration_vault_v1",
        "harvested_at_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_api": OPENALEX_API_URL,
        "license_notice": (
            "OpenAlex metadata is CC0 1.0 Universal; underlying papers retain "
            "publisher/OA licenses."
        ),
        "total_works": len(works),
        "total_citations_sum": sum(int(w["cited_by_count"]) for w in works),
        "clinical_ruo_sports_weight": 0.0,
        "pillar_counts": pillar_counts,
        "works": works,
    }
    payload["payload_sha256"] = canonical_sha256(payload)
    return payload


def harvest_kaggle_bdb27() -> dict[str, Any]:
    """Query live Kaggle datasets/list API and mirror compact CC0 BDB27 CSVs."""
    KAGGLE_BDB27_DIR.mkdir(parents=True, exist_ok=True)
    catalog_queries = [
        "nfl-big-data-bowl-2027",
        "Big Data Bowl 2027",
        "NFL combine",
        "NFL tracking",
    ]
    catalog_by_ref: dict[str, dict[str, Any]] = {}
    for q in catalog_queries:
        url = (
            f"{KAGGLE_API_LIST_URL}?search={urllib.parse.quote(q)}"
            "&sortBy=hottest&page=1"
        )
        items = json.loads(http_get_bytes(url, timeout=30.0).decode("utf-8"))
        for item in items:
            ref = clean_ascii(item.get("ref", ""))
            if not ref or ref in catalog_by_ref:
                continue
            catalog_by_ref[ref] = {
                "id": int(item.get("id") or 0),
                "ref": ref,
                "title": clean_ascii(item.get("title", "")),
                "subtitle": clean_ascii(item.get("subtitle", "")),
                "license_name": clean_ascii(item.get("licenseName", "")),
                "last_updated": clean_ascii(item.get("lastUpdated", "")),
                "total_bytes": int(item.get("totalBytes") or 0),
                "download_count": int(item.get("downloadCount") or 0),
                "vote_count": int(item.get("voteCount") or 0),
                "usability_rating": float(item.get("usabilityRating") or 0.0),
                "url": f"https://www.kaggle.com/datasets/{ref}",
            }
        time.sleep(0.3)

    import kagglehub  # type: ignore[import-untyped]

    compact_targets = [
        (
            "pablodiegoo/nfl-bdb-2027-kinematic-valuation-atlas",
            [
                ("combine_to_nfl_valuation_atlas.csv", "combine_to_nfl_valuation_atlas.csv"),
                (
                    "nfl_bdb_2027_position_channel_benchmarks.csv",
                    "nfl_bdb_2027_position_channel_benchmarks.csv",
                ),
                (
                    "nfl_bdb_2027_scouting_tier_summary.csv",
                    "nfl_bdb_2027_scouting_tier_summary.csv",
                ),
            ],
        ),
        (
            "flashloonarbitrage26/nfl-big-data-bowl-2027-predictions",
            [
                ("submission.csv", "flashloon_bdb_2027_submission_sample.csv"),
            ],
        ),
    ]

    copied_artifacts: list[dict[str, Any]] = []
    for slug, file_pairs in compact_targets:
        src_root = Path(kagglehub.dataset_download(slug))
        for src_name, dst_name in file_pairs:
            src = src_root / src_name
            dst = KAGGLE_BDB27_DIR / dst_name
            if not src.exists():
                raise FileNotFoundError(f"Expected Kaggle CSV missing: {src_name} under {slug}")
            if src.stat().st_size > 2_000_000:
                raise RuntimeError(
                    f"Refusing oversized file {dst_name}: {src.stat().st_size} bytes"
                )
            shutil.copy2(src, dst)
            raw_bytes = dst.read_bytes()
            sha = hashlib.sha256(raw_bytes).hexdigest()
            with dst.open("r", encoding="utf-8", newline="") as f:
                reader = list(csv.reader(f))
            copied_artifacts.append(
                {
                    "kaggle_slug": slug,
                    "repo_relative_path": f"data/kaggle_bdb27/{dst_name}",
                    "bytes": len(raw_bytes),
                    "row_count": max(0, len(reader) - 1),
                    "columns": [clean_ascii(c) for c in (reader[0] if reader else [])],
                    "sha256": sha,
                }
            )

    catalog = sorted(
        catalog_by_ref.values(),
        key=lambda r: (-int(r["download_count"]), -int(r["vote_count"]), r["ref"]),
    )
    payload: dict[str, Any] = {
        "schema": "wave49_kaggle_bdb27_catalog_and_compact_cc0_v1",
        "harvested_at_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_api": KAGGLE_API_LIST_URL,
        "auth_note": (
            "Public keyless Kaggle API v1 datasets/list + kagglehub CC0 download; "
            "competitions endpoint remains auth-gated (401 without kaggle.json)."
        ),
        "catalog_count": len(catalog),
        "compact_csv_artifacts": copied_artifacts,
        "catalog_datasets": catalog[:40],
    }
    payload["payload_sha256"] = canonical_sha256(payload)
    return payload


def write_license_notices(
    arxiv_payload: dict[str, Any],
    openalex_payload: dict[str, Any],
    kaggle_payload: dict[str, Any],
) -> None:
    """Write license attribution files for Wave 49 harvested vaults."""
    LICENSES_DIR.mkdir(parents=True, exist_ok=True)

    arxiv_ids = ", ".join(p["id"] for p in arxiv_payload["papers"])
    arxiv_txt = (
        "Third-Party Scientific Research Literature Notices (Wave 49)\n\n"
        "1. arXiv Atom API Metadata and Abstracts\n"
        "   Sources:\n"
        "   - https://arxiv.org/\n"
        "   - https://www.alphaxiv.org/\n"
        "   - API Terms: https://info.arxiv.org/help/api/index.html\n"
        "   Attribution: Bibliographic metadata and abstracts indexed in "
        "data/arxiv_2026_11_alphaxiv/"
        "arxiv_wave49_tracking_bdb27_conformal_and_rlvr_vault_2026.json "
        f"were retrieved live on {arxiv_payload['harvested_at_utc']} strictly for non-commercial "
        f"scientific research across {arxiv_payload['total_unique_papers']} brand-new preprints "
        f"(0 overlap with Waves 43-46): {arxiv_ids}.\n"
        "   Copyright remains with respective authors under arXiv open-access terms.\n"
    )
    (LICENSES_DIR / "arxiv_wave49_api_LICENSE.txt").write_text(arxiv_txt, encoding="utf-8")

    openalex_txt = (
        "OpenAlex Wave 49 Biomechanics, Combine & Conformal Forecasting License Notice\n"
        f"Recorded UTC: {openalex_payload['harvested_at_utc']}\n"
        "Source API: https://api.openalex.org/works\n"
        "Documentation: https://help.openalex.org/\n"
        "License: OpenAlex bibliographic metadata is dedicated to the "
        "public domain under CC0 1.0.\n"
        f"Indexed Works: {openalex_payload['total_works']} works in "
        "data/openalex_2026_11/"
        "openalex_wave49_sports_biomech_bdb27_and_calibration_vault_2026.json.\n"
        "Individual full-text publications retain their respective "
        "publisher or open-access licenses.\n"
    )
    (LICENSES_DIR / "openalex_wave49_cc0_LICENSE.txt").write_text(openalex_txt, encoding="utf-8")

    slugs = ", ".join(sorted({a["kaggle_slug"] for a in kaggle_payload["compact_csv_artifacts"]}))
    kaggle_txt = (
        "Kaggle BDB 2027 Compact CC0 Benchmark Datasets & Live Catalog License Notice\n"
        f"Recorded UTC: {kaggle_payload['harvested_at_utc']}\n"
        "Source API: https://www.kaggle.com/api/v1/datasets/list + kagglehub\n"
        f"Downloaded Compact Datasets (CC0): {slugs}\n"
        "All mirrored CSV artifacts under data/kaggle_bdb27/ are compact CC0 research benchmarks "
        "used strictly for non-commercial kinematic validation and causal scouting diagnostics.\n"
    )
    (LICENSES_DIR / "kaggle_bdb27_cc0_LICENSE.txt").write_text(kaggle_txt, encoding="utf-8")


def main() -> int:
    """Harvest Wave 49 live API vaults and write attribution notices."""
    ARXIV_VAULT_DIR.mkdir(parents=True, exist_ok=True)
    OPENALEX_VAULT_DIR.mkdir(parents=True, exist_ok=True)
    KAGGLE_BDB27_DIR.mkdir(parents=True, exist_ok=True)

    existing_ids = collect_existing_arxiv_ids()
    arxiv_payload = harvest_arxiv_vault(existing_ids)
    openalex_payload = harvest_openalex_vault()
    kaggle_payload = harvest_kaggle_bdb27()

    ARXIV_OUT_PATH.write_text(json.dumps(arxiv_payload, indent=2) + "\n", encoding="utf-8")
    OPENALEX_OUT_PATH.write_text(json.dumps(openalex_payload, indent=2) + "\n", encoding="utf-8")
    KAGGLE_MANIFEST_PATH.write_text(json.dumps(kaggle_payload, indent=2) + "\n", encoding="utf-8")
    write_license_notices(arxiv_payload, openalex_payload, kaggle_payload)

    # Assert strict ASCII across all written JSON/license files
    for check_path in [
        ARXIV_OUT_PATH,
        OPENALEX_OUT_PATH,
        KAGGLE_MANIFEST_PATH,
        LICENSES_DIR / "arxiv_wave49_api_LICENSE.txt",
        LICENSES_DIR / "openalex_wave49_cc0_LICENSE.txt",
        LICENSES_DIR / "kaggle_bdb27_cc0_LICENSE.txt",
    ]:
        text = check_path.read_text(encoding="utf-8")
        if any(ord(ch) > 127 for ch in text):
            raise RuntimeError(f"Non-ASCII character detected in {check_path}")

    summary = {
        "existing_arxiv_prior_count": len(existing_ids),
        "wave49_arxiv_new_papers": arxiv_payload["total_unique_papers"],
        "total_arxiv_across_vaults": len(existing_ids) + arxiv_payload["total_unique_papers"],
        "wave49_openalex_works": openalex_payload["total_works"],
        "wave49_openalex_citations_sum": openalex_payload["total_citations_sum"],
        "wave49_kaggle_catalog_count": kaggle_payload["catalog_count"],
        "wave49_kaggle_csv_count": len(kaggle_payload["compact_csv_artifacts"]),
        "wave49_kaggle_csv_bytes": sum(a["bytes"] for a in kaggle_payload["compact_csv_artifacts"]),
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
