# Patent Forensics — Sharp Labs football-video family
**Date:** September 29, 2026 · **Analyst:** Motif (subagent) · **Read-only research**

**Bottom line up front:** Sharp Labs of America (Camas, Washington) built a real, working football/broadcast-video summarization technology ("HiMpact Sports") aimed at differentiating Sharp LCD TVs. The company stopped extending and maintaining the patent family long before the patents' term ran out: the last family filings were in 2007, several sibling applications were abandoned, and **every granted patent in this family was allowed to lapse for non-payment of maintenance fees** ("Expired — Fee Related"), not by reaching natural 20-year expiry. Contemporaneous reporting shows the sports-summarization IP had to be spun into a licensing venture because Sharp Corp. in Japan wouldn't develop it — and the venture appears not to have gained lasting commercial traction. Sharp then entered a decade of financial crisis (2012–2016), exited the US TV business, and was taken over by Foxconn; a former employee review says the Labs entity was ultimately eliminated after a reorganization and R&D discontinued. Meanwhile the technology — handcrafted broadcast-heuristics (green-field detection, converging field lines, color-histogram scene cuts, logo-transition replay detection) — was overtaken by learned/ML methods, whose later patents cite this work.

**Important correction:** The eighth patent on the list, `US20060132487A1`, is **not a Sharp application**. It was filed by and granted to Object Prediction Technologies LLC as `US7609855B2` (issued October 27, 2009, inventors Jason Sada, Ping-Sing Tsai, Todd Meijome) and is now also expired for non-payment of fees. Details in section 8.

---

## 1. US7499077B2 — "Automatic summarization of football video based on ball in play and out of play"
**Link:** https://patents.google.com/patent/US7499077B2/en
**Family:** 25464625 (the parent of the football-summary family) · **Priority:** June 4, 2001 · **Filed:** August 20, 2001 · **Granted:** March 3, 2009
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry December 6, 2022)

### What it covers (plain English)
This is the flagship of the family. It automatically builds a football-game summary from **play segments** — video sequences bounded by when the ball is in play vs. out of play. It infers segment starts by comparing sequential video frames and by calibrating against the field color (predominantly-green detection); claim 1 explicitly covers methods that do this *without* comparing to model play sequences, and claim 2 specifies green field color.

### Implementation paths it does NOT cover
- Summaries built from **player or ball tracking** (motion trajectories, positions).
- **Learned/classifier-based** play-boundary detection (HMM, CNN, temporal models) — the claims are handcrafted color/frame-difference heuristics.
- Segment boundaries from **scoreboard/clock OCR, audio cues (whistle, crowd), broadcast metadata, or league data feeds**.
- Sports other than football where "play vs. non-play" doesn't map to the claimed field-color/ball-in-play grammar.
- Post-2012 implementations that never use field-color calibration or green detection as a start cue.

### Limitations (some stated in the patent itself)
- The patent's background **admits the hard parts outright**: many unpredictable play types; player motion is inconsistent and hard to track; the ball is often obscured and "difficult, if not impossible" to track; pre-play movement resembles real action; complex event models are difficult, non-robust, overly selective, and likely to miss relevant content.
- The architecture assumes **conventional broadcast grammar**: a side camera near the snap, green field, visible field lines, zoom/pan/tilt, scene cuts, and audio/commercial cues. Non-standard camera work, non-green fields (snow, turf discoloration), heavy occlusion, or production styles that break these cues degrade it.
- Field-color calibration is light-sensitive: it must be re-calibrated as illumination changes.

### Why it expired
**Fee lapse, not natural expiry.** Google shows the patent's adjusted term ran to December 6, 2022, but the status is "Expired — Fee Related" — Sharp stopped paying maintenance fees (the 12-year fee would have been due around 2021), so the patent died years before its term ran out. Sharp had to actively decide *not* to pay.

### Relationship
Parent of the family (ID 25464625); the seven 2005-era descendants are **divisionals** of the parent application (per Google Patents' "divisions" table), not continuations.

---

## 2. US7312812B2 — "Method for detecting the start of a football segment"
**Link:** https://patents.google.com/patent/US7312812B2/en
**Family:** 25464625 · **Filed:** January 5, 2005 · **Granted:** December 25, 2007
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry March 13, 2022)

