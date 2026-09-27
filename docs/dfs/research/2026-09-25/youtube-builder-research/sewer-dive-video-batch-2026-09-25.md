# Video batch assessment — 25 links (batch 1) + 14 unique videos (batch 2) — 2026-09-25

Garrett's two YouTube/LinkedIn link batches, assessed for the GSE engine-learning program.
Method: video descriptions via page fetch (browser.open) + targeted web search. YouTube transcripts were
IP-blocked for this VM (youtube-transcript-api: "YouTube is blocking requests from your IP") and YouTube
page fetches were intermittently HTTP-429 throttled; throttled pages were NOT retried (marked BLOCKED-429).
Claim tags: DESCRIPTION (video description text), SEARCH (web search), INFERENCE (analyst read).
Verdicts: LEARN (methodology worth feeding the engine) / SKIP (off-topic/entertainment/no substance) /
FOLLOW-UP (needs live-browser watch or a linked artifact read) / BLOCKED-429 (could not fetch; re-check later).

## TOP LEARN ITEMS — concrete kernels for the engine (ranked)

1. **LkJpNLIaeVk — GreenCode, "I Trained AI to Predict Sports"** — a worked public example of ELO-feature
   leakage inflating a sports classifier to "insane 85% accuracy," honestly retracted on camera with corrected
   code promised. Kernel: add to GSE's validation-hygiene notes as the canonical leakage anti-pattern;
   reinforces the sealed-split/prereg discipline (jackc625, prereg-eval.ts). Artifacts: Jeff Sackmann's open
   tennis data (github.com/JeffSackmann/tennis...). (DESCRIPTION)

2. **MzMRKV09dn4 — rugby betting-model series Ep 2, "Why Team Based Betting Models Suck"** — the builder's
   validation protocol, stated explicitly: "seal off the last season... that's always gonna be our out of sample
   test element"; null-classification by league (Opta didn't collect = missing, not zero — e.g. Pro D2 lacks
   stats); triple-verify every prompt/data pull; archive-don't-delete; handle promotion/relegation explicitly.
   Data came from an open free API discovered via Claude Research (5 req/sec; name in Ep 1). Kernel: adopt the
   seal-the-last-season holdout rule and null-classification discipline as engine data-ingestion standards.
   FOLLOW-UP: watch Ep 1 to name the API. (DESCRIPTION)

3. **neBZ6huolkg — abdullahtarek, "Build an AI/ML Football Analysis system with YOLO, OpenCV, and Python"**
   — full CV tracking pipeline: YOLOv8 detection (players/referees/ball) + multi-frame trackers, custom YOLO
   fine-tuning, KMeans pixel-clustering team assignment, OPTICAL FLOW for camera-motion compensation,
   perspective transform to real-world meters, ball interpolation, per-player speed/distance. Kernel: the
   optical-flow + perspective-transform stack is the primitive for deriving NGS-like movement metrics from
   broadcast video. Artifacts: https://github.com/abdullahtarek/football_analysis (license unchecked —
   verify before code reuse), Roboflow football dataset. (DESCRIPTION + SEARCH)

4. **QqVahw9tBfw — abdullahtarek, NBA analysis system** — same builder's basketball pipeline: YOLO + trackers,
   zero-shot image classification for team assignment, court-keypoint detection, perspective transform to a
   top-down tactical map, ball-acquisition/pass/interception detection, speed/distance in meters. Kernel:
   cross-sport confirmation of the CV-tracking architecture; the tactical-map transform is reusable.
   Artifacts: https://github.com/abdullahtarek/bask... (truncated — resolve), Roboflow datasets. (DESCRIPTION)

5. **Gbtb6nUEAmo — Edgerunner, "Txline Solana powered trading engine for sports prediction market"** —
   deterministic low-latency prediction-market trading engine: live market data ingestion, fair-value
   estimation, fixed-point dislocation strategy vs venue L2 order book, inline risk gates, paper-trade
   execution, DETERMINISTIC REPLAY for historical backtesting (live and replay share one engine path),
   decision/trade journal, explicit inactive state without config — "never invents prices." Rust + Axum + React
   + WebSockets. Built for the Superteam × TxLINE hackathon. Kernel: maps directly onto GSE's
   market-microstructure/CLV lane and sealed-split measurement discipline. Artifacts:
   https://github.com/akashjana18/edgerunner (license unchecked — verify before code reuse). (DESCRIPTION + SEARCH)

