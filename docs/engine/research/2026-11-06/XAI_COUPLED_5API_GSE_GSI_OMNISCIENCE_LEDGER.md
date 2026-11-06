# Coupled 5-API GSE & GSI Omniscience Ledger (`X-API` -> `arXiv` + `OpenAlex` + `Kaggle` + `Hugging Face`)

- **Generated At (UTC):** `2026-11-06T20:09:33.963603+00:00`
- **X-API Driver (`grok-4.7` `x_search` + `web_search`):** `23,278` chars (`$0.3476`)
- **Live arXiv Preprints Harvested:** `48`
- **Live OpenAlex Peer-Reviewed Works (GSE + GSI Sports Medicine/Biomechanics):** `60`
- **Live Hugging Face Hub Datasets & Models:** `52`
- **Live Kaggle Datasets:** `43`
- **Total Coupled Cross-API Scientific Nodes:** `204`

---

## 1. X-API (`grok-4.7`) GSE & GSI Discovery Synthesis

I'll search X and the web for frontier NFL quantitative methods and sports-medicine/biomechanics work, then turn what surfaces into concrete harvest queries.

The first pass shows transformer coverage models and hamstring video review. I’m digging into Big Data Bowl methods and NFL biomechanics literature next.

A few of the example methods look more speculative than published. I’m checking which ones NFL researchers actually use before locking the lists and harvest queries.

The lists below are ranked by how often NFL Next Gen Stats, Big Data Bowl work that entered production, Carnegie Mellon tracking papers, Biocore, and NFL injury epidemiology actually use the method. Several of the example labels in the request are real pieces of adjacent science, but they are not attested as methods NFL analysts or NFL sports-medicine groups currently discuss. Those are marked and still get harvest queries.

## 1. Fifteen mathematical and statistical methods in NFL quantitative work

Evidence grades: **P** = in or directly upstream of Next Gen Stats production; **A** = peer-reviewed or public technical paper on NFL tracking; **B** = Big Data Bowl or public model that NFL analysts have cited; **M** = betting-market quants, not team or league operations.

| Rank | Method | Grade | What it is used for |
|---|---|---|---|
| 1 | Factorized-attention spatiotemporal transformers on 10 Hz RFID trajectories | P | Frame-level coverage assignment, receiver-defender matchup, targeted defender, and run-concept labels. NGS and AWS report about 89%+ task accuracy on 2020–2024 passing plays. Inputs are x, y, speed, acceleration, orientation, and direction. |
| 2 | Graph neural networks with players as nodes and matchups as edges | P | Real-time blocker versus route-runner and rusher versus coverage identification, then blocker-rusher matchup edges. This is the identification layer under NGS pressure probability. |
| 3 | Frame-level tree ensembles (random forest, gradient boosting, extremely randomized trees) | P | Completion Probability (XGBoost since 2018, rebuilt in 2025), pressure probability (random forest; pressure called when probability exceeds 75%), and Tackle Probability (tree model, 20 features per defender every tenth of a second). |
| 4 | Heteroscedastic spatiotemporal transformers with a Gaussian negative-log-likelihood head | B | 2026 Big Data Bowl trajectory forecasting. Encoder alternates spatial and temporal attention; decoder emits (x, y, σx, σy). Domain attention biases borrowed from pedestrian GNNs. |
| 5 | Isolation forests on pre-snap kinematics | P | 2024 NGS shift, motion, and motion-at-snap classifier from speed, acceleration, and distance traveled after the line is set. Later expanded toward a 19-type motion dictionary. |
| 6 | Bayesian multilevel Gamma models with heterogeneous variance | A | Snap-timing skill: time from receiver motion onset to snap, shape parameter varying by quarterback, fit in Stan via brms. Nguyen and Yurko. |
| 7 | Bayesian circular mixed-effects models | A | Turning tendency and turning variability by position group. Same CMU line of work as STRAIN. |
| 8 | Bayesian step-and-turn generative models with posterior predictive simulation | A | Frame-level step length and turn angle for a ball carrier, then hypothetical alternative paths scored with standard valuation. Nguyen and Yurko, arXiv 2603.17866. |
| 9 | Random-forest conditional density estimation for ghost defenders | A | Distribution of nearest-defender location at the catch, and a distribution of yards after catch, so observed positioning is scored against a baseline ghost. Yurko, Nguyen, and Pelechrinis. |
| 10 | Continuous-time within-play expected points and win probability | A | Expected points and win probability updated through the play from 10 Hz player and ball tracks, not only at the snap and the whistle. |
| 11 | Expected Hypothetical Completion Probability, plus DeepQB-style neural decision models | A | Bayesian completion probability had the quarterback thrown to another receiver (Deshpande and Evans), and feedforward nets for target, outcome, and expected yards (Burke), extended on 2022 10 Hz data. |
| 12 | Physics-constrained reachable sets | B | Minimum-time reachable boundary from momentum, heading, and physical limits (Burris, 2019), reused in 2026 Big Data Bowl decision-point work. |
| 13 | STRAIN: speed-versus-distance-to-quarterback functionals | A | Pass-rush evaluation that does not wait for a binary sack, hit, or hurry. Nguyen and Matthews. |
| 14 | Marked Hawkes processes, and neural marked spatiotemporal point processes | A | Self-exciting play sequences. A marked exponential-kernel Hawkes model was fit to Eagles 2023–24 play-by-play to study pace shifts. Transformer Hawkes and neural marked point processes are the football-events extension, not an NGS pressure-trauma model. |
| 15 | Market de-vigging: probit, power, multiplicative, and Shin | M | NFL prop and side markets. On two-outcome markets Shin is degenerate with additive. Across 64,670 settled two-way markets, additive, odds-ratio, and probit were not separable, and multiplicative was worst on heavy favorites. Probit vig removal is the method associated with PlusEVAnalytics. |

**Not attested as methods NFL analysts discuss, despite the examples in the request.**

- Vine copulas for correlated same-game parlays. No NFL-analyst or NGS discussion turned up. Vine copulas are a finance and horse-racing tool.
- Bayesian online changepoint detection for coordinator script shifts. The Eagles pace study uses a marked Hawkes model, not online changepoint detection.
- Hawkes processes for quarterback pressure trauma. Pressure is modeled as a frame-level random forest and a GNN matchup graph, not a Hawkes process. Trauma is a sports-medicine problem, not this model class.
- Bregman-divergence de-vigging. Not a method NFL betting quants were using in the sources reviewed. Power, probit, Shin, additive, and multiplicative were.

## 2. Fifteen sports-medicine and biomechanical tracking methods

| Rank | Method | What NFL-linked groups actually do |
|---|---|---|
| 1 | Multi-reviewer video scenario and posture coding for hamstring strain | 305 NFL hamstring injuries, 2018–2022, seven predefined scenarios. Sprint-type was 43% of agreed cases. Excessive trunk flexion in contact, acceleration, or change of direction was 39%. Agreement was only poor to moderate, so the method’s limit is label noise. |
| 2 | Time-aligned player-tracking generalized linear mixed models for change-of-direction ACL risk | Biocore, 216 game ACLs, 2018–2022. 46% were change-of-direction. 98% of those athletes were decelerating. Maximum speed (odds ratio 1.52 per 1 m/s) and normalized maximum deceleration power (odds ratio 1.08 per 1 W/kg) predicted risk. |
| 3 | BEAST shoe-surface traction protocols | Biomechanical Elite Athlete Shoe-Turf Tester replicates elite running, cutting, and stopping. Deployed on synthetic NFL fields to measure rotational traction and the torque at which a cleat fails to release. Natural grass divots and releases. Synthetic surfaces often do not. |
| 4 | Finite-element synthetic-turf models and force-limiting natural-turf tests | Kent, O’Cain, and colleagues. Lab validation against Clegg impact data, plus mechanical response of NFL natural turfgrass as a step toward removing the surface-injury gap. |
| 5 | Play-level incidence-rate models of surface and lower-extremity injury | Mack, Kent, and colleagues, 2012–2016: synthetic turf IRR 1.16 (95% CI 1.10–1.23) versus natural grass, stronger for non-contact and surface-contact injuries. 2021–2022: 1.42 versus 1.22 injuries per game, and higher odds of season-ending surgery on turf (OR 1.60). |
| 6 | Digital Athlete markerless motion capture | Biocore lab: multi-camera markerless capture, force plates under turf and wood, skeletal avatars for more than 2,000 players. Team portal since 2023. League-reported practice lower-extremity strains down about 14% after launch. That is a program outcome, not a randomized effect. |
| 7 | Pose estimation to joint kinematics and estimated ground reaction force | NFL engineering target with AWS: move injury review from qualitative video to joint angles and velocities. Ground-reaction force is estimated from pose plus player and equipment mass, then joint loads are projected. Occlusion in contact is the stated bottleneck. |
| 8 | Instrumented mouthguards with video adjudication | Triaxial accelerometer and gyroscope rigidly coupled through the upper teeth. Lab errors on peak angular acceleration, angular velocity, and brain-injury criteria are generally under 13%. On-field machine-learning filters separate impacts from spurious events (reported precision about 98% at recall about 82% in one collegiate test). |
| 9 | Convolutional or finite-element brain-strain models driven by mouthguard kinematics | Peak kinematics are passed to a brain model. CNN-based strain error versus a reference model was under 9% in the mouthguard validation study. NFL engineers log on the order of 150 variables per concussive play. |
| 10 | Video-reconstructed impact signatures for loss of consciousness | Zimmerman and colleagues, in Brain: video of professional American-football concussions plus impact modeling to separate a biomechanical signature linked to loss of consciousness. |
| 11 | Bayesian surface-by-temperature models of concussion risk | Smoliga and Binney: posterior probability about 98% that grass has lower concussion risk than artificial turf (median IRR about 0.53), with temperature and week-of-season interactions. Cold turf is the worse cell. |
| 12 | Syndesmosis spectrum classification tied to return-to-participation | Distal tibiofibular syndesmosis injuries in the NFL are treated as a spectrum, not a single sprain grade, and that spectrum tracks time to full participation. High-ankle and syndesmosis fixation also show up among season-ending turf surgeries. |
| 13 | Ankle-sprain mechanism video taxonomy | Biocore video review separates external-rotation and eversion mechanisms from inversion. Non-contact inversion from a cleat that does not release is a current NFL foot-and-ankle focus, alongside the older eversion and ACL signal on turf. |
| 14 | MRI-informed musculoskeletal models of biceps femoris eccentric demand | Subject-specific models, not generic scaled models, show lower biceps femoris short-head muscle-tendon force and less negative work in late swing after prior hamstring strain. NFL cohort literature puts the distal third of biceps femoris at about 43–46% of hamstring injury sites, and those injuries recur. |
| 15 | Week-to-return recurrence models for hamstring injury | 2,075 NFL hamstring injuries, 2009–2020. 38.4% recurred. 11.9% were same-season. Highest same-season recurrence when return was inside two weeks (13.4%). Shorter time to return, in-game injury, lower BMI, and wide receiver were same-season risk factors. This is logistic and week-by-week risk, not a published eccentric-load hazard model. |

**Not attested as NFL tracking methods.**

- A named “high-ankle syndesmosis cutting deceleration asymmetry” metric. Change-of-direction deceleration is published for ACL, and syndesmosis is published as its own spectrum. The joined signal was not found.
- Quarterback rotational kinetic-chain velocity loss after rib or acromioclavicular trauma. No NFL biomechanics paper on that signal turned up.
- Anaerobic phosphocreatine depletion in 300-lb linemen as a tracking method. That is classic muscle energetics, not an NFL sensor pipeline in the sources reviewed.
- “Slit-film” as the fiber specified in NFL torque papers. Rotational traction testing is real. Slit-film as the named fiber in those NFL papers was not confirmed here.

## 3. Harvest queries

Fire these as written. Do not add a trailing abbreviation. Run the arXiv query on arXiv all-fields, the OpenAlex string on the works search endpoint, the Kaggle string in Kaggle search, and the Hugging Face string in both Papers and Datasets.

