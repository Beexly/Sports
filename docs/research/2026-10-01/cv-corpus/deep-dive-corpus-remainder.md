# Deep-Dive: CV Corpus Remainder (sources 6, 7, 10–21)

Brief reads for the remainder of the 29-item drop. Each entry: what was read, what it establishes, verdict for the CV lane. Full per-source treatment was not warranted; nothing here changes the top-kernel ranking.

---

## 6. Stellantis Hub — Wonderlic story — SKIPPED (URL unresolvable), tangential
- **URL:** https://hub.stellantis.com/article/how-the-2019-wonderlic-scores-reshaped-nfl-drafts-and-workplace-hiring
- **What happened:** `browser.open` refused it ("requires a resolvable public HTTP(S) URL"); per policy, not retried via another route.
- **Subject (from the URL slug):** 2019 Wonderlic scores and NFL drafts / workplace hiring — combine cognitive testing. Tangential to the CV lane regardless of content. **Filed: no CV relevance; not chased further.**

## 7. Security Systems News — "In brief: NVIDIA secures agents, Mercury reveals gap, ZeroEyes enters UK" — READ, tangential
- **URL:** https://www.securitysystemsnews.com/article/in-brief-nvidia-secures-agents-mercury-reveals-gap-zeroeyes-enters-uk (published/updated Sept 30, 2026; read 163 of 427 lines — the sports-relevant portion).
- **What it establishes:** industry news roundup — NVIDIA Open Agent Safety Platform (agentic-AI governance, Anthropic/Cisco/CrowdStrike/etc. participating); Mercury Security 2026 access-controller report (561 professionals; 32% say cybersecurity features missing from controllers vs 21% a year earlier); **ZeroEyes expanding to the UK** via Samson Security — AI-powered visual firearm/knife detection on existing CCTV, human-verified alerts; Evolv walk-through metal detectors; stadium security programs (Raymond James, Northwest Stadium, Empower Field) listed on safetyact.gov.
- **CV-lane relevance:** none directly — this is **venue CCTV security** (weapons detection, access control), not field tracking. ZeroEyes is the only sports-adjacent CV company named, and its domain (threat detection on CCTV) does not overlap our detector/association/homography gaps.
- **Filed: competitive awareness only — venue-security CV is a different lane; no kernels.**

