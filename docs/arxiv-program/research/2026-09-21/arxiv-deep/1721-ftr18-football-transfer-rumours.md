# 1721 FTR-18: collecting rumours on football transfer news (arXiv:1812.00778v1)

**Citation:** Danielle Caled, Mário J. Silva (2018). *FTR-18: Collecting rumours on football transfer news*. Workshop on Rumours and Deception in Social Media (RDSM 2018). arXiv:1812.00778v1. URL: https://arxiv.org/abs/1812.00778v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 5 pages, all sections and references).
**Verdict:** ADAPT — the rumour-classification pipeline framing (detection → tracking → stance → veracity → evidence retrieval) plus the hedging-language lexicon ("according to reports," "linked to," question-headlines) and veracity-via-official-registration are directly portable to GSE's NFL trade/injury rumor verification, but the paper is a dataset proposal with zero classification experiments, so adapt the taxonomy and annotation protocol, never any result.

## 1. Research question

How should the research community study football transfer rumours — their linguistic patterns, propagation, and veracity — as a structured problem? The paper proposes FTR-18, a multilingual (English/Spanish/Portuguese) dataset of transfer news + Twitter reactions, and frames the full rumour-classification pipeline from Zubiaga et al.: rumour detection, rumour tracking, stance classification, veracity classification, and evidence retrieval. It asks what linguistic structures journalists use to report unverified transfers (attribution hedging, question headlines, cascading conditional moves).

## 2. Dataset / schema

- Collection window: 2018 Summer Transfer Window, June 24 – August 31, 2018.
- 3,045 news articles (1,517 English, 747 Spanish, 781 Portuguese) from 96 news organizations; 304 transfer moves involving 175 players.
- 2,064K tweets (1,130K English, 677K Spanish, 257K Portuguese); Twitter subset covers 112 claimed moves, 84 players.
- 12 monitored clubs (2017–18 UCL group stage): Chelsea, Liverpool, Manchester City, Manchester United, Tottenham; Atlético Madrid, Barcelona, Real Madrid, Sevilla; Benfica, Porto, Sporting CP.
- Per rumour: target player, source club, rumoured destination club (source = destination for "staying" rumours); per article: headline, subhead, body, source, language, URL, publication date; per tweet: content, timestamp, user metadata, retweet/favorite counts.
- Veracity annotation: resolved after the window via official UEFA registration — True if the transfer happened as rumoured, False otherwise (a natural ground truth).

## 3. Method / model

- No classifier is trained — this is a dataset-construction paper ("ongoing work"). The method is the collection + annotation protocol: (1) manual rumour identification from media; (2) semi-automated news harvesting (daily, headline-filtered to single-target transfer reports); (3) Twitter streaming-API crawl per rumour; (4) post-window veracity labeling against official registrations.
- Intended downstream tasks (stated, not executed): rumour detection (rumour vs verified reporting), stance classification (headline orientation: supporting/denying/observing), rumour tracking (related/unrelated post classification à la Qazvinian), veracity prediction, and linguistic/propagation-pattern analysis.

## 4. Equations & assumptions

- No equations; the formal content is the task taxonomy (Table 2 compares FTR-18 against Qazvinian, Emergent, PHEME-RNR/RSD, FEVER, LIAR on data source, availability, multilinguality, and supported tasks RD/RT/SC/VC/ER).
- Veracity rule: for source ≠ destination rumours, True iff the transfer to that destination is confirmed in STW18; for source = destination, True iff the player stays. Assumes official registration is complete and timely ground truth.
- Assumption: headline-level filtering (single target, clear transfer report) captures the rumour without excessive noise; Twitter keyword crawls approximate the reaction conversation.

## 5. Features / target

- For future classifiers: article headline/body, source identity, language, publication timestamp, tweet text/reactions/engagement, user metadata.
- Targets: rumour-vs-news label, stance label, relatedness label, veracity label (True/False from official registration), plus linguistic-pattern descriptors.
- Documented hedging patterns: "according to reports/sources," "player P linked to club C," "reports suggest," "source S reported" (often without link), question headlines ("Ronaldo out, Neymar in at Real Madrid?"), cascading conditional moves ("club will sell X to fund Y").

## 6. Validation design

- None — no experiments are run. The "initial analysis" is descriptive: cross-reference/echo patterns between outlets, the hedging lexicon above, and dataset size statistics. Veracity annotation was pending at publication (completable only after August 31, 2018).

## 7. Numerical results / baselines

