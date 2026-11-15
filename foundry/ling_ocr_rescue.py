#!/usr/bin/env python3
"""Ling OCR-rescue lane v2: image-only / INSUFFICIENT_OCR books -> foundry.db.

Two-phase to stay inside the 15s TTFT guardrail:
  phase 1: downscaled JPEG batches (<=8 pages, max side 1200px, q55),
           thinking OFF — pure fast transcription with page markers.
  phase 2: thinking ON, TEXT-ONLY calls for sovereign primitives + traces.
Fail-fast: any Ling unavailability or one gate rejection returns the row for
the Qwen4 lane; never blocks it. Run with the ocr-venv python.
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
BATCH = 8
MAX_SIDE = 1200
JPEG_Q = 55
MAX_BATCHES_PER_RUN = 6


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


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def render_pages(path, outdir):
    import pymupdf
    doc = pymupdf.open(path)
    os.makedirs(outdir, exist_ok=True)
    paths = []
    for i, page in enumerate(doc):
        long_side = max(page.rect.width, page.rect.height)
        dpi = min(140, int(72 * MAX_SIDE / long_side)) if long_side else 100
        pix = page.get_pixmap(dpi=max(72, dpi))
        p = os.path.join(outdir, f"page_{i+1:04d}.jpg")
        pix.save(p, jpg_quality=JPEG_Q)
        paths.append((i + 1, p))
    return paths


def rescue(row):
    book_id = row["book_id"]
    pages = render_pages(row["file_path"], os.path.join(SCRATCH, book_id))
    if not pages:
        set_status(book_id, "INSUFFICIENT_SOURCE_ACCESS", "zero renderable pages")
        return "refused-empty"
    # phase 1: fast transcription, thinking OFF
    transcribed = []
    for start in range(0, min(len(pages), BATCH * MAX_BATCHES_PER_RUN), BATCH):
        batch = pages[start:start + BATCH]
        prompt = (
            f"Transcribe these scanned book pages (pages {batch[0][0]}-{batch[-1][0]}) EXACTLY as printed. "
            "Output plain text with a [PAGE n] marker before each page's text. Preserve equations in LaTeX "
            "where printed. Skip blank pages. No commentary, no invention."
        )
        msg = ling.image_message(prompt, [p for _, p in batch])
        raw = ling.chat([msg], thinking=False, max_tokens=16000)
        transcribed.append(raw)
    full = "\n".join(transcribed)
    nfull = norm(full)
    if len(nfull) < 2000:
        set_status(book_id, "PENDING", f"OCR transcription too thin ({len(nfull)} chars); Qwen4 lane decides")
        return "rerouted-thin"
    # phase 2: primitives, thinking ON, text only
    prompt = (
        "You are a sovereign-primitive extractor for the GSE/GSI Foundry. The following text is an OCR "
        "transcription of a scanned book (page markers [PAGE n]). Extract 4-6 sovereign primitives: "
        "verbatim quotes (>=8 words, EXACT substrings of the transcription), page numbers, exact LaTeX "
        "when equations appear (null otherwise), symbol_and_unit_ledger for every latex, assumptions, "
        "breakdown_regime, and at least one layer2 object {tag:'[ISOMORPHISM]' or '[DERIVED KERNEL]', "
        "mapping, source_operator: primitive id, telemetry}. NO sportsbook odds, NO toy equations, NO "
        "fabricated football origins for pure math. Also universal_lens, gsi_mapping, gse_mapping "
        "(>=30 words each). ONLY JSON: {primitives:[{primitive_id:'p1',name,verbatim_quote,page,latex,"
        "symbol_and_unit_ledger,assumptions,breakdown_regime,layer2}], universal_lens, gsi_mapping, "
        "gse_mapping}.\n\nTRANSCRIPTION:\n" + full[:60000]
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
        set_status(book_id, "PENDING", f"only {len(prims)} verbatim-verified OCR primitives; Qwen4 decides")
        return "rerouted-quotes"
    doc["primitives"] = prims[:6]
    tprompt = (
        "Write TWO reasoning traces for these OCR-rescued primitives as JSON: {reasoning_traces:[{trace_id,"
        "think, retrocausal_genealogy, theory_of_mind, cross_layer_veto}, ...]}. think >=450 words each "
        "(combined >=900); each section >=70 words. Ground in the primitives; no odds/toy math/fabricated "
        "citations. ONLY JSON.\n" + json.dumps(doc["primitives"], ensure_ascii=False)[:20000]
    )
    raw2 = ling.chat([{"role": "user", "content": tprompt}], thinking=True, max_tokens=12000)
    m2 = re.search(r"\{.*\}", raw2, re.S)
    doc["reasoning_traces"] = json.loads(m2.group(0)).get("reasoning_traces", [])
    doc.update({
        "book_id": book_id, "source_status": "COMPLETE",
        "pages_total": len(pages),
        "pages_read": f"OCR vision: {min(len(pages), BATCH*MAX_BATCHES_PER_RUN)} pages in batches of {BATCH}, max side {MAX_SIDE}px q{JPEG_Q}; quotes verified against OCR transcription",
        "worker_id": WORKER, "extractor_model": ling.MODEL,
        "ocr_note": "Image-only scan rescued via ling vision transcription; verbatim quotes are exact substrings of the transcription, page-cited.",
    })
    errs = gatekeeper.validate(doc)
    if errs:
        set_status(book_id, "PENDING", "OCR pre-validation failed: " + "; ".join(errs)[:200])
        return "rerouted-prevalidation"
    apath = os.path.join(HERE, "artifacts", "primitives", f"{book_id}.json")
    with open(apath, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    out = gk("commit", apath)
    if "GATEKEEPER_APPROVED" in out:
        log(f"OCR COMPLETE {book_id} {row['file_name']} prims={len(doc['primitives'])}")
        return "complete"
    set_status(book_id, "PENDING", "OCR gate rejected once: " + out[:200])
    return "rerouted-gate"


def main():
    if not ling.circuit_ok():
        log("circuit cooldown active; not starting (Qwen4 lane unaffected)")
        return
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