### What it covers (plain English)
A divisional of the parent. It identifies the start of a football segment by finding **field lines converging toward the same off-field point** (the vanishing-point cue of a wide shot of the lined field). Dependent claims specify white lines on a green background, detection within the same frame, and convergence at a point outside the frame.

### Implementation paths it does NOT cover
- Generic **learned** play-boundary detection (any ML classifier, HMM, CNN).
- Boundary cues from **scoreboard/clock alignment, audio, broadcast metadata, or player/ball tracking**.
- Any method that doesn't use line-convergence geometry as the start cue — e.g., pure motion-energy, shot-boundary, or semantic classifiers.
- Fields where lines aren't visible (snow-covered field, obscured markings, stadium close-ups).

### Limitations
- Depends on **visible, detectable field lines converging to a common point** — fails when lines are occluded, worn, snow-covered, or absent (practice footage, alternative camera angles).
- White-on-green color assumption; turf or lighting variants need retuning.
- Single-cue heuristic: it is a start-of-segment detector, not a full summarization system; false starts from any line-like geometry are the known risk of such detectors.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related"; Sharp stopped paying maintenance fees before the 2022 term date.

### Relationship
Division of parent application US09/933,862 (US7499077B2).

---

## 3. US7639275B2 — "Method for detecting the start of a football segment using a sliding window"
**Link:** https://patents.google.com/patent/US7639275B2/en
**Family:** 25464625 · **Filed:** January 3, 2005 · **Granted:** December 29, 2009
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry August 12, 2022)

### What it covers (plain English)
A divisional of the parent. It detects a play start from a **single frame**, then verifies it through a **fixed sliding window of nearby frames**, each processed individually; it declares a "hiking frame" when a threshold *below 100%* of the window's frames qualifies (dependent claim: **70%**). Zoom/lack-of-motion cues are claimed alongside.

### Implementation paths it does NOT cover
- **Learned temporal models** (LSTMs, transformers, temporal CNNs) for play-start detection.
- **Variable or adaptive windows** — the claims lock to a fixed sliding-window structure.
- Metadata-synchronized boundaries, ball/player tracking, or any play-start evidence not following the single-frame-candidate + sliding-window verification structure.

### Limitations
- The fixed-window / sub-100%-threshold design is a handcrafted temporal filter: it trades precision for robustness and will misfire when play-start evidence is spread over different timescales (hurry-up offense, delayed hikes, no-huddle).
- Dependent on per-frame processing with no motion context beyond the window — camera cuts or occlusions inside the window skew the vote.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related" well before the adjusted 2022 term.

### Relationship
Divisional of parent US7499077B2 (family 25464625).

---

## 4. US7474331B2 — "Method for detecting the end of a football segment"
**Link:** https://patents.google.com/patent/US7474331B2/en
**Family:** 25464625 · **Filed:** January 3, 2005 · **Granted:** January 6, 2009
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry February 28, 2023)

### What it covers (plain English)
A divisional of the parent. It identifies the **last frame of a play** via scene-change detection using a **dynamic threshold equal to the mean frame-to-frame color-histogram difference plus 5 or 6 standard deviations**.

### Implementation paths it does NOT cover
- **Semantic** end-of-play recognition (tackle detection, whistle, player dispersal).
- **Whistle/clock/OCR/metadata** cues; **neural shot-boundary models**; any materially different adaptive-threshold formula.
- End-of-play cues that don't manifest as an abrupt histogram shift (gradual camera pull-away, continuous coverage).

### Limitations
- Color-histogram scene-change detection is a **shot-boundary** detector, not a play-end detector: any production cut (replay insert, graphic wipe, crowd shot) can trip it. The 5–6σ threshold is tuned for a specific production grammar.
- Lighting changes, flash photography, or on-screen graphics produce histogram spikes unrelated to play ends.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related"; Sharp stopped paying before the February 2023 term date.

### Relationship
Divisional of parent US7499077B2 (family 25464625).

---

## 5. US8018491B2 — "Method for automatic summarization of football video based on full-speed and slow-motion segments"
**Link:** https://patents.google.com/patent/US8018491B2/en
**Family:** 25464625 · **Filed:** January 3, 2005 · **Granted:** September 13, 2011
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry June 24, 2026)