- Dataset scale only: 3,045 articles / 2,064K tweets / 304 moves / 175 players / 96 outlets (see §2).
- Qualitative findings: pervasive attribution hedging, echo effect (outlets re-reporting third-party rumours as news), question-headlines concentrated in Spanish media, cascading conditional-move narratives that sustain audience attention across follow-ups.
- No precision/recall, no baseline, no benchmark numbers of any kind.

## 8. Code / data availability

- Metadata and news-source scrapers released at https://github.com/dcaled/FTR-18 (per the paper). Article text and tweets subject to the usual redistribution limits; availability of the full corpus today is unverified.

## 9. Leakage & limitations

- Zero experiments: every downstream claim (detection, stance, veracity) is promissory. There is no evidence the dataset supports the tasks at the stated quality.
- Twitter streaming-API collection from 2018 is not reproducible today (API access, deletions, account suspensions); the reaction side of the dataset cannot be rebuilt.
- Manual rumour identification introduces selection bias toward high-profile moves at 12 elite clubs; the long tail of rumours is unrepresented.
- Veracity via official registration is clean for transfers but has no analog for the rumour types GSE cares about most (injury severity, trade *talks* that die quietly — no official "didn't happen" registry entry is as crisp).

## 10. GSE overlap

- GSE's rumor problem is NFL trade rumors, coaching-move rumors, and injury-report rumors — the same verification task with the same hedging language ("sources say," "expected to," "game-time decision"). The paper's pipeline taxonomy gives GSE's rumor desk its stage decomposition.
- The hedging lexicon is directly reusable as features for a rumor-confidence scorer: hedged phrasing → lower extraction confidence (connects to ledgers 1717's evidence tiers and 1719's strong/weak taxonomy).
- Veracity-via-official-registration maps to GSE's injury-report truth: official inactive lists and roster transactions as ground truth for rumor resolution.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/rumors/` in the paper's five stages: (1) detection — classify NFL news items as rumor vs confirmed-report using the hedging lexicon + source features; (2) tracking — cluster articles/posts to rumor threads (same player + move type); (3) stance — per-item orientation (supporting/denying/observing) toward the rumor claim; (4) veracity — resolve against official ground truth (roster transactions, inactive lists, team announcements) with a resolution deadline; (5) evidence retrieval — surface the supporting/refuting items per rumor.
- Maintain a rumor registry with fields: claim, entities, first-seen, sources, stance distribution, hedging score, status (unresolved/confirmed/refuted), resolved-by (official source + timestamp).
- Score every ingested rumor item with a hedging index (count of attribution-hedge patterns) that down-weights its influence in downstream models.

## 12. Reproducible test

- Backtest on 2024 NFL trade deadline + coaching-carousel rumors: manually label 200 rumor threads with resolution (confirmed/refuted via official transactions); run the detection → stance → veracity pipeline; success criteria: veracity accuracy ≥ 0.80 on resolved rumors, median time-to-resolution ≤ 48h after official confirmation, and the hedging index negatively correlated (ρ ≤ −0.3) with eventual confirmation rate — validating the paper's linguistic hypothesis quantitatively, which the paper never does.

## 13. Acceptance / rejection gate

ADAPT the pipeline taxonomy, the hedging lexicon, and the official-registration veracity protocol; adopt nothing empirical since the paper runs no experiments. ADAPT proceeds if the reproducible test validates the hedging-index hypothesis (ρ ≤ −0.3) and veracity accuracy ≥ 0.80; REJECT the Twitter-reaction side of the design for GSE if reaction-volume data is unavailable or too sparse per rumor (the paper's 2M tweets came from a 2018 API that no longer exists — do not build a dependency on firehose social data); REJECT any veracity claim on "talks died quietly" rumors where no official ground truth exists — mark those unresolved, never refuted.

## 14. Improvement experiment

Run the experiments the paper promises but never delivers. (1) Quantify the hedging hypothesis: train a rumor-confirmation classifier with and without hedging-pattern features and report the ablation — if hedging features add ≥ 5 pp accuracy, the paper's core linguistic claim becomes an empirical result for the first time. (2) Echo-effect measurement: the paper observes outlets re-reporting third-party rumours — build a source-attribution graph over GSE's rumor threads and measure what fraction of "confirmations" trace to a single origin vs independent reporting; this converts the echo observation into a rumor-credibility discount (N outlets citing one source ≠ N independent sources), which is the single most valuable upgrade for GSE's rumor desk. (3) Extend veracity ground truth beyond transfers: define resolution protocols for injury rumors (official status reports) and coaching rumors (team announcements), where the paper's UEFA-registration trick does not apply.