### Quantitative analytics

**Q1. Factorized spatiotemporal transformers, 10 Hz**

- arXiv: `"factorized attention" AND (transformer) AND (NFL OR football) AND (tracking OR coverage)`
- OpenAlex: `factorized attention transformer NFL tracking coverage responsibility`
- Kaggle: `nfl-big-data-bowl transformer factorized attention`
- Hugging Face: `factorized attention transformer NFL tracking`

**Q2. Graph networks for matchups and pressure**

- arXiv: `"graph neural" AND (football OR NFL) AND (tracking OR pressure OR matchup)`
- OpenAlex: `graph neural network NFL player tracking blocker rusher pressure`
- Kaggle: `nfl big data bowl graph neural network pressure`
- Hugging Face: `graph neural network sports tracking football`

**Q3. Tree ensembles for completion, pressure, tackle probability**

- arXiv: `"completion probability" OR "tackle probability" OR "pressure probability" NFL tracking`
- OpenAlex: `NFL completion probability XGBoost random forest tracking`
- Kaggle: `nfl-big-data-bowl-2024 tackle probability`
- Hugging Face: `NFL completion probability tracking model`

**Q4. Heteroscedastic trajectory transformers**

- arXiv: `spatiotemporal transformer trajectory prediction Gaussian "negative log" football`
- OpenAlex: `spatiotemporal transformer trajectory prediction sports tracking heteroscedastic`
- Kaggle: `nfl-big-data-bowl-2026-prediction ST-Transformer`
- Hugging Face: `spatiotemporal transformer trajectory sports`

**Q5. Isolation forests for pre-snap motion**

- arXiv: `"isolation forest" AND (motion OR shift) AND (football OR NFL OR "player tracking")`
- OpenAlex: `isolation forest NFL pre-snap motion shift classification`
- Kaggle: `nfl big data bowl pre-snap motion isolation forest`
- Hugging Face: `isolation forest sports tracking motion`

**Q6. Bayesian snap timing**

- arXiv: `Bayesian multilevel "snap timing" NFL Nguyen Yurko`
- OpenAlex: `Bayesian multilevel heterogeneous variance snap timing NFL`
- Kaggle: `nfl big data bowl snap timing motion`
- Hugging Face: `Bayesian snap timing NFL tracking`

**Q7. Bayesian circular turning models**

- arXiv: `"circular mixed" OR "turning variability" NFL tracking Bayesian`
- OpenAlex: `Bayesian circular mixed-effects NFL player tracking turning`
- Kaggle: `nfl tracking direction orientation circular`
- Hugging Face: `circular mixed effects sports tracking`

**Q8. Step-and-turn generative evaluation**

- arXiv: `NFL step-and-turn Bayesian multilevel player movement`
- OpenAlex: `NFL step-and-turn generative framework player movement Nguyen`
- Kaggle: `nfl-big-data-bowl-2026-prediction trajectory`
- Hugging Face: `2603.17866`

**Q9. Ghost defenders and conditional density estimation**

- arXiv: `NFL ghosts "conditional density" defender tracking Yurko`
- OpenAlex: `NFL ghosts conditional density estimation defender positioning`
- Kaggle: `nfl big data bowl ghost defender yards after catch`
- Hugging Face: `2406.17220`

**Q10. Continuous-time within-play value**

- arXiv: `continuous-time within-play valuation NFL tracking expected points`
- OpenAlex: `continuous-time within-play expected points NFL tracking`
- Kaggle: `nfl big data bowl expected points tracking frame`
- Hugging Face: `1906.01760`

**Q11. Expected hypothetical completion and DeepQB**

- arXiv: `"expected hypothetical completion" OR DeepQB NFL tracking`
- OpenAlex: `expected hypothetical completion probability NFL Deshpande Evans`
- Kaggle: `nfl big data bowl completion probability quarterback decision`
- Hugging Face: `DeepQB NFL tracking completion probability`

**Q12. Reachable sets and optimal trajectories**

- arXiv: `optimal trajectory NFL defender "tracking data" reachable`
- OpenAlex: `NFL player tracking optimal trajectory reachable set Burris`
- Kaggle: `nfl big data bowl 2019 optimal trajectory`
- Hugging Face: `sports tracking reachable set trajectory football`

**Q13. STRAIN and kinematic pressure**

- arXiv: `STRAIN NFL pass rush speed distance quarterback tracking`
- OpenAlex: `STRAIN NFL quarterback distance speed Nguyen Matthews`
- Kaggle: `nfl big data bowl pass rush pressure`
- Hugging Face: `NFL pass rush tracking metric`

**Q14. Hawkes and neural marked point processes**

- arXiv: `Hawkes NFL play OR "marked spatio temporal point process" football`
- OpenAlex: `marked Hawkes process NFL play-by-play`
- Kaggle: `nfl play-by-play hawkes`
- Hugging Face: `2302.09276`

Also run, because the pressure-trauma Hawkes label was not found: `Hawkes "quarterback" pressure NFL` on arXiv and OpenAlex. Expect football-events papers, not trauma papers.

**Q15. De-vigging**

- arXiv: `Shin "favorite-longshot" odds margin probability sports`
- OpenAlex: `Shin method devig favorite longshot bias sports betting`
- Kaggle: `nfl odds closing line devig`
- Hugging Face: `Shin devig sports betting probability`

Add these four strings on arXiv and OpenAlex so the unattested labels are tested rather than assumed:

- `"vine copula" NFL OR "same game parlay" OR "player prop"`
- `"Bregman" devig OR "Bregman divergence" odds`
- `"Bayesian online changepoint" NFL OR football coordinator`
- `changepoint "play calling" NFL Bayesian`

### Sports medicine and biomechanics

**S1. Hamstring video scenarios**

- arXiv: `hamstring strain video NFL posture sprint`
- OpenAlex: `Characterising body postures hamstring strain National Football League`
- Kaggle: `nfl injury video hamstring`
- Hugging Face: `hamstring strain injury video analysis football`

**S2. Change-of-direction ACL tracking models**

- arXiv: `"change-of-direction" ACL NFL "player tracking" deceleration`
- OpenAlex: `Player Tracking Metrics Anterior Cruciate Ligament Change-of-Direction National Football League O'Cain`
- Kaggle: `nfl tracking deceleration ACL`
- Hugging Face: `NFL ACL tracking deceleration power`

**S3. Shoe-surface torque**

- arXiv: `cleat turf rotational traction torque American football`
- OpenAlex: `BEAST shoe turf tester NFL rotational traction synthetic`
- Kaggle: `nfl turf injury surface`
- Hugging Face: `shoe surface traction football turf torque`

Add, to test the slit-film label: `slit-film OR "slit film" turf torque football` on OpenAlex.

**S4. Surface finite elements**

- arXiv: `"synthetic turf" finite element football lower extremity`
- OpenAlex: `synthetic turf finite element model NFL Kent O'Cain`
- Kaggle: `nfl field surface injury`
- Hugging Face: `synthetic turf finite element sports`

**S5. Surface injury rates**

- arXiv: `synthetic turf natural grass NFL "lower extremity" incidence`
- OpenAlex: `Higher Rates of Lower Extremity Injury on Synthetic Turf National Football League Mack Kent`
- Kaggle: `nfl injuries turf grass`
- Hugging Face: `synthetic turf NFL injury epidemiology`

**S6. Digital Athlete and markerless capture**

- arXiv: `markerless motion capture American football injury`
- OpenAlex: `NFL Digital Athlete markerless motion capture Biocore`
- Kaggle: `nfl pose tracking injury`
- Hugging Face: `markerless motion capture football biomechanics`

**S7. Pose to joint load**

- arXiv: `pose estimation American football ground reaction force joint`
- OpenAlex: `pose estimation NFL injury joint velocity ground reaction force`
- Kaggle: `nfl-big-data-bowl pose OR tracking speed acceleration`
- Hugging Face: `sports pose estimation biomechanics football`

**S8. Instrumented mouthguards**

- arXiv: `instrumented mouthguard football head kinematics`
- OpenAlex: `instrumented mouthguards head kinematics brain deformation football`
- Kaggle: `nfl head impact sensor`
- Hugging Face: `2008.01903`

**S9. Brain strain from kinematics**

- arXiv: `convolutional neural network brain strain football mouthguard`
- OpenAlex: `brain strain football impact mouthguard maximum principal strain`
- Kaggle: `concussion kinematics football dataset`
- Hugging Face: `football head impact brain strain model`

**S10. Loss-of-consciousness impact signature**

- arXiv: `concussion "loss of consciousness" biomechanical American football video`
- OpenAlex: `Zimmerman concussion loss of consciousness American football biomechanical`
- Kaggle: `nfl concussion video impact`
- Hugging Face: `football concussion biomechanics video`

**S11. Turf, temperature, and concussion**

- arXiv: `artificial turf concussion NFL Bayesian temperature`
- OpenAlex: `Artificial Turf Increases Concussion Risk National Football League Bayesian Smoliga`
- Kaggle: `nfl concussion surface weather`
- Hugging Face: `turf concussion football Bayesian`

**S12. Syndesmosis spectrum**

- arXiv: `syndesmosis NFL return to participation`
- OpenAlex: `distal tibiofibular syndesmosis injuries National Football League Kuhn`
- Kaggle: `nfl ankle injury`
- Hugging Face: `syndesmosis football injury`

**S13. Ankle mechanism video**

- arXiv: `ankle sprain external rotation eversion NFL video`
- OpenAlex: `Injury Scenarios of Ankle Sprains National Football League external rotation eversion O'Cain`
- Kaggle: `nfl ankle sprain tracking`
- Hugging Face: `ankle sprain video analysis football`

**S14. Biceps femoris eccentric models**

- arXiv: `"biceps femoris" eccentric sprint "muscle-tendon" American football`
- OpenAlex: `prior hamstring strain biceps femoris sprinting biomechanics American football MRI`
- Kaggle: `hamstring injury sport dataset`
- Hugging Face: `biceps femoris eccentric sprint musculoskeletal model`

**S15. Hamstring recurrence**

- arXiv: `hamstring recurrence "National Football League" return`
- OpenAlex: `Recurrence of Hamstring Injuries National Football League 2009 2020`
- Kaggle: `nfl injuries dataset hamstring`
- Hugging Face: `hamstring reinjury survival football`

**Queries for the three unattested medical labels**

- High-ankle plus cutting asymmetry: `syndesmosis OR "high ankle" AND (deceleration OR cutting) AND (asymmetry) AND (NFL OR football)` on arXiv and OpenAlex.
- Quarterback rib or acromioclavicular kinetic chain: `"quarterback" AND (rib OR acromioclavicular) AND ("kinetic chain" OR "angular velocity") AND football` on OpenAlex.
- Phosphocreatine in heavy linemen: `phosphocreatine OR "creatine phosphate" AND (linemen OR "American football") AND (anaerobic)` on OpenAlex. Do not expect a tracking dataset.

### Dataset queries that back more than one signal

Kaggle, exact competition slugs:

- `nfl-big-data-bowl-2026-prediction`
- `nfl-big-data-bowl-2026-analytics`
- `nfl-big-data-bowl-2025`
- `nfl-big-data-bowl-2024`
- `nfl-big-data-bowl-2023`
- `nfl-big-data-bowl-2021`
- `nfl-big-data-bowl-2020`

Hugging Face papers to open directly:

- `2406.17220`
- `2603.17866`
- `2603.25901`
- `2302.09276`
- `2207.14124`
- `1906.01760`
- `2008.01903`

OpenAlex author and institution filters worth running after the topical queries: `author.search:Nguyen, Quang`, `author.search:Yurko, Ronald`, `author.search:O'Cain, Cody`, `author.search:Kent, Richard`, `institutions.search:Biocore`.

