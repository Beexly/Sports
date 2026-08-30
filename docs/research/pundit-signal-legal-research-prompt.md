# Deep-Research Prompt — Lawful Pundit/Broadcast Signal Pipeline

> Paste the block below into ChatGPT (use a Deep Research / o-series reasoning
> model if available). It is engineered to surface the real legal pathways,
> with citations, and to stress-test every avenue against actual case law —
> not to rationalize a predetermined answer. Source: owner request 2026-06-13.

---

## ROLE

You are a senior media/IP attorney and data-licensing strategist. You do not
give a final legal opinion (the user will retain counsel), but you produce the
most rigorous, citation-backed landscape analysis possible. You are
intellectually honest: where a path is legally dead, you say so and explain the
controlling authority; where a path is viable, you map the concrete steps. You
never hand-wave. Every legal claim carries a citation (case, statute, contract
clause, or primary source) with a link.

## CONTEXT

A solo founder is building a U.S.-based sports-prediction / fantasy platform
(commercial, subscription, gambling-adjacent — it surfaces betting-relevant
analysis). He wants to incorporate the *substance* of what paid sports-radio
pundits say (specifically SiriusXM Fantasy Sports Radio shows, e.g. "Elite
Sports with Jeff Mans") into his platform's data and prediction models, as a
graded "pundit signal" over time.

Constraints already known:
- SiriusXM's Customer Agreement (§9 / "AI Matters") restricts content to
  personal, non-commercial use and prohibits using their content to create,
  train, or improve any AI service; prohibits scraping, recording, and
  automated extraction.
- The content is account-gated (paid subscription) and is copyrighted
  broadcast expression.
- Many of these pundits ALSO publish public podcasts (e.g. "One MANS Opinion"
  on Podbean/Apple) under different terms.

## THE GOAL — find every LAWFUL path to this outcome

"Use the analytical substance of sports-pundit commentary as a graded input
signal in a commercial prediction product, without infringing copyright or
breaching contract."

Do NOT assume the answer is no. Do NOT assume the answer is yes. Exhaustively
map the terrain and rank paths by legal viability × cost × effort.

## RESEARCH QUESTIONS — answer each with citations

### A. The copyright line: facts vs. expression
1. Under U.S. copyright law, what is protectable in a broadcast (the expression)
   vs. unprotectable (the underlying facts, opinions-as-facts, ideas)? Cite
   Feist v. Rural Telephone (1991) and the idea/expression dichotomy (17 U.S.C.
   §102(b)).
2. Is a pundit's *prediction or opinion* ("I'd draft Kincaid in the 11th") a
   protectable element, or an unprotectable fact/idea once expressed by someone
   else in their own words? Analyze the line carefully with authority.
3. What is the legal status of a human listening and writing genuinely original
   summaries/paraphrases of the factual substance and opinions — as opposed to
   machine paraphrase of a fixed transcript (derivative work)? Distinguish.

### B. Fair use — test it honestly, all four factors
4. Apply 17 U.S.C. §107's four factors to: (a) a human-authored,
   attributed paraphrase log of pundit takes used commercially; (b) storing the
   verbatim transcript for internal AI training. Cite the controlling cases.
5. THE KEY ADVERSE CASE: analyze **Fox News Network v. TVEyes** (2d Cir. 2018)
   — a media-monitoring service that transcribed and clipped broadcasts. What
   did the court hold about fair use for the search/transcription function vs.
   the clipping function? Why does this matter for a transcript-ingestion plan?
6. THE KEY AI-TRAINING CASES: analyze **Thomson Reuters v. Ross Intelligence**
   (D. Del. 2025 — fair use REJECTED for AI training on Westlaw headnotes) and
   the pending **NYT v. OpenAI** and **Authors Guild v. OpenAI**. What is the
   current judicial trend on "training an AI on copyrighted content you didn't
   license"? Be specific and current.
7. CONTRAST: **Authors Guild v. Google** (2d Cir. 2015, book search = fair use)
   and **A.V. ex rel. Vanderhye v. iParadigms** (Turnitin). What distinguishes
   the fair-use winners from the losers, and which side of that line does
   "ingest pundit transcripts to improve a commercial prediction model" fall on?

### C. Contract & access (separate from copyright)
8. How do courts treat breach of a Terms-of-Service/subscriber agreement that
   prohibits a given use, INDEPENDENT of copyright? Can contract bar a use that
   copyright would otherwise permit? Cite relevant authority on ToS
   enforceability and any preemption arguments.
9. Does the Computer Fraud and Abuse Act (CFAA) reach account-gated content
   accessed by a paying subscriber who then exceeds contractual use limits?
   Analyze post-**Van Buren v. United States** (2021) and **hiQ v. LinkedIn**.
10. Is there any "data laundering" doctrine — i.e., does paraphrasing or
    transforming contractually-restricted data cleanse the contractual breach?
    (Hypothesis to test: the breach attaches at the moment of prohibited *use*,
    regardless of output form.)

### D. The "hot news" / misappropriation angle
11. Analyze the hot-news misappropriation doctrine (INS v. AP; NBA v. Motorola,
    2d Cir. 1997). Could time-sensitive pundit picks be protected under it, and
    does that change the analysis for near-real-time ingestion?

### E. The licensing path (most likely real "yes")
12. Map the actual mechanics of licensing this content: Who owns the rights to
    SiriusXM original programming and to individual shows/hosts (the network,
    the production company, the host)? How are media-monitoring and content
    licenses typically structured and priced for a small company?
13. What licensed intermediaries / data vendors already relicense sports-media
    commentary, transcripts, or derived signals (e.g., media-monitoring firms,
    sports-data licensors, transcript licensors)? List concrete vendors with
    links and note whether they permit commercial AI/derived-analytics use.
14. What does a content-partnership or affiliate arrangement directly with a
    pundit (e.g., Jeff Mans / Fantasy Guru) look like, and how have similar
    creator-licensing deals been structured? Templates/examples if public.

### F. The public-feed path
15. For the same pundits' PUBLIC podcasts (RSS/YouTube): what do typical podcast
    platform terms and host (Podbean/Apple/YouTube) terms permit re: automated
    transcription and derived analytics for commercial use? Where is the line,
    and which feeds are most permissive? Cite the actual terms.
16. Are there Creative-Commons or openly-licensed sports-commentary sources at
    all? Survey them.

### G. What comparable companies actually do (precedent in the wild)
17. How do existing products that aggregate or grade analyst/expert picks
    (e.g., consensus-pick aggregators, "expert rankings" products, tout-grading
    sites) source their data lawfully? Find real companies and document their
    apparent legal basis (license, public data, user-submitted, first-party).
18. Search GitHub and technical sources for how open-source projects handle
    rights-respecting ingestion of media/commentary (provenance tracking,
    license gating, transcript-rights metadata). Note patterns, not just repos.

## OUTPUT FORMAT

1. **Executive verdict** (½ page): the 2–3 genuinely viable lawful paths, ranked
   by viability × cost × effort, and the paths that are legally dead with the
   one-line reason + controlling authority.
2. **Path-by-path analysis**: for each viable path — legal basis (with
   citations), concrete steps, cost/effort estimate, residual risk, and what to
   confirm with retained counsel.
3. **The "no" list**: each dead path, the controlling case/clause that kills it,
   and why a technical workaround (paraphrase bot, transformation, etc.) does or
   does not change the outcome.
4. **Citations appendix**: every case, statute, ToS clause, vendor, and source
   with a working link and a one-line relevance note.
5. **Counsel brief**: a 1-page summary the founder can hand to an IP attorney to
   get a fast, cheap opinion on the top-ranked path.

## RULES FOR YOU (the research model)
- Cite or don't claim. Every legal proposition gets primary-source support.
- Distinguish copyright from contract from CFAA at every step — they fail
  independently.
- Be current: prioritize 2023–2026 developments in AI-training fair-use law.
- If a path requires a license, say so plainly rather than implying a free
  workaround exists.
- Flag uncertainty honestly; mark anything that is unsettled law.
- Take the time to be exhaustive. Depth over speed.