6. **GsfXAzfvJVM — McKay Johns, "Build a Simple Expected Goals Model with Machine Learning and Python"** —
   working code-backed xG recipe (soccer; shot features like distance/angle/play type, Python ML). Kernel: the
   shot-feature → probability construction discipline transfers to GSE's NFL metric building and backtest
   hygiene. Artifacts: https://github.com/mckayjohns/youtube-videos (license unchecked),
   https://courses.mckayjohns.com/, https://mckayjohns.substack.com/. (DESCRIPTION + SEARCH)

7. **AULU9cRrWO0 — "Build a Sports Betting Model With AI, No Code Needed" (8rain Station)** — a model
   marketplace + +EV edge platform with a PUBLISHED upload spec: define thesis → AI generates formatted model
   CSV → upload → +EV edges across 100+ sportsbooks. Kernel: the CSV upload spec is a ready-made
   model-output contract to study for GSE's own model-submission/eval formats. Artifacts:
   https://8rainstation.com/build-a-model, https://8rainstation.com/upload-spec.txt,
   https://app.8rainstation.com/signup. (DESCRIPTION)

8. **mMa_EunzHbg — Circles Off, "Building A Winning Sports Betting Model That Actually Works"** — pro bettor
   Rob Pizzola (The Hammer CEO) walks through his first model step by step (2017–18 NHL; he notes it wouldn't
   work today). Kernel: the end-to-end PROCESS discipline of a working pro — process transfers across sports
   even though the model is stale. Artifacts: trial API key for "unified prediction market and sportsbook data"
   via bit.ly/4blx5BR (third-party vendor, terms unknown). (DESCRIPTION)

## FOLLOW-UP ITEMS (need live-browser watch or artifact read)

- **920RxyYaPHM — AWS, "Use Vector Search to Supercharge Your Agents"**: NFL analysis agent built with TiDB
  vector search + Amazon Titan + AgentCore; full code on GitHub (go.aws short links). Resolve the links and
  assess the agent-over-NFL-data pattern for GSE's agent layer. (DESCRIPTION)
- **3cbYEPZlFUs — "I Built an AI Sports Betting Model in 20 Minutes — It Made Over $4,800 on NRL Last Season"**:
  claimed $4,800 NRL season (unverified), downloadable model files via Google Drive, named free data source
  aussportsbetting.com/data. Watch to inspect the value-bet mechanics before judging. (DESCRIPTION)
- **A-H-_cf5yX8 — Alex Cupps / CUPPS Model**: Calculated Upside Player Prospecting System — ML model for NFL
  draft-prospect fantasy upside, from his UC Riverside data-science master's thesis; won "So You Think You Can
  Tout." Interview has no math; follow up on the thesis/writeups. Relevant to GSE's draft/DFS lanes.
  https://x.com/CuppsAnalytics. (DESCRIPTION)

## BLOCKED-429 (fetch throttled; not retried per no-retry rule — re-check via live browser later)

- Batch 1: l5Y_aiohV0k, M6L3Gl2X7-M, rne3Xs16z6k, uMkm-GQa2KE, oi_D-TnzW4Y, DxfCH6-C4ZU
- Batch 2: L23oIHZE14w, OUbxNLlC15w, 7gtNErGOhjw, wabA1DtYUrM
- One recovered lead: M6L3Gl2X7-M is a May 2025 video about AI-powered betting tools (SEARCH, via
  nouvelles-du-monde.com). The other nine are unidentified.

## Notes

- No leaks (exposed keys/endpoints/private data) were observed in any fetched description. (DESCRIPTION)
- No auditable win-loss/ROI/calibration numbers were claimed by any assessed video — only unverifiable
  marketing claims (Linemaker "100%", WagerGPT "$6,850 in 24h", NRL "$4,800"). (DESCRIPTION/INFERENCE)