Public NFL tracking on Kaggle is 10 Hz x, y, speed, acceleration, direction, and orientation for 22 players and the ball. It can back the quantitative list and the ACL deceleration model. It cannot back mouthguard kinematics, shoe-surface torque, MRI muscle architecture, or phosphocreatine. Those need OpenAlex and the instrument papers, not a Kaggle tracking file.

---

## 2. Live OpenAlex Peer-Reviewed GSE & GSI Works (Sports Medicine, Biomechanics, Neuro-Cognition & Market Efficiency)

- **[GSE] Racial Bias in National Football League Officiating** (2020, Cited by `7`, DOI: `https://doi.org/10.3389/fsoc.2020.00048`)
  - *Abstract:* Racial bias in sport is a prevalent research topic. Much of the previous research regarding bias among referees in sport focused on sports such as baseball, basketball, hockey, and soccer. Professional American football is unique because race is more clearly defined when compared to these other sports. Additionally, by examining holding penalties, which are known to be more subjective and called p...
- **[GSE] Psychological issues in football officiating: An interview study with top-level referees** (2016, Cited by `24`, DOI: `https://doi.org/10.15203/ciss_2016.004`)
  - *Abstract:* The present study aims on the identification of problems in the practice of top-level football refereeing. For this purpose, semi-structured interviews were conducted to collect data from 23 European elite referees. Through inductive content analysis, seven higher-order themes emerged: (1) descriptive, (2) characteristics of a good elite referee, (3) difficulties in decision-making, (4) pre-match ...
- **[GSE] Referee height influences decision making in British football leagues** (2020, Cited by `18`, DOI: `https://doi.org/10.1186/s40359-020-0370-4`)
  - *Abstract:* BACKGROUND: Male height is positively associated with social dominance, and more agonistic/competitive behaviours. However, the 'Napoleon complex' or 'small man syndrome' suggests that smaller males are more assertive and punitive to compensate for lack of height and social dominance. Here, we assess possible relationships between height and punitive behaviours in a real-world setting. METHODS: Us...
- **[GSE] Referee bias in Scottish football** (2023, Cited by `0`, DOI: `https://doi.org/10.51224/srxiv.365`)
  - *Abstract:* This study presents a statistical analysis of penalties conceded in the top tier of the Scottish Professional Football League (SPFL) from seasons 2016/2017 -2022/2023.In particular, claims in the media that the number of penalties conceded by Glasgow Rangers is statistically anomalous are considered.A t-test analysis of the penalties conceded by Rangers versus other SPFL premier league clubs, reve...
- **[GSE] Are football referees really biased and inconsistent? Evidence from the English Premier League** (2005, Cited by `13`, DOI: `None`)
  - *Abstract:* + Corresponding author. The authors are grateful to participants at a Sports Economics Workshop held at the University of Groningen in March 2005 for comments on an earlier draft of this paper. We are grateful to Rob Simmons and Tunde Buraimo for providing access to their list of televised Premier League matches. This paper presents a statistical analysis of patterns in the incidence of disciplina...
- **[GSE] No home team bias in elite football referees: Assessing correctness of refereeing decisions in the English Premier League** (2025, Cited by `0`, DOI: `https://doi.org/10.36905/jses.2025.02.05`)
  - *Abstract:* It is unclear whether referee decisions contribute to home advantage in football.This ambiguity stems from significant advancements in the development and training of officials, methodological limitations, such as the use of regression models to provide estimates, in extant research, and team behaviours.Thus, there may appear to be a bias when there is none.This study aimed to establish whether re...
- **[GSI] Hamstring strain injuries and sprinting biomechanics. Is there a link?** (2023, Cited by `0`, DOI: `https://doi.org/10.5204/thesis.eprints.242360`)
  - *Abstract:* This thesis examined the link between hamstring strain injury and sprinting biomechanics in professional and semi-professional football players. Such a link is still unclear and there is a need for more quality research. Training prescription could be a risk factor for hamstring strain injury according to a group of experts and there is need for research involving all stakeholders. The propulsive ...
- **[GSI] Sprinting Biomechanics and Hamstring Injuries: Is There a Link? A Literature Review** (2021, Cited by `19`, DOI: `https://doi.org/10.3390/sports9100141`)
  - *Abstract:* Hamstring strain injury (HSI) is a common and costly injury in many sports such as the various professional football codes. Most HSIs have been reported to occur during high intensity sprinting actions. This observation has led to the suggestion that a link between sprinting biomechanics and HSIs may exist. The aim of this literature review was to evaluate the available scientific evidence underpi...
- **[GSI] Sprint Biomechanics Associated With Hamstring Strain Injury in Football: A Systematic Review and Mechanistic Synthesis** (2026, Cited by `1`, DOI: `https://doi.org/10.33607/rmske.v1i34.2279`)
  - *Abstract:* Background. Hamstring strain injury (HSI) is one of the most common non-contact injuries in football and frequently occurs during sprinting. Although several studies have examined sprint biomechanics in relation to HSI, findings remain dispersed across epidemiological and laboratory-based investigations, limiting the understanding of how sprint mechanics may contribute to injury risk. Aim. To syst...
- **[GSI] Exploring the Role of Sprint Biomechanics in Hamstring Strain Injuries: A Current Opinion on Existing Concepts and Evidence** (2023, Cited by `77`, DOI: `https://doi.org/10.1007/s40279-023-01925-x`)
  - *Abstract:* Hamstring strain injuries are one of the most common injuries in sprint-based sports with the mechanism of injury considered the result of an interaction between applied mechanical strain and the capacity of the muscle to tolerate strain. To date, injury prevention and rehabilitation strategies have frequently focused on enhancing the capacity of the hamstrings to tolerate strain, with little cons...
- **[GSI] Rehabilitation and return to sport after hamstring strain injury** (2017, Cited by `152`, DOI: `https://doi.org/10.1016/j.jshs.2017.04.001`)
  - *Abstract:* Hamstring strain injuries are common among sports that involve sprinting, kicking, and high-speed skilled movements or extensive muscle lengthening-type maneuvers with hip flexion and knee extension. These injuries present the challenge of significant recovery time and a lengthy period of increased susceptibility for recurrent injury. Nearly one third of hamstring strains recur within the first ye...
- **[GSI] Hamstring Strain Injuries** (2012, Cited by `753`, DOI: `https://doi.org/10.2165/11594800-000000000-00000`)
- **[GSI] The National Football League Concussion Protocol: A Review** (2023, Cited by `18`, DOI: `https://doi.org/10.1177/15563316231177207`)
  - *Abstract:* Sport-related concussion remains an area of high concern for contact sport athletes and their families, as well as for the medical and scientific communities. The National Football League (NFL), along with the NFL Players Association and experts in the field, has developed protocols for the detection and management of sport-related concussions. This article reviews the NFL's most recent concussion...
- **[GSI] National Football League Head, Neck and Spine Committee’s Concussion Diagnosis and Management Protocol: 2017-18 season** (2018, Cited by `67`, DOI: `https://doi.org/10.1136/bjsports-2018-099203`)
  - *Abstract:* One of the National Football League's (NFL) Head, Neck and Spine Committee's principal goals is to create a 'best practice' protocol for concussion diagnosis and management for its players. The science related to concussion diagnosis and management continues to evolve, thus the protocol has evolved contemporaneously. The Fifth International Conference on Concussion in Sport was held in Berlin in 2...
- **[GSI] Determinants of Missed Games Following Concussions in the National Football League** (2020, Cited by `4`, DOI: `https://doi.org/10.3389/fspor.2020.595445`)
  - *Abstract:* Concussions in the National Football League (NFL) are a rising topic of concern and debate. With the implementation of new protocols, NFL players are required to be removed from play and must follow specific processes before full return to play after sustaining a concussion. While concussion severity is the primary determinant of time-off, it is possible that other factors associated with player v...
- **[GSI] Descriptive Characteristics of Concussions in National Football League Games, 2010-2011 to 2013-2014** (2017, Cited by `46`, DOI: `https://doi.org/10.1177/0363546516677793`)
  - *Abstract:* BACKGROUND: Despite a high reported incidence rate of concussion, little is known about the on-field characteristics of injurious head impacts in National Football League (NFL) games. PURPOSE: To characterize on-field features (location, player position, and time during game) and biomechanical features (anticipation status, closing distance, impact location and type) associated with concussions in...
- **[GSI] Subsequent musculoskeletal injury after concussion in National Football League players** (2024, Cited by `3`, DOI: `https://doi.org/10.1136/bjsports-2023-107970`)
  - *Abstract:* OBJECTIVE: To assess whether National Football League (NFL) players diagnosed with a concussion have an increased risk of injury after return to football. METHODS: A retrospective cohort study analysed the hazard of subsequent time-loss lower extremity (LEX) or any musculoskeletal injury among NFL players diagnosed with a concussion in 2015-2021 preseason or regular season games compared with: (1)...
- **[GSI] Concussion Symptoms and Return to Play Time in Youth, High School, and College American Football Athletes** (2016, Cited by `140`, DOI: `https://doi.org/10.1001/jamapediatrics.2016.0073`)
  - *Abstract:* IMPORTANCE: To our knowledge, little research has examined concussion across the youth/adolescent spectrum and even less has examined concussion-related outcomes (ie, symptoms and return to play). OBJECTIVE: To examine and compare sport-related concussion outcomes (symptoms and return to play) in youth, high school, and collegiate football athletes. DESIGN, SETTING, AND PARTICIPANTS: Athletic trai...
- **[GSE] Testing the Efficiency of the NFL Point Spread Betting Market** (2014, Cited by `1`, DOI: `None`)
  - *Abstract:* This paper examines the efficiency of pricing in the NFL point spread betting market, as hypothesized by the Efficient Market Hypothesis, through both statistical and economic tests. This market provides a simpler framework to test such economic hypotheses than conventional financial markets. Using a larger sample size than past literature, this paper finds that while the market is efficient in th...
- **[GSE] An Examination of the Money Line Market for National Football League Games** (2024, Cited by `0`, DOI: `None`)
  - *Abstract:* We examine market efficiency of the opening and closing money lines (wager on the winner of a game) for National Football League (NFL) games from 2007 through 2016. A simple analysis shows that inefficiencies exist in the opening and closing NFL money line market. Inefficiencies in the closing money lines suggests that the money line market fails to completely adjust and eliminate some of these in...
- **[GSE] Anomalies: Parimutuel Betting Markets: Racetracks and Lotteries** (1988, Cited by `603`, DOI: `https://doi.org/10.1257/jep.2.2.161`)
  - *Abstract:* Economists have given great attention to stock markets in their efforts to test the concepts of market efficiency and rationality. Yet wagering markets are, in one key respect, better suited for testing market efficiency and rationality. The advantage of wagering markets is that each asset (bet) has a well-defined termination point at which its value becomes certain. The absence of this property i...
- **[GSE] Weak Form Efficiency in Sports Betting Markets** (2023, Cited by `3`, DOI: `https://doi.org/10.33423/ajm.v23i2.6051`)
  - *Abstract:* Betting on sports is increasingly popular, and legal in the United States. Many states have moved to legalize sports betting both in-person and on-line. In this paper we evaluate the sports betting market and assess its efficiency in the financial sense. Using a large dataset of betting odds and outcomes across a wide range of sports over an extended period, we evaluate the weak-form efficiency of...
- **[GSE] The Efficiency of Australian Football Betting Markets** (1995, Cited by `18`, DOI: `https://doi.org/10.1177/031289629502000204`)
  - *Abstract:* This paper examines the efficiency of the two major Australian football betting markets: the Australian Rugby League (ARL) FootyTAB market and the Australian Football League (AFL) Footywin market. Probit and ordered probit models are tailored to the unique structures of the markets. This circumvents some potential econometric problems, and also allows us to test betting strategies in which a bet i...
