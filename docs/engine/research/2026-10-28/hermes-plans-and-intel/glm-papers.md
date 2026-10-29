# GSE Drive Review — PDF slice (top level, no zips, no subfolders)

Scope: `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`, `*.pdf` at the top level only.
Method: extracted page 1 of every PDF with `pdftotext` to identify each paper; pulled pages 1–2 for papers relevant to ratings, aggregation, or calibration. Method lines are my own words; no paper text copied.
Unreadable: none. All 105 unique PDFs opened; no 0-byte files, all carry a valid `%PDF-` header.
Skipped duplicates (same or overlapping content as a file below): `1704.00197v3 (1).pdf`, `2406.19563v2 (1).pdf`, `2503.15225v3 (1).pdf`, `2601.00421v2 (1).pdf`, `2603.09896v1 (1).pdf`, `2603.09896v1 (2).pdf`, `2604.11786v1 (1).pdf`, `2606.28570v1 (1).pdf`, `2606.30449v1 (1).pdf`, `2608.01260v1 (1).pdf`.
Licenses: these are arXiv preprints; treat all as research-only until each license is checked. Nothing from them goes into shipped prompt or eval text.

Status key: already implemented = overlaps something on motif/gse-intelligence-build-2026-10-02 · new = not built · blocked = cannot be applied with data GSE has.
"Premise?" = can the paper's method yield a directional premise backed by a real sample count from GSE's own data.

---

### 1704.00197v3.pdf
- Method: logistic in-game NFL win probability on situation features, kept simple and interpretable so calibration can be checked directly.
- Status: already implemented (home edge, 1187 games, refusal below 200 rows per the build notes).
- Premise?: yes — the fitted coefficients are directional premises with the game count as the sample size.
- Disposition: pick path (already there via the bridge).

### 2109.13743v2.pdf
- Method: extends the Bradley-Terry pairwise-strength model to comparisons whose probabilities drift over time, estimating strengths from a sliding neighborhood of recent comparisons.
- Status: new — adjacent to the dynamic multi-week ratings already in (commit 1758cfa0d); do not rebuild what exists, but the paper gives error guarantees for the "recent window" choice.
- Premise?: yes — a fitted strength gap between two teams on a dated window of completed games, with the window's game count.
- Disposition: pick path, as the estimator behind a strength-edge premise; the paper itself stays research reading.

### 1505.01462v1.pdf
- Method: minimax error bounds for estimating latent strengths from pairwise game outcomes, showing error depends on the shape (connectivity) of the schedule graph.
- Status: new.
- Premise?: indirectly — it says whether the season's schedule has enough connected games for any BTL-style premise to be trusted at all, which gates the sample count you can claim.
- Disposition: shadow — a schedule-connectivity check before storing a strength premise, not a pick-path component.

### 1906.04066v1.pdf
- Method: small modification to maximum-likelihood team-strength estimation that reduces estimator bias (systematic tilt toward some teams) while keeping accuracy.
- Status: new.
- Premise?: yes — a bias-corrected strength gap is a cleaner directional premise than raw MLE.
- Disposition: shadow until the current ratings show a measured bias worth correcting; nothing on the pick path yet.

### 2006.08189v1.pdf
- Method: learns the whole distribution of team skill across a population from pairwise game outcomes by combining BTL fitting with kernel density estimation.
- Status: new.
- Premise?: no — population-level density, not a team-vs-team directional claim.
- Disposition: nowhere for the pick path; possible background for prior shrinkage. Research only.

### 2406.19563v2.pdf
- Method: Bayesian variant of Bradley-Terry that fuses teams with indistinguishable strengths into shared rank groups instead of forcing a strict total ordering.
- Status: new.
- Premise?: yes in form (group-level edges with posterior sample sizes), but it adds a modeling stack GSE has no seam for.
- Disposition: nowhere now; revisit only if the ratings path shows overconfident splits between equal teams.

### 2310.16813v1.pdf
- Method: measures accuracy of published draft forecasts with a rank-distance metric and combines many forecasters into one consensus list via ranked-choice voting.
- Status: new.
- Premise?: no — it evaluates and combines existing forecasts rather than producing one from raw data.
- Disposition: nowhere for game picks; the consensus-combining idea is research-only reading for premise weighting.

