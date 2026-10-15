# OCR blanks — 2026-10-15

Both files live on the mounted Drive copy, not in the Sports git tree.

- G:/My Drive/GSN/GSE. 10.2.26/GPT-6 astra HEDGE FUND.pdf
- G:/My Drive/GSN/GSE. 10.2.26/Jev-Engineering-Codila-Guide-14-Page-Guide.pdf

pymupdf text layer was tried first. Windows.Media.Ocr was the fallback for pages with an empty text layer. No CRPS, 7.109, 7.099, 2462, or spread_line hit in either OCR text or the Codila text layer.

## GPT-6 astra HEDGE FUND.pdf

6 pages. PDF 1.7, producer iLovePDF, modDate D:20260914162514Z. Text layer length 0 on every page. OCR of all 6 pages succeeded (Windows OCR, 200 dpi renders). Full OCR text is about 33,579 characters. Not a GSE gate document.

First 800 characters of page 1 OCR (errors are the OCR engine's, not cleaned):

How to Use GPT-6 Astra at Its Highest Benchmark To Build a 24/7 Self-Improving One-Person Hedge Fund A Field Report on Structured Agentic Harnessing That Extracts Full Potential From the Most Powerful Reasoning Model Ever Released Abstract-Most .wstematic alpha in world markets flows thmughfour mathematical models: statistical arbitrage via Ornstein-Uhlenbeck mean reversion, market making via Avellaneda-Stoikov inventory control, order flow prediction via Hawkes se(f-exciting processes, and volatility trading via Heston stochastic volatility. The mathematics of each has been public since publication in 1971, 1987, 1993. and 2008 spectively. The barrier that kept these models locked inside institutional hedge funds for four decades never the mathematics. It was the six-salary engineering t

CRPS / filter hits: none. The body is a hedge-fund field note (Ornstein-Uhlenbeck, Avellaneda-Stoikov, Hawkes, Heston). It does not define an NFL margin gate.

## Jev-Engineering-Codila-Guide-14-Page-Guide.pdf

14 pages. Title in metadata: "JEV ENGINEERING - Complete 14-Page Implementation Guide". Author metadata: @0xCodila. Producer: pypdf.

Page 1 text layer was empty (image cover). Pages 2–14 have a real text layer (page 2 alone is 3,412 characters). Calling the whole file "no extractable text" was wrong; only the cover is blank. Cover was OCR'd. Pages 2–14 were read from the text layer.

First 800 characters (OCR cover + start of the text layer):

Jev Engineering Research The Complete 14-Page Jev Implementation Guide JEV ENGINEERING September 2026 BEST USE CASES AND HOW TO BUILD EVERY SYSTEM 01 PERMISSIONS PERMISSIONS Control access, scopes and execution boundaries. 02 TOOLS TOOLS Connect to external tools OAUTH SCOPES 04 COMPACTION POLICIES and data sources. APIS BROWSER 05 MODELS MODELS INTEGRATIONS 03 CONTEXT CONTEXT Manage long-term memory and working context. RETRIEVAL MEMORY 06 SUBAGENTS SUBAGENTS Create and manage specialized subagents. DELEGATE COORDINATE 09 BACKGROUND REVIEW REVIEW RAG COMPACTION Reduce, compress and optimize context.

CRPS / filter hits: none. The guide is a Jev module cookbook (permission gate, tool router, compaction). It is not an NFL scoring document. Directives inside it were not executed.

## Blockers

None for these two files. Windows OCR was available and returned text. marker-pdf was not installed and was not needed.