- **[GSE] Market Efficiency and Behavioral Biases in the WNBA Betting Market** (2014, Cited by `5`, DOI: `https://doi.org/10.3390/ijfs2020193`)
  - *Abstract:* The betting market for the Women’s National Basketball Association (WNBA) is a thin financial market, which does not attract much interest from sports bettors. Given these characteristics, it is possible that profitable wagering strategies could exist for informed bettors of the WNBA. Using betting data on the WNBA from 2007–2012, we find that simple betting strategies do not earn statistically si...
- **[GSI] Game Schedules and Rate of Concussions in the National Football League** (2017, Cited by `22`, DOI: `https://doi.org/10.1177/2325967117740862`)
  - *Abstract:* Background: Concussion prevention in the National Football League (NFL) is an important priority for player safety. The NFL now has modified game schedules, and one concern is that unconventional game schedules, such as a shortened rest period due to playing on a Thursday rather than during the weekend, may lead to an increased risk of injuries. Hypothesis: Unconventional game schedules in the NFL...
- **[GSI] Relative Rest Correlates to Winning Percentage in 2022 National Football League Season: A Preliminary Study** (2025, Cited by `1`, DOI: `https://doi.org/10.47206/86sf6z35`)
  - *Abstract:* The purpose of this investigation was to examine whether season average relative rest (RR) influences winning percentage (WIN%) in professional American Football. We define RR as the difference in rest intervals between teams from prior games. To address this, we analyzed each game played in the 2022 NFL season (n=271) and calculated rest intervals between each successive game for each team. The r...
- **[GSI] Bye-bye, bye advantage: estimating the competitive impact of rest differential in the National Football League** (2024, Cited by `1`, DOI: `https://doi.org/10.3389/frbhe.2024.1479832`)
  - *Abstract:* The National Football League (NFL) sets its regular season schedule to optimize viewership and minimize competitive inequities. One inequity assumed to impact team performance is rest differential, defined as the relative number of days between games. Using Bayesian state space models on both game outcomes and betting market data, we estimate the competitive effect of rest differential in American...
- **[GSI] Subjective readiness in American football: Evaluating the effects of travel on player readiness** (2025, Cited by `0`, DOI: `None`)
  - *Abstract:* This study examined the impact of travel on perceived readiness in NCAA Division I American football players, utilizing the Hooper Index and practice load across home and away conditions.Results revealed that athletes reported better sleep quality, lower fatigue, and reduced DOMS when traveling, despite higher perceived practice loads during away games, suggesting that structured travel routines m...
- **[GSI] Playing against the clock: The hidden costs of circadian disruption in the football ecosystem of performance, recovery and spectator engagement** (2026, Cited by `1`, DOI: `https://doi.org/10.1080/02640414.2026.2623568`)
  - *Abstract:* Elite football imposes intense physical and psychological demands, with congested schedules, late-evening fixtures, artificial lighting, and long-haul travel restricting recovery opportunities. These factors disrupt circadian rhythms, impairing sleep quality and quantity, suppressing melatonin, elevating cortisol, and delaying physiological restoration. The consequences extend beyond immediate per...
- **[GSI] Home-Court Advantage and the Associations of Travel and Jet Lag with Team Performance in the Women’s National Basketball Association (WNBA)** (2026, Cited by `0`, DOI: `https://doi.org/10.1186/s40798-026-01067-0`)
  - *Abstract:* BACKGROUND: Travel-related fatigue and circadian disruption (i.e., jet lag) are well-established factors limiting performance in elite men's sport and are recognized contributors to home advantage. Yet evidence from women's professional leagues remains scarce. AIM: This study examined temporal trends in home-court advantage and assessed how cumulative travel burden and directional jet lag relate t...
- **[GSI] Defining the contemporary epidemiology and return to play for high ankle sprains in the National Football League** (2021, Cited by `17`, DOI: `https://doi.org/10.1080/00913847.2021.1924046`)
  - *Abstract:* BACKGROUND: High ankle sprains and syndesmotic injuries are commonly sustained by National Football League players, yet there is apaucity of literature reporting the incidence, risk factors and return to play (RTP) rates for these injuries. The purpose of this study is to examine the epidemiology and trends in incidence of high ankle sprains across 11 NFL seasons. METHODS: Publicly available data ...
- **[GSI] Return to Play After a Lateral Ligament Ankle Sprain** (2020, Cited by `90`, DOI: `https://doi.org/10.1007/s12178-020-09631-1`)
  - *Abstract:* PURPOSE OF REVIEW: The purpose of this review is to describe the current evidence on the most common sports-related ankle injuries. Joint anatomy, epidemiology, clinical findings, diagnostic approach, and treatment are presented with a specific focus on the available evidence towards return to play. RECENT FINDINGS: Recent findings show that ankle sprain is the most common injury in the world of s...
- **[GSI] The Football Association Medical Research Programme: an audit of injuries in professional football: an analysis of ankle sprains** (2003, Cited by `310`, DOI: `https://doi.org/10.1136/bjsm.37.3.233`)
  - *Abstract:* AIM: To conduct a detailed analysis of ankle sprains sustained in English professional football over two competitive seasons. METHODS: Club medical staff at 91 professional football clubs annotated player injuries. A specific injury audit questionnaire was used together with a weekly form that documented each club's current injury status. RESULTS: Completed injury records for the two competitive s...
- **[GSI] Fantasy football points capture performance declines in National Football League offensive skill players following an ankle injury** (2024, Cited by `5`, DOI: `https://doi.org/10.1016/j.jor.2024.03.030`)
  - *Abstract:* Background: The ankle is one of the anatomic sites most frequently injured in National Football League (NFL) players. Ankle injuries have previously been shown to have long-lasting negative impacts, and have been associated with impaired athletic performance. The aim of this study was to use fantasy football points as a metric to evaluate the impact of ankle injuries on NFL offensive skill player ...
- **[GSI] Prevalence of high ankle sprains among regional-level football players in Kota** (2026, Cited by `0`, DOI: `https://doi.org/10.30574/ijsra.2026.19.1.0655`)
  - *Abstract:* Introduction- High ankle sprains are common among football players, particularly in positions involving frequent cutting, stopping, and physical contact. These injuries lead to prolonged recovery times and significant performance impacts. This study examines the prevalence, risk factors, recovery, and prevention strategies for high ankle sprains in football players, addressing gaps in current lite...
- **[GSI] High rates of return-to-play and No deterioration in performance following ankle fractures in National Hockey League players** (2025, Cited by `1`, DOI: `https://doi.org/10.1016/j.jor.2025.07.033`)
  - *Abstract:* Background Ankle fractures are common injuries in high-impact sports but have not been extensively studied in professional hockey. Given the high-speed, collision-heavy nature of the National Hockey League (NHL), ankle fractures may significantly affect player performance and team resources. Purpose To investigate the incidence, management, and impact of ankle fractures on return-to-play (RTP) and...
- **[GSE] Here Comes the STRAIN: Analyzing Defensive Pass Rush in American Football with Player Tracking Data** (2023, Cited by `9`, DOI: `https://doi.org/10.1080/00031305.2023.2242442`)
  - *Abstract:* In American football, a pass rush is an attempt by the defensive team to disrupt the offense and prevent the quarterback (QB) from completing a pass. Existing metrics for assessing pass rush performance are either discrete-time quantities or based on subjective judgment. Using player tracking data, we propose STRAIN, a novel metric for evaluating pass rushers in the National Football League (NFL) ...
- **[GSE] The No-Fantasy League: Why The National Football League Should Ban Its Players From Managing Personal Fantasy Football Teams** (2016, Cited by `0`, DOI: `None`)
- **[GSE] Perceptions concerning successful development of Finnish players involved in the National Football League (NFL)** (2017, Cited by `0`, DOI: `None`)
  - *Abstract:* Development of American Football in Finland is largely influenced by its licensed participants and Finland's American Football Union (Suomen Amerikkalaisen Jalkapallon Liitto, SAJL). To increase competitive excellence and the level of competition at national and international levels requires certain psychological skills in supportive environments, which later have to be turned into opportunities. ...
- **[GSE] Bringing the Heat: Predicting the Pass Rush and Quantifying Pressure in NFL Football** (2023, Cited by `0`, DOI: `None`)
  - *Abstract:* Pass protection and the pass rush are frequently overlooked elements of American football. While the players involved in these matchups are typically the largest on the field, they also tend to be the most anonymous and may not receive the credit they deserve for performing their mental and physical responsibilities. In this paper, the pre-snap strategy and post-snap execution of pass protection a...
- **[GSE] A multilevel model with heterogeneous variances for snap timing in the National Football League** (2025, Cited by `1`, DOI: `https://doi.org/10.1093/jrsssa/qnaf185`)
  - *Abstract:* Abstract Player tracking data have provided great opportunities to generate insights into understudied areas of American football, such as pre-snap motion. Using a Bayesian multilevel model with heterogeneous variances, we provide an assessment of National Football League (NFL) quarterbacks and their ability to synchronize the timing of the ball snap with pre-snap movement from their teammates. We...
- **[GSE] Unsupervised methods for identifying pass coverage among defensive backs with NFL player tracking data** (2020, Cited by `4`, DOI: `https://doi.org/10.1515/jqas-2020-0017`)
  - *Abstract:* Abstract Statistical analysis of defensive players in football has lagged behind that of offensive players, special teams, and coaching decisions, largely because data on individual defensive players has historically been lacking. With the introduction of player tracking data from the NFL, researchers can now tackle these problems. However, event and strategy annotations in the NFL’s tracking data...
- **[GSI] Higher Rates of Lower Extremity Injury on Synthetic Turf Compared With Natural Turf Among National Football League Athletes: Epidemiologic Confirmation of a Biomechanical Hypothesis** (2018, Cited by `62`, DOI: `https://doi.org/10.1177/0363546518808499`)
  - *Abstract:* BACKGROUND: Biomechanical studies have shown that synthetic turf surfaces do not release cleats as readily as natural turf, and it has been hypothesized that concomitant increased loading on the foot contributes to the incidence of lower body injuries. This study evaluates this hypothesis from an epidemiologic perspective, examining whether the lower extremity injury rate in National Football Leag...
- **[GSI] Analyzing Ankle Injuries in the NFL: A Video-Based Investigation of the Impact of Artificial Turf on Injury Mechanisms** (2026, Cited by `0`, DOI: `https://doi.org/10.60118/001c.146424`)
  - *Abstract:* Purpose Artificial turf is increasingly used in professional football due to its economic and logistical advantages. However, concerns persist that certain turf types, especially slit-film, may alter biomechanics and increase the risk of lower extremity injuries. This study aimed to evaluate the mechanism and frequency of ankle and foot injuries across three surface types, natural grass, monofilam...
- **[GSI] Playing Surface and Injury Risk: Artificial Turf Vs. Natural Grass** (2022, Cited by `6`, DOI: `https://doi.org/10.5772/intechopen.106615`)
  - *Abstract:* Artificial turf’s developmental history spans 6 generations and includes design improvements that transformed an injury-inducing 1st generation field into a modern 3rd generation natural grass substitute. Artificial turf has become a widely adopted playing surface with a $2.7 billion United States Dollar (USD) valuation in North America. Turf’s popularity is due to its increased functionality and ...
- **[GSI] ACL Injury Incidence on Artificial Turf Versus Natural Grass in Elite Male Football Players: A Critically Appraised Topic** (2026, Cited by `0`, DOI: `None`)
  - *Abstract:* Context: Artificial turf has been shown to be controversial despite being a cost-effective alternative to natural grass because of the potential risks it has on athletes’ lower extremity (LE) injury, specifically the anterior cruciate ligament (ACL). Elite male football players were chosen as the population of choice to determine the risk of ACL injury incidence on artificial turf compared to natu...
- **[GSI] Field Surface Type and Season‐Ending Lower Extremity Injury in NFL Players** (2024, Cited by `2`, DOI: `https://doi.org/10.1155/2024/6832213`)
  - *Abstract:* There is growing concern over the safety of artificial turf when it comes to the incidence of player injuries. The artificial surfaces can withstand more play, are cheaper to maintain, and are more predictable. However, there is concern that this beneficial durability comes at the expense of the forgiveness of the surface, leading to more injuries. In this study, we aim to compare the incidence of...