### 2607.00164v1.pdf
- Method: trains probabilistic forecasters toward calibration by rewarding a state-conditioned empirical win rate computed from past outcomes instead of the noisy single realized outcome; uses NFL win probability as the testbed.
- Status: new.
- Premise?: yes in spirit — the state-conditioned empirical win rate is itself a directional premise with a real sample count per probability bucket.
- Disposition: shadow — as an audit of logged pick probabilities (bucketed empirical win rate), not as a new calibration transform.

### 2609.01337v1.pdf
- Method: instead of one LLM producing a forecast from all evidence at once, each evidence item gets its own likelihood statement, and an explicit prior plus a fixed probabilistic rule combine them into a posterior.
- Status: new — structurally this is the same shape as the bridge (premises combined by a fixed model), which supports the current design rather than replacing it.
- Premise?: yes — each elicited likelihood is a premise; sample count must come from the data behind that evidence item, not the LLM.
- Disposition: shadow — a trace format where every premise is a separate likelihood check.

### 2604.08885v1.pdf
- Method: wraps language-model outputs with conformal prediction intervals to give distribution-free uncertainty guarantees.
- Status: new.
- Premise?: no — it quantifies uncertainty around a claim; it does not create one.
- Disposition: shadow; only relevant if GSE wants publish/withhold intervals beyond the current refusal rule. Research only.

### 2604.27865v1.pdf
- Method: benchmark for long-horizon sequential decisions under bankroll-style scoring, testing whether models make good repeated staking choices.
- Status: new (benchmark only, no method to wire).
- Premise?: no.
- Disposition: nowhere on the pick path; useful only as an evaluation pattern. Research only.

### 2608.12926v1.pdf
- Method: estimates point values of individual on-ball actions in handball (VAEP/xT-style) from possession data.
- Status: blocked — needs possession-level play-by-play GSE does not have.
- Premise?: no for now.
- Disposition: nowhere.

### 2605.13142v2.pdf
- Method: constraint-programming model that computes which NHL playoff clinching scenarios remain possible days ahead.
- Status: blocked — solver feature, no GSE seam, no premise.
- Premise?: no.
- Disposition: nowhere.

### 2403.12977v3.pdf
- Method: autoregressive generative model that produces sustained, realistic multi-player match trajectories from tracking data.
- Status: blocked — requires full tracking feeds.
- Premise?: no.
- Disposition: nowhere.

### 2604.02447v1.pdf
- Method: generates multi-agent team-sport trajectories with a mixture-of-Gaussians over movement outcomes to keep diversity.
- Status: blocked — needs tracking data.
- Premise?: no.
- Disposition: nowhere.

### 2602.00676v1.pdf
- Method: large benchmark of imperfect-information card-style games for data-driven agents.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2603.17324v1.pdf
- Method: interactive reinforcement-learning environment for badminton strategy choices.
- Status: blocked — domain-specific simulator, no GSE seam.
- Premise?: no.
- Disposition: nowhere.

### 2608.25246v1.pdf
- Method: self-play agents in a physics-based badminton simulator, with interpretable tactic clusters.
- Status: blocked — simulator-dependent.
- Premise?: no.
- Disposition: nowhere.

### 2601.11492v2.pdf
- Method: closed-loop strategy optimization for boxing (round-by-round decision support), validated on Olympic bouts.
- Status: blocked — bout-level sensor/scouting data GSE does not hold.
- Premise?: no.
- Disposition: nowhere.

### 1708.06694v2.pdf
- Method: analyzes how metadata constraints shape network structure in chess player communities.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2102.07545v2.pdf
- Method: survey-style walkthrough of machine-learning analyses of team-sport behavior data.
- Status: new.
- Premise?: no direct; a pointer document.
- Disposition: nowhere.

### 2405.02715v1.pdf
- Method: statistical technique for grouping predictors via network-wide metrics in regression.
- Status: new.
- Premise?: no — a modeling refinement, not a claim source.
- Disposition: nowhere.

### 2510.06789v2.pdf
- Method: rank aggregation over rater scores with rater heterogeneity, without a parametric model.
- Status: new.
- Premise?: no — aggregation of others' rankings, not a data-driven edge.
- Disposition: nowhere.

### 2303.11174v2.pdf
- Method: metric-search algorithms for matching compatible ranked lists.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2411.08055v1.pdf
- Method: event report on organizing an eclipse-viewing party at a stadium.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2203.14782v1.pdf
- Method: detects fatigue from handwriting-task signals.
- Status: blocked — no relevant data.
- Premise?: no.
- Disposition: nowhere.

