# [0036] AI and analytics in sports: Leveraging BERTopic to map the past and chart the future (arXiv:2510.15487v1)

**Citation:** Manit Mishra (2025). *AI and analytics in sports: Leveraging BERTopic to map the past and chart the future*. arXiv:2510.15487v1. URL: https://arxiv.org/abs/2510.15487
**Ledger completed:** 2026-09-21. **Read:** full local text (1,426-line extract, title through references, including PRISMA funnel, BERTopic method, four topic interpretations, Table 1, Figure 4/5 descriptions, future-research directions, discussion, and conclusion).
**Verdict:** REJECT — a bibliometric SLR-plus-topic-model survey with no predictive model, no measured effect, and no transferable technique for GSE's predictive engine.

## 1. Research question
Two objectives: "(a) to develop a comprehensive and integrative synthesis of existing research on the use of AI and analytics in sports, and (b) to leverage the identified thematic insights to propose strategic guideposts for future research" — executed as a systematic literature review (PRISMA) over 2002–2024 journal articles, followed by BERTopic topic modelling of article abstracts to extract latent research themes. (Abstract, Introduction)

## 2. Dataset / schema
Corpus built by PRISMA (Moher et al., 2009) on Web of Science Core Collection — Social Science Citation Index (SSCI), search keywords "Artificial Intelligence" OR "Analytics" OR "Machine Learning" OR "Deep Learning" OR "AI" OR "ML" AND "Sports" in the Topic field, January 2002–December 2024 (Methodology):
- Identification: **598 articles** → **539 journal articles**.
- Refined by research area (ten disciplines with highest publication volume): **459 articles**.
- Screening: journal-quality filter — only journals with 5-year JCR-2025 Impact Factor ≥ 2.0 retained → **339 articles**.
- Eligibility: three academicians each read every abstract and assigned binary coding (1: focused on AI/analytics in sports, 0: no clear focus); disagreements resolved by reading full paper plus discussion; **135 excluded** (traditional statistical methods or experimental designs, no AI/analytics algorithms).
- Included: **204 articles**, published 2002–2024 in **101 different journals**.
- Document unit for modelling: article **abstracts** (transformed to UTF-8 encoded text tiles).
- Descriptives: word cloud of the 204 titles (Python wordcloud 1.8.2.2) shows dominant terms "sport," "model," "data," "player," "machine learning," "performance" (Figure 2). Top journals: *Frontiers in Psychology* **19**, *International Journal of Sports Science & Coaching* **15**, *International Journal of Forecasting* **6**, *Sports Management Review*, *Big Data*, *PLOS One*, *Applied Sciences-Basel*, *Sustainability* **5 each** (Figure 3).
- Access: the 204-article bibliography is the paper's own reference list; corpus itself is WoS-subscription-gated.