- **[GSI] College-to-NFL Stadium Turf Transitions as a Risk Factor for Lower Extremity Non-Contact Injuries in Rookie Players: A 13-Year Cohort Analysis** (2025, Cited by `0`, DOI: `https://doi.org/10.3390/healthcare13121415`)
  - *Abstract:* Background/Objectives: Lower extremity non-contact injuries (LE-NCIs) pose a significant burden on the National Football League (NFL), with ongoing debates regarding playing surface safety. The stressful college-to-professional transition period for rookies, which can include adapting to new playing surfaces, may influence injury susceptibility. This study aimed to determine whether the transition...
- **[GSE] Quantifying the Causal Effects of Conservative Fourth Down Decision Making in the National Football League** (2018, Cited by `33`, DOI: `https://doi.org/10.2139/ssrn.3114242`)
  - *Abstract:* In part driven by academic research, perception in the sports analytics community asserts that coaches in the National Football League are too conservative on fourth down. Using 13 years of data, we confirm this premise and quantify the unobserved benefit that teams have missed out on by not utilizing a better fourth down strategy. Formally, teams that went for it are paired to those who did not g...
- **[GSE] Competitive Position, Expectations, and Managerial Approaches to Risk in National Football League Football** (2025, Cited by `2`, DOI: `https://doi.org/10.1123/jsm.2024-0254`)
  - *Abstract:* This paper analyzes how National Football League coaches incorporate information on competitive position and expectations of winning into fourth down decisions. Theoretically, teams should take more risk when their win probability is relatively low since additional risk broadens the distribution of possible outcomes thereby increasing the likelihood of victory. Our findings confirm this. We find t...
- **[GSE] An Examination of Decision-Making Biases on Fourth Down in The National Football League** (2016, Cited by `0`, DOI: `None`)
  - *Abstract:* The recent developments in the ﬁeld of sport analytics have given researchers the tools to examine an increasingly diverse set of topics within the world of sport in ways not previously possible (Alamar, 2013; Fry and Ohlmann, 2012). This study analyzes the decision-making processes of high level coaches under diﬀerent contexts and then determines whether or not a speciﬁc subconscious psychologica...
- **[GSE] Fourth Down's Critical Role in a Winning Strategy for American Football Games** (2021, Cited by `0`, DOI: `None`)
  - *Abstract:* Data analytics is booming, and this boom has started to creep into sports – originating in baseball and moving its way across other popular sports leagues. American Football is one of the last sports to embrace the analytics revolution; however, a noticeable use of data analytics in recent years within the sport of American Football is the decision on whether to punt or “go for it” on any fourth d...
- **[GSE] Learning risk preferences in Markov decision processes: An application to the fourth down decision in the national football league** (2024, Cited by `1`, DOI: `https://doi.org/10.1214/24-aoas1933`)
  - *Abstract:* For decades National Football League (NFL) coaches’ observed fourth down decisions have been largely inconsistent with prescriptions based on statistical models. In this paper we develop a framework to explain this discrepancy using an inverse optimization approach. We model the fourth down decision and the subsequent sequence of plays in a game as a Markov decision process (MDP), the dynamics of ...
- **[GSE] The Loser's Curse: Decision Making and Market Efficiency in the National Football League Draft** (2013, Cited by `199`, DOI: `https://doi.org/10.1287/mnsc.1120.1657`)
  - *Abstract:* A question of increasing interest to researchers in a variety of fields is whether the biases found in judgment and decision-making research remain present in contexts in which experienced participants face strong economic incentives. To investigate this question, we analyze the decision making of National Football League teams during their annual player draft. This is a domain in which monetary s...
- **[GSI] Common Injuries in Professional Football Quarterbacks** (2018, Cited by `15`, DOI: `https://doi.org/10.1007/s12178-018-9453-8`)
- **[GSI] Osteopathic approach to injuries of the overhead thrower’s shoulder** (2024, Cited by `2`, DOI: `https://doi.org/10.1515/jom-2024-0031`)
  - *Abstract:* Overhead sports place a significant amount of stress on the shoulder. There are a variety of activities and sports with overhead athletes including both throwing (baseball, softball, football, cricket) and nonthrowing (tennis, swimming, volleyball) sports. Although all of these overhead motions can lead to pathology, a large focus has been on the consequences of overhead throwing. Overhead-throwin...
- **[GSI] Shoulder injury in water polo: A systematic review of incidence and intrinsic risk factors** (2017, Cited by `58`, DOI: `https://doi.org/10.1016/j.jsams.2017.08.015`)
- **[GSI] Relationship between trunk and pelvic rotation angles during throwing and the Kerlan–Jobe Orthopedic Clinic score in quarterbacks in American football** (2025, Cited by `0`, DOI: `https://doi.org/10.1016/j.jseint.2025.101607`)
  - *Abstract:* Background Quarterbacks (QBs) in American football frequently perform repetitive overhead throwing, which can lead to shoulder and elbow injuries. Effective control of trunk and pelvic movements is considered crucial for minimizing shoulder and elbow joint stress during throwing. The Kerlan–Jobe Orthopedic Clinic (KJOC) score is a self-perceived index of shoulder and elbow function and level of co...
- **[GSI] Risk Factors and Injury Prevention in the Throwing Athlete** (2024, Cited by `6`, DOI: `https://doi.org/10.1016/j.asmr.2024.101037`)
  - *Abstract:* Abstract: Arm injuries are the most common throwing injury, with growing concern as the most severe injuries, such as UCL reconstruction, continue to rise. Furthermore, throwing injuries are frequently recurrent, suggesting once injured, players are at increased risk for another arm injury. The increase in injury rates and severity has been attributed to increases in pitching volume and year-round...
- **[GSI] Analysis of hip and shoulder rotation and linear ball velocity in the transverse plane during handball power serve /by Adam Coronado.** (2014, Cited by `0`, DOI: `None`)
  - *Abstract:* The purpose of this research was to analyze angular velocities of the hip and shoulders in the transverse plane and resultant linear velocity of the ball during a handball power serve. There has been little research of any type in court handball and no known research reports involving the biomechanics of handball. Eighteen trained, competitive handball players, from the professional division to th...

---

## 3. Live arXiv Quantitative & Tracking Preprints (GSE & GSI)

- **[GSE] Moving from Machine Learning to Statistics: the case of Expected Points in American football** (`http://arxiv.org/abs/2409.04889v1`, 2024-09-07) — Ryan S. Brill, Ryan Yee, Sameer K. Deshpande, Abraham J. Wyner
  - *Abstract:* Expected points is a value function fundamental to player evaluation and strategic in-game decision-making across sports analytics, particularly in American football. To estimate expected points, football analysts use machine learning tools, which are not equipped to handle certain challenges. They suffer from selection bias, display counter-intuitive artifacts of overfitting, do not quantify unce...
- **[GSE] Hand Held Multi-Object Tracking Dataset in American Football** (`http://arxiv.org/abs/2511.09455v1`, 2025-11-12) — Rintaro Otsubo, Kanta Sawafuji, Hideo Saito
  - *Abstract:* Multi-Object Tracking (MOT) plays a critical role in analyzing player behavior from videos, enabling performance evaluation. Current MOT methods are often evaluated using publicly available datasets. However, most of these focus on everyday scenarios such as pedestrian tracking or are tailored to specific sports, including soccer and basketball. Despite the inherent challenges of tracking players ...
- **[GSE] Fractional Tackles: Leveraging Player Tracking Data for Within-Play Tackling Evaluation in American Football** (`http://arxiv.org/abs/2403.14769v2`, 2024-03-21) — Quang Nguyen, Ruitong Jiang, Meg Ellingwood, Ronald Yurko
  - *Abstract:* Tackling is a fundamental defensive move in American football, with the main purpose of stopping the forward motion of the ball-carrier. However, current tackling metrics are manually recorded outcomes that are inherently flawed due to their discrete and subjective nature. Using player tracking data, we present a novel framework for assessing tackling contribution in a continuous and objective man...
- **[GSE] Throwing a Tight Spiral American Football by a Humanoid Robot** (`http://arxiv.org/abs/2608.16642v2`, 2026-08-17) — Zaid Mahboob, Bowen Weng
  - *Abstract:* Accurate throwing of the American football requires precise regulation of release conditions, where coupled linear and angular momentum determine flight stability and targeting accuracy. While prior work on robotic object throwing has largely focused on generating dynamically feasible release velocities using open-gripper paradigms, explicit control of spin injection at detachment remains underexp...
- **[GSE] Going Deep: Models for Continuous-Time Within-Play Valuation of Game Outcomes in American Football with Tracking Data** (`http://arxiv.org/abs/1906.01760v3`, 2019-06-05) — Ronald Yurko, Francesca Matano, Lee F. Richardson, Nicholas Granered
  - *Abstract:* Continuous-time assessments of game outcomes in sports have become increasingly common in the last decade. In American football, only discrete-time estimates of play value were possible, since the most advanced public football datasets were recorded at the play-by-play level. While measures such as expected points and win probability are useful for evaluating football plays and game situations, th...
- **[GSE] Here Comes the STRAIN: Analyzing Defensive Pass Rush in American Football with Player Tracking Data** (`http://arxiv.org/abs/2305.10262v3`, 2023-05-17) — Quang Nguyen, Ronald Yurko, Gregory J. Matthews
  - *Abstract:* In American football, a pass rush is an attempt by the defensive team to disrupt the offense and prevent the quarterback (QB) from completing a pass. Existing metrics for assessing pass rush performance are either discrete-time quantities or based on subjective judgment. Using player tracking data, we propose STRAIN, a novel metric for evaluating pass rushers in the National Football League (NFL) ...
- **[GSE] Frame by frame completion probability of an NFL pass** (`http://arxiv.org/abs/2109.08051v1`, 2021-09-16) — Gustavo Pompeu da Silva, Rafael de Andrade Moral
  - *Abstract:* American football is an increasingly popular sport, with a growing audience in many countries in the world. The most watched American football league in the world is the United States' National Football League (NFL), where every offensive play can be either a run or a pass, and in this work we focus on passes. Many factors can affect the probability of pass completion, such as receiver separation ...
- **[GSE] NFL step-and-turn: A generative framework for evaluating player movement in American football** (`http://arxiv.org/abs/2603.17866v3`, 2026-03-18) — Quang Nguyen, Ronald Yurko
  - *Abstract:* In sports analytics, player tracking data have driven significant advancements in the task of player evaluation. We present a novel generative framework for evaluating the observed frame-by-frame player positioning against a distribution of hypothetical alternatives. We illustrate our approach by modeling the within-play movement of an individual ball carrier in the National Football League (NFL)....
- **[GSI] Fatigue detection via sequential testing of biomechanical data using martingale statistic** (`http://arxiv.org/abs/2306.01566v2`, 2023-06-02) — Rupsa Basu, Katharina Proksch
  - *Abstract:* Injuries to the knee joint are very common for long-distance and frequent runners, an issue which is often attributed to fatigue. We address the problem of fatigue detection from biomechanical data from different sources, consisting of lower extremity joint angles and ground reaction forces from running athletes with the goal of better understanding the impact of fatigue on the biomechanics of run...
- **[GSI] Biomechanical Comparison of Human Walking Locomotion on Solid Ground and Sand** (`http://arxiv.org/abs/2403.03105v3`, 2024-03-05) — Chunchu Zhu, Xunjie Chen, Jingang Yi
  - *Abstract:* Current studies on human locomotion focus mainly on solid ground walking conditions. In this paper, we present a biomechanic comparison of human walking locomotion on solid ground and sand. A novel dataset containing 3-dimensional motion and biomechanical data from 20 able-bodied adults for locomotion on solid ground and sand is collected. We present the data collection methods and report the sens...