- Code-reuse rule: repos found here are methodology references; verify licenses before any code adaptation
  (only engage8's MIT terms are pre-verified from the earlier sweep).

---

## BATCH 1 — full per-video breakdown (Garrett's first 25 links)

### 1. Vfd1gleEpLI — "How to Build an AI-Powered Sports App | From Idea to scale | MVP to Enterprise"
- Channel: NetMaxims (software dev agency) | Lang: en
- Topic: off-topic — agency promo for building sports-business apps (registrations, bookings, memberships, payments, tournament management). No modeling methodology. (DESCRIPTION)
- Methodology: none. Artifacts: https://netmaxims.com/ (agency). Track record: none. Leaks: none.
- Verdict: SKIP. (DESCRIPTION)

### 2. 920RxyYaPHM — "Use Vector Search to Supercharge Your Agents"
- Channel: AWS Developers | Lang: en
- Topic: AI agent tutorial — builds an NFL analysis tool using TiDB vector search, Amazon Titan embeddings, AgentCore runtime; chapters include code walkthrough and results analysis. (DESCRIPTION)
- Methodology: vector-search-augmented agent over NFL data; tech stack TiDB + Titan + AgentCore. Detail is in the code walkthrough (visual). (DESCRIPTION)
- Artifacts: "Full Code Example on Github" via https://go.aws/3ZsWjqY (short link — resolve); TiDB via https://go.aws/4qtlDIo. (DESCRIPTION)
- Track record: none. Leaks: none.
- Verdict: FOLLOW-UP — resolve the GitHub link; the agent-over-NFL-data pattern is adjacent to GSE's agent layer. (DESCRIPTION)

### 3. AULU9cRrWO0 — "Build a Sports Betting Model With AI, No Code Needed"
- Channel: 8rain Station | Lang: en
- Topic: on-topic — walkthrough of building a betting model via AI-generated CSV uploaded to 8rain Station. (DESCRIPTION)
- Methodology: define betting thesis → feed upload spec to ChatGPT/Claude → AI generates formatted model CSV → upload to 8rain Station → +EV edges across 100+ sportsbooks. (DESCRIPTION)
- Artifacts: https://8rainstation.com/build-a-model (full guide + upload spec); https://8rainstation.com/upload-spec.txt (the CSV schema itself — a model-output contract); https://app.8rainstation.com/signup (3-day trial). Leagues: MLB/NHL/NBA/NFL/EPL/WNBA/UFC/MLS/La Liga/Serie A/Bundesliga/Ligue 1. Markets: moneylines, spreads, totals, game/team/player props. (DESCRIPTION)
- Track record: none claimed. Leaks: none.
- Verdict: LEARN — the published upload spec is a ready-made model-output contract to study. (DESCRIPTION)

### 4. uvqXBqWJK5A — "The Hidden AI Technology Building Pro Sports Schedules"
- Channel: Future of Sports (presented by ADP) | Lang: en
- Topic: off-topic for modeling — interview with Fastbreak AI CEO John Stewart + CPO Dr. Chris Groer on AI-driven league schedule optimization (broadcast priorities, travel, venue conflicts, competitive fairness). Operations research, not prediction. (DESCRIPTION)
- Methodology: none disclosed (talk format). Artifacts: none. Track record: none. Leaks: none.
- Verdict: SKIP. (DESCRIPTION)

### 5. l5Y_aiohV0k — BLOCKED-429 (see blocked list)

### 6. M6L3Gl2X7-M — BLOCKED-429 (see blocked list; SEARCH lead: a May 2025 video about AI-powered betting tools)

### 7. rne3Xs16z6k — BLOCKED-429 (see blocked list)

### 8. mfyXbWiNc0Y — "I Built an AI Sports Betting Bot with ChatGPT"
- Channel: Siraj Raval | Lang: en
- Topic: on-topic — AI sports betting bot (WagerGPT), $2,000 bankroll experiment framed as entertainment. (DESCRIPTION)
- Methodology: OpenAI API for sentiment analysis; Python + BeautifulSoup web scraping; PyTube for YouTube videos; Requests; Flask; Fly.io deployment. (DESCRIPTION)
- Artifacts: https://wagergpt.xyz/ (bot, 500 spots); https://wagergpt.xyz/reports (P&L report); https://gptschool.app/ (community). (DESCRIPTION)
- Track record: claims "$6,850.00 after 24 hours" on $2,000 (DESCRIPTION — unverified, entertainment framing).
- Leaks: none.
- Verdict: SKIP — sentiment-scraping betting-bot content; no real methodology. (DESCRIPTION)

### 9. uMkm-GQa2KE — BLOCKED-429 (see blocked list)

### 10. lzcjK4jyAv8 — "Put Yourself in a Football Match with AI (Full Workflow)"
- Channel: ElevenLabs | Lang: en
- Topic: off-topic — AI video-generation tutorial (place yourself in a football match with AI commentary); creative tooling, not modeling. (DESCRIPTION)
- Methodology: none (sports). Artifacts: elevenlabs.io creative tools. Track record: none. Leaks: none.
- Verdict: SKIP. (DESCRIPTION)

### 11. _F7vl7PW0iE — "Build a No-Code Predictive Model for Sports With Real Data and AI!"
- Channel: Data Punk (@imadatapunk) | Lang: en
- Topic: beginner tutorial on no-code predictive modeling for sports — 7.5-minute walkthrough using hockey data to predict points per game. (DESCRIPTION)
- Methodology: Hockey Reference as data source, Microsoft Excel as the modeling tool, ChatGPT as assistant; "5 Steps to Create a Model" chapter outline. No model family, features, or validation named — substance is visual. (DESCRIPTION/INFERENCE)
- Artifacts: datapunk.media; Instagram /datapunkmedia. No repo/dataset/notebook. (DESCRIPTION)
- Track record: none. Leaks: none.
- Verdict: SKIP — intro no-code tutorial, nothing novel for an engine past this level. (DESCRIPTION/INFERENCE)

### 12. kwvADOVn33U — "Now ANYONE Can Build A Sports Betting Model (with Moddy.AI)"
- Channel: GMG / Green Means Go Sports (@gmgobetting, gmgsports.org) | Lang: en
- Topic: sponsored review + live demo of Moddy.AI, a no-code sports-betting model platform. (DESCRIPTION)
- Methodology: none of the creator's own — walks Moddy.AI's product ("Lab Partner" model builder; predictions/performance tracked via ROI, win rate, history). Platform is the black box. (DESCRIPTION/INFERENCE)
- Artifacts: moddy.ai (affiliate-tagged); affiliate links for Novig, Pikkit, AVO, SmartStake; GMG Discord via gmgsports.buildr.bet. No repo/dataset/notebook. (DESCRIPTION)
- Track record: none claimed. Leaks: none (affiliate codes are public marketing).
- Verdict: SKIP — sponsored review of a closed platform; zero transferable methodology. (DESCRIPTION)

### 13. LkJpNLIaeVk — "I Trained AI to Predict Sports"
- Channel: GreenCode (~91k subs; X @GreenCodeCodes) | Lang: en
- Topic: ML sports prediction (tennis) with an honest post-mortem: "insane 85% accuracy" turned out to be data leakage — leaking ELO features — publicly corrected. (DESCRIPTION)
- Methodology: ML classifier on tennis match data with ELO features among inputs; the leakage (future-information ELO in training features) is the entire lesson; corrected code promised on Patreon at lower accuracy. Exact architecture in video visuals. (DESCRIPTION)
- Artifacts: Jeff Sackmann's open tennis dataset — github.com/JeffSackmann/tenni... (truncated); corrected code promised on Patreon (not yet public). (DESCRIPTION)
- Track record: 85% accuracy claimed then RETRACTED as leakage artifact — a negative result, honestly labeled. (DESCRIPTION)
- Leaks: none.
- Verdict: LEARN — canonical leakage anti-pattern; catalogue in GSE's validation-hygiene notes. (DESCRIPTION)

### 14. MQ3qDhXhTxo — "How to Build a Predictive Model with Rithmm"
- Channel: appears to be Rithmm's own channel (INFERENCE) | Lang: en
- Topic: product tutorial/marketing for Rithmm's custom sports betting model builder. (DESCRIPTION)
- Methodology: adjustable stat weights in a blended model, predictions vs sportsbook lines to compute "Edge." No data sources, math, or validation detail — marketing level. (DESCRIPTION/INFERENCE)
- Artifacts: rithmm.com 7-day free trial. No repo/dataset/notebook. (DESCRIPTION)
- Track record: none. Leaks: none.
- Verdict: SKIP — closed-platform marketing; "weights + edge vs books" framing is standard. (DESCRIPTION)

### 15. 3cbYEPZlFUs — "I Built an AI Sports Betting Model in 20 Minutes — It Made Over $4,800 on NRL Last Season"
- Channel: not visible on fetched page (INFERENCE: small NRL/Australian betting channel) | Lang: en
- Topic: statistical value-betting model for NRL (Australian rugby league) using free data + ChatGPT/Gemini/Claude in Excel; creator notes value-betting principles transfer to US sports. (DESCRIPTION)
- Methodology: "statistical value betting model" assembled in 20 minutes — free historical data + three LLMs assisting in Excel. Mechanics (features, probability→odds mapping, staking) are in video visuals and Drive files. (DESCRIPTION/INFERENCE)
- Artifacts: Google Drive folder with video files — drive.google.com/drive/folder... (truncated); data source aussportsbetting.com/data. No GitHub repo. (DESCRIPTION)
- Track record: claims "over $4,800" profit on NRL "last season" (DESCRIPTION — unverified; no stakes/sample/units).
- Leaks: none.
- Verdict: FOLLOW-UP — downloadable model files + named free data source merit a live-browser watch of the value-bet mechanics before judging. (DESCRIPTION)

### 16. mMa_EunzHbg — "Building A Winning Sports Betting Model That Actually Works"
- Channel: Circles Off (The Hammer Betting Network; @CirclesOffHQ) | Lang: en
- Topic: pro bettor Rob Pizzola (The Hammer CEO) walks through his first-ever sports betting model — used on the NHL in 2017–18 — step by step, noting it wouldn't work in today's NHL. (DESCRIPTION)
- Methodology: step-by-step model-building process and "key strategies" from a working pro; concrete math/features in episode audio. The transferable part is the process discipline. (DESCRIPTION/INFERENCE)
- Artifacts: The Hammer Discord, newsletter (kirknewsletter.thehammer.bet), thehammer.bet, X @robpizzola; trial API key offer for "unified prediction market and sportsbook data" via bit.ly/4blx5BR (third-party vendor, terms unknown). (DESCRIPTION)
- Track record: "successfully used on the NHL in the 2017-2018 season" (DESCRIPTION — no numbers/ROI/sample).
- Leaks: none.
- Verdict: LEARN — a pro's end-to-end model-building process; process transfers across sports. (DESCRIPTION)

### 17. qgetf64aJTM — "Building The Model Is Easy... Knowing When To Use It Isn't | Off Script | Presented by ProphetX"
- Channel: Circles Off (The Hammer Betting Network) | Lang: en
- Topic: podcast discussion — a College Football Playoff simulator frames algorithm-vs-sharp-bettor tension; plus prediction markets, live betting, EV, industry news. Talk format, not a build tutorial. (DESCRIPTION)
- Methodology: none concrete — discussion of algorithmic vs human decision-making, EV, odds screens, AI's impact on sharps. CFP simulator referenced without build detail. (DESCRIPTION)
- Artifacts: sponsor/affiliate links only (ProphetX, edgeboost.bet, JuiceReel, Betstamp PRO); socials for the hosts. No repo/dataset/notebook. (DESCRIPTION)
- Track record: none. Leaks: none.
- Verdict: SKIP — no transferable methodology; conceptually adjacent to GSE's pick-selection/abstention lane but carries no method. (DESCRIPTION/INFERENCE)

### 18. pr7uicYs23Q — "I Hit 100% Of My Bets Using AI"
- Channel: not shown by fetch | Lang: en
- Topic: sports-betting product marketing (AI betting tool promo), not methodology content. (DESCRIPTION)
- Methodology: none disclosed — "based on public data, probability analysis" with no data source, model type, features, or validation; a sales funnel for a paid tool. (DESCRIPTION)
- Artifacts: https://linemaker.ai/ (trial signup); http://kalshi.com/r/LINEMAKER (referral). No repo/dataset/notebook. (DESCRIPTION)
- Track record: title claims "100%" (DESCRIPTION — no sample size/timeframe; unverifiable marketing).
- Leaks: none.
- Verdict: SKIP — paid-tool promo, zero disclosed methodology. (INFERENCE)

### 19. QXLJMfxqHDk — "Ep. 49: Perplexity Sports: AI's First Major Play in Real-Time Sports Data"
- Channel: not shown by fetch (INFERENCE: podcast/news series) | Lang: en
- Topic: product coverage of Perplexity Sports (AI sports-data Q&A product launch) — adjacent to sports data, not prediction methodology. (DESCRIPTION)
- Methodology: none — describes product features (real-time scores, play-by-play, NLP query processing, Tako partnership knowledge cards with 10-second refresh, planned "more sophisticated prediction models"). (DESCRIPTION)
- Artifacts: none. Track record: none. Leaks: none.
- Verdict: SKIP — product-news episode; no modeling methodology. (INFERENCE)

### 20. wJNl88zaWv0 — "Steve Kuhn, SportsPredic - How Sports Prediction Is Becoming a Skill"
- Channel: not shown by fetch | Lang: en
- Topic: sports-tech entrepreneurship interview — Steve Kuhn (Major League Pickleball builder) on "SportsPredict," a free-to-play platform with a global "SMART rating" (chess/FPL-inspired skill rating for forecasters) to measure prediction accuracy without gambling. Concept, not methodology. (DESCRIPTION)
- Methodology: none disclosed — chapters cover prediction markets, fantasy, storytelling; no math/data/models. (DESCRIPTION)
- Artifacts: none linked. Track record: none. Leaks: none.
- Verdict: SKIP — founder interview, no extractable method; SMART-rating concept noted but undetailed. (INFERENCE)

### 21. Gbtb6nUEAmo — "Txline Solana powered trading engine for sports prediction market - Edgerunner"
- Channel: not shown by fetch | Lang: en
- Topic: sports prediction-market TRADING engine (market microstructure, not game-outcome modeling) — on-topic for the market-microstructure/CLV lane. (DESCRIPTION)
- Methodology: deterministic low-latency engine — live market data ingestion, fair-value estimation, fixed-point dislocation strategy vs venue L2 order book, inline risk gates, paper-trade execution, deterministic replay for historical backtesting (live and replay share one engine path), decision/trade journal, explicit inactive state without config ("never invents prices"). Rust + Axum + React + WebSockets. Built for the Superteam × TxLINE Trading Tools & Agents Hackathon. (DESCRIPTION + SEARCH)
- Artifacts: https://github.com/akashjana18/edgerunner (license unverified — check before code reuse). (SEARCH)
- Track record: none claimed (paper-trade only; no backtest PnL published). (INFERENCE)
- Leaks: none.
- Verdict: LEARN — deterministic replay + dislocation + never-invents-prices discipline maps onto GSE's market-microstructure/CLV lane and sealed-split measurement. (INFERENCE)

### 22. oi_D-TnzW4Y — BLOCKED-429 (see blocked list)

### 23. DxfCH6-C4ZU — BLOCKED-429 (see blocked list)

### 24. LinkedIn — jasoncyip, "this is a gambling emergency" (https://www.linkedin.com/posts/jasoncyip_this-is-a-gambling-emergency-activity-7493753990040563712-X7sI)
- Author: Jason Yip, Ph.D. | Lang: en
- Topic: off-topic — design-ethics rant about a fintech app combining 401k retirement funds with sports betting/predictive markets ("dystopian future," "gambling emergency"); references a Coffeezilla report. No data/model content. (DESCRIPTION)
- Methodology: none. Artifacts: none relevant. Track record: none. Leaks: none.
- Verdict: SKIP. (DESCRIPTION)

---

## BATCH 2 — full per-video breakdown (Garrett's second batch, 14 unique)

### B1. Qu3QEz8PBUc — "CMU presents Sports Analytics 101: Using AI and Data Science to Change the Game"
- Channel: not shown by fetch (INFERENCE: Carnegie Mellon / CLP-affiliated upload) | Lang: en
- Topic: on-topic conceptually (sports analytics) but a public 101-level outreach lecture, not a methodology source. Presented by CMU's NSF AI Institute for Societal Decision Making with Carnegie Library of Pittsburgh (class dated March 31, hybrid, now passed). (DESCRIPTION + SEARCH)
- Methodology: none in the description — "track players, improve performance, gain a competitive edge." (DESCRIPTION)
- Artifacts: none (a "watch this next" companion video on draft-prediction mentioned). Track record: none. Leaks: none.
- Verdict: SKIP — intro-level public lecture; no extractable methodology. (INFERENCE)

### B2. GsfXAzfvJVM — "Build a Simple Expected Goals Model with Machine Learning and Python"
- Channel: not shown by fetch (INFERENCE from linked accounts: McKay Johns) | Lang: en
- Topic: on-topic — soccer expected-goals (xG) modeling tutorial (soccer, not NFL). (DESCRIPTION)
- Methodology: "simple expected goals model with machine learning and Python" — description gives no feature list/algorithm; the creator's corpus centers on shot features (distance, angle, play type) with Python ML (SEARCH: his xG explainer covers chance-quality factors; repos use StatsBomb open data + pandas/scikit-learn patterns). Exact features/algorithm in this video unverified. (DESCRIPTION + SEARCH/INFERENCE)
- Artifacts: data & code https://github.com/mckayjohns/youtube-videos (repo name via SEARCH; truncated in description); https://courses.mckayjohns.com/ ; https://mckayjohns.substack.com/. Licenses unchecked. (DESCRIPTION + SEARCH)
- Track record: none. Leaks: none.
- Verdict: LEARN — working code-backed xG recipe; shot-feature → probability construction discipline transfers to GSE's NFL metric building. (INFERENCE)

### B3. neBZ6huolkg — "Build an AI/ML Football Analysis system with YOLO, OpenCV, and Python"
- Channel: not shown by fetch (INFERENCE: Abdullah Tarek, via GitHub) | Lang: en
- Topic: on-topic — computer-vision tracking pipeline for football (soccer footage); directly relevant to GSE's tracking-data lane. (DESCRIPTION)
- Methodology: full CV pipeline (~4+ hour build): YOLOv8 object detection (players, referees, ball) via ultralytics + multi-frame trackers; custom YOLO fine-tuning on own dataset; KMeans pixel segmentation/clustering for team color assignment; optical flow for camera-movement measurement; CV2 perspective transformation to real-world meters; ball interpolation; per-player speed/distance estimation. (DESCRIPTION)
- Artifacts: https://github.com/abdullahtarek/football_analysis (via SEARCH; truncated in description); Roboflow football dataset https://universe.roboflow.com/roboflow/football-dataset (SEARCH); Kaggle competition dataset + Google Drive sample video linked but truncated/unrecoverable from available text. License unchecked. (DESCRIPTION + SEARCH)
- Track record: none (educational build; trained YOLOv5 weights shipped per SEARCH). Leaks: none.
- Verdict: LEARN — optical-flow camera compensation + perspective-transform-to-meters is the CV-tracking primitive GSE's NGS/tracking lane could adapt for broadcast-video movement metrics. (INFERENCE)

### B4. L23oIHZE14w — BLOCKED-429 (see blocked list)

### B5. QqVahw9tBfw — "Build an AI/ML NBA Basketball Analysis system with YOLO, OpenCV, and Python"
- Channel: not shown by fetch (INFERENCE: Abdullah Tarek) | Lang: en
- Topic: computer-vision basketball analytics — YOLO + tracking pipeline extracting passes, interceptions, ball possession %, player speed/distance, top-down tactical view from NBA footage. A tracking-data EXTRACTION system, not a prediction model. (DESCRIPTION)
- Methodology: YOLO player/ball detection across frames + trackers; fine-tune YOLO on custom basketball dataset; team assignment via jersey color with zero-shot image classification (HuggingFace); court keypoint detection; perspective transformation to top-down tactical map; speed/distance in real-world meters; ball interpolation; ball-acquisition/pass/interception detection. (DESCRIPTION)
- Artifacts: https://github.com/abdullahtarek/bask... (truncated — resolve); basketball detection dataset https://universe.roboflow.com/workspa... (truncated); court keypoint dataset https://universe.roboflow.com/fyp-3bw... (truncated); zero-shot classifier https://huggingface.co/patrickjohncyh... (truncated). (DESCRIPTION)
- Track record: none. Leaks: none.
- Verdict: LEARN — the detect → track → team-assign → court-keypoint → perspective-transform → metric-extraction architecture is the learnable kernel for building GSE's own tracking data from broadcast footage (same class as Next Gen Stats). (INFERENCE on fit; DESCRIPTION on method)

### B6. 6IjZQUh2nuA — "Machine Learning for Sports Science"
- Channel: not shown by fetch | Lang: en
- Topic: generic explainer — what ML is; how sports scientists might use it (talent ID, biomechanics, performance, injury prevention). No concrete methodology, data, or code. (DESCRIPTION)
- Methodology: none. Artifacts: none. Track record: none. Leaks: none.
- Verdict: SKIP — 101-level overview, no substance for the engine. (DESCRIPTION)

### B7. OUbxNLlC15w — BLOCKED-429 (see blocked list)

### B8. 8dttMoqzRF8 — "What Retail Taught Sports About AI, Data & the Fan Experience | Shripal Shah at Next League"
- Channel: Fourth Quarter Labs | Lang: en
- Topic: off-topic — sports-business podcast on retail lessons for fan experience, loyalty, personalization. No modeling/data methodology. (DESCRIPTION)
- Methodology: none. Artifacts: none. Track record: none. Leaks: none.
- Verdict: SKIP — business talk, nothing for the engine. (DESCRIPTION)

### B9. 7gtNErGOhjw — BLOCKED-429 (see blocked list)

### B10. A-H-_cf5yX8 — "Discovering His Own Fantasy Life | Alex Cupps of Fantasy Life & The CUPPS Model"
- Channel: Fantasy Football Unlimited (podcast) | Lang: en
- Topic: interview with Alex Cupps — UC Riverside Data Science master's; fantasy football was his thesis; creator of the CUPPS Model (Calculated Upside Player Prospecting System), an ML model identifying NFL prospects with high fantasy upside; won Peter Overzet's "So You Think You Can Tout" (135 applicants); joined Fantasy Life. (DESCRIPTION)
- Methodology: none in description — interview format; the model (features, algorithm, validation) lives in his thesis/work. (DESCRIPTION/INFERENCE)
- Artifacts: https://x.com/CuppsAnalytics ; YouTube @cuppsanalytics ; https://www.fantasylife.com/. (DESCRIPTION)
- Track record: none claimed in description. Leaks: none.
- Verdict: FOLLOW-UP — CUPPS is a named, thesis-backed NFL draft-prospect ML model directly relevant to GSE's draft/DFS lanes; the thesis/writeups need a follow-up read. (DESCRIPTION/INFERENCE)

### B11. vqOR6rPTyG8 — "Micro-Betting & Machine Learning: AI Meets Its Sports Tech Match at nVenue"
- Channel: Forging the Future (ftf.show) | Lang: en
- Topic: interview with Kelly Pracht, co-founder/CEO of nVenue — AI-powered live micro-betting engine. (DESCRIPTION)
- Methodology: none concrete (interview). Concepts named: "model vault for players and teams" + real-time live-game data feeding next-event probabilities; claims 1B+ predictions; on-screen predictive analytics for Apple TV+ Friday Night Baseball 2022–2023. (DESCRIPTION)
- Artifacts: nVenue.com ; https://www.ftf.show ; https://www.softeq.com. (DESCRIPTION)
- Track record: "over 1 billion predictions" claimed as volume, not accuracy. (DESCRIPTION)
- Leaks: none.
- Verdict: SKIP — founder interview with no disclosed math/features; the per-player/per-team "model vault" concept is noted but methodless. (DESCRIPTION/INFERENCE)

### B12. wabA1DtYUrM — BLOCKED-429 (see blocked list)

### B13. hiWQiTynYyU — "Hockey, AI, & the future of sports analysis! With David Radke | Approximately Correct #AI Podcast"
- Channel: Amii (Alberta Machine Intelligence Institute) | Lang: en
- Topic: podcast interview with Chicago Blackhawks' David Radke on ML in hockey analytics (tracking data, event data, player evaluation, team strategy). Talk format; no methodology in description. (DESCRIPTION)
- Methodology: none in description. Artifacts: https://www.amii.ca/podcast ; Spotify/Apple links (truncated). Track record: none. Leaks: none.
- Verdict: SKIP — talk-format podcast, no disclosed method; conceptually adjacent (tracking data) but nothing to feed the engine. (DESCRIPTION)

### B14. MzMRKV09dn4 — "Why Team Based Betting Models Suck - 93% in 30 minutes | EP 2 - How to build a sports betting model"
- Channel: not shown by fetch (rugby betting-model series) | Lang: en
- Topic: on-topic — Ep 2 of a rugby betting prediction-modeling series: team-based theories and approaches; data acquisition and validation protocol. (DESCRIPTION)
- Methodology: data pulled from an open free API discovered via Claude Research in Ep 1 (5 req/sec; ~20 min for the full pull); data-hygiene protocol — triple-verify everything, classify nulls per stat per league (Opta didn't collect = missing, not zero; e.g. Pro D2 lacks stats), archive-don't-delete, handle promotion/relegation explicitly; validation discipline — "seal off the last season... that's always gonna be our out of sample test element"; 2022–23 as seed data, two main train sets, last season held out. (DESCRIPTION — description includes a partial transcript)
- Artifacts: the API itself is unnamed in this episode (in Ep 1 — FOLLOW-UP to identify). No repo links in description. (DESCRIPTION)
- Track record: title's "93%" is a hook, not a stated backtest number (INFERENCE).
- Leaks: none.
- Verdict: LEARN — the seal-the-last-season holdout rule + null-classification + triple-verify hygiene is directly adoptable as engine data-ingestion standards; FOLLOW-UP on Ep 1 for the API name. (DESCRIPTION)

---

## Totals

- Items: 38 unique (37 YouTube + 1 LinkedIn)
- Assessed: 28 | BLOCKED-429: 10
- LEARN: 8 (batch 1: AULU9cRrWO0, LkJpNLIaeVk, mMa_EunzHbg, Gbtb6nUEAmo; batch 2: GsfXAzfvJVM, neBZ6huolkg, QqVahw9tBfw, MzMRKV09dn4)
- SKIP: 17 (batch 1: Vfd1gleEpLI, uvqXBqWJK5A, mfyXbWiNc0Y, lzcjK4jyAv8, _F7vl7PW0iE, kwvADOVn33U, MQ3qDhXhTxo, qgetf64aJTM, pr7uicYs23Q, QXLJMfxqHDk, wJNl88zaWv0 + LinkedIn jasoncyip; batch 2: Qu3QEz8PBUc, 6IjZQUh2nuA, 8dttMoqzRF8, vqOR6rPTyG8, hiWQiTynYyU)
- FOLLOW-UP: 4 (920RxyYaPHM, 3cbYEPZlFUs, A-H-_cf5yX8, MzMRKV09dn4's Ep-1 API)
- Method coverage: descriptions only — no transcript-level methodology was obtainable this run (YouTube transcript API IP-blocked; page fetches 429-throttled). Treat LEARN verdicts as description-grade; a transcript pass would deepen them.
