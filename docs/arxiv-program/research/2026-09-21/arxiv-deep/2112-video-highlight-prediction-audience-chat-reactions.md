# [2112] Video Highlight Prediction Using Audience Chat Reactions (arXiv:1707.08559)

**Citation:** Cheng-Yang Fu, Joon Lee, Mohit Bansal, Alexander C. Berg, UNC Chapel Hill (2017). *Video Highlight Prediction Using Audience Chat Reactions*. arXiv:1707.08559v1. URL: https://arxiv.org/abs/1707.08559
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 1707.08559v1).
**Verdict:** ADAPT
**Rationale:** highlight prediction from joint visual + audience-chat-reaction modeling; the transferable insight is that CROWD REACTION (chat velocity + slang content) is a predictive signal for "which moments matter," and that character-level modeling beats word-level on internet slang by 22.3%. Needs adaptation (NFL: X/reaction volume + broadcast video; community-produced highlights as ground truth).

## 1. Research question
Can audience chat reactions during live esports streams — noisy, slang-filled, multilingual — predict video highlights, alone or jointly with visual features? And does character-level language modeling handle internet slang better than word-level models?

## 2. Dataset / schema
- **Novel dataset**: 321 League of Legends championship videos from Twitch (spring 2017): NALCS (North American, English chat) 218 videos; LMS (Taiwan/Macau/Hong Kong, Traditional Chinese chat) 103 videos. Each game 30–50 min with timestamped chat. Ground truth: community-created highlight clips matched back to match timestamps (frame-level binary labels).
- Splits: by game number — games 1&3 train (NALCS 128, LMS 57), game 2 of weeks 1–4 val (40/18), remaining game 2s test (50/28). Dataset "will be released for further research."

## 3. Method / model
- **V-CNN**: pretrained ResNet-34 frame features (224×224) → per-frame prediction.
- **V-CNN-LSTM**: LSTM over image features, unfolded 16 steps; predict every 10th frame of 30fps video (≈5s window), interpolate between.
- **L-Char-LSTM**: character-level 3-layer LSTM over all chats in the next W_t seconds (best W_t = 7s; tested 5–9s → 32.1/29.6/41.5/28.2/34.4%). Chats concatenated with a stop character; the NUMBER of stop characters encodes chat count (model can learn to use volume). Deleted messages → "\\n" symbol. Handles slang ("happppppy"), emojis, abbreviations, onomatopoeia ("4444444" = "yes" in Chinese internet slang).
- **L-Word-LSTM**: word-level baseline, vocab 10,019 (words appearing >10×).
- **Joint lv-LSTM**: concat(F_v, F_l) → 2-layer MLP.
- Training: 5k positive + 5k negative frames/epoch, batch 32, 60 epochs, lr 1e-2 (20 epochs) → 1e-3, weight decay 1e-4, cross-entropy. Positive-label heuristic: only the last 25% of frames in each highlight clip (the action usually occurs late in the clip).

## 4. Equations & assumptions
- Metric: P = |S_gt ∩ S_pred|/|S_pred|, R = |S_gt ∩ S_pred|/|S_gt|, F = 2PR/(P+R) × 100% (Eq. 1–2).
- Assumptions: (1) community highlight clips are valid ground truth for "exciting moments"; (2) chat in the NEXT W_t seconds is predictive (reaction follows the event — uses future chat relative to frame); (3) the last-25%-of-clip heuristic correctly localizes the action; (4) chat volume (stop-char count) is a legitimate feature, not just a confound.

## 5. Features / target
- Inputs: video frames (ResNet-34) + timestamped chat text (char-level).
- Target: binary per-frame highlight membership. Metric: F-score.

## 6. Validation design
Dev-set ablations (NALCS train/val): each module alone, UF (100% vs last-25% positives), text-window sweep, char vs word. Final: retrain on train+val, test on held-out games, both languages.