### What it covers (plain English)
A divisional of the parent. It identifies full-speed vs. slow-motion play segments using **at least one of: green-field detection, converging parallel field lines, or zoom**; the user can choose full-speed only, replays only, or both.

### Implementation paths it does NOT cover
- Summaries using **learned event embeddings**, scoreboard/OCR, audio, metadata, or ball/player tracking.
- Replay detection via **slow-motion cadence / frame-duplication analysis alone**, logo-free fingerprinting, or broadcaster API markers.
- Any interface or summarizer that doesn't segment on the claimed three-cue scheme.

### Limitations
- The three cues (green field, converging lines, zoom) are all **production-grammar heuristics** — brittle outside standard broadcast coverage.
- The full-speed/replay distinction depends on reliably classifying segment type from low-level visual cues; modern replays are often detected via frame-cadence or logos, not field geometry.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related" — maintenance fees stopped before the adjusted June 2026 term.

### Relationship
Divisional of parent US7499077B2 (family 25464625). The last family filing activity was 2007 (a later divisional, US20080109848A1, was abandoned).

---

## 6. US7474698B2 — "Method for detection and identification of replays in sports video"
**Link:** https://patents.google.com/patent/US7474698B2/en
**Family:** 26947257 (replay family) · **Priority:** October 19, 2001 · **Filed:** September 27, 2002 · **Granted:** January 6, 2009
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry December 8, 2024)

### What it covers (plain English)
Parent of the replay family. It identifies **sports replays bracketed by starting and ending logo transitions** — the graphical "bumper" (logo wipe) a broadcaster uses to enter/exit a replay; replay frames repeat an earlier video sequence. Dependents cover graphical logos, logo size/shape/position, automatic characterization, and replay-only summaries.

### Implementation paths it does NOT cover
- Replay detection from **frame similarity alone**, slow-motion cadence analysis, audio cues, scoreboard changes, OCR, broadcast metadata/API markers.
- **Graphics-free replays** (no logo bumpers) or direct **neural replay classification**.
- Fingerprint matching that never looks for logo transitions.

### Limitations
- **Depends on logo-transition production conventions.** Broadcasters that don't use logo bumpers, change their graphics package, or use non-logo transitions (whips, morphs) break the detector. Every graphics rebrand is a retraining/recalibration event.
- False positives from any repeating graphic sequence (sponsored segments, stat boards) that resembles a logo transition.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related"; Sharp stopped paying before the December 2024 term date.

---

## 7. US7653131B2 — "Method for detection of replays in sports video using learned logo transitions"
**Link:** https://patents.google.com/patent/US7653131B2/en
**Family:** 26947257 · **Filed:** December 2, 2005 · **Granted:** January 26, 2010
**Assignee:** Sharp Laboratories of America Inc. → now shown as Sharp Corp.
**Status:** **Expired — Fee Related** (adjusted expiry November 11, 2024)

### What it covers (plain English)
A division of US7474698B2. It starts from an **identified slow-motion replay**, **learns a nearby starting/ending logo transition** (some claims limit the search to within 1,000 frames), then uses that learned logo to find other replay segments and build a shorter summary.

### Implementation paths it does NOT cover
- **Direct neural replay classification** or fingerprint matching without logos.
- Metadata/broadcast markers, OCR/scoreboard cues, or audio-based replay detection.
- Any system that doesn't bootstrap from a known slow-motion replay.

### Limitations
- The bootstrap requirement (start from a *known* slow-motion replay) limits fully-automatic use; the 1,000-frame search window is a hard engineering guess that can miss transitions in long commercial/promotional gaps.
- Same production-convention fragility as the parent: logo redesigns, bumper-less broadcasts, or transitions outside the search window all fail.
- "Learned" here means template-matching a logo, not machine learning in the modern sense.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related" before the November 2024 term date.

### Relationship
Division of US7474698B2 (family 26947257).

---