### 2303.00285v1.pdf
- Method: review of heat-management strategies for elite performance with physio-physiological recommendations.
- Status: new.
- Premise?: no as written — narrative recommendations without a usable sample count; would need GSE's own weather/total splits to become a premise.
- Disposition: nowhere unless a heat-edge premise is later built from GSE data.

### 2402.10979v2.pdf
- Method: benchmark probing how LLMs fuse narrative text with box-score numbers in sports contexts.
- Status: new.
- Premise?: no.
- Disposition: shadow — a checklist for designing the reasoning trace the pick path currently lacks.

### 2403.04031v1.pdf
- Method: benchmark testing LLMs on analytical reasoning over sports narratives and statistics.
- Status: new.
- Premise?: no.
- Disposition: shadow — same reason as SportsMetrics above.

### 2512.21877v3.pdf
- Method: multilingual benchmark evaluating LLMs on cricket analytics questions.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2604.26501v1.pdf
- Method: tree-based prompting framework that turns structured tables into sports game summaries.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2601.00421v2.pdf
- Method: applies semantic/similarity methods to football tactics questions.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2511.13326v2.pdf
- Method: discovers and generates football open-play tactic patterns.
- Status: blocked — needs tracking data.
- Premise?: no.
- Disposition: nowhere.

### 2604.11786v1.pdf
- Method: generative model that forecasts soccer tactical formations over a match.
- Status: blocked — tracking data.
- Premise?: no.
- Disposition: nowhere.

### 2603.09896v1.pdf
- Method: benchmarking spatial reasoning of vision-language models on sports court imagery.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2509.11796v1.pdf
- Method: agent-of-thoughts reasoning over sports video using retrieved domain knowledge.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2511.12908v2.pdf
- Method: multimodal LLM for sports video reasoning trained with agentic reinforcement learning.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2512.14121v2.pdf
- Method: LLM framework giving interpretable assessments of athletic motion with training guidance.
- Status: blocked — motion-capture data.
- Premise?: no.
- Disposition: nowhere.

### 2511.00261v2.pdf
- Method: benchmark for predicting where a ball player will go from visual context ("spot the ball").
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2512.15386v1.pdf
- Method: deep-learning model anticipating basketball rebounds from video.
- Status: blocked — video data.
- Premise?: no.
- Disposition: nowhere.

### 2604.16588v1.pdf
- Method: predicts penalty-kick direction early from HAR-style motion embeddings.
- Status: blocked — video/sensor data.
- Premise?: no.
- Disposition: nowhere.

### 2608.01696v1.pdf
- Method: entity-aware sequence model for spotting ball actions per player in video.
- Status: blocked — video data.
- Premise?: no.
- Disposition: nowhere.

### 2204.00003v3.pdf
- Method: recovers 3D ball position from a single calibrated camera image.
- Status: blocked — calibrated video.
- Premise?: no.
- Disposition: nowhere.

### 2106.12666v2.pdf
- Method: human activity recognition from accelerometer signals via wavelet transforms and CNNs.
- Status: blocked — wearables.
- Premise?: no.
- Disposition: nowhere.

### 2210.00507v1.pdf
- Method: fast exercise classification from body-pose video time series.
- Status: blocked — pose video.
- Premise?: no.
- Disposition: nowhere.

### 2304.06489v1.pdf
- Method: survey of domain adaptation for IMU-based activity recognition.
- Status: blocked — wearables.
- Premise?: no.
- Disposition: nowhere.

### 2212.05223v1.pdf
- Method: multi-view human mesh recovery trained with self-supervision.
- Status: blocked — video.
- Premise?: no.
- Disposition: nowhere.

### 2311.04726v1.pdf
- Method: predicts others' future motion with a cognitive-hierarchy-structured model.
- Status: blocked — motion data.
- Premise?: no.
- Disposition: nowhere.

### 2505.08665v5.pdf
- Method: multi-view video model estimating a person's skill proficiency.
- Status: blocked — video.
- Premise?: no.
- Disposition: nowhere.

### 2506.03032v1.pdf
- Method: adaptive agent for administering human assessments.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2507.10571v3.pdf
- Method: orchestrator-agent framework where a coordinator trusts specialized agents for visual classification with RAG support.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2509.03682v1.pdf
- Method: review of multi-agent reinforcement learning in video games.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2509.05913v3.pdf
- Method: classifies musculoskeletal injury risk in athletes from visual and skeletal features.
- Status: blocked — medical imaging.
- Premise?: no.
- Disposition: nowhere.