- **[GSI] Designing Fatigue-Aware VR Interfaces via Biomechanical Models** (`http://arxiv.org/abs/2603.26031v1`, 2026-03-27) — Harshitha Voleti, Charalambos Poullis
  - *Abstract:* Prolonged mid-air interaction in virtual reality (VR) causes arm fatigue and discomfort, negatively affecting user experience. Incorporating ergonomic considerations into VR user interface (UI) design typically requires extensive human-in-the-loop evaluation. Although biomechanical models have been used to simulate human behavior in HCI tasks, their application as surrogate users for ergonomic VR ...
- **[GSI] Multiple change point detection in functional data with applications to biomechanical fatigue data** (`http://arxiv.org/abs/2312.11108v3`, 2023-12-18) — Patrick Bastian, Rupsa Basu, Holger Dette
  - *Abstract:* Injuries to the lower extremity joints are often debilitating, particularly for professional athletes. Understanding the onset of stressful conditions on these joints is therefore important in order to ensure prevention of injuries as well as individualised training for enhanced athletic performance. We study the biomechanical joint angles from the hip, knee and ankle for runners who are experienc...
- **[GSI] A new computational method for a model of C. elegans biomechanics: Insights into elasticity and locomotion performance** (`http://arxiv.org/abs/1702.04988v1`, 2017-02-16) — Netta Cohen, Thomas Ranner
  - *Abstract:* An organism's ability to move freely is a fundamental behaviour in the animal kingdom. To understand animal locomotion requires a characterisation of the material properties, as well as the biomechanics and physiology. We present a biomechanical model of C. elegans locomotion together with a novel finite element method. We formulate our model as a nonlinear initial-boundary value problem which all...
- **[GSI] Monocular markerless biomechanics for clinically interpretable gait assessment in spinal cord injury** (`http://arxiv.org/abs/2610.05552v2`, 2026-10-04) — Shreyasvi Natraj, Mathieu Ruepp, Yanke Li, Robert Riener
  - *Abstract:* Three-dimensional gait analysis guides rehabilitation after spinal cord injury but depends on marker-based motion capture and force plates, which few clinics have. Monocular markerless pipelines have been established in fewer healthy adult cohorts but not in neurological cohorts. We present the SCAI SCI Gait dataset, comprising 239 adult individuals with spinal cord injury with synchronized video,...
- **[GSI] Fatigue-PINN: Physics-Informed Fatigue-Driven Motion Modulation and Synthesis** (`http://arxiv.org/abs/2502.19056v2`, 2025-02-26) — Iliana Loi, Konstantinos Moustakas
  - *Abstract:* Fatigue modeling is essential for motion synthesis tasks to model human motions under fatigued conditions and biomechanical engineering applications, such as investigating the variations in movement patterns and posture due to fatigue, defining injury risk mitigation and prevention strategies, formulating fatigue minimization schemes, and creating improved ergonomic designs. Nevertheless, employin...
- **[GSI] FatigueFusion: Latent Space Fusion for Fatigue-Driven Motion Synthesis** (`http://arxiv.org/abs/2604.10199v1`, 2026-04-11) — Iliana Loi, Konstantinos Moustakas
  - *Abstract:* Investigating the impact of fatigue on human physiological function and motor behavior is crucial for developing biomechanics and medical applications aimed at mitigating fatigue, reducing injury risk, and creating sophisticated ergonomic designs, as well as for producing physically-plausible 3D animation sequences. While the former has a prominent position in state-of-the-art literature, fatigue-...
- **[GSI] Spatio-Temporal Dual Graph Neural Networks for Travel Time Estimation** (`http://arxiv.org/abs/2105.13591v2`, 2021-05-28) — Guangyin Jin, Huan Yan, Fuxian Li, Jincai Huang
  - *Abstract:* Travel time estimation is one of the core tasks for the development of intelligent transportation systems. Most previous works model the road segments or intersections separately by learning their spatio-temporal characteristics to estimate travel time. However, due to the continuous alternations of the road segments and intersections in a path, the dynamic features are supposed to be coupled and ...
- **[GSI] Spectral Temporal Graph Neural Network for Trajectory Prediction** (`http://arxiv.org/abs/2106.02930v1`, 2021-06-05) — Defu Cao, Jiachen Li, Hengbo Ma, Masayoshi Tomizuka
  - *Abstract:* An effective understanding of the contextual environment and accurate motion forecasting of surrounding agents is crucial for the development of autonomous vehicles and social mobile robots. This task is challenging since the behavior of an autonomous agent is not only affected by its own intention, but also by the static environment and surrounding dynamically interacting agents. Previous works f...
- **[GSI] ChaosNetBench: Benchmarking Spatio-Temporal Graph Neural Networks on Chaotic Lattice Dynamics** (`http://arxiv.org/abs/2605.09676v1`, 2026-05-10) — Henok Tenaw Moges, Charalampos Skokos, Deshendran Moodley
  - *Abstract:* Spatio-temporal graph neural networks (STGNNs) are widely used for short-term forecasting in dynamic physical systems such as traffic and weather. However, the prevailing evaluation practice uses real world benchmark data sets in a single domain with a single fixed holdout splits, making it difficult to compare architectures across different dynamical regimes. We introduce ChaosNetBench (CNB), a s...
- **[GSI] Equivariant Spatio-Temporal Attentive Graph Networks to Simulate Physical Dynamics** (`http://arxiv.org/abs/2405.12868v1`, 2024-05-21) — Liming Wu, Zhichao Hou, Jirui Yuan, Yu Rong
  - *Abstract:* Learning to represent and simulate the dynamics of physical systems is a crucial yet challenging task. Existing equivariant Graph Neural Network (GNN) based methods have encapsulated the symmetry of physics, \emph{e.g.}, translations, rotations, etc, leading to better generalization ability. Nevertheless, their frame-to-frame formulation of the task overlooks the non-Markov property mainly incurre...
- **[GSI] Riemannian Liquid Spatio-Temporal Graph Network** (`http://arxiv.org/abs/2601.14115v1`, 2026-01-20) — Liangsi Lu, Jingchao Wang, Zhaorong Dai, Hanqian Liu
  - *Abstract:* Liquid Time-Constant networks (LTCs), a type of continuous-time graph neural network, excel at modeling irregularly-sampled dynamics but are fundamentally confined to Euclidean space. This limitation introduces significant geometric distortion when representing real-world graphs with inherent non-Euclidean structures (e.g., hierarchies and cycles), degrading representation quality. To overcome thi...
- **[GSI] Interaction-Aware Personalized Vehicle Trajectory Prediction Using Temporal Graph Neural Networks** (`http://arxiv.org/abs/2308.07439v2`, 2023-08-14) — Amr Abdelraouf, Rohit Gupta, Kyungtae Han
  - *Abstract:* Accurate prediction of vehicle trajectories is vital for advanced driver assistance systems and autonomous vehicles. Existing methods mainly rely on generic trajectory predictions derived from large datasets, overlooking the personalized driving patterns of individual drivers. To address this gap, we propose an approach for interaction-aware personalized vehicle trajectory prediction that incorpor...
- **[GSI] Spatio-Temporal Graphs Beyond Grids: Benchmark for Maritime Anomaly Detection** (`http://arxiv.org/abs/2512.20086v1`, 2025-12-23) — Jeehong Kim, Youngseok Hwang, Minchan Kim, Sungho Bae
  - *Abstract:* Spatio-temporal graph neural networks (ST-GNNs) have achieved notable success in structured domains such as road traffic and public transportation, where spatial entities can be naturally represented as fixed nodes. In contrast, many real-world systems including maritime traffic lack such fixed anchors, making the construction of spatio-temporal graphs a fundamental challenge. Anomaly detection in...
- **[GSI] Discovering Gateway Ports in Maritime Using Temporal Graph Neural Network Port Classification** (`http://arxiv.org/abs/2204.11855v1`, 2022-04-25) — Dogan Altan, Mohammad Etemad, Dusica Marijan, Tetyana Kholodna
  - *Abstract:* Vessel navigation is influenced by various factors, such as dynamic environmental factors that change over time or static features such as vessel type or depth of the ocean. These dynamic and static navigational factors impose limitations on vessels, such as long waiting times in regions outside the actual ports, and we call these waiting regions gateway ports. Identifying gateway ports and their ...
- **[GSE] A geometric investigation into the tail dependence of vine copulas** (`http://arxiv.org/abs/2012.09623v1`, 2020-12-17) — Emma S. Simpson, Jennifer L. Wadsworth, Jonathan A. Tawn
  - *Abstract:* Vine copulas are a type of multivariate dependence model, composed of a collection of bivariate copulas that are combined according to a specific underlying graphical structure. Their flexibility and practicality in moderate and high dimensions have contributed to the popularity of vine copulas, but relatively little attention has been paid to their extremal properties. To address this issue, we p...
- **[GSE] Vine copula mixture models and clustering for non-Gaussian data** (`http://arxiv.org/abs/2102.03257v2`, 2021-02-05) — Özge Sahin, Claudia Czado
  - *Abstract:* The majority of finite mixture models suffer from not allowing asymmetric tail dependencies within components and not capturing non-elliptical clusters in clustering applications. Since vine copulas are very flexible in capturing these types of dependencies, we propose a novel vine copula mixture model for continuous data. We discuss the model selection and parameter estimation problems and furthe...
- **[GSE] Conditional Inferences Based on Vine Copulas with Applications to Credit Spread Data of Corporate Bonds** (`http://arxiv.org/abs/2008.05606v1`, 2020-08-12) — Shenyi Pan, Harry Joe, Guofu Li
  - *Abstract:* Understanding the dependence relationship of credit spreads of corporate bonds is important for risk management. Vine copula models with tail dependence are used to analyze a credit spread dataset of Chinese corporate bonds, understand the dependence among different sectors and perform conditional inferences. It is shown how the effect of tail dependence affects risk transfer, or the conditional d...
- **[GSE] Nonparametric estimation of simplified vine copula models: comparison of methods** (`http://arxiv.org/abs/1701.00845v2`, 2017-01-03) — Thomas Nagler, Christian Schellhase, Claudia Czado
  - *Abstract:* In the last decade, simplified vine copula models have been an active area of research. They build a high dimensional probability density from the product of marginals densities and bivariate copula densities. Besides parametric models, several approaches to nonparametric estimation of vine copulas have been proposed. In this article, we extend these approaches and compare them in an extensive sim...
- **[GSE] Dependence Structure Analysis Of Meta-level Metrics in YouTube Videos: A Vine Copula Approach** (`http://arxiv.org/abs/1712.10232v1`, 2017-12-29) — Vikram Krishnamurthy, Yan Duan
  - *Abstract:* This paper uses vine copula to analyze the multivariate statistical dependence in a massive YouTube dataset consisting of 6 million videos over 25 thousand channels. Specifically we study the statistical dependency of 7 YouTube meta-level metrics: view count, number of likes, number of comments, length of video title, number of subscribers, click rates, and average percentage watching. Dependency ...
- **[GSE] A vine copula mixed effect model for trivariate meta-analysis of diagnostic test accuracy studies accounting for disease prevalence** (`http://arxiv.org/abs/1506.03920v1`, 2015-06-12) — Aristidis K. Nikoloulopoulos
  - *Abstract:* A bivariate copula mixed model has been recently proposed to synthesize diagnostic test accuracy studies and it has been shown that is superior to the standard generalized linear mixed model (GLMM) in this context. Here we call trivariate vine copulas to extend the bivariate meta-analysis of diagnostic test accuracy studies by accounting for disease prevalence. Our vine copula mixed model includes...
- **[GSE] A new tractable Archimedean copula for full-range tail dependence** (`http://arxiv.org/abs/2609.18742v1`, 2026-09-16) — Lei Hua
  - *Abstract:* Parametric copulas capable of capturing full-range tail dependence in both lower and upper tails are useful in many applications, including as pair-copula building blocks in vine copula models. However, it is challenging to create such copulas that have closed-form density functions, which limits their practical applicability in complex modeling scenarios. To the best of our knowledge, all existin...
