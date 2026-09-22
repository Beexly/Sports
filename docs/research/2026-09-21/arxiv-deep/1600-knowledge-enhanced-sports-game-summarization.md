# [1600] Knowledge Enhanced Sports Game Summarization (arXiv:2111.12535)

**Citation:** Wang, J., Li, Z., Zhang, T., Zheng, D., Qu, J., Liu, A., Zhao, L., & Chen, Z. (2022). *Knowledge Enhanced Sports Game Summarization*. Proc. WSDM '22. arXiv:2111.12535. URL: https://arxiv.org/abs/2111.12535
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — knowledge-corpus-enhanced commentary summarizer (K-SportsSum + KES); GSE-adaptable for enriching generated NFL content with roster/player knowledge.

## 1. Research question
Sports news routinely contains knowledge absent from commentary (team nicknames, player bios, season context); can a summarizer that retrieves from a structured knowledge corpus (14,724 players, 523 teams) and fuses knowledge embeddings into the generator outperform knowledge-blind two-step baselines — and what is the scale of this "knowledge gap"?

## 2. Dataset / schema
K-SportsSum: 7,854 human-cleaned Chinese commentary–news pairs (from 8,640 Sina Sports Live games 2012–2020; dual-annotator + senior adjudicator cleaning; 6,854/500/500 split). Knowledge corpus: 14,724 player passages (structured Sina knowledge cards → templated sentences, avg 15.05 sentences/283 tokens) + 523 team Wikipedia articles (manually aligned by 3 students + 2 experts; avg 18.28 sentences/1,342 tokens). Knowledge-gap audit (300 samples): 14.7% of news needs team/home-away resolution, 6.3% player info, 4.7% team info. Data released: github.com/krystalan/K-SportsSum.

## 3. Method / model
KES: (1) selector — RoBERTa-Large over target sentence + sliding context window (avg token embeddings → sigmoid, cross-entropy); (2) knowledge retriever — FLAT NER (Chinese lattice Transformer, trained on MSRA, 94.21 F1) → keep PER/ORG → entity linking by normalized Levenshtein distance NLev(entity,title) = Lev/max(len) with thresholds λp=0.2, λo=0.25 against game-linked candidate passages/articles; (3) rewriter — mT5-Large seq2seq on input "<s> In the t-minute </s> commentary </s>", where each token embedding is z_k = LN(z_token + z_pos + z_seg + z_know): z_seg ∈ {[Player],[Team],[Time],[Other]} learnable segment embeddings, z_know = averaged RoBERTa-[CLS] sentence embeddings of the linked passage/article; trained with NLL loss.

## 4. Equations & assumptions
NLev = Lev(entity,title)/max(len(entity),len(title)); z_k = LN(z_token + z_pos + z_seg + z_know). Assumptions: entity mentions linkable by string similarity within the game's candidate set; averaging passage sentence embeddings preserves enough knowledge signal; pseudo-labels (BERTScore argmax in [h_i, h_i+3]) suffice for training (same as Huang et al. 2020).

## 5. Features / target
Features: commentary sentence + context, temporal phrase, segment tags, knowledge-passage embeddings. Targets: importance labels, news sentences.

## 6. Validation design
ROUGE-1/2/L on K-SportsSum and SportsSum; baselines TextRank, PacSum, RoBERTa-Large extractive, Abs-LSTM, Abs-PGNet, SportsSUM two-step. Ablations: remove segment embeddings (−0.53 avg ROUGE), remove knowledge embeddings (−0.72), remove both (−1.71), PGN rewriter instead of mT5 (−2.92), TextCNN selector (−2.22). Human study: 5 masters × 50 samples each, KES vs KES(w/o know.) vs SportsSUM on informativeness/fluency/overall (3-pt scale).

## 7. Numerical results / baselines
KES on K-SportsSum: ROUGE-1 48.79, ROUGE-2 21.04, ROUGE-L 47.17 vs SportsSUM 44.89/19.04/44.16 (+3.7 avg); on SportsSum: 47.43/20.54/47.79 vs 43.17/18.66/42.27. Human study: KES > KES(w/o know.) > SportsSUM on all three axes. Caveat: qualitative analysis catches a factual error — KES injected "De Yang is 1.7 meters" when his actual height is 1.8 m (authors: pattern of adding knowledge learned, correctness not guaranteed).

## 8. Code / data availability
Dataset released at github.com/krystalan/K-SportsSum; models built on HuggingFace (RoBERTa, mT5); FLAT NER on MSRA.

## 9. Leakage & limitations
Chinese-only; implicit knowledge fusion hallucinates facts (documented 1.7 m vs 1.8 m error); entity linking by edit distance is brittle to nicknames/abbreviations (ironically the cases that need knowledge most); averaging passage embeddings loses salience; knowledge corpus frozen in time (roster changes stale); thresholds hand-tuned.

## 10. GSE overlap
Distinct from ledger 1599 (SportsSum2.0): different dataset (1.45× scale, mid-article history cleaning) and a different method (knowledge fusion vs reranker). Same author team, companion WSDM '22 paper — both count, methods are non-overlapping. No GSE knowledge-fused content generator exists.

## 11. GSE implementation spec
Adapt KES to English NFL content: (a) build the NFL knowledge corpus — 32 teams + ~1,700 active players as structured cards (bio, contract, season stats, injury history) plus Wikipedia/team-page text; (b) NER (English SOTA, e.g., spaCy/GLiNER) + entity linking over the game's two rosters by normalized edit distance or dense retrieval; (c) inject knowledge via the z_seg/z_know embedding recipe into a modern seq2seq LLM when generating game recaps, injury explainers, and matchup previews — but add the missing faithfulness guard this paper lacked: entailment-check every injected fact against the knowledge card before emission (fixes the 1.7 m-class hallucination).

## 12. Reproducible test
Replicate Table 3 on the released K-SportsSum split (KES R-1 ≥ 48.0, R-2 ≥ 20.5, R-L ≥ 46.5) and the ablation deltas in Table 5. For GSE: generated recaps with knowledge fusion rated more informative by human/LLM judges than knowledge-blind baseline with zero entailed-fact errors on a 50-game sample.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): largest human-cleaned dataset of its kind + quantified knowledge gap (14.7/6.3/4.7%) + ablated knowledge-fusion method + public release. The hallucination caveat converts this to ADAPT rather than ADOPT — adopt only with the entailment guard added.

## 14. Improvement experiment
Explicit knowledge selection (retrieve-then-attend per sentence) instead of averaged passage embeddings; dense entity linking (bi-encoder) for nicknames; per-fact entailment filter at decode time; live knowledge corpus refresh from weekly NFL data feeds; measure factual-error rate with and without the guard as the primary metric.