## 8. US20060132487A1 / US7609855B2 — "Method of analyzing moving objects using a vanishing point algorithm"
**Links:** https://patents.google.com/patent/US20060132487A1/en · https://patents.google.com/patent/US7609855B2/en
**Priority:** November 30, 2004 · **Filed:** November 30, 2005 · **Published:** June 22, 2006 · **Granted:** October 27, 2009
**Assignee: Object Prediction Technologies LLC — NOT Sharp.** (Original assignee: Object Prediction Tech LLC; inventors: Jason Sada, Ping-Sing Tsai, Todd Meijome.)
**Status:** **Granted as US7609855B2; now Expired — Fee Related** (adjusted expiry June 30, 2027)

### Correction
This application was **not an abandoned Sharp filing**. It matured into granted US patent US7609855B2, issued October 27, 2009 to a different company entirely. Do not list it as evidence of Sharp abandoning a football-video line.

### What it covers (plain English)
Video capture → foreground/background segmentation → object tracking → perspective mapping from an image quadrilateral to a physical rectangle using one or two vanishing points → position/velocity/acceleration calculation. Its classification even includes "Sports video; Sports image" (G06T2207/30221); the spec's FIG. 1 is a frame from a football game.

### What it does NOT cover (design space outside it)
- Calibration-free or moving-camera methods: the claims assume a **fixed scene geometry** (stationary reference elements, a constant region of interest).
- Deep-learning detectors/trackers; appearance-based re-identification; 3D pose estimation.
- Any tracking that doesn't map the image quadrilateral to a physical rectangle via vanishing-point geometry.

### Limitations (stated or directly implied in the text)
- The text admits the **multi-object association problem**: unwanted moving objects must be separated (its example: a jet flying past in the sky while tracking a football player). It uses color/luminosity thresholds, background subtraction, connected components, proximity and motion-similarity grouping, and fixed scene geometry.
- Brittle under: camera movement (breaks fixed scene geometry), occlusion, shadows/illumination changes (color-threshold segmentation), merged players (connected components merge them), and moving backgrounds (background subtraction fails). Label these as engineering inference, not all stated in text.

### Why it expired
**Fee lapse, not natural expiry.** "Expired — Fee Related" — Object Prediction Technologies stopped paying maintenance fees before the adjusted June 30, 2027 term.

---

## WHY THEY STOPPED — Sharp verdict

The evidence supports a **combination** of causes, not a single clean one. Each factor below is labeled by evidence strength:

**1. Commercial orphaning (strong, contemporaneous evidence).** In 2003–2004, EDN reported that Sharp Labs was developing software to summarize a football game "to every play in about 45 minutes" as part of its mission to differentiate Sharp LCD TVs in the US market (275 employees, 286 patents secured). But when founder/director Jon Clemens retired, he formed **Sharp Technology Ventures** specifically to license lab technologies that had "languished" because they were "technologies that, for one reason or another, Sharp Corp. in Japan is not going to develop." The sports summarizer — branded **HiMpact Sports** (algorithms that "understand the semantics of baseball, football and soccer," boiling a 3-hour game to 45 minutes with automatic indexing, random-access play-by-play navigation, and annotated summaries) — was the venture's flagship IP, with ESPN described as the likely first licensee. There is no evidence the venture's licensing effort produced durable commercial products. **Inference:** the parent company never turned the lab's sports-video work into a product; the licensing spin-out was a fallback, and it evidently failed to sustain the research line.

**2. Sharp's financial crisis and retrenchment (strong evidence of context; lab-level causation unverified).** Sharp posted a $1.2B quarterly loss and announced 5,000 job cuts in August 2012 — its first such cuts in over five decades — followed by a record $4.7B annual net loss, ~$13B in losses over four years, and $8.2B in debt. It sold its unprofitable US TV business during restructuring, and Foxconn completed a 66% controlling acquisition in 2016. A former employee review (February 2020) states the Labs entity "was eliminated after reorganization" and that "research and development activities were discontinued." **Caution:** no source directly connects the Sharp Labs Camas retrenchment to the specific patent-fee lapses; that link is plausible but unverified. Do not assert it as fact.

**3. The patent family was stopped deliberately, not exhausted (proven by status data).** All seven listed Sharp grants are marked **Expired — Fee Related** — maintenance fees were deliberately not paid. The family's last filings were in 2007; three 2005 siblings and one 2007 sibling were abandoned (US20050128361A1, US20050117021A1, US20050138673A1, US20080109848A1). Nobody maintained a portfolio they still valued. The natural-expiry story ("they just aged out") is wrong for every single grant.