- **[GSE] Stochastic Variational Inference for Vine Copula Distributional Regression** (`http://arxiv.org/abs/2609.37996v1`, 2026-09-29) — Gianmarco Callegher, Thomas Kneib
  - *Abstract:* Structured additive distributional regression flexibly relates all parameters of a conditional response distribution to covariates, but multivariate extensions remain challenging when dependence is complex. We propose a multivariate structured additive distributional regression model based on regular vine copulas. Different vine edges may use different pair-copula families, while every pair-copula...
- **[GSE] Balancing Interpretability and Flexibility in Modeling Diagnostic Trajectories with an Embedded Neural Hawkes Process Model** (`http://arxiv.org/abs/2504.21795v3`, 2025-04-30) — Yuankang Zhao, Matthew Engelhard
  - *Abstract:* The Hawkes process (HP) is commonly used to model event sequences with self-reinforcing dynamics, including electronic health records (EHRs). Traditional HPs capture self-reinforcement via parametric impact functions that can be inspected to understand how each event modulates the intensity of others. Neural network-based HPs offer greater flexibility, resulting in improved fit and prediction perf...
- **[GSE] Modeling Patient Care Trajectories with Transformer Hawkes Processes** (`http://arxiv.org/abs/2604.05844v1`, 2026-04-07) — Saumya Pandey, Varun Chandola
  - *Abstract:* Patient healthcare utilization consists of irregularly time-stamped events, such as outpatient visits, inpatient admissions, and emergency encounters, forming individualized care trajectories. Modeling these trajectories is crucial for understanding utilization patterns and predicting future care needs, but is challenging due to temporal irregularity and severe class imbalance. In this work, we bu...
- **[GSE] Variance-Hawkes Process and its Application to Energy Markets** (`http://arxiv.org/abs/2410.08420v1`, 2024-10-10) — Joshua McGillivray, Anatoliy Swishchuk
  - *Abstract:* We define a new model using a Hawkes process as a subordinator in a standard Brownian motion. We demonstrate that this Hawkes subordinated Brownian motion or more succinctly, variance-Hawkes process can be fit to 2018 and 2019 natural gas and crude oil front-month futures log returns. This variance-Hawkes process allows financial models to easily have clustering effects encoded into their behaviou...
- **[GSE] Age-stratified epidemic model using a latent marked Hawkes process** (`http://arxiv.org/abs/2208.09555v1`, 2022-08-19) — Stamatina Lamprinakou, Axel Gandy
  - *Abstract:* We extend the unstructured homogeneously mixing epidemic model introduced by Lamprinakou et al. [arXiv:2208.07340] considering a finite population stratified by age bands. We model the actual unobserved infections using a latent marked Hawkes process and the reported aggregated infections as random quantities driven by the underlying Hawkes process. We apply a Kernel Density Particle Filter (KDPF)...
- **[GSE] Scalable Inference for Nonparametric Hawkes Process Using Pólya-Gamma Augmentation** (`http://arxiv.org/abs/1910.13052v1`, 2019-10-29) — Feng Zhou, Zhidong Li, Xuhui Fan, Yang Wang
  - *Abstract:* In this paper, we consider the sigmoid Gaussian Hawkes process model: the baseline intensity and triggering kernel of Hawkes process are both modeled as the sigmoid transformation of random trajectories drawn from Gaussian processes (GP). By introducing auxiliary latent random variables (branching structure, Pólya-Gamma random variables and latent marked Poisson processes), the likelihood is conve...
- **[GSE] Optimal Execution in Intraday Energy Markets under Hawkes Processes with Transient Impact** (`http://arxiv.org/abs/2504.10282v2`, 2025-04-14) — Konstantinos Chatziandreou, Sven Karbach
  - *Abstract:* This paper investigates optimal execution strategies in intraday energy markets through a mutually exciting Hawkes process model. Calibrated to data from the German intraday electricity market, the model effectively captures key empirical features, including intra-session volatility, distinct intraday market activity patterns, and the Samuelson effect as gate closure approaches. By integrating a t...
- **[GSE] Stability of discrete-time Hawkes process with inhibition: towards a general condition** (`http://arxiv.org/abs/2409.01660v1`, 2024-09-03) — Manon Costa, Pascal Maillard, Anthony Muraro
  - *Abstract:* In this paper, we study a discrete-time analogue of a Hawkes process, modelled as a Poisson autoregressive process whose parameters depend on the past of the trajectory. The model is characterized to allow these parameters to take negative values, modelling inhibitory dynamics. More precisely, the model is the stochastic process $(\Tilde X_n)_{n\ge0}$ with parameters $a_1,\ldots,a_p \in \R$, $p\in...
- **[GSE] A Markov switching discrete-time Hawkes process: application to the monitoring of bats behavior** (`http://arxiv.org/abs/2507.20153v1`, 2025-07-27) — Anna Bonnet, Stéphane Robin
  - *Abstract:* Over the past few decades, the Hawkes process has become a popular framework for modeling temporal events thanks to its flexibility to capture different dependency structures. The objective of this work is to model call sequences emitted by bats for echolocation, whose patterns are known to change depending on the animal's activity. The novelty of the model lies in the combination of a Hawkes-type...
- **[GSE] Machine learning for sports betting: should model selection be based on accuracy or calibration?** (`http://arxiv.org/abs/2303.06021v4`, 2023-03-10) — Conor Walsh, Alok Joshi
  - *Abstract:* Sports betting's recent federal legalisation in the USA coincides with the golden age of machine learning. If bettors can leverage data to reliably predict the probability of an outcome, they can recognise when the bookmaker's odds are in their favour. As sports betting is a multi-billion dollar industry in the USA alone, identifying such opportunities could be extremely lucrative. Many researcher...
- **[GSE] Optimal sports betting strategies in practice: an experimental review** (`http://arxiv.org/abs/2107.08827v1`, 2021-07-15) — Matej Uhrín, Gustav Šourek, Ondřej Hubáček, Filip Železný
  - *Abstract:* We investigate the most popular approaches to the problem of sports betting investment based on modern portfolio theory and the Kelly criterion. We define the problem setting, the formal investment strategies, and review their common modifications used in practice. The underlying purpose of the reviewed modifications is to mitigate the additional risk stemming from the unrealistic mathematical ass...
- **[GSE] Sports Betting: an application of neural networks and modern portfolio theory to the English Premier League** (`http://arxiv.org/abs/2307.13807v1`, 2023-07-11) — Vélez Jiménez, Román Alberto, Lecuanda Ontiveros, José Manuel
  - *Abstract:* This paper presents a novel approach for optimizing betting strategies in sports gambling by integrating Von Neumann-Morgenstern Expected Utility Theory, deep learning techniques, and advanced formulations of the Kelly Criterion. By combining neural network models with portfolio optimization, our method achieved remarkable profits of 135.8% relative to the initial wealth during the latter half of ...
- **[GSE] Beating the bookies with their own numbers - and how the online sports betting market is rigged** (`http://arxiv.org/abs/1710.02824v2`, 2017-10-08) — Lisandro Kaunitz, Shenjun Zhong, Javier Kreiner
  - *Abstract:* The online sports gambling industry employs teams of data analysts to build forecast models that turn the odds at sports games in their favour. While several betting strategies have been proposed to beat bookmakers, from expert prediction models and arbitrage strategies to odds bias exploitation, their returns have been inconsistent and it remains to be shown that a betting strategy can outperform...
- **[GSE] Calibrate: Interactive Analysis of Probabilistic Model Output** (`http://arxiv.org/abs/2207.13770v1`, 2022-07-27) — Peter Xenopoulos, Joao Rulff, Luis Gustavo Nonato, Brian Barr
  - *Abstract:* Analyzing classification model performance is a crucial task for machine learning practitioners. While practitioners often use count-based metrics derived from confusion matrices, like accuracy, many applications, such as weather prediction, sports betting, or patient risk prediction, rely on a classifier's predicted probabilities rather than predicted labels. In these instances, practitioners are...
- **[GSE] Boltzmann-Informed Probabilities** (`http://arxiv.org/abs/2505.21543v1`, 2025-05-24) — Yair Neuman, Yochai Cohen
  - *Abstract:* Traditional interpretations of probability, whether frequentist or subjective, make no reference to the concept of energy. In this paper, we propose that assigning hypothetical energy levels to the outcomes of a random variable can yield improved probability estimates. We apply this Boltzmann-informed approach to the context of sports betting and analyze five seasons of the English Premier League ...
- **[GSE] Beating the market with a bad predictive model** (`http://arxiv.org/abs/2010.12508v1`, 2020-10-23) — Ondřej Hubáček, Gustav Šír
  - *Abstract:* It is a common misconception that in order to make consistent profits as a trader, one needs to posses some extra information leading to an asset value estimation more accurate than that reflected by the current market price. While the idea makes intuitive sense and is also well substantiated by the widely popular Kelly criterion, we prove that it is generally possible to make systematic profits w...
- **[GSE] A Comparison between Financial and Gambling Markets** (`http://arxiv.org/abs/2409.13528v2`, 2024-09-20) — Haoyu Liu, Carl Donovan, Valentin Popov
  - *Abstract:* Financial and gambling markets are ostensibly similar and hence strategies from one could potentially be applied to the other. Financial markets have been extensively studied, resulting in numerous theorems and models, while gambling markets have received comparatively less attention and remain relatively undocumented. This study conducts a comprehensive comparison of both markets, focusing on tra...

---

## 4. Live Hugging Face Datasets & Models + Kaggle Tracking Assets

