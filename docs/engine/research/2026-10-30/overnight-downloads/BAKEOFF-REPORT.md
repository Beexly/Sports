# OXR vs MarkItDown — 10-PDF Bake-Off Report

**Register item:** S58 — SoMarkAI/OXR (OXR-1.0), verdict was TEST.
**Run:** 2026-10-30, overnight, in `~/workspace/tests/oxr/` (sandbox venv; source PDFs read-only).
**Outcome in one line:** OXR produced **zero output on all 10 documents** — every documented route is blocked from this machine tonight (details §3). The MarkItDown baseline half is complete and scored on all 10 (total **174/200**), so the comparison finishes the moment an OXR route opens. On the baseline evidence, MarkItDown is stronger than its reputation for Garrett's actual corpus — with two real weaknesses (justified-text word merging in academic PDFs, fractured multi-line table cells) that are exactly the classes OXR claims to beat. **OXR does not earn a lane place tonight — not on quality (untested) but on reachability: a parser the fleet cannot run has no lane. Status: TEST INCOMPLETE, retest path specified in §6.**

---

## 1. The 10 documents (all Garrett's real working PDFs)

| # | ID | Document | Pages | Why chosen |
|---|----|----------|-------|------------|
| 1 | dfs-week2-dossier | `goals/draftkings-week-2-dfs-lineup/files/Week-2-DFS-Complete-Dossier.pdf` | 50 | Flagship work product; dense player/stat tables — the table stress test |
| 2 | dfs-week5-packet | `goals/week-5-dfs-packet-build/files/…/Week 5 DFS Packet 2026.pdf` | 19 | Second independent table-heavy packet class |
| 3 | lineup-card | `user/files/GSE-Week2-Lineup-Card.pdf` | 4 | Designed lineup card Garrett uploaded himself; compact fixed-width tables |
| 4 | audit-report | `vendor/Sports/docs/mobile/pdf/01-review-and-audit.pdf` | 11 | Standard prose audit report — the everyday ingestion class |
| 5 | plan-doc | `vendor/Sports/docs/mobile/pdf/02-plan.pdf` | 13 | Structured plan; headings/lists/reading order |
| 6 | research-1 | `vendor/Sports/docs/mobile/pdf/06-research-1.pdf` | 5 | Research write-up |
| 7 | research-2 | `vendor/Sports/docs/mobile/pdf/07-research-2.pdf` | 4 | Research write-up, second sample |
| 8 | brand-pack | `vendor/Sports/brand-kit/Galaxy_Sports_Edge_Brand_Use_Pack.pdf` | 5 | Graphics/design-heavy (796K for 5 pp) — layout over text |
| 9 | social-playbook | `your_files/gse-social-media-playbook/gse-social-media-playbook.pdf` | 12 | Designed playbook delivered to Garrett (2.8M, image-rich) |
| 10 | arxiv-paper | `w3-07-scratch/pdfs/paper-1910.03779.pdf` ("Forecast Aggregation via Peer Prediction," Wang/Liu/Chen) | 27 | Two-column academic PDF with formulas + tables — OXR's claimed home turf, from his arXiv-program stash |

**Deliberate exclusion:** personal medical/billing PDFs in `user/files/` (e.g. the Vytalus billing PDF) were **not** sent to OXR's third-party free API. The bake-off's table questions are fully answered by his work-product documents; his medical billing does not need to leave the machine to grade a parser. (The local-weights route, if it ever runs, has no such constraint.)

## 2. Setup record

