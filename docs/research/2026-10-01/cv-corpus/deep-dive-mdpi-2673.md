# Deep Dive — MDPI Encyclopedia 2026, 6, 213: "Sports Data: Sources, Infrastructure, and Governance in AI Era" (Jerred Junqi Wang)

## What was actually read + how obtained — FULL TEXT BLOCKED; identified via public metadata

- **The full text was NOT read.** `browser.open` on `https://www.mdpi.com/2673-8392/6/10/213` returned **HTTP 403 (access denied)** on 2026-10-01. A runtime instruction for this session explicitly forbids retrying a denied fetch — including with changed arguments, through another tool, or via another endpoint — so no curl/UA/API retries were attempted. The 403 reads as bot-mitigation rather than a paywall (the article is open access), but the denial stands: **full text BLOCKED for this pass**.
- **What I DID read (legitimate, independent):** the public Crossref metadata record for DOI `10.3390/encyclopedia6100213` (queried via the api.crossref.org public API — bibliographic metadata, not the denied article content), which includes the **full abstract**. No article text was retrieved from any source.
- **Identification (HIGH confidence, from Crossref):**
  - Title: "Sports Data: Sources, Infrastructure, and Governance in AI Era"
  - Author: Jerred Junqi Wang (ORCID 0000-0001-5517-5594), Department of Health, Exercise & Sports Sciences, University of New Mexico, Albuquerque, NM
  - Journal: *Encyclopedia* (ISSN 2673-8392), 2026, volume 6, article 213; published online **2026-10-01** (today — this explains why web search has no indexed copy yet)
  - License: CC BY 4.0; 35 references; 0 citations (brand new)
- **Important correction to the task framing:** this is **NOT a computer-vision methods paper**. It is an encyclopedia survey entry on sports data broadly. Computer vision appears in it only as **one of six listed data sources**. It should not be cited as CV-lane research.

## METHOD (from the Crossref abstract — paraphrased)

A survey/encyclopedia entry, not an experiment — there is no algorithm, dataset, or result to extract. Its structure, per the abstract:

1. **What sports data is:** information generated through athletic competition, training, athlete monitoring, and the commercial activities of sport — framed as the foundation of the modern sports industry and of evidence-based decision-making.
2. **The AI-era thesis:** AI both *depends* on sports data (model development) and *produces* new data (via computer vision and simulation).
3. **Six major sources of sports data:** (a) human event coding, (b) in-venue tracking systems, (c) wearable sensors, (d) computer vision, (e) fan behavior data, (f) synthetic data.
4. **Infrastructure:** collection, storage, integration, and management of these sources.
5. **Governance:** ownership, privacy, integrity, and access — flagged as front-of-mind issues as data volume, detail, and value grow.

## DATASETS

- None — survey entry, no data collected. 35 references (not individually retrieved).

## GSE APPLICATION

Honest assessment: **none of the three CV gaps (a/b/c) is addressed by this paper.** Its value to GSE is elsewhere:

1. **Total-signal program citation (PRIMARY):** the six-source taxonomy (human coding / in-venue tracking / wearables / computer vision / fan behavior / synthetic) is a clean, citable inventory for `docs/ops/total-signal-wiring-program.md` — the "wire everything" program needs exactly this kind of source map, and a 2026 encyclopedia entry is a respectable citation for the framing. Note the inclusion of **synthetic data** as a first-class source: it legitimizes GSE's synthetic-field-image test fixtures (used in the test assertions across this corpus) as an industry-recognized practice rather than a shortcut.
2. **Governance framing (SECONDARY):** ownership / privacy / integrity / access maps directly onto GSE's existing `source-rights-registry-adapter.ts` (packages/prediction-engine/src/metrics/core/) and the standing NGS internal-only doctrine (reasoning fuel only, nothing commercial touches restricted data). If the full text is later obtained, mine its governance section for the rights-registry's data-source onboarding checklist.
3. **CV-lane relevance (TERTIARY, weak):** the "AI produces data via computer vision" framing is a one-line justification for the CV lane's existence inside the total-signal program — nothing implementable.

## IMPLEMENTATION SPEC

No CV code is specified from this source (there is none to specify). The actionable items are documentation-level:

1. Add the six-source taxonomy to the total-signal wiring program doc as the source inventory, with this entry cited (full citation: Wang, J.J. "Sports Data: Sources, Infrastructure, and Governance in AI Era." *Encyclopedia* 2026, 6, 213. https://doi.org/10.3390/encyclopedia6100213. CC BY 4.0).
2. When the full text becomes obtainable (it is open access; a future session with working MDPI access can read it), extract the governance checklist and file it under the source-rights registry docs.
3. TEST ASSERTIONS: n/a — survey, no empirical claims to verify.

## IMPROVEMENT PATH

- Beyond the paper: GSE's total-signal program is already more specific than this survey (it names actual feeds and wiring order). The paper's marginal value is the citation and the governance vocabulary, not new mechanics.

## Confidence + evidence

- **HIGH** — on identification (Crossref DOI metadata: title, author, affiliation, journal, date, license, reference count) and on the blocked status (403 observed; no retries per runtime instruction).
- **HIGH** — on the abstract-level claims (Crossref abstract read in full, paraphrased above).
- **HIGH** — that the full text was not read and that this is a survey entry, not CV methods research. Do not cite it as CV evidence.