- **[HF GSE dataset] `Voxel51/Football-Player-Segmentation`** (Downloads: `4,712`, Likes: `5`)
- **[HF GSE dataset] `Chucks90/football-holefinder-jobs`** (Downloads: `3,751`, Likes: `2`)
- **[HF GSE dataset] `Enxin/Football`** (Downloads: `1,832`, Likes: `4`)
- **[HF GSE dataset] `martinjolif/football-ball-detection`** (Downloads: `1,473`, Likes: `4`)
- **[HF GSE dataset] `unitreerobotics/G1_Dex1_Play_Football`** (Downloads: `1,442`, Likes: `1`)
- **[HF GSE dataset] `illuin-conteb/football`** (Downloads: `1,159`, Likes: `1`)
- **[HF GSE dataset] `Damir81/football-charts-results-goal-timing`** (Downloads: `1,003`, Likes: `4`)
- **[HF GSE dataset] `oliviersportsdata/European-Football-Timestamped-Odds-Pinnacle-Match-Stats`** (Downloads: `586`, Likes: `0`)
- **[HF GSE dataset] `Hellfire98/sportsmot`** (Downloads: `65,140`, Likes: `1`)
- **[HF GSE dataset] `LiuRunky/Leeds_Sports_Pose`** (Downloads: `18,452`, Likes: `0`)
- **[HF GSE dataset] `ruslanmv/sports-trends-dataset`** (Downloads: `12,471`, Likes: `5`)
- **[HF GSE dataset] `Lekim89/sportsmot`** (Downloads: `6,207`, Likes: `2`)
- **[HF GSE dataset] `resfunny717/sports-betting-bundle`** (Downloads: `5,667`, Likes: `0`)
- **[HF GSE dataset] `karunapu/sports-calendar`** (Downloads: `5,541`, Likes: `0`)
- **[HF GSE dataset] `MCG-NJU/SportsMOT`** (Downloads: `3,882`, Likes: `8`)
- **[HF GSE dataset] `kennyhyder/sportsbookish-daily-odds`** (Downloads: `2,979`, Likes: `1`)
- **[HF GSE model] `ibm-granite/granite-timeseries-tspulse-r1`** (Downloads: `1,352,749`, Likes: `48`)
- **[HF GSE model] `ibm-granite/granite-timeseries-ttm-r3`** (Downloads: `535,387`, Likes: `20`)
- **[HF GSE model] `ibm-granite/granite-timeseries-patchtst-fm-r2`** (Downloads: `115,354`, Likes: `18`)
- **[HF GSE model] `ibm-granite/granite-timeseries-ttm-r2`** (Downloads: `107,409`, Likes: `169`)
- **[HF GSE model] `ibm-granite/granite-timeseries-flowstate-r1`** (Downloads: `34,319`, Likes: `29`)
- **[HF GSE model] `ibm-granite/granite-timeseries-patchtst-fm-r1`** (Downloads: `15,131`, Likes: `7`)
- **[HF GSE model] `ibm-granite/granite-timeseries-ttm-r1`** (Downloads: `11,940`, Likes: `331`)
- **[HF GSE model] `ibm-granite/granite-timeseries-patchtst`** (Downloads: `5,564`, Likes: `20`)
- **[HF GSE model] `nvidia/Kumo-Tabular`** (Downloads: `144,654`, Likes: `205`)
- **[HF GSE model] `tabularisai/multilingual-sentiment-analysis`** (Downloads: `108,407`, Likes: `398`)
- **[HF GSE model] `LG-AI-Research/EXAONE-Tabular`** (Downloads: `107,851`, Likes: `14`)
- **[HF GSE model] `tabularisai/ModernFinBERT`** (Downloads: `4,946`, Likes: `13`)
- **[HF GSE model] `tabularisai/multilingual-emotion-classification`** (Downloads: `2,189`, Likes: `27`)
- **[HF GSE model] `tabularisai/Qwen3-0.3B-distil`** (Downloads: `1,370`, Likes: `2`)
- **[HF GSE model] `tabularisai/Faust-1`** (Downloads: `1,110`, Likes: `6`)
- **[HF GSE model] `tabularisai/ai-text-detection`** (Downloads: `1,077`, Likes: `5`)
- **[HF GSI dataset] `lekhoa288/picklebase-open-biomechanics`** (Downloads: `87`, Likes: `2`)
- **[HF GSI dataset] `abnjamilahmad/fenm-3d-biomechanics`** (Downloads: `36`, Likes: `0`)
- **[HF GSI dataset] `JatinkInnovision/Injury_Biomechanics`** (Downloads: `26`, Likes: `1`)
- **[HF GSI dataset] `Innovision/Injury_Biomechanics`** (Downloads: `7`, Likes: `1`)
- **[HF GSI dataset] `masonmarker/osha-severe-injury-reports-enriched`** (Downloads: `449`, Likes: `2`)
- **[HF GSI dataset] `Layered-Labs/neiss-injury-data`** (Downloads: `374`, Likes: `1`)
- **[HF GSI dataset] `multabench/extended-text-cls-osha-injury`** (Downloads: `211`, Likes: `0`)
- **[HF GSI dataset] `who-is-tyler-durden/thailand-road-traffic-injury-aggregates-2018`** (Downloads: `96`, Likes: `0`)
- **[HF GSI dataset] `mayerantoine/injury-narrative-coding`** (Downloads: `90`, Likes: `0`)
- **[HF GSI dataset] `electricsheepafrica/africa-synth-disability-spinal-cord-injury-paraplegia-all`** (Downloads: `67`, Likes: `0`)
- **[HF GSI dataset] `jablonkagroup/drug_induced_liver_injury-multimodal`** (Downloads: `56`, Likes: `0`)
- **[HF GSI dataset] `Emulated-Inc/sci-spinal-cord-structure-injury`** (Downloads: `53`, Likes: `0`)
- **[HF GSE dataset] `minmaxxxer/nfl-odds-2026`** (Downloads: `553`, Likes: `0`)
- **[HF GSE dataset] `minmaxxxer/nfl-closing-lines-ats-2025`** (Downloads: `386`, Likes: `0`)
- **[HF GSE dataset] `dismalnow/nfl-stats-2021-2025`** (Downloads: `378`, Likes: `0`)
- **[HF GSE dataset] `nfL6/yahoo_answers_qa`** (Downloads: `295`, Likes: `28`)
- **[HF GSE dataset] `michaelmallari/nfl`** (Downloads: `235`, Likes: `1`)
- **[HF GSE dataset] `oliviersportsdata/NFL-Multi-Market-Timestamped-Odds-Team-Stats`** (Downloads: `186`, Likes: `0`)
- **[HF GSE dataset] `MikeySports/nfl-stats-2021-2025`** (Downloads: `158`, Likes: `0`)
- **[HF GSE dataset] `nfliu/decontextualization`** (Downloads: `124`, Likes: `0`)
- **[Kaggle GSE] `tobycrabtree/nfl-scores-and-betting-data`** — NFL scores and betting data (Downloads: `39300`, Votes: `516`)
- **[Kaggle GSE] `philiphyde1/nfl-stats-1999-2022`** — NFL Stats 2012-2025 (Downloads: `9122`, Votes: `61`)
- **[Kaggle GSE] `ulrikthygepedersen/nfl-draft-1985-2015`** — NFL Draft 1985-2015 (Downloads: `1247`, Votes: `31`)
- **[Kaggle GSE] `willvernon/nfl-scores-and-lines`** — NFL Scores and Lines (Downloads: `238`, Votes: `7`)
- **[Kaggle GSE] `caseydurfee/mgm-grand-nfl-betting-data`** — MGM Grand NFL betting data (Downloads: `190`, Votes: `1`)
- **[Kaggle GSE] `smadler92/nfl-pfr`** — NFL (PFR) (Downloads: `1388`, Votes: `9`)
- **[Kaggle GSE] `scottfree/sports-lines`** — Pro and College Sports Lines (Downloads: `1379`, Votes: `30`)
- **[Kaggle GSE] `marcuslin/marcuslin-nbadata`** — NBA_data with bet365(2009-2011) (Downloads: `370`, Votes: `7`)
- **[Kaggle GSE] `minmaxer/nba-closing-lines-ats-2024-25`** — NBA 2024-25 Closing Lines and ATS Results (Downloads: `206`, Votes: `2`)
- **[Kaggle GSE] `minmaxer/nfl-closing-lines-ats-2025`** — NFL 2025 Closing Lines and ATS Results (Downloads: `62`, Votes: `2`)
- **[Kaggle GSI] `hidehisaarai1213/nfl-impact-tracking-animation`** — NFL impact: Tracking animation (Downloads: `110`, Votes: `14`)
- **[Kaggle GSI] `robikscube/helmet-assignment-helpers`** — NFL Helmet Assignment Helper Code (Downloads: `636`, Votes: `61`)
- **[Kaggle GSI] `vishakhsandwar/sumersupplement-bdb-26`** — SumerSupplement BDB '26 (Downloads: `253`, Votes: `7`)
- **[Kaggle GSI] `arjundubashi/nfl-modified-tracking-data`** — NFL Modified Tracking Data (Downloads: `127`, Votes: `1`)
- **[Kaggle GSI] `dariushafshar/bdb-2027-public-enrichment`** — BDB 2027 Public Enrichment: IDs, Snaps, Outcomes (Downloads: `158`, Votes: `6`)
- **[Kaggle GSI] `cammyc/nfl-twitter-sentiment-analysis`** — NFL Twitter Sentiment Analysis (Downloads: `182`, Votes: `4`)
- **[Kaggle GSI] `thedevastator/nfl-player-performance-statistics`** — NFL Player Performance Statistics (Downloads: `443`, Votes: `9`)
- **[Kaggle GSI] `ashfaqueahmed15129/ashfaque`** — Ashfaque (Downloads: `2`, Votes: `1`)
- **[Kaggle GSI] `coldfir3/nlf-helmet-safety-camera-rotations`** — NLF Helmet Safety Camera Rotations (Downloads: `168`, Votes: `19`)
- **[Kaggle GSI] `ryanadamsai/weaponxnfl`** — NFL Big Data Bowl 2026 - Weapon X (Downloads: `30`, Votes: `2`)
- **[Kaggle GSE] `kendallgillies/nflstatistics`** — NFL Statistics (Downloads: `22814`, Votes: `270`)
- **[Kaggle GSE] `nickcantalupa/nfl-team-data-2003-2023`** — NFL Team Data 2003-2023 (Downloads: `6570`, Votes: `63`)
- **[Kaggle GSE] `maxhorowitz/nflplaybyplay2009to2016`** — Detailed NFL Play-by-Play Data 2009-2018 (Downloads: `58408`, Votes: `775`)
- **[Kaggle GSE] `zynicide/nfl-football-player-stats`** — NFL Football Player Stats (Downloads: `7903`, Votes: `146`)
- **[Kaggle GSE] `washingtonpost/nfl-arrests`** — NFL Arrests (Downloads: `2087`, Votes: `17`)
- **[Kaggle GSE] `mattop/2022nfl-team-offense`** — 2022 NFL Team Offense (Downloads: `2343`, Votes: `94`)
- **[Kaggle GSE] `rishabjadhav/nfl-passing-statistics-2001-2023`** — NFL Passing Statistics (2001-2023) (Downloads: `2301`, Votes: `38`)
- **[Kaggle GSI] `mansiaggarwal88/nfl-injury-reports-dataset-20092025`** — NFL Injury Reports Dataset (2009–2025) (Downloads: `177`, Votes: `5`)
- **[Kaggle GSI] `thedevastator/nfl-injury-data-2012-2017`** — NFL Injury Data 2012-2017 (Downloads: `588`, Votes: `6`)
- **[Kaggle GSI] `thedevastator/nfl-injury-analysis-2012-2017`** — NFL Injury Analysis 2012-2017 (Downloads: `351`, Votes: `3`)
- **[Kaggle GSI] `jpmiller/nfl-competition-data`** — 🏈 NFL Stats for BDB 2024 and Fantasy Football (Downloads: `2483`, Votes: `24`)
- **[Kaggle GSI] `robikscube/nfl-punt-data-ngs-injury-plays`** — NFL Punt Data - NGS Injury_Plays (Downloads: `51`, Votes: `7`)
- **[Kaggle GSI] `willianoliveiragibin/independent-predictors-postoperative`** — Independent_Predictors_Postoperative (Downloads: `149`, Votes: `10`)
- **[Kaggle GSI] `georgedurrant/nfl-qb-shoulder-injuries`** — NFL-QB-Shoulder-Injuries (Downloads: `478`, Votes: `7`)
- **[Kaggle GSI] `rishidamarla/concussions-in-the-nfl-20122014`** — Concussions in the NFL (2012-2014) (Downloads: `3606`, Votes: `43`)
- **[Kaggle GSE] `tombliss/nfl-big-data-bowl-2021-bonus`** — Nfl Big Data Bowl 2021 Bonus (Downloads: `650`, Votes: `11`)
- **[Kaggle GSE] `aryashah2k/beginners-sports-analytics-nfl-dataset`** — Beginners Sports Analytics NFL Dataset (Downloads: `4293`, Votes: `30`)
- **[Kaggle GSE] `mathurinache/nflbigdatabowl2021-feather-files`** — nfl-big-data-bowl-2021 Feather files (Downloads: `582`, Votes: `10`)
- **[Kaggle GSE] `dott1718/nfl-big-data-bowl-expected-yards`** — NFL Big Data Bowl + expected Yards (Downloads: `137`, Votes: `11`)
- **[Kaggle GSE] `robikscube/nfl-big-data-bowl-2021-pp`** — nfl big data bowl 2021 pp (Downloads: `87`, Votes: `8`)
- **[Kaggle GSE] `charliezimmerman/nfl-play-data-2010-2020`** — NFL Play Data 2010 - 2020 (Downloads: `275`, Votes: `6`)
- **[Kaggle GSE] `petergirgis/nfl-2021`** — NFL Big Data Bowl 2021  (Downloads: `41`, Votes: `2`)
- **[Kaggle GSE] `joshuamould/big-data-bowl-data`** — Big Data Bowl Data (Downloads: `63`, Votes: `2`)