## 3. Method / model
SLR + **BERTopic** (Grootendorst, 2022) on the 204 abstracts (Topic modelling). Method details as stated in the paper:
- BERTopic "leverages clustering techniques and a class-based variation of TF-IDF to generate coherent topic representations" (Grootendorst, 2022, p. 2).
- Pipeline: generate contextualized text embeddings using a pre-trained BERT model (captures semantic relationships) → cluster embeddings to identify coherent topic structures → CountVectorizer preprocessing applied **following** the generation of embeddings and clustering (per Grootendorst, 2022's recommendation, because the transformer model "requires complete textual input to produce accurate contextual embeddings").
- Output: four topics with associated terms in decreasing order of relevance (Figure 4), representative articles per topic (Table 1), and a two-dimensional inter-topic distance map (Figure 5) where circle size = relative significance and spatial position = semantic proximity/dissimilarity.
- Topic interpretation: per DiMaggio et al. (2013), objective is "to identify the lens through which one can see the data most clearly"; topics labelled through assessment of topic-word associations (Crain et al., 2012; DiMaggio et al., 2013; Hannigan et al., 2019), prioritizing higher-weight words, cross-checked against representative studies per topic (Table 1).
- Topic 1 example: words include "performance," "team", "football," "results," "match," "player" → labelled "performance modelling."

## 4. Equations & assumptions
No equations stated in the paper. Stated/implicit assumptions: (1) the PRISMA-filtered 204-article sample is representative of AI/analytics-in-sports research; (2) abstracts faithfully represent article content; (3) BERTopic clusters on abstracts recover genuine research themes (interpretability and analytic utility prioritized per Blei & Lafferty, 2009; DiMaggio et al., 2013); (4) WoS adherence to Garfield's Law of Document Sets and Bradford's Law yields high-quality curation.

## 5. Features / target
Not applicable — no predictive modelling. The "findings" are four descriptive topic clusters with term associations and representative studies.

## 6. Validation design
None. Descriptive survey; no baselines, metrics, predictive validation, or splits. No topic-coherence metric (e.g., c_v) reported.

## 7. Numerical results / baselines
The single substantive result: **four extracted themes**, ordered by relative prominence in the inter-topic distance map (Figure 5): **(1) performance modelling, (2) physical and mental health, (3) social media sentiment analysis, (4) tactical tracking**.
- The map shows the four topics are "largely distinct" (well-spaced circles); the two most prominent (performance modelling, physical/mental health) are positioned far apart (thematic divergence); closer proximities observed between physical/mental health ↔ tactical tracking and between performance modelling ↔ social media sentiment analysis (conceptual overlap).
- Representative studies per topic (Table 1, full citations as given):
  - Performance modelling: Maanijou & Mirroshandel (2019) — weighted-voting ensemble optimized by genetic algorithm for Persian Gulf Premier League player ranking; Al-Asadi & Tasdemir (2022) — ML estimation of footballer market value from FIFA video game data; Constantinou (2019) — "Dolores" ML model predicting soccer match outcomes across countries.
  - Physical and mental health: Peng & Tang (2021) — Smart Sports Classroom from AI/big data; Chen & Zhou (2022) — HMM-based visual perception–motion recognition for student exercise behavior; Deng et al. (2022) — big data/Internet Plus/AI intelligent governance of college students' physical health.
  - Social media sentiment analysis: Galiano-Coronil et al. (2024) — sentiment/content analysis of socially responsible companies' social media (sports a top theme); Xie & Wang (2024) — hybrid SEM-ANN on AI-enhanced sports app community; Jain et al. (2017) — emotion extraction from multilingual social media on the 2015 IPL.
  - Tactical tracking: Tuyls et al. (2021) — "Game plan" (stats, game theory, computer vision for soccer); Goes et al. (2019) — data-driven pass-effectiveness model from tracking data; Wu & Swartz (2023a) — player speed calculation from Cartesian tracking data (*International Journal of Sports Science & Coaching*, 18(2), 516–522 — note: this is the citation the prior draft wrongly attributed to the Mishra paper itself).
- Future-research directions proposed per topic: (1) tactical tracking — multimodal tracking-data frameworks, real-time AI tactical decision-support systems, extension beyond soccer (cricket, field hockey, volleyball); (2) sentiment — multilingual/cross-cultural sentiment, multimodal data (images, video, emojis, gifs, live streams), sentiment → behavioral/market outcomes; (3) health — preventive injury detection from biomechanical/physiological precursors, mental-health risk modelling from multimodal data (social media, sleep, conversational cues), integrated physical–emotional frameworks; (4) performance modelling — holistic technical/tactical/physical/psychological models, situational factors (game context, opponent quality, environment), backward integration into talent identification/development/recruitment.
- No quantitative results of any kind (no accuracy, no effect size, no coherence score).

## 8. Code / data availability
None stated in the paper. BERTopic is open-source (Grootendorst, 2022); corpus is the paper's reference list plus a WoS subscription.

## 9. Leakage & limitations
- **This is a survey, not a study**: no model, no prediction, no measured effect — nothing to transfer.
- Corpus construction biases: WoS-only, journal-articles-only (conferences, preprints, industry work excluded by design), SSCI-only, JCR 5-year IF ≥ 2.0 quality filter (excludes lower-impact venues), abstracts-only modelling (topic labels infer themes from ~150-word summaries).
- BERTopic topic labels are interpretive; no coherence metric (c_v) reported; representative-study selection is the author's judgment.
- Findings are generic ("performance modelling is the biggest theme") — no actionable direction beyond what a practitioner already knows.
- Corpus ends December 2024; rapidly evolving field.
- External validity to NFL: nil — nothing here is an NFL method, and the NFL-specific corpus coverage is incidental (one cited study, Hsu 2020, uses candlestick patterns on American football games; Bigsby et al. 2019 on college football recruiting sentiment).

## 10. GSE overlap
No duplication concern: the existing-research map has no BERTopic/topic-modelling work because there is no transferable predictive technique here — the paper only clusters academic abstracts. GSE's thin "text/news features" lane concerns *using* text as a predictive input; this paper's text is meta-research (abstracts *about* sports AI), not data *for* prediction. The one conceivable internal use — BERTopic over the 500 papers' own abstracts to map coverage against the existing-research map — is a tooling idea, not a paper finding, and would live in tooling notes, not as research. Verdict unaffected.

## 11. GSE implementation spec
None. No implementation is warranted from this paper.

## 12. Reproducible test
None. There is no hypothesis to test; re-running BERTopic on the 204 abstracts to recover four generic themes would not constitute a result. (If a literature-surveillance agent is ever built for the 500-paper program, the test would be whether BERTopic over those abstracts produces stable, interpretable clusters that map onto the existing-research-map lanes — but that belongs to tooling, not to this ledger.)

## 13. Acceptance / rejection gate
**Rejected outright:** the paper contains no predictive model, no quantitative result, and no transferable method. The only candidate transfer — "run BERTopic on sports text" — is a generic NLP recipe whose output (topic labels on abstracts) has no path into GSE's prediction, calibration, or betting stack. No further work.

## 14. Improvement experiment
None applicable from the paper itself. The paper's own proposed future directions (real-time tactical decision-support systems, multilingual multimodal sentiment, integrated physical–mental health frameworks) are other people's research agendas, not experiments derived from a verified result here.