## 10. Amazon Science — "A decade of NFL Next Gen Stats innovation" — READ (full, 158 lines)
- **URL:** https://www.amazon.science/blog/a-decade-of-nfl-next-gen-stats-innovation
- **Pose-estimation architecture (the ceiling reference):** RFID chips in every shoulder-pad set + inside the football; 20+ UWB receivers per stadium; **players at 10 Hz, ball at 25 Hz, "accurate to a few inches."** Optical tracking: **4K cameras, 16 angles per venue, x/y/z for 29 body parts per player at 60 fps** — "first year of full installation, full capture," data internal while validated. Pipeline: local capture → on-site processing (**~700 ms**) → cloud ML (**<100 ms**) → **capture-to-analysis under 1 second** (Thursday Night Football's ~2s broadcast delay makes it effectively real time). Ultimate goal: **hybrid RFID (center of mass) + optical skeleton**, algorithms filling gaps when players obscure each other.
- **Model portfolio:** 75+ ML models; **completion probability** (2018, XGBoost on SageMaker: QB pressure, throw depth, receiver separation, sideline proximity); **tackle probability** (speed, angle, distance, leverage, pursuit at contact; yields missed-tackle quantification, yards saved/conceded); **defensive alerts** (acceleration patterns + presnap shifts + down/distance/game state → generative-AI rusher prediction, red-circle broadcast overlays). RYOE came from the 2020 Big Data Bowl (<10 months from winning solution to broadcast graphic).
- **Safety numbers:** dynamic kickoff — 2025 return rate **75%** (from 32% in 2024); **1,157 more plays**, lower-extremity injuries **down 35%**, concussions below the old format.
- **CV-lane verdict:** strategic ceiling, not implementable — the data (RFID + 16-angle 4K) is NFL-internal. The **hybrid-identity doctrine** (RFID center-of-mass + optical skeleton + gap-filling) is the architecture to reason about; our broadcast-only equivalent is motion-continuity + OCR re-ID (deep-dive-harshraj-linkedin.md). The **sub-second pipeline budget** (700ms + 100ms) is the latency bar to cite for any real-time GSE tracking claim.

## 11. AWS Media Blog — "Building a Digital Athlete" — READ (full, 90 lines)
- **URL:** https://aws.amazon.com/blogs/media/building-a-digital-athlete-using-ai-to-rewrite-the-playbook-on-nfl-player-safety/
- **Camera-rig scale (data-scale reference):** **38 synchronized cameras in a ring per stadium, 5K video at 60 fps**; **~6.8M video frames/week**, **~100M player locations/positions documented per week**; practices: **15,000 miles of tracking/week ≈ 500M+ data points (10 Hz)**.
- **Method shape:** AI taught helmets → helmet impacts → **cross-reference with NGS data to determine the players involved**; "exponentially faster and more reliable than humans" at identifying/classifying helmet collisions; Risk Mitigation Modeling (ideal training volume vs injury risk); 3D Pose Estimation in development; concussion-force measurement models in development.
- **CV-lane verdict:** scale reference only — the rig is not replicable from broadcast. The **"teach helmets, then impacts, then cross-reference with tracking for identity"** sequencing is a useful curriculum metaphor for our own pipeline (detect → associate → identify).

## 12. HuddleVision (huddlevision.ai) — READ (full, 70 lines)
- **Product surface:** custom software for football data companies; "SOTA proprietary models" claimed on **field registration, player detection and tracking, group activity recognition**; **speed/acceleration extraction from game footage**; **fine-tuning on client footage**; custom metrics; maintenance contracts. **No pricing published.**
- **Partnership (July 17, 2024):** with **Tracking Football** — TF Triple Verified Metric combining combine COM™, track-and-field PAI®, and a new MPH metric, for HS/college recruiting.
- **CV-lane verdict:** competitive intel only — proprietary, no method detail, no code. Confirms the commercial shape "field registration + detection/tracking + speed" as the product bundle our open pipeline mirrors.

## 13. Leaders in Sport — Genius Sports broadcast CV — READ (full, 71 lines)
- **What it establishes:** Genius Sports (exclusive distributor of **NFL Official League Data**, incl. Next Gen Stats) powers Prime Video / NFL+ with an **AI + CV pipeline synchronizing "billions of data points" with live video in real time**; launched **BetVision** (low-latency betting stream + wager + stats in one sportsbook-app interface). 93 of the top 100 US broadcasts in 2023 were NFL.
- **CV-lane verdict:** competitive intel only — proprietary, no method. The "CV + NGS synced to broadcast" product shape is the commercial end-state our pipeline must be architected to feed (real-time sync is the requirement, not the method).

## 14. nfl.com — NFL+AWS AI Challenge awards page — READ (full, via curl)
- **URL:** https://www.nfl.com/playerhealthandsafety/equipment-and-innovation/aws-partnership/nfl-and-aws-artificial-intelligence-challenge-awards-100-000-for-new-ways-to-aut
- **What it establishes (published Jan 14, 2022):** the player-identification challenge (follow-up to the 2020 impact-detection competition): winners' models **automate injury review — "more comprehensive, accurate and 83 times faster than a person conducting the analysis manually."** 1,000+ analysts from 65 countries; **$100K total: Kippei Matsuda (Osaka) $50K**, Takuya Ito (Tokyo) $25K, 3rd/4th/5th $13K/$7K/$5K. Models feed the **Digital Athlete**.
- **CV-lane verdict:** the "83× faster than a human" number is the automation benchmark to cite; winner names recorded for potential solution-write-up follow-up (their approaches are the state of the art for helmet-impact player ID).

## 15. nfl.com — NFL+AWS AI Challenge launch press release — READ (full, via curl)
- **URL:** https://www.nfl.com/playerhealthandsafety/resources/press-releases/nfl-and-aws-launch-artificial-intelligence-challenge-to-crowdsource-ways-to-auto
- **What it establishes (published Aug 10, 2021):** challenge to **automatically identify players from NFL game footage** (built on the prior season's impact-detection competition: **~7,800 submissions**, solutions now used in Digital Athlete work); **$100K, open through Nov 2, 2021**; Kaggle: `kaggle.com/c/nfl-health-and-safety-helmet-assignment/`; Jeff Miller / Priya Ponnapalli quotes framing it as "foundational" for per-player injury-risk identification.
- **CV-lane verdict:** context for the Kaggle impact-detection deep-dive (the 2021 follow-up is the player-ID task our re-ID work parallels); no new kernels.

## 16. Policy Commons — "How the NFL is using AI to evaluate players" — GATED
- **URL:** https://policycommons.net/artifacts/4144146/how-the-nfl-is-using-ai-to-evaluate-players/4953211/
- **What happened:** `browser.open` returned 403; one curl retry with a browser UA also returned **403**. Per policy, not retried further. **Nothing about this source is established beyond its title.**

## 17. Microsoft Source — Seahawks Game Analytics Dashboard — READ (full, 120 lines)
- **URL:** https://news.microsoft.com/source/features/digital-transformation/nfl-game-analytics-dashboard/
- **What it establishes:** Seahawks' **Excel-based Game Analytics Dashboard with Copilot integration** + AI-powered **Sideline Viewing System (SVS)**; analysts "cast" live tables/graphs to SVS sideline devices; VP Research & Analytics Patrick Ward builds game-situation models; anecdotes (Week 15 Colts timeout decision, OT 2-point call vs Rams). Microsoft is an official AI partner of the Seahawks.
- **CV-lane verdict:** tangential — this is **decision-support/analytics infrastructure**, not detection or tracking. Noted for completeness; no kernels. (The "anticipate, don't react" analyst doctrine is culturally aligned with our tendency layer but is not a CV method.)

## 18. YouTube (tIDJDkRTRPQ) — title verified via oEmbed, content UNVERIFIED
- **oEmbed result:** **"AWS re:Invent 2020: How the NFL builds computer vision training datasets at scale"**, channel **AWS Events** (`youtube.com/@AWSEventsChannel`).
- **What this means:** the video is *directly on-topic* (NFL CV training-dataset construction at scale) — more relevant than the prior pass assumed.
- **Video content: UNVERIFIED** — cannot be watched by this agent. **Recommended follow-up:** locate a transcript or re:Invent session notes via web search (not done here — out of this task's read scope, flagged for the parent).

## 19. safetyact.gov — READ (homepage), irrelevant — confirmed
- **URL:** https://www.safetyact.gov/
- **What it establishes:** DHS SAFETY Act — registry of approved anti-terrorism technologies: Evolv Express walk-through metal detectors, airport security programs, vehicle barriers, **stadium security programs** (Raymond James, Rate Field, Northwest Stadium, Empower Field at Mile High), ROC Watch (AI face/firearm detection on CCTV).
- **CV-lane verdict:** venue-security technology listings; **no field-tracking relevance. Filed, not chased.**

## 20. x.com/GeniusSports — GATED (no read path)
- Per task instruction: no live-browser/X-CLI available to this agent; **not attempted, marked GATED.** One line, as directed.

## 21. PMC13471965 — confirmed the ALS paper (wrong link), one line
- **"At-Home Versus in-Clinic Vital Capacity Measurement: Insights From the HEALEY ALS Platform Trial"** (Muscle & Nerve, CC BY-NC-ND 4.0) — amyotrophic lateral sclerosis respiratory study; **not sports, not CV. Wrong link in the drop; do not chase.**
