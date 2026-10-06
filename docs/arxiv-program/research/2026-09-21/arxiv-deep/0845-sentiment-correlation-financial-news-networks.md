# 0845 Sentiment Correlation in Financial News Networks and Associated Market Movements (arXiv:2011.06430v2)

**Citation:** Xingchen Wan, Jie Yang, Slavi Marinov, Jan-Peter Calliess, Stefan Zohren, Xiaowen Dong (2020). *Sentiment Correlation in Financial News Networks and Associated Market Movements*. arXiv:2011.06430v2. URL: https://arxiv.org/abs/2011.06430v2
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — from 7 years of Reuters news on 87 companies, a news co-occurrence network (cosine similarity of coverage vectors + Louvain communities) plus entity-level sentiment shows sentiment shocks propagate to network neighbors and coincide with significant CAR/volatility moves (Mann–Whitney, p<0.01); the network-diffusion framing ports to NFL news (a QB injury story moving teammates' and opponents' markets).

## 1. Research question

Does news sentiment toward one company propagate to related companies (measured as neighbors in a news co-occurrence network), and are strong sentiment events associated with abnormal market returns and volatility — at the company, group, and sector level?

## 2. Dataset / schema

- **News:** Reuters financial news, 2007–2013 (27 quarters); entity extraction via NCRF++ NER (char-CNN + word-LSTM + CRF, trained on CoNLL 2003), keeping "organisation" entities mentioned >4 times/quarter → 145 frequent orgs → 87 companies with Bloomberg tickers in 9 sectors.
- **Market:** daily Bloomberg prices for the 87 companies, same period.
- **Schema:** news coverage matrix (company × article counts) → co-occurrence network (edge weight = cosine similarity of coverage rows); per-company-per-article sentiment; per-company daily returns.
- **Access:** Reuters/Bloomberg proprietary; method replicable on any news+price feed.

## 3. Method / model

- **Network:** weighted news co-occurrence graph from 2007 data; Louvain modularity community detection → 7 groups (≈ the 9 Bloomberg sectors; median in-sector edge weight 0.0157 vs out-sector 0.00229). Outlier pairs flagged statistically (e.g., AMZN–GOOG/AAPL cross-sector links; VOD–VZ, GS–MS within-sector).
- **Sentiment:** entity-level sentiment per company per article (NLP pipeline, Methods section); quarterly aggregates visualized 2007–2013 (e.g., US banks deeply negative around Sep 2008; Canadian banks less so).
- **Event study:** sentiment events (large sentiment changes) → change in group aggregate sentiment (Mann–Whitney U, H0: zero change); CAR around event days (Mann–Whitney vs H0: CAR=0, following Ranco et al. but non-parametric); post-event volatility vs stationary pre-event distribution. Volatility proxy: σ(t) ≈ |log(P(t)/P(t−1))|.
- **Causality check:** sampled event-day articles to verify sentiment derives from fundamental events, not from market commentary (Reuters publishes pure market-recap pieces).

## 4. Equations & assumptions

- Louvain modularity (quoted): Q = (1/2m) Σ_{i,j} (e_{ij} − k_i k_j / 2m) δ(C_i, C_j).
- Edge weight e_{ij} = cosine similarity of news-coverage row vectors.
- Volatility proxy (quoted): σ(t) ≈ |log(P(t)/P(t−1))|.
- Assumptions: co-mention reveals economic relatedness; entity-level sentiment is measurable from article text; Mann–Whitney avoids Gaussianity; pre-event volatility is stationary; sentiment events are exogenous enough for the event study.

## 5. Features / target

- **Inputs:** per-company news sentiment time series; co-occurrence network adjacency; daily prices.
- **Targets:** group sentiment change after sentiment events; CAR and volatility around events.

## 6. Validation design

- Event study over 7 years / 27 quarters; significance via Mann–Whitney U (red p<0.01, orange 0.01≤p<0.05).
- No predictive backtest — associational, not a trading strategy; the authors pitch it as a real-time monitoring framework.

## 7. Numerical results / baselines

- Sentiment propagation: clear positive relation between individual-company sentiment shocks and group sentiment for several groups; asymmetric in Group 1 (financials): negative shocks propagate significantly, positive ones don't; same pattern in Groups 3, 5, 6; symmetric propagation in consumer groups 2 and 4.
- Market moves: few significant pre-event CAR deviations; post-event CAR diverges — positive sentiment → upward drift, negative → decline; both event types elevate volatility, lingering for days in some groups.
- Network validation: 7 Louvain groups vs 9 Bloomberg sectors — high-level consistency with interpretable disagreements (AMZN/EBAY grouped with Tech; auto manufacturers split out of Consumer Discretionary).
- No single headline effect size quoted — results are figure-based significance patterns, not point estimates.

## 8. Code / data availability

None stated (Gephi used for visualization).

## 9. Leakage & limitations

- Associational, not causal: sentiment and returns are jointly driven by fundamentals; the "event" timing relative to price moves isn't nailed down to intraday.
- 87 large-cap companies, 2007–2013 (includes the GFC — results may be crisis-driven).
- Entity-sentiment NLP details thin in the extracted text; measurement error in sentiment unquantified.
- No trading implementation, no costs, no out-of-sample test.
- Reuters' own market commentary had to be manually argued away — residual circularity risk.

## 10. GSE overlap

Per the existing-research map: market microstructure covered (CLV, de-vigged consensus, steam, market-implied ratings); news/injury *signals* arrive via Grok briefs as inputs, but no network-diffusion model of news impact exists. Complements 0841/0842 (social sentiment) with institutional-news networks. New capability: news-graph-based market-impact monitoring.

## 11. GSE implementation spec

- Build the NFL news co-occurrence network: entities = teams/players from sports news (ESPN, beat writers); edges = co-mention cosine similarity; Louvain groups (≈ divisions/conferences + cross-links like shared agents or coordinators).
- Entity-level sentiment per team/player per day; event study on line moves: does a negative-sentiment event for a QB propagate to his team's total and the opponent's spread?
- Effort: 1–2 weeks.

## 12. Reproducible test

Dataset: 2024 NFL season news (GDELT or sports-news API) + opening/closing lines. Metric: after large negative-sentiment events for a starting QB, measure the team's spread move and the group (division) average move vs baseline days; Mann–Whitney significance. Pass if QB-sentiment events move lines significantly (p<0.05) beyond injury-designation dummies.

## 13. Acceptance / rejection gate

ADOPT as a monitoring layer if sentiment events predict line moves beyond the official injury designations (i.e., the network catches what the designation dummies miss); REJECT if all line movement is explained by designations + market steam (then the network is descriptive, not predictive).

## 14. Improvement experiment

Make the network dynamic (quarterly rebuilt, per the paper's suggestion) and weight edges by *surprise* co-mention (deviation from rolling baseline) rather than raw co-occurrence. Hypothesis: surprise-based edges spike exactly when narratives shift (trades, coaching changes, scandals) — the moments when sentiment actually moves markets — beating the static network's propagation signal.