### 2509.11362v2.pdf
- Method: multimodal datasets where LLM-inferred behavior traits label everyday interactions.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2509.21673v1.pdf
- Method: wearable-accelerometer foundation model using slot attention for motion tasks.
- Status: blocked — wearables.
- Premise?: no.
- Disposition: nowhere.

### 2510.15983v1.pdf
- Method: ontology (BFO-based) for building knowledge graphs of sports-science motor-performance data.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2510.19150v1.pdf
- Method: cross-egocentric contrastive video learning for team tactical awareness.
- Status: blocked — egocentric video.
- Premise?: no.
- Disposition: nowhere.

### 2510.19457v4.pdf
- Method: benchmark for probing and updating time-sensitive multimodal knowledge in large models.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2511.00553v1.pdf
- Method: measures interrater reliability and national scoring bias among judges in head-to-head Olympic Breaking.
- Status: new.
- Premise?: no for GSE's own data — its bias-audit pattern would only become a premise with a judged-events sample GSE does not hold.
- Disposition: nowhere for game picks; the reliability-check habit applies to any scored premise.

### 2511.01340v1.pdf
- Method: benchmark of rebus puzzles for vision-language models.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2511.11983v1.pdf
- Method: Bayesian fusion framework for epidemiological decisions emphasizing calibrated risk and honest uncertainty.
- Status: new.
- Premise?: no.
- Disposition: nowhere (its discipline — report calibrated risk, refuse on thin data — GSE already encodes).

### 2512.02651v1.pdf
- Method: smartwatch data collection with educational visualization.
- Status: blocked — wearables.
- Premise?: no.
- Disposition: nowhere.

### 2512.05277v4.pdf
- Method: temporal scene understanding benchmark for autonomous-driving VLMs.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2512.19551v1.pdf
- Method: lifelong empathic motion generation with LLMs.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2601.00998v1.pdf
- Method: visual grounding benchmark for UAV imagery.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2601.12132v1.pdf
- Method: evaluates LLM approaches for Bengali text classification.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2602.02979v3.pdf
- Method: iterative coach-player style LLM reasoning loop for data-free reinforcement learning.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2602.08996v1.pdf
- Method: generates rock-climbing feedback from competition video plus reference books.
- Status: blocked — video.
- Premise?: no.
- Disposition: nowhere.

### 2602.23123v1.pdf
- Method: multi-agent LLM system moderating emotional intensity of consumer-facing content.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2603.07091v1.pdf
- Method: evaluation framework for small models' reasoning depth on software-architecture tasks.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2603.26575v1.pdf
- Method: personalized deep-learning models predicting fear and muscle activity in climbers.
- Status: blocked — biosignals.
- Premise?: no.
- Disposition: nowhere.

### 2604.19792v2.pdf
- Method: decentralized AI peer-review system with layered persistence and reference verification.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2604.20861v3.pdf
- Method: intent-enriched semantic IDs for multimodal generative recommendation.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2605.05997v2.pdf
- Method: 4D imagery reasoning model for dynamic spatial understanding.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2605.12437v1.pdf
- Method: 3D Gaussian splatting for novel view synthesis of dynamic scenes.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2605.12799v1.pdf
- Method: multimodal dataset for AI-assisted swimming coaching with trust checks.
- Status: blocked — sensor/video.
- Premise?: no.
- Disposition: nowhere.

### 2605.14855v1.pdf
- Method: neural forecasting of human movement exploiting hidden context, from RNNs to graph transformers.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2605.22073v2.pdf
- Method: recommendation-system architecture fusing behavior-guided residuals with graph evidence (name overlap with "bridge" is coincidental).
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2605.24445v1.pdf
- Method: Chernoff-type matrix concentration bounds for time-inhomogeneous Markov chains.
- Status: new.
- Premise?: no.
- Disposition: nowhere (pure math; possible background for sequential guarantees).

### 2605.25409v1.pdf
- Method: multimodal-temporal model localizing laughter in video with new benchmarks.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2605.31529v2.pdf
- Method: dynamic microworld benchmark for strategic video intelligence.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2606.05966v1.pdf
- Method: benchmark for causally-informed physical reasoning in VLMs.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2606.08064v1.pdf
- Method: cooperative long rope skipping via multi-agent reinforcement learning.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2606.09842v1.pdf
- Method: real-time motion tracking pipeline for athletic performance analysis.
- Status: blocked — video/sensors.
- Premise?: no.
- Disposition: nowhere.