**4. Technical supersession (supported by later art, not by Sharp's own statements).** Later patents citing this family move to learned logo recognition, machine-learning highlight detection, CNN sports-event detection, and scoreboard extraction — i.e., the field moved to learned methods while Sharp's claims were locked to handcrafted broadcast heuristics. This is evidence the *field* moved on, not proof of why Sharp stopped paying fees; pair it with factors 1–2 rather than presenting it alone.

**5. The core design limitation.** Every claim in the football family depends on **broadcast-production conventions and low-level handcrafted cues**: green field, visible converging white field lines, side-camera snap framing, zoom cessation, color-histogram scene cuts, and replay-logo bumpers. The parent's own background admits the approach's weak points: unpredictable play types, inconsistent player motion, an often-unseeable ball, pre-play movement that mimics action, and event models that are "difficult, non-robust, overly selective, and likely to miss relevant content." Sharp's own engineers concluded that deterministic rule-based inference "is too difficult to write rules for that cover every situation," and moved toward probabilistic methods (HMM) in the HiMpact prototypes — the handcrafted-heuristic line in these patents was the technology they were already outgrowing.

### Guidance for GSE building on these expired ideas
- The ideas are genuinely **expired and unencumbered** (all fee-lapsed; the field is open), but treat them as **negative knowledge**: they map out the brittle production-grammar assumptions to avoid.
- A modern reimplementation should use **multimodal learned boundaries** — scoreboard/clock OCR, audio events, league data feeds, and visual models — with explicit uncertainty handling, rather than treating any single broadcast cue (green field, line convergence, logo bumpers) as ground truth.
- The HiMpact story is also a **go-to-market caution**: Sharp had working technology and an ESPN relationship and still failed to commercialize. For GSE, the distribution and product surface matter at least as much as the summarization algorithm.

### Sources
- Google Patents pages for each patent (status, dates, claims, family IDs 25464625 and 26947257)
- EDN, "Sharp Labs casting wide research net" (football summaries to ~45 min; 275 employees): https://www.eetimes.com/sharp-labs-casting-wide-research-net/
- EDN, "In Sharp Labs, quest is always tomorrow's tech" (sports-summary prototypes for baseball/football/soccer): https://www.edn.com/in-sharp-labs-quest-is-always-tomorrows-tech/
- EDN, "Sharp unit to license IP from U.S. labs" (Sharp Technology Ventures; HiMpact Sports; ESPN interest; Sharp Corp. Japan "is not going to develop" it): https://www.edn.com/sharp-unit-to-license-ip-from-u-s-labs/
- TV Technology, "New technology promises to streamline sports viewing" (HiMpact/HiMPACT Coach; broadcaster licensing discussions): https://www.tvtechnology.com/news/new-technology-promises-to-streamline-sports-viewing
- Marketplace, 2012-08-02 ($1.2B quarterly loss, 5,000 job cuts): https://www.marketplace.org/story/2012/08/02/japanese-electronic-companies-suffer-losses
- IndustryWeek, 2012 ($4.7B net loss, 5,000 cuts): https://www.industryweek.com/leadership/companies-executives/article/21957874/sharp-to-cut-5000-jobs-by-march
- IndustryWeek/AFP (TV/LCD competition, wage reductions, stock -55% in 2012): http://www.industryweek.com/the-economy/article/21959402/sharp-panasonic-post-massive-losses
- Electronics Weekly, 2015 (~$13B losses over four years, $8.2B debt, Foxconn as survival option): https://www.electronicsweekly.com/blogs/mannerisms/shenanigans/11843-2015-05/
- The Recycler, 2016-07-29 (US TV business sold; Foxconn 66% stake, ¥389B): https://archive.therecycler.com/2016/07/29/sharp-reportedly-cuts-losses/
- Indeed company reviews (Feb 2020: entity eliminated after reorganization, R&D discontinued): https://www.indeed.com/cmp/Sharp-Laboratories-of-America

*Evidence vs. inference labels are in the text. The direct link between Sharp's corporate retrenchment and these specific fee lapses remains unverified and is flagged as such.*