## 7. Numerical results / baselines
- Dev F-scores: L-Char-LSTM 41.5 (chat only, last-25%) vs L-Word-LSTM 19.2 — char beats word by **22.3 points**; V-CNN 64.0; V-CNN-LSTM 68.3; **joint lv-LSTM 74.8** (P 0.77, R 0.72).
- Test: NALCS — lv-LSTM **74.7** vs video-only 72.2 vs chat-only 43.2. LMS — **70.0** vs 69.2 vs 39.7.
- Finding: vision alone beats language alone ("surprisingly"), but language disambiguates hard cases and the combination is best in both languages. Chat works better in English (43.2) than Traditional Chinese (39.7).

## 8. Code / data availability
PyTorch implementation; dataset "will be released" (2017 — verify link freshness before depending on it). No URL extracted.

## 9. Leakage & limitations
- Uses FUTURE chat (next 7s) relative to the frame — fine for post-hoc highlight generation, NOT for real-time prediction; the paper doesn't separate these use cases clearly.
- Ground truth = fan-made highlight clips: biased toward popular teams/players and spectacular (not important) plays.
- 2017 LoL Twitch chat; platform dynamics have changed; dataset links may be dead.
- Chat-only F-scores (~40) are weak — the signal is real but noisy; the value is in the JOINT model.
- External validity: esports chat is denser and better-aligned than NFL social reactions, but the principle (reaction velocity + content → highlight) transfers.

## 10. GSE overlap
Existing-research-map: no highlight-prediction or audience-reaction read. Complements 2107 (event taxonomy — what the events ARE) and 2110 (commentary generation): this answers "which moments does the crowd care about." NEW: reaction-volume-as-signal and char-level slang modeling. No duplication.

## 11. GSE implementation spec
**Goal:** automated "top plays" selection for GSE's video operation + a crowd-validation signal for the engine.
- **Reaction-velocity highlight ranker**: for each 2024 NFL play, build features = (a) broadcast-video embeddings, (b) X reaction velocity (posts/minute mentioning the game in the 5 min after the play; sentiment via a char/subword model per the paper's slang finding), (c) tracking-based excitement proxies (max speed, air yards). Train lv-LSTM-style joint model against ground truth = plays that appeared in official "top 10 plays" reels / most-viewed clips.
- The chat-COUNT trick transfers directly: encode reaction volume as an explicit feature — the paper shows the model learns to use it.
- Use: (1) auto-generate the nightly GSE highlight reel; (2) a "crowd excitement" feature for the engine (plays the crowd reacts to correlate with... test); (3) content — "the 5 plays that broke NFL Twitter this week."
- Effort: small-medium (2–3 weeks; X API volume data + existing video embeddings).

## 12. Reproducible test
Dataset: 2024 NFL regular season — all plays with broadcast video + X firehose volume per game-minute. Ground truth: NFL's official weekly Top 10 plays (binary per play). Train weeks 1–12, test weeks 13–18 (time-ordered). Baselines: (a) video-only, (b) reaction-volume-only (logistic on posts/min), (c) tracking-excitement-only. Metric: the paper's F-score + Precision@10 per week (did we pick the actual top 10?).

## 13. Acceptance / rejection gate
**ACCEPT:** joint model beats the best single-modality baseline by ≥5 F-score points on held-out weeks AND Precision@10 ≥ 0.5 (half the official top-10 recovered). **REJECT:** reaction features add nothing over video+tracking (then crowd noise is just noise for the NFL, and the lane reduces to a pure vision problem) or Precision@10 < 0.3 (not usable for the nightly reel). Pre-registered before running.

## 14. Improvement experiment
Beyond the paper: **causal reaction windows.** The paper uses chat from the NEXT 7 seconds (post-hoc). For GSE's live operation, build a streaming variant using only PAST reactions (t−60s to t) and measure the highlight-detection latency/accuracy tradeoff curve. Why it might beat the paper: it turns a post-hoc research result into a LIVE product — "highlight detected 45 seconds after the play, before the broadcast even cuts to commercial" — which is the actual deployable version GSE needs, and the latency-accuracy curve itself is publishable analysis ("how fast does the crowd know?").
