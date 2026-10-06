# 0264 twAwler: A lightweight twitter crawler (arXiv:1804.07748v1)

**Citation:** Polyvios Pratikakis (2018). *twAwler: A lightweight twitter crawler*. arXiv:1804.07748v1. URL: https://arxiv.org/abs/1804.07748v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,572 lines, including appendices).
**Verdict:** REJECT — a well-engineered 2018 Twitter crawler whose API architecture, endpoints, rate limits, and data-access assumptions are obsolete under the current X API; only its scheduling, checkpointing, and interaction-graph concepts survive as generic ingestion patterns.

## 1. Research question

The paper presents twAwler, a lightweight (approximately 11 KLoC of Python) Twitter crawler designed to run on a single credential and a single desktop machine while respecting Twitter's API rate limits and crawler politeness policies. Applied to the Greek-speaking Twitter community, it asks: can a single-machine, single-credential crawler collect a near-complete national-language subgraph (users, tweets, follows, lists, trends) over an extended period, and what does the resulting interaction-graph structure look like?

## 2. Dataset / schema

- **Collection window:** August 2016 – March 2018.
- **Scale:** ~330,000 Greek-speaking accounts discovered; 750 million tweets collected (424 million in Greek); 750 million follow relations; ~300,000 lists with 119 million member relations and 27,000 subscriptions; 705,000 trends; 52 million distinct users observed, of which 292,000 suspended, 141,000 deleted, 3.5 million protected.
- **MongoDB schema:** collections for users, tweets, trends, URLs, follow edges, language classifications, suspended/deleted/ignored account states, and crawler metadata (checkpoints, per-endpoint rate-limit state).
- **Extracted interaction graphs (vertices / edges / size):** follow 26,339,971 / 204,969,957 / 4.2G; retweet 3,851,055 / 46,084,224 / 1.0G; mention 2,226,118 / 2,781,915 / 65M; reply 4,552,175 / 24,364,103 / 552M; quote 1,279,360 / 4,794,911 / 112M; list-similarity 54,309,000 / 1,993,937,542 / 44G; favorite 2,778,775 / 38,881,162 / 893M.
- **Reply-thread structure:** 86% of threads are one tweet plus one reply; 6.3% have two replies; maximum observed thread length 2,185.
- **Access:** the paper states the crawler was intended for Apache-licensed release; the dataset itself is Twitter-derived and not redistributable. Both the 2018 API and the data are stale.

## 3. Method / model

Crawler design:
1. **Seed and discovery:** start from seed Greek-speaking accounts; expand via friends/followers, list memberships, and trends.
2. **Language classification heuristics:** track an account if it has > 100 tweets and ≥ 20% Greek, or > 500 tweets and ≥ 10% Greek plus a Greek name/bio; stop tracking if > 500 tweets and < 1% Greek; infer Greek-speaking status if > 30% of an account's friends/followers are Greek-speaking.
3. **Politeness and rate limiting:** single credential, single machine; respects the 2018 API limits — latest 3,200 timeline tweets per user, 200 tweets per request, 15-minute rate-limit windows — with per-endpoint backoff and persistent checkpointing in MongoDB so crawls resume after interruption.
4. **State machine per account:** active / suspended / deleted / protected / ignored, with transitions recorded.
5. **Graph extraction:** post-hoc construction of follow, retweet, mention, reply, quote, list-similarity, and favorite graphs from the Mongo store, with sizes reported above.
No ML model is trained; the "model" is the crawler's scheduling and classification policy.

## 4. Equations & assumptions

No equations stated. The paper contains no mathematical model — its quantitative content is API limits, heuristic thresholds, and graph-size counts. Assumptions: the language heuristics (tweet-percentage and network-percentage thresholds) correctly identify Greek-speaking accounts; a single credential's rate-limit budget suffices for the target community; suspended/deleted/protected states observed via API errors are accurate; the 3,200-tweet timeline cap does not materially distort the interaction graphs.

## 5. Features / target

Not a prediction paper. The "inputs" are seed accounts and the API's paginated endpoints; the "outputs" are the collected corpora and derived graphs described in §2. The language-classification heuristics use features: tweet count, Greek-tweet percentage, Greek name/bio presence, and the fraction of Greek-speaking friends/followers. No label definition beyond the heuristic thresholds; no prediction horizon.

## 6. Validation design

No train/test or formal evaluation. Validation is by scale and internal consistency: the crawler ran for ~19 months without being banned (evidence the politeness design worked), discovered 330K accounts in the target community, and produced graph statistics with face-valid structure (e.g., the reply-thread length distribution). There is no ground-truth comparison for the language classifier (no precision/recall reported) and no baseline crawler comparison.

## 7. Numerical results / baselines

