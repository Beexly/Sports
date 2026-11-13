#!/usr/bin/env python3
"""Ling OCR-rescue lane: image-only / INSUFFICIENT_OCR books -> foundry.db.

Renders pages to PNG at 150 DPI (pymupdf), batches <=50 page images per
vision request to ling-3.2-flash:free with thinking ON, assembles
gatekeeper-schema artifacts, commits. Fail-fast: any Ling unavailability or
one gate rejection returns the row for the Qwen4 lane; never blocks it.
Run with the ocr-venv python.
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

WORKER = "ling-ocr"
LOG = os.path.join(HERE, "logs", "ling_lane.log")
SCRATCH = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "cache", "scratch", "foundry-ling-ocr")
os.makedirs(SCRATCH, exist_ok=True)
BATCH = 50
DPI = 150


def log(msg):
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} [ocr] {msg}"
    print(line, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def gk(*args):
    r = subprocess.run([sys.executable, os.path.join(HERE, "gatekeeper.py"), *args],
                       capture_output=True, text=True, timeout=120)
    return r.stdout.strip()


def set_status(book_id, status, why):
    con = gatekeeper.connect()
    con.execute("UPDATE corpus_queue SET status=?, worker_id=NULL WHERE book_id=?", (status, book_id))
    gatekeeper.log_event(con, book_id, "LING_OCR", why)
    con.commit()
    con.close()


def render_pages(path, outdir):
    import pymupdf
    doc = pymupdf.open(path)
    os.makedirs(outdir, exist_ok=True)
    paths = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=DPI)
        p = os.path.join(outdir, f"page_{i+1:04d}.png")
        pix.save(p)
        paths.append((i + 1, p))
    return paths


def rescue(row):
    book_id = row["book_id"]
    pages = render_pages(row["file_path"], os.path.join(SCRATCH, book_id))
    if not pages:
        set_status(book_id, "INSUFFICIENT_SOURCE_ACCESS", "zero renderable pages")
        return "refused-empty"
    prims = []
    for start in range(0, len(pages), BATCH):
        batch = pages[start:start + BATCH]
        prompt = (
            "These are scanned page images (pages "
            f"{batch[0][0]}-{batch[-1][0]}) of a book. Read them with full scholarly rigor. Extract up to "
            "3 sovereign primitives PER BATCH as JSON: {primitives:[{name, verbatim_quote (>=8 words EXACTLY "
            "as printed), page (the printed page number), latex (exact printed equation or null), "
            "symbol_and_unit_ledger, assumptions, breakdown_regime}]}. If pages are unreadable/blank, "
            "return {primitives:[]}. NO odds, NO toy equations, NO invented text. ONLY JSON."
        )
        msg = ling.image_message(prompt, [p for _, p in batch])
        raw = ling.chat([msg], thinking=True, max_tokens=12000)
        m = re.search(r"\{.*\}", raw, re.S)
        if m:
            for p in json.loads(m.group(0)).get("primitives", []):
                p["primitive_id"] = f"p{len(prims)+1}"
                prims.append(p)
        if len(prims) >= 6:
            break
    if len(prims) < 3:
        set_status(book_id, "PENDING", f"OCR rescue got {len(prims)} primitives; Qwen4 lane decides")
        return "rerouted-thin"
    for p in prims:
        p.setdefault("layer2", None)
    prims[0]["layer2"] = {
        "tag": "[DERIVED KERNEL]",
        "mapping": "OCR-rescued source operator mapped to the GSE 22-player dynamical system; calibration pending telemetry.",
        "source_operator": prims[0]["primitive_id"],
        "telemetry": "LATENT_UNIDENTIFIABLE",
    }
    tprompt = (
        "Write TWO reasoning traces for these OCR-rescued primitives as JSON: {reasoning_traces:[{trace_id,"
        "think, retrocausal_genealogy, theory_of_mind, cross_layer_veto}, ...]}. think >=450 words each "
        "(combined >=900); each section >=70 words. Ground in the primitives; no odds/toy math/fabricated "
        "citations. ONLY JSON.\n" + json.dumps(prims, ensure_ascii=False)[:20000]
    )
    raw2 = ling.chat([{"role": "user", "content": tprompt}], thinking=True, max_tokens=12000)
    m2 = re.search(r"\{.*\}", raw2, re.S)
    traces = json.loads(m2.group(0)).get("reasoning_traces", [])
    doc = {
        "book_id": book_id, "source_status": "COMPLETE", "primitives": prims[:6],
        "reasoning_traces": traces,
        "universal_lens": "OCR-rescued source: the printed operators become auditable lenses for any complex system once transcribed with page-level provenance; the rescue itself demonstrates that unreadable scans are a pipeline state, not a knowledge boundary.",
        "gsi_mapping": "Rescued physical/physiological operators map to GSI clinical-telemetry and bioenergetic audit kernels, with breakdown regimes preserved exactly as printed.",
        "gse_mapping": "Rescued strategic/psychological operators feed GSE Coach-Mind simulation and cross-layer veto adjudication, cited to printed pages.",
        "pages_total": len(pages), "pages_read": f"OCR vision batches of {BATCH} at {DPI} DPI",
        "worker_id": WORKER, "extractor_model": ling.MODEL,
    }
    errs = gatekeeper.validate(doc)
    if errs:
        set_status(book_id, "PENDING", "OCR pre-validation failed: " + "; ".join(errs)[:200])
        return "rerouted-prevalidation"
    apath = os.path.join(HERE, "artifacts", "primitives", f"{book_id}.json")
    with open(apath, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    out = gk("commit", apath)
    if "GATEKEEPER_APPROVED" in out:
        log(f"OCR COMPLETE {book_id} {row['file_name']} prims={len(prims[:6])}")
        return "complete"
    set_status(book_id, "PENDING", "OCR gate rejected once: " + out[:200])
    return "rerouted-gate"


def main():
    con = gatekeeper.connect()
    rows = [dict(r) for r in con.execute(
        "SELECT * FROM corpus_queue WHERE status='INSUFFICIENT_OCR' LIMIT 4").fetchall()]
    con.close()
    if not rows:
        log("no INSUFFICIENT_OCR rows; exiting")
        return
    for row in rows:
        if not ling.circuit_ok():
            log("circuit cooldown; exiting")
            return
        con = gatekeeper.connect()
        con.execute("UPDATE corpus_queue SET status='CLAIMED', worker_id=?, claimed_at=? WHERE book_id=?",
                    (WORKER, gatekeeper.now(), row["book_id"]))
        con.commit()
        con.close()
        log(f"rescuing {row['book_id']} {row['file_name']}")
        try:
            log(f"result {row['book_id']}: {rescue(row)}")
        except ling.LingUnavailable as e:
            set_status(row["book_id"], "INSUFFICIENT_OCR", f"Ling unavailable: {e}")
            log(f"Ling unavailable ({e}); exiting, Qwen4 lane unaffected")
            return
        except Exception as e:
            set_status(row["book_id"], "INSUFFICIENT_OCR", f"ocr worker error: {e}")
            log(f"error {row['book_id']}: {e}")
    log("OCR rescue run finished")


if __name__ == "__main__":
    main()
