#!/usr/bin/env python3
"""
scripts/ops/xai_coupled_5api_gse_gsi_omniscience_engine.py

Coupled 5-API Omniscience Engine (X-API -> arXiv API + OpenAlex API + Kaggle API + Hugging Face API)
for BOTH Galaxy Sports Edge (GSE) and Galaxy Sports Institute (GSI).

Workflow:
  1. Uses live xAI Grok (`grok-4.7` with `x_search` + `web_search`) to mine X/Twitter for the
     latest frontier NFL analytics (GSE) and sports medicine / orthopedic biomechanics /
     neuro-cognitive tracking signals (GSI), emitting structured query vectors.
  2. Drives live queries against:
     - arXiv REST API (`https://export.arxiv.org/api/query`)
     - OpenAlex REST API (`https://api.openalex.org/works`)
     - Kaggle REST API / Public Dataset Search (`https://www.kaggle.com/api/v1/datasets/list`)
     - Hugging Face Hub REST API (`https://huggingface.co/api/datasets` & `/api/models`)
  3. Synthesizes every discovered X signal, arXiv preprint, OpenAlex peer-reviewed medical/analytics
     study, Kaggle dataset, and Hugging Face dataset/model into a unified GSE + GSI Omniscience
     Ledger and executable feature priors for the reasoning engine, live site, support, and research.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
from typing import Any
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env.local"
OUT_JSON = REPO_ROOT / "data" / "audits" / "xai_coupled_5api_gse_gsi_omniscience_2026_11_06.json"
OUT_MD = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "XAI_COUPLED_5API_GSE_GSI_OMNISCIENCE_LEDGER.md"


def load_env_map() -> dict[str, str]:
    env_map: dict[str, str] = dict(os.environ)
    for candidate in [
        ENV_PATH,
        Path(r"C:\c\wt-week8-forensic\.env.local"),
        Path(r"C:\Users\Garrett\Sports\.env.local"),
    ]:
        if candidate.exists():
            for line in candidate.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.split("=", 1)
                    env_map[k.strip()] = v.strip().strip('"').strip("'")
    return env_map


def run_xai_driver_discovery(api_key: str) -> dict[str, Any]:
    """Step 1: Live xAI Grok 4.7 x_search + web_search driver for GSE + GSI cross-API queries."""
    prompt = (
        "Search X/Twitter and the web across both NFL Quantitative Analytics (GSE) and NFL Sports Medicine / "
        "Biomechanics / Neuro-Cognitive Performance (GSI). Identify: "
        "(1) The top 15 frontier mathematical & statistical methodologies discussed by NFL analysts and researchers "
        "(e.g., spatiotemporal transformers on 10Hz tracking, Hawkes processes for QB pressure trauma, Bayesian online "
        "changepoint detection for coordinator script shifts, vine copulas for correlated SGPs, Shin/Bregman de-vigging); "
        "(2) The top 15 sports-medicine & biomechanical tracking methodologies for GSI (e.g., high-ankle syndesmosis "
        "cutting deceleration asymmetry, biceps femoris eccentric hamstring strain re-injury hazard, synthetic slit-film "
        "turf lower-extremity torque, QB rotational kinetic chain velocity loss after rib/AC-joint trauma, anaerobic "
        "phosphocreatine depletion in 300-lb linemen); "
        "(3) Exact search queries we should fire into arXiv, OpenAlex, Kaggle, and Hugging Face to harvest the full "
        "scientific and dataset backing for every single signal. Never use the abbreviation 'e-t-c' with a period."
    )
    payload = {
        "model": "grok-4.7",
        "input": [{"role": "user", "content": prompt}],
        "tools": [{"type": "x_search"}, {"type": "web_search"}],
    }
    req = urllib.request.Request(
        "https://api.x.ai/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "GSE-GSI-5API-Driver/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    texts: list[str] = []
    for item in raw.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") in ("output_text", "text") and part.get("text"):
                    texts.append(part["text"])
    content = "\n\n".join(texts).replace("etc.", "and related methods").replace("ETC.", "AND RELATED METHODS")
    usage = raw.get("usage", {})
    cost_usd = float(usage.get("cost_in_usd_ticks", 0)) / 1e10
    return {
        "model": "grok-4.7",
        "cost_usd": round(cost_usd, 6),
        "usage": usage,
        "synthesis": content,
    }


ARXIV_QUERIES: list[tuple[str, str, str]] = [
    ("GSE", "nfl_tracking_spatiotemporal", 'all:"American football" AND (all:tracking OR all:"expected points" OR all:"completion probability")'),
    ("GSE", "sports_betting_calibration_kelly", 'all:"sports betting" AND (all:calibration OR all:"Kelly criterion" OR all:arbitrage)'),
    ("GSE", "hawkes_process_changepoint_sports", 'all:"Hawkes process" AND (all:sports OR all:game OR all:trajectory)'),
    ("GSE", "copula_tail_dependence_portfolio", 'all:"vine copula" AND all:"tail dependence"'),
    ("GSI", "biomechanics_acl_hamstring_fatigue", 'all:biomechanics AND (all:fatigue OR all:injury OR all:locomotion OR all:deceleration)'),
    ("GSI", "spatiotemporal_graph_neural_network_pose", 'all:"spatio-temporal" AND all:"graph neural network" AND all:trajectory'),
]


def fetch_arxiv_query(domain: str, slug: str, query: str) -> list[dict[str, Any]]:
    url = f"http://export.arxiv.org/api/query?search_query={urllib.parse.quote(query)}&start=0&max_results=8"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-GSI-Omniscience/1.0"})
    papers: list[dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            xml_bytes = resp.read()
        root = ET.fromstring(xml_bytes)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("atom:entry", ns):
            arxiv_id = (entry.findtext("atom:id", default="", namespaces=ns) or "").strip()
            title = " ".join((entry.findtext("atom:title", default="", namespaces=ns) or "").split())
            summary = " ".join((entry.findtext("atom:summary", default="", namespaces=ns) or "").split())
            published = (entry.findtext("atom:published", default="", namespaces=ns) or "").strip()
            authors = [
                (a.findtext("atom:name", default="", namespaces=ns) or "").strip()
                for a in entry.findall("atom:author", ns)
            ]
            if title:
                papers.append({
                    "domain": domain,
                    "query_slug": slug,
                    "arxiv_id": arxiv_id,
                    "title": title.replace("etc.", "and related items"),
                    "published": published,
                    "authors": authors[:6],
                    "abstract": summary[:900].replace("etc.", "and related items"),
                })
    except Exception as exc:
        print(f"[arXiv warn] {slug}: {exc}")
    return papers


OPENALEX_QUERIES: list[tuple[str, str, str]] = [
    ("GSI", "nfl_syndesmotic_high_ankle_sprain_return_to_play", "National Football League high ankle sprain return to play performance"),
    ("GSI", "nfl_hamstring_strain_reinjury_sprint_biomechanics", "hamstring strain return to play sprinting biomechanics football"),
    ("GSI", "nfl_synthetic_turf_grass_lower_extremity_injury", "NFL artificial turf natural grass noncontact lower extremity injury"),
    ("GSI", "nfl_concussion_protocol_neurocognitive_recovery", "National Football League concussion return to play protocol recovery"),
    ("GSI", "nfl_quarterback_shoulder_rib_throwing_biomechanics", "quarterback throwing biomechanics shoulder injury ball velocity"),
    ("GSI", "nfl_travel_circadian_rhythm_short_week_fatigue", "National Football League circadian travel rest Thursday injury fatigue"),
    ("GSE", "nfl_fourth_down_decision_making_win_probability", "National Football League fourth down decision win probability"),
    ("GSE", "nfl_pass_rush_tracking_expected_points_added", "National Football League player tracking pass rush coverage expected points"),
    ("GSE", "sports_betting_market_efficiency_closing_line", "NFL betting market efficiency closing line favorite longshot"),
    ("GSE", "referee_home_bias_penalty_decision_nfl", "National Football League referee officiating penalty bias"),
]


def reconstruct_openalex_abstract(inv_idx: dict[str, list[int]] | None) -> str:
    if not inv_idx or not isinstance(inv_idx, dict):
        return ""
    pos_map: dict[int, str] = {}
    for word, positions in inv_idx.items():
        if isinstance(positions, list):
            for p in positions:
                if isinstance(p, int):
                    pos_map[p] = word
    if not pos_map:
        return ""
    ordered = [pos_map[k] for k in sorted(pos_map.keys())]
    return " ".join(ordered)[:900].replace("etc.", "and related factors")


def fetch_openalex_query(domain: str, slug: str, query: str) -> list[dict[str, Any]]:
    url = f"https://api.openalex.org/works?search={urllib.parse.quote(query)}&per-page=6&mailto=hq@galaxysportsedge.com"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-GSI-Omniscience/1.0 (mailto:hq@galaxysportsedge.com)"})
    works: list[dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for item in data.get("results", []):
            title = (item.get("title") or "").strip()
            if not title:
                continue
            abstract = reconstruct_openalex_abstract(item.get("abstract_inverted_index"))
            works.append({
                "domain": domain,
                "query_slug": slug,
                "openalex_id": item.get("id"),
                "doi": item.get("doi"),
                "title": title.replace("etc.", "and related factors"),
                "publication_year": item.get("publication_year"),
                "cited_by_count": item.get("cited_by_count", 0),
                "abstract": abstract,
            })
    except Exception as exc:
        print(f"[OpenAlex warn] {slug}: {exc}")
    return works


HUGGINGFACE_QUERIES: list[tuple[str, str, str]] = [
    ("GSE", "dataset", "nfl"),
    ("GSE", "dataset", "football"),
    ("GSE", "dataset", "sports"),
    ("GSI", "dataset", "biomechanics"),
    ("GSI", "dataset", "injury"),
    ("GSE", "model", "time-series"),
    ("GSE", "model", "tabular"),
]


def fetch_huggingface_query(domain: str, kind: str, search: str) -> list[dict[str, Any]]:
    endpoint = "datasets" if kind == "dataset" else "models"
    url = f"https://huggingface.co/api/{endpoint}?search={urllib.parse.quote(search)}&limit=8&sort=downloads&direction=-1"
    req = urllib.request.Request(url, headers={"User-Agent": "GSE-GSI-Omniscience/1.0"})
    items: list[dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        for row in data:
            repo_id = row.get("id", "")
            if repo_id:
                items.append({
                    "domain": domain,
                    "kind": kind,
                    "search": search,
                    "id": repo_id,
                    "downloads": row.get("downloads", 0),
                    "likes": row.get("likes", 0),
                    "tags": (row.get("tags") or [])[:8],
                })
    except Exception as exc:
        print(f"[HuggingFace warn] {kind}/{search}: {exc}")
    return items


KAGGLE_QUERIES: list[tuple[str, str]] = [
    ("GSE", "nfl"),
    ("GSE", "big data bowl"),
    ("GSE", "nfl betting"),
    ("GSI", "nfl injury"),
    ("GSI", "nfl tracking"),
]


def fetch_kaggle_datasets(domain: str, search: str, env_map: dict[str, str]) -> list[dict[str, Any]]:
    url = f"https://www.kaggle.com/api/v1/datasets/list?search={urllib.parse.quote(search)}&page=1"
    headers = {"User-Agent": "GSE-GSI-Omniscience/1.0"}
    if env_map.get("KAGGLE_USERNAME") and env_map.get("KAGGLE_KEY"):
        import base64
        creds = f"{env_map['KAGGLE_USERNAME']}:{env_map['KAGGLE_KEY']}".encode("utf-8")
        headers["Authorization"] = f"Basic {base64.b64encode(creds).decode('ascii')}"
    out: list[dict[str, Any]] = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if isinstance(data, list):
            for d in data[:10]:
                out.append({
                    "domain": domain,
                    "search": search,
                    "ref": d.get("ref", ""),
                    "title": (d.get("title") or "").replace("etc.", "and related data"),
                    "downloadCount": d.get("downloadCount", 0),
                    "voteCount": d.get("voteCount", 0),
                    "usabilityRating": d.get("usabilityRating", 0.0),
                })
    except Exception as exc:
        print(f"[Kaggle info] {search}: {exc}")
    return out


def main() -> None:
    env_map = load_env_map()
    xai_key = env_map["XAI_API_KEY"]

    print("[5-API Omniscience] Launching Step 1: xAI Grok 4.7 X-Search + Web-Search Driver + Parallel arXiv, OpenAlex, Kaggle & HuggingFace harvests...")
    arxiv_results: list[dict[str, Any]] = []
    openalex_results: list[dict[str, Any]] = []
    hf_results: list[dict[str, Any]] = []
    kaggle_results: list[dict[str, Any]] = []

    with ThreadPoolExecutor(max_workers=10) as pool:
        xai_fut = pool.submit(run_xai_driver_discovery, xai_key)
        arxiv_futs = [pool.submit(fetch_arxiv_query, dom, slug, q) for dom, slug, q in ARXIV_QUERIES]
        oa_futs = [pool.submit(fetch_openalex_query, dom, slug, q) for dom, slug, q in OPENALEX_QUERIES]
        hf_futs = [pool.submit(fetch_huggingface_query, dom, kind, s) for dom, kind, s in HUGGINGFACE_QUERIES]
        kg_futs = [pool.submit(fetch_kaggle_datasets, dom, s, env_map) for dom, s in KAGGLE_QUERIES]

        xai_driver = xai_fut.result()
        for f in as_completed(arxiv_futs):
            arxiv_results.extend(f.result())
        for f in as_completed(oa_futs):
            openalex_results.extend(f.result())
        for f in as_completed(hf_futs):
            hf_results.extend(f.result())
        for f in as_completed(kg_futs):
            kaggle_results.extend(f.result())

    # Deduplicate by unique ID
    seen_arxiv: set[str] = set()
    dedup_arxiv = []
    for p in arxiv_results:
        if p["arxiv_id"] not in seen_arxiv:
            seen_arxiv.add(p["arxiv_id"])
            dedup_arxiv.append(p)

    seen_oa: set[str] = set()
    dedup_oa = []
    for w in openalex_results:
        oid = str(w.get("openalex_id") or w.get("title"))
        if oid not in seen_oa:
            seen_oa.add(oid)
            dedup_oa.append(w)

    seen_hf: set[str] = set()
    dedup_hf = []
    for h in hf_results:
        hid = f"{h['kind']}:{h['id']}"
        if hid not in seen_hf:
            seen_hf.add(hid)
            dedup_hf.append(h)

    seen_kg: set[str] = set()
    dedup_kg = []
    for k in kaggle_results:
        kref = str(k.get("ref") or k.get("title"))
        if kref and kref not in seen_kg:
            seen_kg.add(kref)
            dedup_kg.append(k)

    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "architecture": "X-API -> (arXiv API + OpenAlex API + Kaggle API + Hugging Face Hub API) -> GSE & GSI Reasoning Engine + Pinecone + Live Site",
        "counts": {
            "xai_driver_chars": len(xai_driver["synthesis"]),
            "xai_driver_cost_usd": xai_driver["cost_usd"],
            "arxiv_preprints_fetched": len(dedup_arxiv),
            "openalex_peer_reviewed_works_fetched": len(dedup_oa),
            "huggingface_datasets_and_models_fetched": len(dedup_hf),
            "kaggle_datasets_fetched": len(dedup_kg),
            "total_cross_api_scientific_nodes": len(dedup_arxiv) + len(dedup_oa) + len(dedup_hf) + len(dedup_kg) + 1,
        },
        "xai_driver": xai_driver,
        "arxiv_papers": dedup_arxiv,
        "openalex_works": dedup_oa,
        "huggingface_assets": dedup_hf,
        "kaggle_datasets": dedup_kg,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    md = [
        "# Coupled 5-API GSE & GSI Omniscience Ledger (`X-API` -> `arXiv` + `OpenAlex` + `Kaggle` + `Hugging Face`)",
        "",
        f"- **Generated At (UTC):** `{payload['generated_at_utc']}`",
        f"- **X-API Driver (`grok-4.7` `x_search` + `web_search`):** `{payload['counts']['xai_driver_chars']:,}` chars (`${payload['counts']['xai_driver_cost_usd']:.4f}`)",
        f"- **Live arXiv Preprints Harvested:** `{payload['counts']['arxiv_preprints_fetched']}`",
        f"- **Live OpenAlex Peer-Reviewed Works (GSE + GSI Sports Medicine/Biomechanics):** `{payload['counts']['openalex_peer_reviewed_works_fetched']}`",
        f"- **Live Hugging Face Hub Datasets & Models:** `{payload['counts']['huggingface_datasets_and_models_fetched']}`",
        f"- **Live Kaggle Datasets:** `{payload['counts']['kaggle_datasets_fetched']}`",
        f"- **Total Coupled Cross-API Scientific Nodes:** `{payload['counts']['total_cross_api_scientific_nodes']}`",
        "",
        "---",
        "",
        "## 1. X-API (`grok-4.7`) GSE & GSI Discovery Synthesis",
        "",
        xai_driver["synthesis"],
        "",
        "---",
        "",
        "## 2. Live OpenAlex Peer-Reviewed GSE & GSI Works (Sports Medicine, Biomechanics, Neuro-Cognition & Market Efficiency)",
        "",
    ]
    for w in dedup_oa:
        md.append(f"- **[{w['domain']}] {w['title']}** ({w.get('publication_year')}, Cited by `{w.get('cited_by_count')}`, DOI: `{w.get('doi')}`)")
        if w.get("abstract"):
            md.append(f"  - *Abstract:* {w['abstract'][:400]}...")
    md.extend([
        "",
        "---",
        "",
        "## 3. Live arXiv Quantitative & Tracking Preprints (GSE & GSI)",
        "",
    ])
    for p in dedup_arxiv:
        md.append(f"- **[{p['domain']}] {p['title']}** (`{p['arxiv_id']}`, {p['published'][:10]}) — {', '.join(p['authors'][:4])}")
        if p.get("abstract"):
            md.append(f"  - *Abstract:* {p['abstract'][:400]}...")
    md.extend([
        "",
        "---",
        "",
        "## 4. Live Hugging Face Datasets & Models + Kaggle Tracking Assets",
        "",
    ])
    for h in dedup_hf:
        md.append(f"- **[HF {h['domain']} {h['kind']}] `{h['id']}`** (Downloads: `{h['downloads']:,}`, Likes: `{h['likes']}`)")
    for k in dedup_kg:
        md.append(f"- **[Kaggle {k['domain']}] `{k['ref']}`** — {k['title']} (Downloads: `{k['downloadCount']}`, Votes: `{k['voteCount']}`)")

    OUT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")

    sports_root = Path(r"C:\Users\Garrett\Sports")
    if sports_root.exists() and sports_root.resolve() != REPO_ROOT.resolve():
        for rel in [
            Path("scripts/ops/xai_coupled_5api_gse_gsi_omniscience_engine.py"),
            Path("data/audits/xai_coupled_5api_gse_gsi_omniscience_2026_11_06.json"),
            Path("docs/engine/research/2026-11-06/XAI_COUPLED_5API_GSE_GSI_OMNISCIENCE_LEDGER.md"),
        ]:
            dst = sports_root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(REPO_ROOT / rel, dst)

    print("[5-API Omniscience] COMPLETE:", json.dumps(payload["counts"], indent=2))


if __name__ == "__main__":
    main()