- Sandbox: `~/workspace/tests/oxr/`, Python 3.12.3 venv. Packages: markitdown 0.1.9, somark 0.1.0 (official SDK/CLI), pdfplumber 0.11.10 / pdfminer.six (ground truth), httpx 0.28.1.
- Machine: no GPU (`nvidia-smi` absent), 2 cores, 7 GB RAM, egress via the VM's HTTP proxy.
- MarkItDown run: Python API, default PDF converter, all 10 converted, 0 errors, 0.4–30 s per document. Outputs in `markitdown_out/`, run log `logs/markitdown_run.json`.
- Ground truth: pdfplumber native-text extraction per document (`logs/ground_truth.json`) — page counts, full native word counts, detected tables with sampled cell text. Metrics in `logs/metrics.json`; scorer scripts in `scripts/`.
- Scoring scale: 0–5 per dimension per document. Dimensions: **Completeness** (share of the document's real text present, incl. tail pages), **Table fidelity** (cell content present *and* row/column structure survives), **Reading order** (sequence matches the page's intended flow), **Hallucination/drops** (invented content penalized; extractor drops counted here when not captured under Completeness). Objective checks behind the scores: word-count ratio vs full native text; sampled table-cell recall; token-level novelty (share of output tokens absent from the document's full native text = invention detector); plus manual reads of heads, tails, and table regions.

## 3. OXR — what was tried, and the exact blockers

OXR's README documents three routes. All three were attempted or verified:

**(a) Free API — `https://free-oxr.somark.ai/api/v1` (no key, `api-key: dummy`) — UNREACHABLE IN PRACTICE.**
The host answers GETs (base URL returned HTTP 302 through the proxy), but **every POST hangs**:
1. Official CLI, sync parse of the 4-page lineup card: hung ~10 min → "Server disconnected without sending a response."
2. Official CLI, `--async` submit: "timed out" after ~6 min, no task ID returned.
3. Direct driver (SDK-verified shapes: `POST /parse/async` multipart + `output_formats`, poll `POST /parse/async_check` with `task_id`): submit read-timed-out at 240 s.
4. Minimal control test — `POST /usage` with a one-field body (no file), on **both** the `.ai` and the README's `.cn` mirror: no response within 70 s each.
5. Long-window retry (async submit, 1,500 s read timeout): the server **disconnected without sending a response after 602 s** — the same ~10-minute drop as attempt 1. The free API never returned a task ID, a result, or an error body across any attempt.

A CLI-side bug was found and fixed en route: the somark CLI crashes on this VM (`httpx InvalidURL: Invalid port ':1]'`) because httpx cannot parse the VM's bracketed-IPv6 `NO_PROXY` entries; setting `NO_PROXY=localhost,127.0.0.1` for the invocation clears it. That fix is necessary but not sufficient — with it applied, the POSTs still hang server-side/proxy-side. Whether the stall is the free service's queue (README: "requests are queued… we do not guarantee service stability") or this VM's proxied POST path cannot be distinguished from here; both are outside the sandbox's control. Either way: **from Garrett's machines tonight, the API route returns nothing.**

**(b) Local weights — GPU-GATED, cannot run here.** README requirements, verbatim class: NVIDIA GPU with BF16 support, CUDA 13.0 driver, **24 GB VRAM minimum** (48 GB recommended), served via a custom vLLM plugin + a separate layout-analysis service. This VM has no NVIDIA GPU at all; neither does Garrett's Windows host (standing fact). His only GPU lane is Kaggle — a hosted-notebook run is a separate operation, not a sandbox task, and is the specified retest path (§6).

**(c) HF Inference — not offered.** The HF model page (`SoMarkAI/OXR-1.0`) carries the same README and no inference-provider serving; the model needs its custom vLLM plugin, which hosted inference does not supply.

**License (the standing flag):** the HF page still shows **no license** in its model-card metadata — NOASSERTION stands. Nothing about tonight changes that; commercial pipeline use remains uncleared until SoMark states terms.

## 4. MarkItDown baseline — per-document scores (OXR column empty by §3)

| # | Document | Complete | Tables | Order | Halluc./drops | Total /20 |
|---|----------|:-:|:-:|:-:|:-:|:-:|
| 1 | dfs-week2-dossier | 5 | 3 | 4 | 5 | **17** |
| 2 | dfs-week5-packet | 5 | 3 | 4 | 5 | **17** |
| 3 | lineup-card | 5 | 5 | 5 | 5 | **20** |
| 4 | audit-report | 5 | 3 | 4 | 5 | **17** |
| 5 | plan-doc | 5 | 4 | 4 | 5 | **18** |
| 6 | research-1 | 5 | 4 | 4 | 5 | **18** |
| 7 | research-2 | 5 | 4 | 4 | 5 | **18** |
| 8 | brand-pack | 5 | 4 | 4 | 5 | **18** |
| 9 | social-playbook | 5 | 2 | 3 | 5 | **15** |
| 10 | arxiv-paper | 4 | 3 | 3 | 5 | **15** |
| | **MarkItDown total** | | | | | **174 / 200** |
| | **OXR total** | — | — | — | — | **0 outputs produced (blocked, §3)** |

### Evidence behind the scores (concrete, per document class)

**Hallucination — a clean sweep, and it matters.** Token-level invention check: on **9 of 10 documents, exactly 0 output tokens are absent from the document's own native text** — MarkItDown invents nothing, anywhere. The one exception (social-playbook, 4.0%) is single letters (`g l p o r e`) from pdfminer splitting letter-spaced display type — a tokenization artifact, not invented content. As an extractor (not a generative model) MarkItDown *cannot* hallucinate text; its failure classes are drops and structure, below. Any OXR advantage would have to come from structure, never from "less hallucination."

**Completeness — near-total on born-digital PDFs.** Word-count ratio vs full pdfplumber native text: 0.97–1.06 across all 10 (dossier 27,643 vs 28,400 words; arxiv 13,523 vs 12,792 — over 1.0 because the two extractors segment differently, not because content was added). Full 50-page and 27-page documents converted end-to-end with tail content present.

**Tables — content survives, structure is hit-or-miss.**
- Best case (lineup-card, 20/20): the fixed-width card tables convert to clean, correctly-aligned markdown tables — every salary/ownership cell in place (e.g. `| QB Jayden Daniels | WAS DAL | $6,300 | 9.2% |`).
- Sampled cell recall: brand-pack 32/32, social-playbook 28/28, arxiv 59/59, plan-doc 53/60, dfs-week2 81/88 — the *values* are almost always present.
- The failure is structural: in the Week-2 dossier, multi-line cells fracture — rows 1–2 of the slate table collapse into running text (`1 MIN @ CHI (Sun 1:00 CHI -4.5 48.5–49.5 Weather game (rain, 13 mph…`) with stray `ET)` fragments orphaned outside the table, while rows 3–4 keep their pipes. A downstream parser reading that markdown gets two clean rows and two prose lines for one table. dfs-week5 (75% cell recall) drops more cell content outright.
- Inverse failure (arxiv): prose lines get falsely wrapped as tables — `| part in Section | 6.1. |` — empty-cell markdown tables invented around ordinary text (structure hallucination, zero content invention).

**Reading order — good on single-column, frayed on academic layout.**
- All single-column documents (1–9 except the playbook) read in correct sequence; headings, lists, and card sections land in order.
- arxiv-paper: the two columns flow correctly (abstract → introduction → page-2 continuation), which pdfminer-class tools often get wrong. Two defects: (1) **word-boundary merging** on tightly justified lines — `performancedata. Weproposeusingpeerpredictionmethods,afamilyofmechanisms…` — whole phrases fused, which corrupts search and any downstream token statistics on exactly the research corpus Garrett mines; (2) the rotated arXiv page stamp is dumped mid-document as reversed garbage tokens (`8v97730.0191:viXra`, `]EM.tats[`). Diacritics survive acceptably (`Satop¨a¨a`).
- social-playbook: designed blocks flatten (0 markdown tables produced) and letter-spaced display type splits into single letters — the design-heavy class is MarkItDown's weakest after the academic class.
- Formulas (arxiv): no LaTeX is produced; math degrades to plain glyphs in reading order. For a research-ingestion lane that feeds an arXiv program, formula content is effectively lost in both text and structure. This is OXR's single clearest claimed edge (Formula → LaTeX output) — and it remains untested.

## 5. Verdict

- **OXR: does not earn a place in the ingestion lane tonight.** Not a quality verdict — zero documents parsed, so there is no quality evidence either way. It is an availability verdict: the free API returns nothing from this network across five attempts and two domains, the local route needs a 24 GB NVIDIA GPU the fleet does not own, HF does not serve it, and its license is still NOASSERTION. A lane component must be runnable and licensable; OXR is currently neither, for Garrett.
- **MarkItDown stays the lane** — and the baseline is now measured, not assumed: 174/200 on his real corpus, zero invented content, near-total completeness, free, local, 0.4–30 s a document. Its known defects are now named with examples (fused words in justified academic text; fractured multi-line table cells; flattened design blocks; no formula capture), which means any challenger — OXR included — has a specific bar to clear, on specific documents (§6), instead of a vibe to beat.
- The benchmark crowns in OXR's README (#1 olmOCR-Bench / OmniDocBench / DocParsingBench) remain **creator-stated and UNVERIFIED** — tonight's run adds no independent evidence for or against them.

## 6. What closes the test (retest spec, ready to run)

1. **Kaggle GPU session** (his only GPU lane): clone `github.com/SoMarkAI/OXR`, `hf download SoMarkAI/OXR-1.0`, start the all-in-one Docker or the three services per README §1.2, then run `scripts/run_oxr.py` with the base URL pointed at the local service — the driver, the 10 documents, ground truth, metrics, and this score sheet are all in place; only `oxr_out/` is empty.
2. **Or the free API from a different network** (e.g. the Windows host's residential connection): same driver, unchanged. If the API answers there, the stall is this VM's proxy path; if it hangs there too, the stall is the service.
3. Score OXR output with `scripts/metrics.py` + the §2 rubric and fill the empty column in §4. The documents where OXR must win to matter: **arxiv-paper** (formulas → LaTeX, no word fusion, no fake tables) and **dfs-week2-dossier** (multi-line table cells intact). Winning on the lineup-card class (already 20/20) proves nothing.
4. License: no production wiring until SoMark publishes terms for OXR-1.0 — regardless of bake-off outcome.

## 7. Files

- Outputs: `markitdown_out/*.md` (10), `oxr_out/` (empty — blocked), `logs/` (ground truth, run logs, metrics, task ledger), `scripts/` (ground_truth.py, run_markitdown.py, run_oxr.py, metrics.py), `docs/selection.json`.
- §3 attempt 5 final result (recorded 2026-10-30 ~09:12 UTC): `RemoteProtocolError: Server disconnected without sending a response` after 602 s. All five API attempts are now closed: **zero OXR outputs exist because zero OXR responses were ever received.**