Scale figures as in §2, quoted exactly: ~330,000 Greek-speaking accounts; 750M tweets (424M Greek); 750M follow relations; ~300,000 lists, 119M member relations, 27,000 subscriptions; 705,000 trends; 52M users observed / 292K suspended / 141K deleted / 3.5M protected. API limits: 3,200 latest timeline tweets, 200 tweets/request, 15-minute windows. Discovery thresholds: >100 tweets & ≥20% Greek, or >500 tweets & ≥10% Greek + Greek name/bio; stop at >500 tweets & <1% Greek; >30% Greek friends/followers → infer Greek. Graph sizes per §2 (follow 26.3M vertices / 205.0M edges / 4.2G through favorite 2.78M / 38.9M / 893M). Reply threads: 86% single-reply, 6.3% two replies, max length 2,185. No accuracy metrics, no baselines beaten — the paper claims feasibility at scale, demonstrated by the collection itself.

## 8. Code / data availability

Paper states the crawler is ~11 KLoC of Python intended for release under an Apache license. No URL is given in the extract for the code, and no dataset is released (Twitter's terms prohibit redistribution). Effectively: code availability asserted but not linked; data not available.

## 9. Leakage & limitations

- **The 2018 Twitter API no longer exists.** Endpoints, the 3,200-tweet timeline cap, 15-minute windows, and free-tier access patterns were all superseded by the paid X API tiers; the crawler as specified cannot run today, and its rate-limit engineering targets limits that no longer apply.
- **Single-credential design is now a liability.** Modern X API pricing is per-credential and expensive at this scale; the "one desktop, one credential" economy the paper exploits is gone.
- **Language heuristics unevaluated.** No precision/recall for the Greek-speaker classifier; the 20%/10%/30% thresholds are asserted, not validated — misclassification propagates into every graph.
- **Survivorship and API-visibility bias.** Suspended/deleted/protected accounts (3.9M of 52M observed) create holes; the 3,200-tweet cap truncates prolific accounts' histories, distorting the retweet/reply graphs for exactly the most influential users.
- **No external validity to GSE's data needs.** GSE ingests first-party and licensed sports data (nflverse, FTN, odds APIs), not scraped social graphs; nothing in the modeling pipeline requires a Twitter crawler.

## 10. GSE overlap

**Duplicate as a capability; obsolete as an implementation.** The existing-research map shows GSE already runs X-account monitoring and sweep infrastructure (86+ inventoried accounts, daily sweeps, the 2026-09-21 @NextGenStats deep-dive) — the "watch social accounts at scale" capability exists. The map's gap #12 (text/news as features) is a *modeling* gap (beat-writer text embeddings), not a crawling gap, and this paper offers no text-modeling method. What survives as potentially useful: the generic patterns of polite single-credential scheduling, checkpoint/resume state machines, and per-endpoint backoff — but those are standard ingestion engineering, and GSE's actual social-data work goes through official APIs and manual sweeps, not scraping. Nothing here is a new GSE capability.

## 11. GSE implementation spec

No implementation recommended. If GSE ever needs large-scale public-post ingestion (e.g., for the text/news-features gap), the correct path is the official X API (paid tier) or licensed data providers — not a resurrection of this crawler. The only transferable checklist, applicable to any polite API ingestion GSE builds: per-endpoint rate-limit state persisted across restarts; account/entity state machines (active/suspended/deleted/protected); checkpointed pagination cursors; and backoff with jitter. Estimated effort for that checklist inside an existing pipeline: hours, not a project.

## 12. Reproducible test

Not applicable to the paper's claims (the 2018 API is gone, so the collection cannot be reproduced). The transferable-pattern test: build a small polite ingestor against any rate-limited API GSE already uses (e.g., The Odds API on Garrett's 20K credits/month plan), kill it mid-run, and verify it resumes without re-fetching or exceeding limits. Metric: zero duplicate writes and zero 429s across a kill/resume cycle. Baseline: the current ad-hoc fetch scripts.

## 13. Acceptance / rejection gate

REJECT the crawler as specified — the target API is obsolete, the language heuristics are unevaluated, and GSE has no social-scraping requirement. ADOPT only the four-item politeness checklist (§11) as an engineering standard for GSE's existing API ingestion, gated on the kill/resume test in §12 passing. Never quote the paper's API limits or graph sizes as current facts.

## 14. Improvement experiment

The experiment the paper's lineage actually needs today: **measuring API-visibility bias in social sports data.** Take a fixed set of NFL analyst accounts, collect their posts through the official X API at two access tiers (or API vs manual sweep), and quantify what fraction of posts, replies, and engagement edges the lower tier misses — then test whether downstream uses (sentiment, news-event detection for the text-features gap) degrade. twAwler assumed the API shows the truth; on the modern X API, characterizing what the API *hides* is the research question. That would be a genuinely new, GSE-relevant contribution the 2018 paper could not have made.
