# Patent Forensics: Why They Stopped — GSE Film-Pipeline Patents
**Research date:** 2026-09-29 · **Read-only research** · **Analyst:** Motif + two forensic subagents
**Question from Garrett:** before we build on these expired patents, understand the FULL scope — why did the original owners stop? Dead end? Funding? Acquisition? Just term expiry?

**Correction to the earlier report:** US20060132487A1 ("vanishing-point camera analysis") was listed as an abandoned Sharp application. It is NOT Sharp — it was filed by Object Prediction Technologies LLC and GRANTED as US7609855B2 (Oct 27, 2009, inventors Sada/Tsai/Meijome), now expired for non-payment of fees. It's still free prior art for our purposes — arguably cleaner than assumed. Details in §8.

---

## PART 1 — Sportvision/FOX telestration family (yellow first-down-line lineage)

**Headline: normal 20-year term expiry on a commercial winner. The tech won, the company was acquired, the patents aged out.**

| Patent | Title | Filed → Granted | Status |
|---|---|---|---|
| [US7075556B1](https://patents.google.com/patent/US7075556B1/en) | Telestrator system | 1999-10-21 → 2006-07-11 | Expired – Lifetime (2019) |
| [US5953077A](https://patents.google.com/patent/US5953077A/en) | System for displaying an object not visible to a camera (FoxTrax glowing puck) | 1997-01-17 → 1999-09-14 | Expired – Lifetime (2017) |
| [US6133946A](https://patents.google.com/patent/US6133946A/en) | System for determining the position of an object (jump-height triangulation) | 1998-03-11 → 2000-10-17 | Expired – Lifetime (2018) |
| [US6292130B1](https://patents.google.com/patent/US6292130B1/en) | System for determining the speed/timing of an object (radar bat-speed) | 1999-04-09 → 2001-09-18 | Expired – Lifetime (2019) |
| [US6229550B1](https://patents.google.com/patent/US6229550B1/en) | System for blending a graphic (yellow-line compositing engine) | 1998-09-24 → 2001-05-08 | Expired – Lifetime (2018) |
| [US6466275B1](https://patents.google.com/patent/US6466275B1/en) | Enhancing video with event info (remote-studio processing) | 1999-04-16 → 2002-10-15 | Expired – Lifetime (2019) |

**What the claims actually cover (plain English):** human-drawn telestration smoothed and converted to 3D field coordinates so arrows stick to the field during camera moves (US7075556); auto-revealing an obstructed target via a separate sensor + barrier geometry (US5953077); operator-pointed two-camera triangulation for vertical position like jump height (US6133946); six-radar Doppler analysis for bat speed/pitch timing (US6292130); color-sampling compositing with inclusion/exclusion colors so the yellow line passes *under* players (US6229550); splitting the pipeline so cameras only carry sensors and a remote studio does the graphics math (US6466275).

**What the claims do NOT cover (our walk-through gaps):** automatic drawing *generation* without a human hand (telestrator claims are operator-triggered); non-color-map compositing (depth buffers, neural segmentation masks); radar-free speed measurement (pure CV); all-at-the-venue processing (the remote claims require the split); position determination without a separate sensor or barrier check. **An automatic, no-stadium-hardware, segmentation-based pipeline does not read on these claims.**

### The corporate story (evidence)
- **The yellow line won.** Emmy-winning, adopted across NFL broadcasts; SMT's own 2018 Super Bowl LII coverage confirms the 1st & Ten line still live on NBC/SNF/TNF/SkyCam/goal-line cams *plus* new real-space graphics (route painting, Next Gen Stats overlays). Active development, not maintenance.
- **SMT (SportsMEDIA Technology) acquired 100% of Sportvision, deal closed October 4, 2016** (Eldridge Industries, Vicente Capital Partners financing; reported >$25M). Sportvision rebranded as SMT; all six patents assigned to Sportsmedia Technology Corp in March 2017.
- **New filing tapered after telestrator continuations through 2010** (US7492363B2/2005, US7750901B2/2009, US7928976B2/2010) — consistent with a company entering lender-restructuring years (portfolio repeatedly pledged as loan collateral 2004–2015: Comerica, Hercules, Escalate, Velocity, Multiplier) heading toward sale.
- **1999–2002 Sportvision/Fox vs. PVI litigation settled with cross-licensing** — PVI's sensorless image-recognition approach (L-VIS) was never blocked; sensor-free implementations were always legal.
- **Lane-by-lane supersession:** PITCHf/x → Statcast 2017 (SMT later sued MLBAM over it); glowing puck → viewer rejection (product dead end, not patent failure); RFID/Next Gen Stats for player tracking.

### WHY THEY STOPPED — Sportvision verdict
(a) **Commercial success + normal 20-year term expiry** is the dominant story for the yellow-line core — the patents were maintained diligently and aged out 2017–2019. (c) **Acquisition absorption** explains why new filing stopped: Sportvision was consolidated into SMT, which develops under its own banner with newer methods (ISO Track image-based tracking). (d) **True dead ends** only for the puck (audience rejection) and arguably the six-radar rig. (e) **Supersession** for PITCHf/x and sensor-based tracking generally.

**Single most important technical limitation to design around:** **calibration/registration fragility.** The whole family depends on *instrumented cameras* — pan/tilt/zoom encoders, inclinometers, gyros — with *repeated continuous re-registration* (US6466275's claims demand periodic registration updates; US6133946 needs a dedicated registration-error minimization routine), and the blending engine is **colorimetry-based**: it degrades under weather, lighting shifts, and uniform/field color collisions (US6229550's background admits standard chroma-keying can't distinguish grass-green from uniform-green). **Modern re-implementations avoid both weaknesses with image-based match-moving and neural segmentation that needs zero stadium hardware** — the approach PVI shipped in the 90s and SMT's ISO Track uses today. We build the modern version, not the 1998 version.

---

## PART 2 — Sharp Labs football-video family (HiMpact Sports lineage)

**Headline: fee lapse — Sharp deliberately stopped paying. The parent company orphaned the technology, the licensing spin-out failed to gain traction, then Sharp's corporate crisis killed the lab.**

| Patent | Title | Filed → Granted | Status |
|---|---|---|---|
| [US7499077B2](https://patents.google.com/patent/US7499077B2/en) | Automatic summarization of football video (parent) | 2001-08-20 → 2009-03-03 | Expired — Fee Related (2022) |
| [US7312812B2](https://patents.google.com/patent/US7312812B2/en) | Detecting the start of a football segment (line-convergence cue) | 2005-01-05 → 2007-12-25 | Expired — Fee Related (2022) |
| [US7639275B2](https://patents.google.com/patent/US7639275B2/en) | Start detection via sliding window (70% voting) | 2005-01-03 → 2009-12-29 | Expired — Fee Related (2022) |
| [US7474331B2](https://patents.google.com/patent/US7474331B2/en) | Detecting the end of a segment (histogram scene-change, 5–6σ threshold) | 2005-01-03 → 2009-01-06 | Expired — Fee Related (2023) |
| [US8018491B2](https://patents.google.com/patent/US8018491B2/en) | Summarization from full-speed vs. slow-motion segments | 2005-01-03 → 2011-09-13 | Expired — Fee Related (2026) |
| [US7474698B2](https://patents.google.com/patent/US7474698B2/en) | Replay detection via logo transitions (replay family parent) | 2002-09-27 → 2009-01-06 | Expired — Fee Related (2024) |
| [US7653131B2](https://patents.google.com/patent/US7653131B2/en) | Replay detection via learned logo transitions | 2005-12-02 → 2010-01-26 | Expired — Fee Related (2024) |
| [US7609855B2](https://patents.google.com/patent/US7609855B2/en) | Moving-object analysis via vanishing-point algorithm (Object Prediction Technologies LLC — NOT Sharp) | 2005-11-30 → 2009-10-27 | Expired — Fee Related (2027) |

**What the claims actually cover (plain English):** automatic game summarization from play segments bounded by ball-in-play/out-of-play, detected via green-field color calibration and frame differences (US7499077); play-start detection from field lines converging to a vanishing point (US7312812); start verification through a fixed sliding window with sub-100% voting threshold (US7639275); play-end detection via color-histogram scene changes with a mean+5–6σ dynamic threshold (US7474331); full-speed vs. slow-motion segment classification from green-field/line-convergence/zoom cues (US8018491); replay identification from broadcaster logo-transition bumpers (US7474698); bootstrapping logo learning from a known slow-motion replay (US7653131); vanishing-point perspective mapping from image quadrilateral to physical rectangle for position/velocity (US7609855).

**What the claims do NOT cover (our walk-through gaps):** learned/classifier-based boundary detection (CNNs, HMMs, transformers) — the claims are locked to *handcrafted* color/frame-difference heuristics; boundaries from scoreboard/clock OCR, audio cues (whistle/crowd), broadcast metadata, or league data feeds; player/ball *tracking* as the summary basis; replay detection from frame similarity, slow-motion cadence, or neural classification; any method not using logo transitions or field-color calibration. **A multimodal learned pipeline using OCR + audio + data feeds walks around the entire family.**

### The corporate story (evidence, labeled by strength)
- **Commercial orphaning (strong, contemporaneous).** EDN reported 2003–2004: Sharp Labs of America (Camas, WA; 275 employees, 286 patents) built football summarization ("a game to every play in about 45 minutes") to differentiate Sharp LCD TVs. When founder/director Jon Clemens retired, he formed **Sharp Technology Ventures** to license lab technologies that had "languished" because they were "technologies that, for one reason or another, Sharp Corp. in Japan is not going to develop." The sports work — branded **HiMpact Sports** ("understand the semantics of baseball, football and soccer," 3-hour game → 45 minutes, automatic indexing, random-access play-by-play, annotated summaries) — was the flagship, with ESPN described as the likely first licensee. No evidence of durable commercial traction afterward.
- **Sharp's financial crisis (strong context; lab-level causation unverified).** $1.2B quarterly loss + 5,000 job cuts (Aug 2012, first in 50+ years); ~$13B losses over four years; US TV business sold during restructuring; Foxconn completed a 66% controlling acquisition in 2016. A February 2020 ex-employee review states the Labs entity "was eliminated after reorganization" and "R&D discontinued." **No source directly connects the Camas retrenchment to these specific fee lapses — that link is plausible but flagged unverified.**
- **The family was stopped deliberately, not exhausted (proven by status).** All seven Sharp grants are "Expired — Fee Related" — fees deliberately unpaid, several years before term. Last filings 2007; four sibling applications abandoned outright.
- **Technical supersession (supported by later art).** Later citing patents move to learned logo recognition, ML highlight detection, CNN event detection, scoreboard extraction — the field moved to learned methods while Sharp's claims stayed locked to handcrafted heuristics.

### WHY THEY STOPPED — Sharp verdict
A **combination**: (b) **commercial orphaning** — the Japanese parent wouldn't productize it; the licensing spin-out (HiMpact Sports/ESPN interest) evidently failed to sustain it; (c) **corporate crisis** — Sharp's 2012–2016 collapse and Foxconn takeover gutted the US lab that owned the work; (d) **partial technical dead end** — their own background admits the ball is "difficult, if not impossible" to track, and Sharp's own engineers concluded deterministic rule-based inference was "too difficult to write rules for that cover every situation," already moving toward probabilistic methods (HMM) in the HiMpact prototypes. The handcrafted-heuristic line in these patents was technology they were *already outgrowing*. (e) **Supersession** by learned methods finished the job.

**Single most important technical limitation to design around:** **brittle dependence on broadcast-production grammar.** Every claim assumes green field, visible converging white lines, side-camera snap framing, zoom cessation, color-histogram scene cuts, logo-bumper replays. Snow, worn lines, non-standard cameras, graphics rebrands, bumper-less broadcasts — all break it. **Treat these patents as negative knowledge: build multimodal learned boundaries (scoreboard/clock OCR, audio events, league data feeds, visual models) with explicit uncertainty handling, and never let any single broadcast cue be ground truth.**

### Go-to-market caution from the Sharp story
Sharp had *working technology* and an *ESPN relationship* and still failed to commercialize. For GSE, the distribution and product surface matter at least as much as the algorithm. Our use is internal capability (film pipeline → content + training data), not a product sale — which sidesteps the trap that killed HiMpact.

---

## PART 3 — WHY THEY STOPPED: consolidated verdict

| Family | Mechanism | Why they stopped | Evidence strength |
|---|---|---|---|
| **Sportvision telestration (6)** | Normal 20-year term expiry (2017–2019) | **Commercial success + acquisition.** The yellow line won (Emmy, still on NFL broadcasts, active SMT development through 2018+). SMT acquired Sportvision Oct 2016; filing had tapered as the company headed to sale. True dead ends only for the puck and radar rig; PITCHf/x superseded by Statcast. | Strong (term dates, acquisition records, SMT product line) |
| **Sharp summarization (7)** | Fee lapse — deliberately unpaid | **Orphaning + crisis + supersession.** Sharp Japan wouldn't develop it; HiMpact licensing spin-out fizzled; 2012–2016 corporate collapse and Foxconn takeover; handcrafted heuristics superseded by learned methods. | Strong on orphaning + fee data; lab-to-lapse link unverified |
| **Object Prediction Tech (1)** | Fee lapse — deliberately unpaid | Small company's vanishing-point tracker lapsed before term. Same brittle-geometry limitations. | Medium (status data only) |

**Neither family stopped because the core problem was unsolvable.** Sportvision's core product is still on TV. Sharp's summarizer demonstrably worked (45-minute game summaries, ESPN interest) — it died of corporate neglect and a methods generation change, not a dead end. The field has since validated both architectures with modern tools (nflgsplat: classical geometric front end → deep refinement on consumer GPUs; soccer charting real-time on an RTX 4060).

**The two limitations we must design around:**
1. **Registration/calibration fragility** (Sportvision lesson) → build image-based match-moving + neural segmentation; zero stadium hardware; continuous self-recalibration, never encoder telemetry.
2. **Single-cue brittleness** (Sharp lesson) → multimodal learned boundaries (OCR/clock, audio, data feeds, visual models); explicit uncertainty; no single broadcast cue as ground truth.

**Freedom-to-operate posture:** all families expired/unencumbered as displayed on Google Patents (observed 2026-09-29). Displayed status is an assumption, not a legal conclusion; run a family/continuation review before any build decision. Note the one live hazard from the earlier report: the Walker Digital menu-board family (US20040177004A1's granted continuation US7841514B2) — unrelated to the film pipeline, but flagged for the ARE lane.

**Build recommendation (unchanged, strengthened):** prototype G2's classical prefilter first (cheapest test, unlocks G1/G3/G4), then G1's field-anchored telestration on real NFL frames — both marked UNTESTED — QUEUED FOR EVALUATION until then. The forensics raise confidence: we're re-implementing a *validated* architecture with modern tools, in the exact gaps the expired claims leave open.
