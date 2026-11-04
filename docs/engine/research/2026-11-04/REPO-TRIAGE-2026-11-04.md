# Repo Triage — 2026-11-04

Source: user-supplied list of ~40 GitHub URLs. Triaged against the GSE corpus
pipeline's actual needs (arXiv ingestion, OpenAlex metadata, PDF→text, ranking,
gate enforcement). "Relevant" means *this pipeline would use it*, not "it is a
good project".

---

## Tier 1 — Use now (unblocks known defects)

| Repo | Why it matters here |
|---|---|
| `blazickjp/arxiv-mcp-server` | The arXiv server itself. v0.8.2, 19 tools. **Already running**; Hermes's MCP client cannot register it (transport write blocks), so `scripts/research/arxiv_bridge.py` talks to the same `uvx` process directly. Verified end-to-end. |
| `J535D165/pyalex` | OpenAlex Python client. Direct fit for the OpenAlex API key — supplies metadata + citation counts for records arXiv cannot cover. |
| `microsoft/markitdown` | Document → markdown. Cheapest path to full text for non-PDF sources (docx/html/pptx) in the manifest. |
| `opendatalab/MinerU` | PDF → structured text. The heavy lifter for the 1,083 records that have a PDF but no extracted text. |
| `Stirling-Tools/Stirling-PDF` | PDF surgery (split/merge/OCR). Useful when MinerU chokes on a scanned or malformed PDF. |

## Tier 2 — Use selectively

| Repo | Note |
|---|---|
| `TideDra/zotero-arxiv-daily` | Daily arXiv digest → Zotero. Pattern worth copying for the `watch_topic` / `check_alerts` loop; the Zotero coupling is not needed. |
| `arielshakaramiro/ai-paper-digest` | Paper summarization. Redundant with the local LLM path; borrow the prompt structure only. |
| `metavert-io/paper-scout` | Paper discovery. Overlaps `search_papers` + `watch_topic` in the bridge. |
| `LearningCircuit/local-deep-research` | Local research loop. Overlaps the existing specialist design; check its citation handling before adopting. |
| `AfonsoAzevedo/arxiv-research-explorer-aws` | arXiv explorer on AWS. Only relevant if the hybrid-cloud placement moves ingestion off-workstation. |
| `jimmc414/onefilellm` | Concatenates sources for an LLM context. Handy for feeding a full paper into a prompt without a RAG round trip. |
| `Graphify-Labs/graphify` | Graph construction. Candidate for the citation graph if `citation_graph` (Semantic Scholar) proves too thin. |
| `federicodeponte/opendraft` | Drafting assistant. Grant-writing adjacent — evaluate against the academic-integrity rule before use. |
| `PraveenKumarVk/arxiv-ai` | Unclear scope from the name; needs a README read before it earns a slot. |
| `Companion-Inc/feynman` | Unclear scope; needs a README read. |

## Tier 3 — ML / reference (adjacent, not pipeline)

| Repo | Note |
|---|---|
| `lightgbm-org/LightGBM` | Gradient boosting. Directly relevant to win-prob / coverage models, not to retrieval. |
| `catboost/catboost` | Same. Categorical handling is the differentiator. |
| `d2l-ai/d2l-en` | Dive into Deep Learning. Reference text. |
| `donnemartin/data-science-ipython-notebooks` | Notebook reference. |
| `gjyoungjr/sagemaker_kaggle_data_ingestion` | Kaggle → SageMaker. Relevant only if ingestion moves to SageMaker; the Kaggle API path is already local. |

## Tier 4 — Do not install / handle with care

These are listed so they are *deliberately* excluded, not forgotten.

| Repo | Risk |
|---|---|
| `screetsec/TheFatRat` | Malware/exploit creation tool. Do not install, do not run. |
| `swisskyrepo/PayloadsAllTheThings` | Offensive payload catalogue. Reference reading only; never execute. |
| `projectdiscovery/katana` | Web crawler with offensive-adjacent defaults. Legitimate tool, wrong project. |
| `v2ray/v2ray-core`, `XX-net/XX-Net`, `Flowseal/tg-ws-proxy` | Proxy / circumvention stacks. Policy risk; not needed for arXiv or OpenAlex, both of which are plain HTTPS. |
| `CloakHQ/CloakBrowser`, `FlareSolverr/FlareSolverr`, `jo-inc/camofox-browser`, `seleniumbase/SeleniumBase` | Anti-bot bypass. arXiv and OpenAlex both publish APIs and rate limits — bypassing them is a terms violation and unnecessary. |
| `AhmadHassan-BTed/Turnitout-Humanizer` | AI-text humanizer. Direct academic-integrity risk given active grant/paper writing. Excluded on policy. |

## Tier 5 — Noise

`justjavac/free-programming-books-zh_CN` (Chinese programming book list),
`DrewThomasson/ebook2audiobook` (ebook→audio), `virgiliojr94/book-to-skill`
(listed three times in the source list), `danderfer/Comp_Sci_Sem_2` (course
repo), `morluto/rea` (unidentified), `honojs/hono` (web framework).

---

## What this changes in the plan

1. **arXiv ingestion is solved today.** The bridge works; no need to wait on the
   Hermes MCP transport bug. Backfill subagent is running against it.
2. **OpenAlex coverage is the real gap, not arXiv.** 1,083 records lack full text
   partly because many are OpenAlex-only. `pyalex` gives metadata + abstracts;
   `MinerU`/`markitdown` give text where a PDF or HTML exists. Plan for arXiv
   ids and OpenAlex ids as separate backfill tracks.
3. **Do not adopt the anti-bot tier.** Both target APIs are rate-limited but
   open; polite delay beats a bypass and keeps the corpus reproducible.
4. **`Turnitout-Humanizer` is excluded on policy**, not on capability — it would
   undermine the epistemic-honesty posture the gate exists to enforce.
