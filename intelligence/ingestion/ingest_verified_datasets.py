"""
Hardened Stream Ingestion Pipeline for Verified Datasets
"""
import os
import sys
import json
import time
import hashlib
import urllib.request
import io
import pandas as pd
from datetime import datetime, timezone

BASE_DIR = r"C:\Users\Garrett\Sports"
MANIFEST_PATH = os.path.join(BASE_DIR, r"docs\data-sources\research\2026-10-16\rea_extraction\dataset_manifest.json")
WAREHOUSE_RAW = os.path.join(BASE_DIR, r"intelligence\data\warehouse\raw")
WAREHOUSE_NORM = os.path.join(BASE_DIR, r"intelligence\data\warehouse\normalized")
REGISTRY_LOG = os.path.join(BASE_DIR, r"intelligence\data\warehouse\ingestion_registry.jsonl")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def log_registry(entry):
    with open(REGISTRY_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

def ingest_dataset(ds):
    cid = ds["canonical_id"]
    source = ds["source"]
    url = ds["endpoint"]
    pit_safe = ds.get("PIT_safe", True)
    rea_mod = ds.get("rea_module_used", "src/browser/execution/CdpRuntimeRequests.ts")
    
    print(f"\n[Ingesting] {cid} from {source}...")
    t0 = time.time()
    now_utc = datetime.now(timezone.utc).isoformat()
    
    is_csv = url.endswith(".csv") or "csv" in url
    raw_filename = f"{cid.lower()}_raw." + ("csv" if is_csv else "json")
    raw_path = os.path.join(WAREHOUSE_RAW, raw_filename)
    norm_parquet = os.path.join(WAREHOUSE_NORM, f"{cid.lower()}.parquet")
    
    try:
        # Check if raw file was already downloaded
        if os.path.exists(raw_path) and os.path.getsize(raw_path) > 0:
            print(f"  Using existing raw cache: {raw_filename} ({os.path.getsize(raw_path):,} bytes)")
            with open(raw_path, "rb") as rf:
                content = rf.read()
            status = 200
        else:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
                content = resp.read()
            with open(raw_path, "wb") as rf:
                rf.write(content)
                
        duration_ms = int((time.time() - t0) * 1000)
        sha256 = hashlib.sha256(content).hexdigest()
        byte_size = len(content)
        
        # Parse to DataFrame cleanly
        if is_csv:
            df = pd.read_csv(io.BytesIO(content), low_memory=False)
        else:
            parsed = json.loads(content.decode("utf-8", errors="ignore"))
            if cid == "DS_SLEEPER_PLAYER_DATABASE":
                # Dict of player_id -> dict
                if isinstance(parsed, dict):
                    records = []
                    for pid, pdata in list(parsed.items()):
                        pdata["sleeper_id"] = pid
                        # keep shallow string/number fields
                        records.append({
                            "player_id": pid,
                            "full_name": pdata.get("full_name"),
                            "position": pdata.get("position"),
                            "team": pdata.get("team"),
                            "status": pdata.get("status"),
                            "gsis_id": pdata.get("gsis_id"),
                            "sportradar_id": pdata.get("sportradar_id"),
                            "rotowire_id": pdata.get("rotowire_id"),
                            "depth_chart_order": pdata.get("depth_chart_order")
                        })
                    df = pd.DataFrame(records)
                else:
                    df = pd.DataFrame(parsed)
            elif isinstance(parsed, list):
                df = pd.DataFrame(parsed)
            elif isinstance(parsed, dict):
                for k in ["events", "markets", "data"]:
                    if k in parsed and isinstance(parsed[k], list):
                        df = pd.DataFrame(parsed[k])
                        break
                else:
                    df = pd.json_normalize(parsed)
            else:
                df = pd.DataFrame([{"raw": str(parsed)}])
                
        record_count = len(df)
        df["gse_ingested_at_utc"] = now_utc
        df["gse_source_sha256"] = sha256
        df.to_parquet(norm_parquet, index=False)
        
        print(f"  -> SUCCESS: HTTP {status} | {record_count:,} records | {byte_size:,} bytes -> {os.path.basename(norm_parquet)}")
        
        entry = {
            "canonical_id": cid,
            "source": source,
            "url": url,
            "http_status": status,
            "byte_size": byte_size,
            "record_count": record_count,
            "sha256": sha256,
            "duration_ms": duration_ms,
            "pit_safe": pit_safe,
            "rea_module_used": rea_mod,
            "norm_parquet": norm_parquet,
            "ingested_at_utc": now_utc,
            "status": "PASS"
        }
        log_registry(entry)
        return entry
    except Exception as e:
        print(f"  -> FAIL: {e}")
        fail_entry = {
            "canonical_id": cid,
            "source": source,
            "url": url,
            "http_status": f"ERROR: {e}",
            "byte_size": 0,
            "record_count": 0,
            "sha256": None,
            "duration_ms": int((time.time() - t0) * 1000),
            "pit_safe": pit_safe,
            "rea_module_used": rea_mod,
            "ingested_at_utc": now_utc,
            "status": "FAIL"
        }
        log_registry(fail_entry)
        return fail_entry

def main():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    summary = []
    for ds in manifest.get("datasets", []):
        summary.append(ingest_dataset(ds))
        
    summary_path = os.path.join(BASE_DIR, r"intelligence\data\warehouse\INGESTION_SUMMARY_LATEST.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
        
    passed = sum(1 for s in summary if s['status'] == 'PASS')
    print(f"\n=======================================================")
    print(f"INGESTION COMPLETE: {passed}/{len(summary)} DATASETS INGESTED")
    print(f"=======================================================")

if __name__ == "__main__":
    main()