### 2606.18242v1.pdf
- Method: event-camera benchmark for driving intelligence.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2606.28570v1.pdf
- Method: agentic VLM+RAG framework for holistic athlete profiling.
- Status: blocked — multimodal athlete data.
- Premise?: no.
- Disposition: nowhere.

### 2606.30449v1.pdf
- Method: probes on model internals for pre-action misalignment monitoring; reports three negative results.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2607.01152v2.pdf
- Method: benchmark measuring artificial general creativity across domains.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2607.07498v1.pdf
- Method: reward-adaptive iterative discovery applied to automated game testing for NHL26.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2607.12447v2.pdf
- Method: studies the computational basis of confidence signals in LLMs.
- Status: new.
- Premise?: no.
- Disposition: nowhere (potential background for refusal thresholds only).

### 2608.01260v1.pdf
- Method: audit showing semantic signals in sequential recommenders can be recovered by lightweight models.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2608.21381v1.pdf
- Method: benchmark for omni-platform personal intelligence, recommendation, and agentic tasks.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2609.28049v1.pdf
- Method: compares prompting, probing, training, and annotation for single-camera amateur sports video understanding.
- Status: blocked — video.
- Premise?: no.
- Disposition: nowhere.

### 2610.00302v1.pdf
- Method: multi-task geospatial reasoning with VLMs on disaster imagery.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2610.00399v1.pdf
- Method: metacognitive reasoning in energy-based models via instance-based learning theory.
- Status: new.
- Premise?: no.
- Disposition: nowhere.

### 2003.12185v1.pdf
- Method: action localization driven by continual predictive learning of Surprise events.
- Status: blocked — video.
- Premise?: no.
- Disposition: nowhere.

### 2006.03700v1.pdf
- Method: models how leaders emerge in pedestrian walking groups via motion dynamics.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2305.13654v3.pdf
- Method: detects and mitigates spurious correlations in text classifiers using neighborhood analysis.
- Status: new.
- Premise?: no — but its discipline (test each feature-premise for spuriousness) applies to bridge features like homeSign.
- Disposition: shadow, as a validation habit only.

### 2308.01492v1.pdf
- Method: VR game designed to improve physical and cognitive acuity.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2408.14305v1.pdf
- Method: formative study of tactical communication in outdoor team sports with XR tools.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2412.11814v2.pdf
- Method: large Chinese event-centric summarization dataset.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2412.12209v1.pdf
- Method: review of challenges in technology-driven biomechanical simulation.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2502.08621v2.pdf
- Method: AI sports-video storytelling tool, evaluated through real-world deployment.
- Status: not applicable.
- Premise?: no.
- Disposition: nowhere.

### 2503.15225v3.pdf
- Method: data-driven reproduction of individual motor signatures from repetitive motion.
- Status: blocked — motion data.
- Premise?: no.
- Disposition: nowhere.

### 2212.03041v1.pdf
- Method: post-hoc explanation of cooperative multi-agent systems using Myerson (cooperative-game) values.
- Status: new.
- Premise?: no — attribution among agents, not a data-backed edge.
- Disposition: nowhere.

---

## Next wires (at most 5)

1. Make published picks carry a reasoning trace: at the `scoreGames` / `process-sport` pick path in the live repo, attach the stored-premises set that `from-bridge.ts` already reads, so a published pick names its premises and sample counts. This is the known gap. No new method needed.
2. Fit a Bradley-Terry strength model on completed games (method per 2109.13743v2, research only) and store each team-edge as a premise with the window's game count into the same premises store `from-bridge.ts` consumes; wire lives next to `bridge-model.ts`. No live file for the fit yet.
3. Add a schedule-connectivity check (per 1505.01462v1, research only) that refuses to store a strength premise when the game graph behind it is too thin or disconnected. Natural home is the premises store read by `from-bridge.ts`; no live file for the check yet.
4. Build a shadow audit of logged pick probabilities: bucket by stated probability, compare to realized win rate (the state-conditioned empirical win rate idea of 2607.00164v1, research only). It reports; it does not transform probabilities, so it does not conflict with the calibration seam on feat/trueprob-calibration-boundary that already passes `probabilityCalibrator` at both `assessIndependentEdge` call sites. No live file yet.
5. Keep the trace format aligned with the bridge: one premise, one likelihood statement, one sample count, per 2609.01337v1 (research only). If the premises store gains a field for the evidence source and count, `from-bridge.ts` remains the single consumer. No live file for the schema change yet.
