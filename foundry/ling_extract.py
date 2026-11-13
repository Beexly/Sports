#!/usr/bin/env python3
"""Ling overflow extraction lane (auxiliary, fail-fast, non-blocking).

Claims PENDING books via the gatekeeper, extracts with ling-3.2-flash:free
(thinking ON), assembles gatekeeper-schema artifacts, commits. ONE gate
rejection or any Ling unavailability => row returned to PENDING for the
Qwen4 primary lane; this worker never retries Ling on the same file.
Run with the ocr-venv python (pymupdf available). Max 4 books per run.
"""
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ling_client as ling  # noqa: E402
import gatekeeper  # noqa: E402

WORKER = "ling-1"
LOG = os.path.join(HERE, "logs", "ling_lane.log")
SCRATCH = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "cache", "scratch", "foundry-ling")
os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(LOG), exist_ok=True)


def log(msg):
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def gk(*args):
    r = subprocess.run([sys.executable, os.path.join(HERE, "gatekeeper.py"), *args],
                       capture_output=True, text=True, timeout=120)
    return r.stdout.strip()


def release(book_id, why):
    con = gatekeeper.connect()
    con.execute("UPDATE corpus_queue SET status='PENDING', worker_id=NULL WHERE book_id=? AND worker_id=?",
                (book_id, WORKER))
    gatekeeper.log_event(con, book_id, "LING_REROUTE_QWEN4", why)
    con.commit()
    con.close()


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def read_pdf(path):
    import pymupdf
    doc = pymupdf.open(path)
    pages = []
    for i, page in enumerate(doc):
        pages.append((i + 1, page.get_text()))
    return pages


def extract_book(row):
    book_id, path = row["book_id"], row["file_path"]
    pages = read_pdf(path)
    full = "\n".join(f"[PAGE {n}]\n{t}" for n, t in pages)
    nfull = norm(full)
    if len(nfull) < 2000:
        release(book_id, "text too thin after pymupdf; Qwen4/OCR lane decides")
        return "rerouted-thin"
    head = full[:60000]
    tail = full[-10000:] if len(full) > 70000 else ""
    prompt = (
        "You are a sovereign-primitive extractor for the GSE/GSI Foundry. Source book text follows "
        "(page markers [PAGE n]). Extract 4-6 sovereign primitives: verbatim quotes (>=8 words, EXACT "
        "substrings of the source), page numbers, exact LaTeX when the source prints equations (null "
        "otherwise), symbol_and_unit_ledger for every latex, assumptions, breakdown_regime, and at "
        "least one layer2 object {tag: '[ISOMORPHISM]' or '[DERIVED KERNEL]', mapping, source_operator: "
        "primitive id, telemetry}. NO sportsbook odds, NO toy equations like Force/Fatigue, NO fabricated "
        "football origins for pure math. Also write universal_lens, gsi_mapping, gse_mapping (>=30 words "
        "each). Respond with ONLY a JSON object: {primitives:[{primitive_id:'p1',name,verbatim_quote,page,"
        "latex,symbol_and_unit_ledger,assumptions,breakdown_regime,layer2}], universal_lens, gsi_mapping, "
        "gse_mapping}.\n\nSOURCE:\n" + head + ("\n[...middle omitted...]\n" + tail if tail else "")
    )
    raw = ling.chat([{"role": "user", "content": prompt}], thinking=True, max_tokens=16000)
    m = re.search(r"\{.*\}", raw, re.S)
    doc = json.loads(m.group(0))
    prims = []
    for i, p in enumerate(doc.get("primitives", [])):
        p["primitive_id"] = p.get("primitive_id") or f"p{i+1}"
        if norm(p.get("verbatim_quote", "")) and norm(p["verbatim_quote"]) in nfull:
            prims.append(p)
    if len(prims) < 3:
        release(book_id, f"only {len(prims)} verbatim-verified primitives; Qwen4 re-extracts")
        return "rerouted-quotes"
    doc["primitives"] = prims[:6]
    tprompt = (
        "For the same book, write TWO reasoning traces as JSON: {reasoning_traces:[{trace_id:'t1',"
        "think, retrocausal_genealogy, theory_of_mind, cross_layer_veto},{trace_id:'t2',...}]}. Each "
        "trace's think must be >=450 words (combined >=900); each of retrocausal_genealogy (backward "
        "historical/institutional causation), theory_of_mind (recursive belief modeling under pressure), "
        "cross_layer_veto (where one domain vetoes another) >=70 words. Ground everything in these "
        "primitives:\n" + json.dumps(doc["primitives"], ensure_ascii=False)[:20000] +
        "\nNo odds, no toy math, no fabricated citations. ONLY JSON."
    )
    raw2 = ling.chat([{"role": "user", "content": tprompt}], thinking=True, max_tokens=12000)
    m2 = re.search(r"\{.*\}", raw2, re.S)
    doc["reasoning_traces"] = json.loads(m2.group(0)).get("reasoning_traces", [])
    doc.update({
        "book_id": book_id, "source_status": "COMPLETE",
        "pages_total": len(pages),
        "pages_read": len(pages) if len(full) <= 70000 else "head+tail sample (honest)",
        "worker_id": WORKER, "extractor_model": ling.MODEL,
    })
    errs = gatekeeper.validate(doc)
    if errs:
        release(book_id, "local pre-validation failed: " + "; ".join(errs)[:200])
        return "rerouted-prevalidation"
    apath = os.path.join(HERE, "artifacts", "primitives", f"{book_id}.json")
    with open(apath, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    out = gk("commit", apath)
    if "GATEKEEPER_APPROVED" in out:
        log(f"COMPLETE {book_id} {row['file_name']} prims={len(doc['primitives'])}")
        return "complete"
    release(book_id, "gatekeeper rejected once: " + out[:200])
    return "rerouted-gate"


def main():
    done = 0
    while done < 4:
        if not ling.circuit_ok():
            log("circuit cooldown active; exiting (Qwen4 lane unaffected)")
            return
        out = gk("claim", "--worker", WORKER, "--tier", "A")
        if out == "NO_PENDING":
            out = gk("claim", "--worker", WORKER, "--tier", "B")
        if out == "NO_PENDING":
            log("no pending books; exiting")
            return
        row = json.loads(out)
        log(f"claimed {row['book_id']} {row['file_name']}")
        try:
            result = extract_book(row)
            log(f"result {row['book_id']}: {result}")
            if result == "complete":
                done += 1
        except ling.LingUnavailable as e:
            release(row["book_id"], f"Ling unavailable: {e}")
            log(f"Ling unavailable ({e}); released claim, exiting to Qwen4 lane")
            return
        except Exception as e:
            release(row["book_id"], f"worker error: {type(e).__name__}: {e}")
            log(f"error on {row['book_id']}: {e}; rerouted to Qwen4")
    log("run budget reached (4 books); exiting")


if __name__ == "__main__":
    main()
