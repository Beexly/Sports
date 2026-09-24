# [1603] Template-free Data-to-Text Generation of Finnish Sports News (arXiv:1910.01863)

**Citation:** Kanerva, J., Rönnqvist, S., Kekki, R., Salakoski, T., & Ginter, F. (2019). *Template-free Data-to-Text Generation of Finnish Sports News*. TurkuNLP, University of Turku. arXiv:1910.01863. URL: https://arxiv.org/abs/1910.01863
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — event-aligned data-to-text pipeline (CRF event selection → pointer-generator verbalisation) with journalist product-readiness evaluation; GSE-adaptable for generating stat-grounded NFL game recaps.

## 1. Research question
Can a template-free end-to-end data-to-text system generate ice-hockey game reports from structured game statistics at near-product quality — and how much of real news is actually inferrable from statistics (vs background knowledge, interpretation, quotes)?

## 2. Dataset / schema
Finnish ice-hockey corpus: 3,454 games (STT news agency 1994–2018) auto-paired by date/team heuristic; 2,307 manually checked, 2,134 correctly paired; events extracted by regex (end result, goal, penalty, save — 36,097 total); single annotator aligned 12,251 events (33.9%) to 8,831 text spans (9,266 sentences, 84,997 tokens) over ~6 weeks, deleting/neutralising ungrounded content. Event→text examples: input = XML-tagged feature sequence (e.g., `<length>long</length><type>result</type><home>Ässät</home>...`); output = neutralised Finnish report sentence. Data + code: github.com/scoopmatic/finnish-hockey-news-generation-paper; original corpus at urn.fi/urn:nbn:fi:lb-2019041501.

## 3. Method / model
Two stages: (1) Event selection — CRF sequence labeler over the game's event sequence with per-event features, binary include/exclude labels, class weighting 0.85:1 (CRFsuite); F-score 67.1% (end result 98.0%, goal 70.2%, penalty 20.1%, save 47.7%). (2) Text generation — pointer-generator seq2seq (2-layer BiLSTM encoder + 2-layer LSTM decoder, 500 hidden/embedding, dropout 0.3, copy + coverage mechanisms, OpenNMT-py), trained per single event with a `length` control feature (short/medium/long, best-confidence selection at test), Adam 5e-4, batch 32, ~40 epochs, 80/10/10 game split. Validated on E2E NLG Challenge first (beats TGen on BLEU/METEOR/ROUGE-L; BLEU and METEOR above the best shared-task participants).

## 4. Equations & assumptions
Standard CRF + pointer-generator NLL objectives; coverage loss; WER = edit distance / reference length for human evaluation. Assumptions: event sequences are sufficient conditioning (no document-level planning); gold selection during generation training; single annotator's alignments are the truth; length control compensates for arbitrary journalist detail choices.

## 5. Features / target
Features: linearised XML-tagged event feature sequences (scorer, assists, time, game state, score, period breakdowns). Targets: aligned neutralised text spans; CRF targets: binary event-inclusion labels.

## 6. Validation design
Automatic: BLEU/NIST/METEOR/ROUGE-L/CIDEr on test (gold event selection, per-event). Learning curve vs training-data fraction. Human: minimum-edit evaluation by the corpus annotator on 59 full games (CRF selection + generation concatenated chronologically) — WER 5.6% (6.2% w/o punctuation), factual-error taxonomy on 510 events. Product-readiness: two STT journalists editing toward (a) post-edit draft (WER 9.9%/11.2%) and (b) direct publication as machine-labeled news (WER 22.0%/24.4%).

## 7. Numerical results / baselines
Hockey test: BLEU 19.67, NIST 4.41, METEOR 0.23, ROUGE-L 0.42, CIDEr 1.87 (vs Rotowire best BLEU 16.50; vs E2E single-ref 31.90). Human: 84.7% of 510 generated events factually error-free; 78 errors in a tight taxonomy — names 25, goal type/score 24, time reference 14, total score 6, penalty 5, assist 2, power play 2. Key finding: models tuned by BLEU (via RBFOpt) produced *more* fluent but *more* factually wrong text — BLEU rewards fluency over factuality (Wiseman et al. 2017), so hyperparameters were hand-tuned for a factuality balance instead. Journalist verdict: 75–90% of generated text directly usable depending on post-editing budget — "relatively close to a viable product."

## 8. Code / data availability
Dataset, code, model: github.com/scoopmatic/finnish-hockey-news-generation-paper; original corpus at the Finnish national URN.

## 9. Leakage & limitations
Single annotator for 6 weeks of alignment (no IAA reported); per-event generation causes repetition and poor document flow (document-level generation attempts failed); 33.9% of events aligned — the rest is reportorial content statistics can't support, which is itself the key finding; copy-mechanism errors on inflected names (token-level, not subword); learning curve still rising at 100% data — data-starved.

## 10. GSE overlap
Distinct from ledgers 1599–1602 (commentary→news summarization and RAG): this is structured-data→text with a product-readiness evaluation, and the only ledger with a journalist usability metric. Pairs with 1600's knowledge-fusion (both confront the fact/knowledge boundary from opposite sides).

## 11. GSE implementation spec
Adapt the CRF-select → pointer-generator pipeline to NFL box-score/play-by-play → recap generation: (a) align historical GSE-recap-quality sentences to play-by-play events (the paper's 6-week single-annotator protocol, scaled); (b) train an event-selection model (modern CRF or LLM classifier) over candidate plays using the 67.1%-F baseline as the floor; (c) generate per-event sentences with copy-enabled seq2seq/LLM conditioned on play features, with a length-control signal; (d) adopt the paper's minimum-edit WER evaluation with GSE editors as the acceptance metric (target: ≤10% WER to post-edit draft); (e) heed the BLEU-factuality finding — optimise and select models on factual-error rate, never BLEU alone.

## 12. Reproducible test
Replicate Table 4 (BLEU ≥ 0.19, ROUGE-L ≥ 0.40) and the 84.7% factual-correctness rate on the released corpus. For GSE: on 50 NFL games, ≤15% of generated play descriptions contain a factual error and post-edit WER ≤ 12% by an editor blind to the source.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): public corpus + code + rare journalist product evaluation + honest failure taxonomy + the BLEU-vs-factuality warning. ADAPT because hockey/Finnish and LSTM-era; the event-selection protocol, alignment methodology, and evaluation framework transfer directly to NFL with modern generators.

## 14. Improvement experiment
Subword/BPE tokenisation to fix name-inflection copy errors; document-level generation with multi-event alignments (the paper's failed attempt, revisited with LLM context windows); data augmentation targeted at the error taxonomy (name pairing, score inversion, verbal time references); factuality-first model selection as the explicit training objective.
