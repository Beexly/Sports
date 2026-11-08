# REPOS WAVE REPOS-B-2 — Lane B (GSI Medical) — Mega Sweep 2026-11-06

52 new, live-verified GitHub repositories for GSI (medical research arm), closing the Lane B program quota (48 counted in REPOS-B-1 + 52 here = 100). Focus per wave brief: finite-element/brain-strain tooling beyond WHIM, instrumented-mouthguard pipelines, neuroimaging pipelines (dMRI/fMRI/lesion), vestibular/ocular assessment, sleep/circadian and recovery modeling, musculoskeletal injury modeling, the OpenSim ecosystem, brain-strain metric calculators (BrIC/HIC/MPS), and CTE/neuropathology-adjacent data tools.

Verification method (disclosed): every counted repo was confirmed live via the GitHub API (`bin/github-api GET /repos/<owner>/<name>`, custom.legacy-github connector) on 2026-11-06, with the full JSON record saved to the wave scratch folder; stars, last push, language, license, fork flag and description in each dossier header come from that record only (canonical `full_name` used where the API reported a rename/transfer). The API proxy was flaky (slow responses, intermittent tracebacks/empty bodies): every candidate got up to 3 attempts, and only repos with a complete JSON record are counted. Unverified = not counted (see gap audit).

Dedupe (programmatic): counted names were checked with `comm` against (a) SEEN-LEDGER.md — all 148 REPO lines (100 Lane A + 48 Lane B), (b) all SEEN-*.md fragments in the sweep folder, (c) REPO-CATALOG.md, and (d) github.com links extracted from 2026-11-04-MASTER-PULL.md and SHARED-ITEMS-REGISTER.md — zero overlaps. Excluded by name per brief regardless: nflverse/nflverse-data and sportsdataverse/sportsdataverse-py (counted under Lane A). One same-wave duplicate was found and skipped (see SEEN-REPOS-B-2.md DUPE-SKIP lines).

Held-out seam note: the wave brief states REPOS-B-1 held out 15 repos named in its working record. The delivered B-1 file (repos-wave-REPOS-B-1.md, 556 lines, read in full and grepped for held/gap/candidate terms) contains NO held-out list and no closing gap section, and no B-1 scratch folder exists. The only recoverable B-1 leftovers are the 4 never-verified names named in this wave's brief; their disposition is in the gap audit (1 of 4 taken: biomechZoo, B-R2-04).

## B-R2-01 — BIC (18 brain injury criteria vs brain strain, Stanford)
- **Repo:** xzhan96-stf/BIC — 1★ · last push 2020-12-15 · Jupyter Notebook · license Apache-2.0
1. **WHAT IT IS** — Code and data for "Prediction of brain strain across head impact subtypes using 18 brain injury criteria": computes 18 published brain injury criteria (HIC, BrIC, GAMBIT, HIP, PRHIC, RIC, RVCI and related kinematic criteria) from head-impact kinematics and evaluates each against finite-element brain strain across impact subtypes (football, MMA, car-crash reconstructions). (API description: "This repository contains the code and data related to the work of Prediction of brain strain across head impact subtypes using 18 brain injury criter[ia]")
2. **WHERE** — https://github.com/xzhan96-stf/BIC
3. **HOW TO USE IT** — Open the notebooks, feed head linear/angular kinematic time series (or peaks), get all 18 criteria per impact plus their strain-prediction performance — the comparison table GSI needs before choosing which scalar criteria to compute on mouthguard data.
4. **WHICH SYSTEM** — GSI brain-strain metrics line — the criteria layer between raw kinematics (HEADSport-filtered, B-1) and tissue strain (CNN-brain-strains, B-1): criteria are the cheap, explainable features; this repo says which ones actually track strain, per impact subtype. GSE tie-in: none direct.
5. **SECOND-ORDER** — Same Stanford lab as impact_retriever (B-R1-03): retriever reconstructs the impact, BIC scores it, CNN-brain-strains (B-R1-02) maps it to strain — a three-way cross-check on every impact. Criteria that fail per-subtype here should be excluded from any GSI risk curve before they waste a validation cycle.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metric = 18 scalar injury criteria per impact + FE brain-strain reference values (data in-repo per API description "code and data"). Labels: FE-derived strain labels per impact subtype — simulation ground truth, not diagnosed-concussion labels. Lives in-repo.
7. **PROVENANCE** — Original code from Stanford's Camarillo Lab (author xzhan96-stf, Zhan et al.). Not a fork. Note: a same-day sibling repo (xzhan96-stf/Brain-Injury-Criteria) carries the identical description and creation date — treated as the same project's duplicate and skipped (see SEEN file).
8. **VERDICT** — TEST

## B-R2-02 — Fast Brain Strain Evaluation (mouthguard signal → KTH-model strain)
- **Repo:** wzhao5/Fast-Brain-Strain-Evaluation-in-Head-Impact — 0★ · last push 2020-03-21 · language none recorded · license none stated
1. **WHAT IT IS** — Code that reads sensor signals from an instrumented mouthguard and outputs brain strain in 4,124 brain elements from the KTH (Royal Institute of Technology, Stockholm) finite-element head model, with visualization — a fast mouthguard-to-strain evaluator built directly on the KTH model rather than WHIM. (API description, verbatim in substance: "These codes read in sensor signals from instrumented mouthguard and output brain strain in 4124 brain elements from KTH modeling")
2. **WHERE** — https://github.com/wzhao5/Fast-Brain-Strain-Evaluation-in-Head-Impact
3. **HOW TO USE IT** — Feed instrumented-mouthguard kinematic signals in the documented format; receive per-element strain estimates (4,124 KTH elements) instead of an hours-long FE run — the KTH counterpart to the WHIM-trained CNN-brain-strains (B-R1-02).
4. **WHICH SYSTEM** — GSI finite-element brain-model line — this is the wave's direct hit on the "FE head models beyond WHIM" seam: a second, independent head model (KTH) wired to the same mouthguard inputs, enabling model-disagreement checks (WHIM vs KTH strain on identical impacts). GSE tie-in: none direct.
5. **SECOND-ORDER** — Run WHIM-CNN (B-R1-02) and this KTH evaluator on the same impact set: where two independently-built head models agree on high-strain regions, GSI has a robust finding; where they disagree is exactly where FE assumptions (material properties, geometry) drive conclusions — the honest-uncertainty map for the whole strain line.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metric = per-element (4,124) brain strain per mouthguard impact, KTH-model reference. Data lives in-repo (code; example signals per repo layout). Labels: KTH FE simulation labels — simulation ground truth, not clinical diagnoses. Small/dormant repo (0★, 2020) — value is the KTH coupling, not community maintenance.
7. **PROVENANCE** — Original code by wzhao5 implementing the KTH head model lineage (KTH Royal Institute of Technology head-model family, Kleiven et al.). Not a fork.
8. **VERDICT** — TEST

## B-R2-03 — Adding VOMS to SCAT3 (vestibular/ocular-motor screening analysis)
- **Repo:** Nicholas-Port/Adding_VOMS_to_SCAT3 — 0★ · last push 2020-09-08 · MATLAB · license none stated
1. **WHAT IT IS** — Source code for the manuscript "Adding the Vestibular/Ocular-Motor Screening (VOMS) to the Sports Concussion Assessment Tool 3 (SCAT3)": the statistical analysis testing whether VOMS scores add diagnostic value over SCAT3 alone for sports concussion — the vestibular/ocular assessment seam in published, reproducible form. (API description confirms manuscript-code purpose)
2. **WHERE** — https://github.com/Nicholas-Port/Adding_VOMS_to_SCAT3
3. **HOW TO USE IT** — Read/run the MATLAB analysis to see exactly how VOMS symptom-provocation scores were combined with SCAT3 components and evaluated (the model form and thresholds), as the design template for any GSI sideline-screening study.
4. **WHICH SYSTEM** — GSI vestibular/ocular assessment line — the only open, manuscript-tied VOMS implementation found in this sweep (see gap audit: the seam is thin). GSE tie-in: none.
5. **SECOND-ORDER** — Pairs with the EEG/autonomics lines (B-1): VOMS (clinical screen) + HRV (NeuroKit) + EEG spectral change (MNE) is the multimodal post-impact panel; this repo supplies the clinical-screen leg's evidence weighting — how much VOMS should count against instrumented measures.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo (analysis code for the manuscript's cohort). Metric = VOMS total/symptom-provocation change scores joined to SCAT3 components; labels (diagnosed concussion vs control) live in the parent study, not the repo. Value = the evaluated combination rule, not data.
7. **PROVENANCE** — Original manuscript code (Nicholas-Port). Not a fork. Dormant since 2020 — cite as a methods artifact, not a maintained tool.
8. **VERDICT** — CONTEXT-ONLY

## B-R2-04 — biomechZoo (B-1 retry, resolved: PhilD001/biomechZoo)
- **Repo:** PhilD001/biomechZoo — 40★ · last push 2026-11-04 · MATLAB · license Apache-2.0
1. **WHAT IT IS** — A user-customizable MATLAB toolbox for analysis of biomechanical data: gait/biomechanics data organization, event detection, time-normalization, ensemble averaging and statistics over motion-capture trial collections — the long-standing biomechZoo package (B-1's "biomechzoo" name, which did not resolve in B-1, resolves here under PhilD001). (API description confirms)
2. **WHERE** — https://github.com/PhilD001/biomechZoo
3. **HOW TO USE IT** — Add to MATLAB path; structure trial data into its zoo format, run its processing/statistics routines (channel operations, event-based ensemble curves) over mocap collections — the MATLAB-side batch layer for lab biomechanics, complementing Pyomeca's Python layer (B-R1-49).
4. **WHICH SYSTEM** — GSI biomechanics line — batch trial statistics for tackling/rehab mocap collections stored outside the Python stack; also the reference implementation a Python port (mcgillmotionlab/biomechzoo, seen in search, not counted) tracks. GSE tie-in: none direct.
5. **SECOND-ORDER** — Its ensemble-curve statistics are the comparison format for OpenCap (B-R1-14) field trials vs lab gold standard (processed here or via ezc3d/Pyomeca): same curves, two stacks, agreement = validation.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; metrics = time-normalized ensemble kinematic/kinetic curves + per-event statistics per trial collection. Labels: trial-condition labels live in the user's data organization (zoo data structure carries condition metadata). Labels exist only as the analyst files them — document the convention in any GSI use.
7. **PROVENANCE** — Original biomechZoo project (PhilD001 is the project's GitHub home; McGill motion-lab lineage). Not a fork. Apache-2.0. RETRY DISPOSITION: one of B-1's 4 never-verified names — now verified live on a full API record and counted.
8. **VERDICT** — TEST

## B-R2-05 — sMRIPrep
- **Repo:** nipreps/smriprep — 169★ · last push 2026-11-03 · Python · license Apache-2.0
1. **WHAT IT IS** — Structural MRI preprocessing workflows for NiPreps: the anatomical backbone (skull-stripping, segmentation, spatial normalization, surface reconstruction interfaces) that fMRIPrep (B-R1-15) itself calls — usable standalone when only structural endpoints are needed. (API description: "Structural MRI PREProcessing (sMRIPrep) workflows for NIPreps")
2. **WHERE** — https://github.com/nipreps/smriprep
3. **HOW TO USE IT** — Run as a BIDS App or import its workflows; outputs analysis-ready anatomical derivatives (brain masks, tissue segmentations, normalized T1w) for morphometry or as the anatomical stage of a custom GSI pipeline.
4. **WHICH SYSTEM** — GSI neuroimaging line — structural endpoint production (volumes, thickness inputs) for TBI morphometry without running a full functional pipeline. GSE tie-in: none.
5. **SECOND-ORDER** — Upstream component of fMRIPrep/nibabies (B-R2-08); its segmentations feed HD-BET cross-checks (B-R2-22) and GIBBON meshing for subject-specific FE heads (B-R1-08).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Produces per-subject structural derivatives (tissue maps, normalized anatomy) — features/inputs for morphometry models. Labels: none in-repo; diagnosis labels external (study cohorts).
7. **PROVENANCE** — Original NiPreps community project. Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-06 — SDCFlows
- **Repo:** nipreps/sdcflows — 46★ · last push 2026-11-02 · Python · license Apache-2.0
1. **WHAT IT IS** — Susceptibility distortion correction workflows for EPI MRI: fieldmap estimation (incl. fieldmap-less SyN-based correction) used by fMRIPrep/dMRIPrep to unwarp echo-planar images — the distortion layer that decides whether diffusion and fMRI voxels sit where the anatomy actually is. (API description: "Susceptibility Distortion Correction (SDC) workflows for EPI MR schemes")
2. **WHERE** — https://github.com/nipreps/sdcflows
3. **HOW TO USE IT** — Import its workflows into a NiPreps-style pipeline or run via fMRIPrep/dMRIPrep (B-R1-15/16) which embed it; standalone use for custom EPI correction on legacy TBI datasets lacking fieldmaps (the fieldmap-less path matters for older cohorts).
4. **WHICH SYSTEM** — GSI neuroimaging line — correctness gate for every EPI modality (DTI + fMRI) in pooled athlete data, especially retrospective scans without fieldmap acquisitions. GSE tie-in: none.
5. **SECOND-ORDER** — Correction quality propagates into DIPY/MRtrix tractography (B-R1-21/22) and pyAFQ profiles (B-R1-23): uncorrected distortion near frontal/temporal poles overlaps the regions most reported in TBI DTI — a named confound GSI dataset cards should record (which SDC path was used).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; value = geometric fidelity of every downstream voxel feature. Produces displacement fields per scan (a per-scan QC feature in itself). Labels: n/a (correction layer).
7. **PROVENANCE** — Original NiPreps project. Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-07 — NiWorkflows
- **Repo:** nipreps/niworkflows — 121★ · last push 2026-11-04 · Python · license Apache-2.0
1. **WHAT IT IS** — The shared workflow library under the NiPreps family: common anatomical/functional/diffusion building blocks (registration, segmentation, resampling, reporting) that fMRIPrep, dMRIPrep, sMRIPrep and ASLPrep are all assembled from. (API description: "Common workflows for MRI (anatomical, functional, diffusion, etc)")
2. **WHERE** — https://github.com/nipreps/niworkflows
3. **HOW TO USE IT** — Import workflow nodes when building custom Nipype pipelines (B-R1-30) so GSI bespoke analyses reuse the exact, tested components the reference pipelines use, instead of hand-rolled equivalents.
4. **WHICH SYSTEM** — GSI neuroimaging line — component library for GSI-custom pipelines with reference-grade parts. GSE tie-in: none.
5. **SECOND-ORDER** — Version-locking note for reproducibility: a GSI pipeline's behavior is partly determined by its niworkflows version — record it in dataset cards alongside the *Prep versions (B-1 lesson, extended one level down the stack).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; infrastructure value = identical preprocessing components across studies, so features are comparable. Labels: n/a.
7. **PROVENANCE** — Original NiPreps project. Not a fork. Apache-2.0.
8. **VERDICT** — LEARN-ONLY

## B-R2-08 — NiBabies
- **Repo:** nipreps/nibabies — 39★ · last push 2026-11-05 · Python · license Apache-2.0
1. **WHAT IT IS** — fMRIPrep Lifespan tailored to neonate and infant MRI: age-appropriate templates, segmentation and motion handling for developing brains — the pediatric end of the NiPreps family. (API description: "fMRIPrep Lifespan — A robust, transparent workflow tailored for neonate and infant MRI")
2. **WHERE** — https://github.com/nipreps/nibabies
3. **HOW TO USE IT** — Run as a BIDS App on infant/neonate data; outputs lifespan-appropriate functional derivatives. Direct GSI use is narrow (youth cohorts start older), but its design is the template for age-tailored preprocessing when adult pipelines fail on developing brains.
4. **WHICH SYSTEM** — GSI neuroimaging line — youth-imaging edge: relevant to GSI's youngest-cohort questions (early head-impact exposure research designs) and as the documented boundary of where the standard stack stops applying. GSE tie-in: none.
5. **SECOND-ORDER** — Complements ABCD-HCP/DCAN (B-R1-50, school-age/adolescent) one age-band lower; together they bracket the developmental range any GSI youth study design must choose pipelines for, explicitly, per age band.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Produces functional derivatives for infant cohorts. Labels: none in-repo; developmental/exposure labels external. For GSI the near-term value is methodological (age-band pipeline selection), not a data source.
7. **PROVENANCE** — Original NiPreps project. Not a fork. Apache-2.0.
8. **VERDICT** — CONTEXT-ONLY

## B-R2-09 — ASLPrep
- **Repo:** PennLINC/aslprep — 65★ · last push 2026-11-05 · Python · license NOASSERTION
1. **WHAT IT IS** — Preprocessing of arterial spin labeling (ASL) MRI in the NiPreps design language: produces cerebral blood flow (CBF) maps from ASL acquisitions — perfusion imaging, the modality that measures the cerebrovascular side of concussion/TBI recovery. (API description: "Preprocessing of arterial spin labeling (ASL) data")
2. **WHERE** — https://github.com/PennLINC/aslprep
3. **HOW TO USE IT** — Run the BIDS App on ASL data; outputs CBF maps + QC ready for group/longitudinal analysis alongside fMRIPrep structural/functional derivatives of the same subjects.
4. **WHICH SYSTEM** — GSI neuroimaging line — adds the perfusion modality B-1 lacked: post-concussion CBF changes are a replicated finding family, and ASL needs no contrast agent, suiting repeat athlete scanning. GSE tie-in: none.
5. **SECOND-ORDER** — CBF maps join XCP-D connectomes (B-R1-18) and DTI metrics (B-R1-21) as a third modality block per subject; perfusion-functional coupling features are a live research direction GSI can now compute rather than only cite.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metric = quantitative CBF (mL/100g/min) maps per subject/session — a physiological feature with units, not just a statistical map. Labels: none in-repo; diagnosis/recovery labels external (study cohorts).
7. **PROVENANCE** — Original PennLINC code (Univ. of Pennsylvania). Not a fork. License NOASSERTION per API — check repo terms before redistribution.
8. **VERDICT** — TEST

## B-R2-10 — QSIRecon
- **Repo:** PennLINC/qsirecon — 26★ · last push 2026-11-05 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Reconstruction of preprocessed q-space (diffusion) images: the companion to QSIPrep (B-R1-17) that turns its preprocessed DWI into tractography, ODFs and scalar reconstructions (the QSIPrep/QSIRecon split mirrors the fMRIPrep/XCP-D split). (API description: "Reconstruction of preprocessed q-space images (dMRI)")
2. **WHERE** — https://github.com/PennLINC/qsirecon
3. **HOW TO USE IT** — Point QSIRecon at QSIPrep derivatives, select reconstruction workflows (DIPY/MRtrix/AMICO-class recons — AMICO is B-R2-17); outputs connectivity-ready derivatives.
4. **WHICH SYSTEM** — GSI neuroimaging line — the reconstruction half of GSI's diffusion stack; choosing recons here decides which microstructure models (NODDI via AMICO, DKI, CSD) GSI can report. GSE tie-in: none.
5. **SECOND-ORDER** — With QSIPrep (B-R1-17) it completes the PennLINC diffusion chain; its AMICO workflow is the fast path to NODDI metrics that DIPY (B-R1-21) computes more slowly — same metrics, two engines, a built-in cross-validation.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = reconstructed ODFs, streamlines, NODDI/DKI scalar maps per subject. Labels: none in-repo; the recon choice is a dataset-card field (it changes feature values materially).
7. **PROVENANCE** — Original PennLINC code. Not a fork. BSD-3-Clause.
8. **VERDICT** — TEST

## B-R2-11 — C-PAC (Configurable Pipeline for the Analysis of Connectomes)
- **Repo:** FCP-INDI/C-PAC — 83★ · last push 2025-10-31 · Python · license LGPL-3.0
1. **WHAT IT IS** — A configurable, Nipype-based pipeline for resting-state fMRI connectome analysis from the International Neuroimaging Datasharing Initiative: preprocessing + network construction with a fully specified, shareable pipeline configuration. (API description confirms)
2. **WHERE** — https://github.com/FCP-INDI/C-PAC
3. **HOW TO USE IT** — Install/run with a pipeline config YAML over BIDS data; outputs denoised time series and connectomes under an explicitly versioned configuration — the configurability is the point: analyst degrees of freedom are written down, not implicit.
4. **WHICH SYSTEM** — GSI neuroimaging line — the alternative connectome pipeline to the fMRIPrep→XCP-D chain (B-R1-15/18): a second implementation for robustness checks on any GSI resting-state finding. GSE tie-in: none.
5. **SECOND-ORDER** — Pipeline-config-as-document is a reproducibility pattern for all GSI analyses; running one cohort through both C-PAC and XCP-D and reporting agreement is the multiverse-style check reviewers increasingly expect.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metric = subject connectomes + regional time series per configuration. Labels: none in-repo; configuration provenance is part of the training record (same features, different config = different dataset, honestly).
7. **PROVENANCE** — Original FCP-INDI / Child Mind Institute-lineage project. Not a fork. LGPL-3.0.
8. **VERDICT** — TEST

## B-R2-12 — HCP Pipelines
- **Repo:** Washington-University/HCPpipelines — 661★ · last push 2026-11-04 · Shell · license NOASSERTION
1. **WHAT IT IS** — The Human Connectome Project's processing pipelines: the structural/functional/diffusion processing (incl. CIFTI grayordinate framework) used for HCP and HCP-style lifespan studies (HCP-YA, HCP-Aging, ABCD-adjacent harmonized processing). (API description: "Processing pipelines for the HCP")
2. **WHERE** — https://github.com/Washington-University/HCPpipelines
3. **HOW TO USE IT** — Deploy the scripted pipelines (FreeSurfer/FSL/MSM dependencies) on HCP-style acquisitions; outputs surface-based CIFTI derivatives comparable with the public HCP releases.
4. **WHICH SYSTEM** — GSI neuroimaging line — comparability bridge: processing GSI athlete data HCP-style lets findings be read against the large public HCP normative corpora. GSE tie-in: none.
5. **SECOND-ORDER** — DCAN's ABCD pipeline (B-R1-50) is an adaptation of this stack; owning the upstream original lets GSI trace every adaptation choice. CIFTI outputs pair with nilearn surface analysis (B-R1-29).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Produces CIFTI derivatives; the public HCP datasets processed with these exact pipelines carry rich phenotype labels (via HCP restricted/open terms — access per HCP rules, not downloaded here). Pipeline = feature-definition provenance for any HCP-comparable feature.
7. **PROVENANCE** — Original Washington University (HCP consortium) code. Not a fork; license NOASSERTION (HCP terms) — check before redistribution.
8. **VERDICT** — LEARN-ONLY

## B-R2-13 — FastSurfer
- **Repo:** Deep-MI/FastSurfer — 645★ · last push 2026-11-06 · Python · license Apache-2.0
1. **WHAT IT IS** — A fast, GPU-accelerated deep-learning implementation of FreeSurfer-style anatomical segmentation and cortical surface analysis (FastSurferCNN + surface pipeline): whole-brain segmentation in minutes instead of hours, validated against FreeSurfer (B-R1-28). (API description: "PyTorch implementation of FastSurferCNN")
2. **WHERE** — https://github.com/Deep-MI/FastSurfer
3. **HOW TO USE IT** — Run the containerized pipeline on T1w scans; receive FreeSurfer-compatible segmentation statistics and surfaces at a fraction of recon-all runtime — the throughput option for large athlete cohorts and rapid post-injury turnarounds.
4. **WHICH SYSTEM** — GSI neuroimaging line — the speed layer over B-1's FreeSurfer morphometry: same feature family (regional volumes/thickness), cohort-scale feasible. GSE tie-in: none.
5. **SECOND-ORDER** — FreeSurfer-vs-FastSurfer agreement on a GSI subsample is a required validation before swapping engines mid-study; its speed makes within-week longitudinal designs (baseline → post-impact → follow-up) computationally ordinary.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = FreeSurfer-compatible per-region volumes + thickness per subject. Model trained on FreeSurfer-labelled data (documented in its papers) — a teacher-labelled asset: pseudo-labels at scale, with FreeSurfer (B-R1-28) as the reference standard for audits.
7. **PROVENANCE** — Original Deep-MI (German Center for Neurodegenerative Diseases / DZNE-lineage) code. Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-14 — HeuDiConv
- **Repo:** nipy/heudiconv — 286★ · last push 2026-10-05 · Python · license NOASSERTION
1. **WHAT IT IS** — Flexible DICOM conversion into structured (BIDS) directory layouts: heuristic-driven conversion that turns scanner DICOM folders into BIDS datasets — the standard front door between raw clinical/research scanner output and every BIDS App in this corpus. (API description: "Flexible DICOM conversion into structured directory layouts")
2. **WHERE** — https://github.com/nipy/heudiconv
3. **HOW TO USE IT** — pip install heudiconv; write/select a heuristic file mapping DICOM series to BIDS names, run conversion; pair with dcm2niix (B-R1-35) which performs the underlying DICOM→NIfTI step.
4. **WHICH SYSTEM** — GSI neuroimaging line — ingestion standard for multi-site athlete imaging: one heuristic per site/scanner makes heterogeneous incoming scans land in one BIDS shape. GSE tie-in: none.
5. **SECOND-ORDER** — The heuristic file is a provenance artifact: it records how each site's naming chaos was interpreted — keep it with the dataset (DataLad, B-R1-39) or the conversion is not reproducible. Feeds CuBIDS-style curation and bids-validator checks (B-R2-15).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; value = conversion fidelity + the heuristic as metadata. Labels: session/participant labels are assigned at this step (participants.tsv originates here) — errors here corrupt every downstream join, so this layer earns its dossier.
7. **PROVENANCE** — Original NiPy-community project (Dartmouth Brain Imaging Center lineage). Not a fork; license NOASSERTION per API.
8. **VERDICT** — ADOPT

## B-R2-15 — BIDS Validator
- **Repo:** bids-standard/bids-validator — 52★ · last push 2026-11-03 · TypeScript · license MIT
1. **WHAT IT IS** — The reference validator for the Brain Imaging Data Structure (current TypeScript implementation): checks a dataset against the BIDS schema and reports errors/warnings before any BIDS App is run. (API description: "Validator for the Brain Imaging Data Structure")
2. **WHERE** — https://github.com/bids-standard/bids-validator
3. **HOW TO USE IT** — Run the validator (CLI/deno) over a dataset directory as a CI-style gate in GSI ingestion: no dataset enters the *Prep queue until it validates, with the report archived alongside it.
4. **WHICH SYSTEM** — GSI neuroimaging line — the schema gate for the whole BIDS-based stack (B-1 + this wave). GSE tie-in: same validate-at-ingest discipline GSE applies to its feeds.
5. **SECOND-ORDER** — Validator version vs BIDS schema version is a dataset-card field: a dataset valid under one schema version can warn under another — record both. Pairs with pybids (B-R1-37) querying: validate first, query second.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No data; value = structural integrity of every training dataset (missing sidecars, misnamed sessions — e.g., baseline/post-injury swaps — are caught here, not after model training). Labels: n/a (gate).
7. **PROVENANCE** — Original BIDS Standards community project. Not a fork. MIT.
8. **VERDICT** — TEST

## B-R2-16 — Scilpy
- **Repo:** scilus/scilpy — 103★ · last push 2026-11-03 · Python · license NOASSERTION
1. **WHAT IT IS** — The Sherbrooke Connectivity Imaging Lab (SCIL) Python dMRI toolbox: diffusion processing, tractography, bundle segmentation, tractometry and connectome scripts (scil_* CLI family) from one of the most productive tractography labs. (API description confirms)
2. **WHERE** — https://github.com/scilus/scilpy
3. **HOW TO USE IT** — pip install scilpy; use its scripts on QSIPrep/QSIRecon outputs (B-R1-17/B-R2-10) for local tractography, bundle dissection and along-tract metrics in a scriptable Python form (vs MRtrix3's shell tools, B-R1-22).
4. **WHICH SYSTEM** — GSI neuroimaging line — the third dMRI engine (with DIPY and MRtrix3): SCIL's bundle methods are the reference for tract-specific analyses in several TBI DTI papers. GSE tie-in: none.
5. **SECOND-ORDER** — Three-engine tractography (DIPY/MRtrix/scilpy) on one cohort = the robustness standard for any GSI tract claim; scilpy's bundle-segmentation outputs are directly comparable feature blocks for ComBat pooling (B-R1-25).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = bundle-wise tractometry (FA/MD along tracts), streamline/connectome outputs per subject. Labels: none in-repo; SCIL's published validation uses phantom + curated bundle data (documented in its papers) — method-validation labels, not clinical ones.
7. **PROVENANCE** — Original SCIL code (Université de Sherbrooke). Not a fork; license NOASSERTION per API.
8. **VERDICT** — ADOPT

## B-R2-17 — AMICO
- **Repo:** daducci/AMICO — 131★ · last push 2026-11-06 · Cython · license NOASSERTION
1. **WHAT IT IS** — Accelerated Microstructure Imaging via Convex Optimization: fast fitting of microstructure models (NODDI, ACTIVE-class) to diffusion MRI by reformulating them as convex problems — minutes instead of hours per subject. (API description confirms)
2. **WHERE** — https://github.com/daducci/AMICO
3. **HOW TO USE IT** — pip install dmri-amico (or via QSIRecon's AMICO workflow, B-R2-10); fit NODDI to preprocessed DWI; receive neurite density (NDI), orientation dispersion (ODI) and free-water maps.
4. **WHICH SYSTEM** — GSI neuroimaging line — the microstructure layer beyond DTI scalars: NODDI metrics are the more biologically-specific white-matter features in current mTBI imaging work. GSE tie-in: none.
5. **SECOND-ORDER** — Free-water fraction from NODDI fitting doubles as an edema/neuroinflammation-adjacent signal — a distinct feature family from FA that GSI should track separately in dataset cards rather than merging into a generic "DTI" block.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = voxelwise NDI/ODI/FISO maps per subject — quantitative microstructure features. Labels: none in-repo; model-fitting validity (b-value shells required) is a dataset-card constraint: single-shell legacy DTI cannot produce these features honestly.
7. **PROVENANCE** — Original code by Alessandro Daducci (Univ. of Verona lineage). Not a fork; license NOASSERTION per API.
8. **VERDICT** — ADOPT

## B-R2-18 — ANTsR
- **Repo:** ANTsX/ANTsR — 145★ · last push 2026-10-30 · R · license Apache-2.0
1. **WHAT IT IS** — R interface to the ANTs image-processing library (registration, segmentation, statistical imaging in R): the R-native form of ANTs (B-R1-26) for analysts whose statistics live in R. (API description confirms)
2. **WHERE** — https://github.com/ANTsX/ANTsR
3. **HOW TO USE IT** — Install in R; call registration/segmentation and image-statistics functions in the same environment as ComBat (B-R1-25, R) and longitudinal mixed models — one-language imaging statistics.
4. **WHICH SYSTEM** — GSI neuroimaging line — completes the ANTs triangle (C++ ANTs, Python ANTsPy, R ANTsR): whichever language a GSI analysis lives in, the registration reference is the same algorithm family. GSE tie-in: R is also GSE's nflverse language — shared analyst fluency, internal only.
5. **SECOND-ORDER** — ANTsR's image-math functions produce Jacobian/atrophy features directly inside the R statistics workflow that fits the outcome models — fewer language boundaries, fewer silent format conversions (the NiBabel-affine class of error, B-R1-36).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = registration fields, segmentations, per-region statistics computed in R. Labels: none in-repo; value is analysis-environment consolidation for labelled-cohort statistics.
7. **PROVENANCE** — Original ANTsX project. Not a fork. Apache-2.0.
8. **VERDICT** — LEARN-ONLY

## B-R2-19 — UKF Tractography
- **Repo:** pnlbwh/ukftractography — 30★ · last push 2025-06-02 · C · license NOASSERTION
1. **WHAT IT IS** — Unscented Kalman Filter (UKF) tractography: two-tensor tractography that fits a multi-compartment model while tracking, resolving crossing fibers and giving per-streamline microstructure estimates — the PNL lab's tractography engine, long used in clinical (incl. TBI) diffusion studies. (API description: none set on the repo)
2. **WHERE** — https://github.com/pnlbwh/ukftractography
3. **HOW TO USE IT** — Build/run the UKF tracker on preprocessed DWI (PNL pipeline conventions); outputs streamlines with along-tract tensor/microstructure estimates for tractometry.
4. **WHICH SYSTEM** — GSI neuroimaging line — a fourth, methodologically distinct tractography engine whose two-tensor model handles the crossing-fiber regions where single-tensor DTI tractography (and FA itself) is least trustworthy. GSE tie-in: none.
5. **SECOND-ORDER** — UKF vs DIPY/MRtrix/scilpy disagreement maps localize exactly where tract claims are method-dependent — publish the disagreement map with any GSI tract finding. Pairs with PNL's harmonization stack (B-R1-24/B-R2-20) from the same lab.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = per-streamline multi-tensor estimates + tract profiles. Labels: none in-repo; validation lineage is the PNL publications (method papers), clinical labels external.
7. **PROVENANCE** — Original Psychiatry Neuroimaging Lab (Brigham and Women's/Harvard) code. Not a fork; license NOASSERTION per API.
8. **VERDICT** — TEST

## B-R2-20 — Multi-Shell dMRI Harmonization
- **Repo:** pnlbwh/multi-shell-dMRIharmonization — 15★ · last push 2026-08-25 · Python · license NOASSERTION
1. **WHAT IT IS** — The multi-shell extension of PNL's dMRI harmonization (B-R1-24 covers the single-shell original): RISH-feature template harmonization for modern multi-shell acquisitions (HCP-style and contemporary TBI protocols). (API description: "Harmonization of multi-site, multi-shell diffusion MRI")
2. **WHERE** — https://github.com/pnlbwh/multi-shell-dMRIharmonization
3. **HOW TO USE IT** — Follow the pipeline (site template from controls, per-shell harmonization) on multi-shell DWI before microstructure fitting (AMICO, B-R2-17) or tractography; matched shells across sites are a hard requirement.
4. **WHICH SYSTEM** — GSI neuroimaging line — the harmonizer that matches how new data is actually acquired: B-1's harmonizer predates multi-shell protocols; this is its successor for pooled modern cohorts. GSE tie-in: none.
5. **SECOND-ORDER** — Together B-R1-24 + B-R2-20 cover the acquisition eras GSI will pool (legacy single-shell consortium data + new multi-shell collections) — dataset cards must state which harmonizer (and which template cohort) touched each feature block.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; value = site-effect removal for multi-shell features (the features AMICO/NODDI models need). Labels: needs per-site control subjects, not diagnosis labels — a study-design requirement GSI must budget for.
7. **PROVENANCE** — Original PNL (Brigham and Women's/Harvard) code, successor to pnlbwh/dMRIharmonization (B-R1-24). Not a fork.
8. **VERDICT** — TEST

## B-R2-21 — PNL TBSS (ANTs/FSL tract-based spatial statistics)
- **Repo:** pnlbwh/TBSS — 17★ · last push 2026-06-17 · Python · license NOASSERTION
1. **WHAT IT IS** — Tract-Based Spatial Statistics implemented with ANTs and FSL: the skeletonized-FA group-analysis framework (TBSS) that produced a large share of the published DTI-in-TBI group results, in PNL's maintained wrapper. (API description: "Tract based spatial statistics using ANTs and FSL")
2. **WHERE** — https://github.com/pnlbwh/TBSS
3. **HOW TO USE IT** — Run its pipeline on fitted FA maps: skeleton projection + voxelwise group statistics on the white-matter skeleton — the exact analysis form needed to reproduce (or refute) classic TBSS concussion findings on GSI data.
4. **WHICH SYSTEM** — GSI neuroimaging line — the group-inference layer for DTI: B-1 supplied feature extraction (DIPY/pyAFQ); TBSS is the hypothesis-testing form the literature's claims are stated in. GSE tie-in: none.
5. **SECOND-ORDER** — TBSS skeleton results vs pyAFQ tract profiles (B-R1-23) on the same cohort is the standard concordance check; known TBSS limits (skeleton projection, registration sensitivity) belong in every GSI dataset card that reports it.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metric = skeletonized FA (+MD/RD) maps and group statistic maps. Labels: group labels (concussed/control) are the analysis input — the pipeline consumes labels rather than producing features for ML; its outputs (effect maps) are literature-comparison artifacts.
7. **PROVENANCE** — Original PNL wrapper around FSL/ANTs TBSS methodology (FMRIB lineage). Not a fork; license NOASSERTION per API.
8. **VERDICT** — LEARN-ONLY

## B-R2-22 — HD-BET (brain extraction)
- **Repo:** MIC-DKFZ/HD-BET — 438★ · last push 2024-12-18 · Python · license Apache-2.0
1. **WHAT IT IS** — Deep-learning brain extraction for MRI: robust skull-stripping across modalities and pathologies (trained for the BraTS/lesion context, where mass effect and lesions break classical skull-strippers) from the DKFZ group behind nnU-Net (B-R1-32). (API description: "MRI brain extraction tool")
2. **WHERE** — https://github.com/MIC-DKFZ/HD-BET
3. **HOW TO USE IT** — pip install HD-BET; run hd-bet on a scan; receive a brain mask robust on pathological anatomy — the first step before registration/segmentation on TBI scans with hematoma or swelling.
4. **WHICH SYSTEM** — GSI imaging-AI line — pathology-robust preprocessing for exactly GSI's hard cases: injured brains are where generic skull-strippers fail silently and poison downstream morphometry. GSE tie-in: none.
5. **SECOND-ORDER** — Use as the independent check on sMRIPrep/FastSurfer masks (B-R2-05/13): mask disagreement on a TBI scan flags the cases needing human review — an active-QC pattern rather than blind pipeline trust.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Ships a pretrained model (trained on expert-labelled brain masks across modalities — a real labelled asset). Metric = brain masks + derived intracranial volumes per scan. GSI clinical labels external.
7. **PROVENANCE** — Original DKFZ Medical Image Computing code. Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-23 — Nobrainer
- **Repo:** neuronets/nobrainer — 167★ · last push 2026-04-14 · Python · license NOASSERTION
1. **WHAT IT IS** — A framework for developing neural-network models for 3D neuroimaging (TensorFlow-based): data loaders, 3D architectures and training utilities specialized for volumetric brain MRI, from the Neuronets collective. (API description: "A framework for developing neural network models for 3D image processing")
2. **WHERE** — https://github.com/neuronets/nobrainer
3. **HOW TO USE IT** — Use its 3D data/model utilities to train volumetric classifiers/segmenters on GSI imaging (e.g., scan-level TBI classification) where MONAI (B-R1-31) is not the chosen stack, or mine it for 3D-specific augmentation/loading patterns.
4. **WHICH SYSTEM** — GSI imaging-AI line — the alternative 3D-DL framework to MONAI: a second implementation lineage for volumetric models, useful for cross-framework validation of a GSI model's architecture choices. GSE tie-in: none.
5. **SECOND-ORDER** — Nobrainer-trained replicas of a MONAI model on the same labelled set give a framework-sensitivity estimate — rarely reported, and exactly the kind of robustness number GSI's verification doctrine wants attached to imaging claims.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Framework, no dataset in-repo; pretrained model zoo lineage (brain-extraction/segmentation models distributed via Neuronets). Labels must come from GSI-annotated imaging (as with MONAI/nnU-Net).
7. **PROVENANCE** — Original Neuronets project code. Not a fork; license NOASSERTION per API.
8. **VERDICT** — LEARN-ONLY

## B-R2-24 — 3D Slicer
- **Repo:** Slicer/Slicer — 2708★ · last push 2026-11-06 · C++ · license NOASSERTION
1. **WHAT IT IS** — The multi-platform open-source platform for medical image visualization and computing: volumetric rendering, segmentation editing, registration, and an extension ecosystem (incl. diffusion/tractography via SlicerDMRI) — the clinician-facing workbench of medical imaging research. (API description: "Multi-platform, free open source software for visualization and image computing")
2. **WHERE** — https://github.com/Slicer/Slicer
3. **HOW TO USE IT** — Install the application; load DICOM/NIfTI, inspect and hand-edit segmentations (lesion masks for nnU-Net training sets), render tractography, and export analysis-ready volumes — the human-in-the-loop station of the GSI imaging stack.
4. **WHICH SYSTEM** — GSI imaging-AI/neuroimaging lines — expert annotation and visual QC: every labelled dataset GSI builds (B-R1-32's masks) passes through a tool like this. GSE tie-in: none.
5. **SECOND-ORDER** — Slicer's segmentation-editor output is the ground-truth production line for GSI annotation budgets; its SlicerDMRI extension overlaps scilpy/MRtrix visualization — standardize on one viewing stack per study and record it.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; value = label production: expert-drawn masks/annotations created here ARE the training labels for GSI segmentation models. Provenance of who annotated what is a dataset-card requirement this tool's scene files can carry.
7. **PROVENANCE** — Original 3D Slicer community project (Brigham and Women's Surgical Planning Lab lineage; GitHub record created 2020 on migration). Not a fork; license is Slicer's own (NOASSERTION).
8. **VERDICT** — ADOPT

## B-R2-25 — ITK (Insight Toolkit)
- **Repo:** InsightSoftwareConsortium/ITK — 1673★ · last push 2026-11-06 · C++ · license Apache-2.0
1. **WHAT IT IS** — The foundational C++ library for medical image registration and segmentation: the algorithm substrate underneath SimpleITK, ANTs-adjacent tooling, MITK and much of the imaging stack in this corpus. (API description confirms)
2. **WHERE** — https://github.com/InsightSoftwareConsortium/ITK
3. **HOW TO USE IT** — Used directly for custom C++ imaging pipelines, or (normally) through SimpleITK (B-R2-26); direct ITK is for performance-critical or novel-algorithm work where the simplified layer hides a needed filter.
4. **WHICH SYSTEM** — GSI neuroimaging line — the bedrock layer: knowing ITK is underneath explains behavior (interpolation, spacing, direction cosines) of half the tools above it. GSE tie-in: none.
5. **SECOND-ORDER** — Most "different tools disagree" imaging bugs trace to this layer's conventions (LPS vs RAS, direction matrices); GSI debugging doctrine should start here before suspecting study data.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; value = correct low-level image math for feature extraction. Labels: n/a (substrate).
7. **PROVENANCE** — Original Insight Software Consortium project (NLM-funded lineage). Not a fork. Apache-2.0.
8. **VERDICT** — LEARN-ONLY

## B-R2-26 — SimpleITK
- **Repo:** SimpleITK/SimpleITK — 1096★ · last push 2026-11-05 · C++ · license Apache-2.0
1. **WHAT IT IS** — A simplified, multi-language (Python-first) layer over ITK: image I/O, registration, segmentation and filtering with a procedural API — the way most Python neuroimaging utilities actually call ITK algorithms. (API description confirms)
2. **WHERE** — https://github.com/SimpleITK/SimpleITK
3. **HOW TO USE IT** — pip install SimpleITK; read/write NIfTI/DICOM, run rigid/deformable registration, resample strain/DTI maps into common spaces, compute mask statistics — the scripting glue of GSI image processing.
4. **WHICH SYSTEM** — GSI neuroimaging line — the practical image-math workhorse for custom steps the *Prep pipelines don't cover (e.g., mapping CNN-brain-strain element fields onto a subject's DTI space). GSE tie-in: none.
5. **SECOND-ORDER** — Its registration is the fallback where ANTs is too heavy; strain-map ↔ DTI-space alignment via SimpleITK is what makes per-region strain-vs-FA joins (B-R1-02 × B-R1-21) computable in practice.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; produces resampled/registered feature arrays and mask statistics (regional means of strain/FA/CBF) — the exact tabular features ML consumes. Labels: n/a (processing layer).
7. **PROVENANCE** — Original SimpleITK project (Insight Consortium). Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-27 — MITK (Medical Imaging Interaction Toolkit)
- **Repo:** MITK/MITK — 848★ · last push 2026-11-06 · C++ · license BSD-3-Clause
1. **WHAT IT IS** — DKFZ's C++ toolkit and application framework for interactive medical imaging: image/surface data management, segmentation interaction, and diffusion-imaging capabilities (MITK Diffusion) — a Slicer-class workbench from the German Cancer Research Center. (API description: "The Medical Imaging Interaction Toolkit.")
2. **WHERE** — https://github.com/MITK/MITK
3. **HOW TO USE IT** — Use the MITK Workbench application for interactive analysis (incl. diffusion/tractography inspection) or build custom viewers on the toolkit; the second clinician-facing platform in the corpus.
4. **WHICH SYSTEM** — GSI neuroimaging line — alternative workbench to 3D Slicer (B-R2-24) with a strong diffusion heritage (its Diffusion application predates much of the Python stack's visualization). GSE tie-in: none.
5. **SECOND-ORDER** — Slicer-vs-MITK is a genuine either/or for a lab's annotation platform; GSI should pick per-study, not per-analyst, and the pick belongs in the dataset card (annotation-tool provenance affects label consistency).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; label-production + inspection platform (same role as Slicer). Its diffusion tools produce tract visualizations used in QC of B-R1-21/22 outputs.
7. **PROVENANCE** — Original DKFZ code. Not a fork. BSD-3-Clause.
8. **VERDICT** — LEARN-ONLY

## B-R2-28 — MONAI Label
- **Repo:** Project-MONAI/MONAILabel — 911★ · last push 2026-10-29 · Python · license Apache-2.0
1. **WHAT IT IS** — Intelligent image labeling and learning server for healthcare imaging: interactive segmentation (active learning with models in the loop, DICOM/3D Slicer/OHIF integrations) that turns expert corrections into continuously improving segmentation models. (API description: "MONAI Label is an intelligent open source image labeling and learning tool")
2. **WHERE** — https://github.com/Project-MONAI/MONAILabel
3. **HOW TO USE IT** — Deploy the MONAILabel server with a MONAI (B-R1-31) model; annotators correct model proposals in Slicer/OHIF (B-R2-24/31); the server retrains on corrections — the annotation flywheel for GSI lesion/hematoma datasets.
4. **WHICH SYSTEM** — GSI imaging-AI line — the label-production engine: it directly attacks GSI's scarcest resource (expert annotation hours) for TBI lesion datasets. GSE tie-in: none.
5. **SECOND-ORDER** — Closes the loop B-1 opened: TotalSegmentator pseudo-labels (B-R1-33) → MONAI Label correction → nnU-Net training set (B-R1-32) → better proposals. Inter-annotator agreement statistics from the loop are label-quality features in their own right.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Produces labelled datasets (image + mask + correction history). The correction history is a label-confidence signal: cases the model got wrong repeatedly are the hard-case stratum any honest evaluation must report separately. Labels: created in-tool by experts.
7. **PROVENANCE** — Original Project MONAI consortium code. Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-29 — QuPath
- **Repo:** qupath/qupath — 1475★ · last push 2026-11-05 · Java · license GPL-3.0
1. **WHAT IT IS** — Open-source software for bioimage analysis, built for whole-slide (histopathology) images: annotation, cell detection/quantification and ML classification on gigapixel slides — the standard open platform for digital pathology. (API description: "QuPath — Open-source bioimage analysis for research")
2. **WHERE** — https://github.com/qupath/qupath
3. **HOW TO USE IT** — Load whole-slide images (via OpenSlide, B-R2-30), annotate regions/cells (e.g., tau-pathology burden in CTE brain-bank sections), train pixel/object classifiers, export per-region quantification tables.
4. **WHICH SYSTEM** — GSI neuropathology/brain-bank line — the wave's direct CTE-seam tool: quantitative histopathology (p-tau lesion burden, perivascular patterns) is how CTE staging claims are made, and QuPath is how they get measured reproducibly. GSE tie-in: none.
5. **SECOND-ORDER** — Pairs with OpenSlide IO (B-R2-30) and OHIF-style viewing patterns; quantified slide features (burden per region/sulcal depth) are the ground-truth labels that antemortem imaging ML (DTI/PET research) tries to predict — the label end of the CTE imaging chain.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Metrics = per-slide/per-region cell and stain quantification tables. Labels: expert annotations created in-tool on brain-bank slides (data lives with the brain banks under their access rules — not in-repo, not downloaded). This is the measurement layer for the corpus's most restricted label source; name that access boundary in any plan.
7. **PROVENANCE** — Original QuPath project (Univ. of Edinburgh lineage, Peter Bankhead). Not a fork. GPL-3.0.
8. **VERDICT** — TEST

## B-R2-30 — OpenSlide
- **Repo:** openslide/openslide — 519★ · last push 2026-11-02 · C · license LGPL-2.1
1. **WHAT IT IS** — A C library for reading whole-slide images (virtual slides) in vendor formats (Aperio, Hamamatsu, Leica, Philips, etc.) with a simple pyramidal-tile interface — the IO substrate under QuPath and every open digital-pathology pipeline. (API description: "C library for reading virtual slide images")
2. **WHERE** — https://github.com/openslide/openslide
3. **HOW TO USE IT** — Use via its Python bindings (openslide-python) or through QuPath (B-R2-29); read slide regions at chosen magnifications for quantification or ML tiling.
4. **WHICH SYSTEM** — GSI neuropathology/brain-bank line — format access for brain-bank slide archives: without vendor-format IO, donated-brain histology stays locked in proprietary viewers. GSE tie-in: none.
5. **SECOND-ORDER** — Same substrate pattern as NiBabel (B-R1-36) for MRI: unglamorous IO correctness (tile alignment, magnification metadata) silently determines whether pathology quantification is valid.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; value = access to slide pixels + metadata (objective power, microns-per-pixel) that quantification features depend on. Labels: n/a (IO layer).
7. **PROVENANCE** — Original OpenSlide project (Carnegie Mellon lineage). Not a fork. LGPL-2.1.
8. **VERDICT** — TEST

## B-R2-31 — OHIF Viewers
- **Repo:** OHIF/Viewers — 4402★ · last push 2026-11-05 · TypeScript · license MIT
1. **WHAT IT IS** — Zero-footprint web DICOM viewer (Open Health Imaging Foundation): browser-based viewing/measurement/annotation of radiology images with an extension architecture (incl. lesion tracking) — imaging review without installed software. (API description confirms)
2. **WHERE** — https://github.com/OHIF/Viewers
3. **HOW TO USE IT** — Deploy the web viewer against a DICOMweb archive (e.g., an XNAT/DICOM server); clinicians review TBI CT/MRI in-browser, place measurements/annotations that MONAI Label (B-R2-28) can consume.
4. **WHICH SYSTEM** — GSI neuroimaging line — the collaboration surface: remote expert review of athlete scans (second reads, annotation sessions) without moving data into desktop installs. GSE tie-in: none.
5. **SECOND-ORDER** — OHIF + MONAI Label is the standard open pairing for distributed annotation; viewer-side measurement provenance (who measured, when, which series) should be preserved as label metadata.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset; value = annotation/measurement capture on clinical imaging. Labels are created by reviewers in-tool; the platform's role is making expert labels collectible across sites.
7. **PROVENANCE** — Original OHIF community project (Massachusetts General Hospital lineage). Not a fork. MIT.
8. **VERDICT** — TEST

## B-R2-32 — AllenSDK
- **Repo:** AllenInstitute/AllenSDK — 402★ · last push 2026-07-06 · Jupyter Notebook · license NOASSERTION
1. **WHAT IT IS** — Python SDK for Allen Institute for Brain Science data: programmatic access to the Allen Brain Atlas resources (reference atlases, gene-expression and cell-type data, connectivity) — the reference-anatomy data layer for human/mouse brain science. (API description: "code for reading and processing Allen Institute for Brain Science data")
2. **WHERE** — https://github.com/AllenInstitute/AllenSDK
3. **HOW TO USE IT** — pip install allensdk; query/download atlas structures, expression and morphology data via the API; use Allen reference spaces to anchor region definitions in GSI analyses (which atlas a "region" claim refers to, stated in code).
4. **WHICH SYSTEM** — GSI neuropathology/reference-data line — brain-bank informatics adjacency: standardized anatomical reference and cell-type context for interpreting where pathology (CTE tau patterns) and imaging changes localize. GSE tie-in: none.
5. **SECOND-ORDER** — Atlas-anchored region definitions make GSI imaging features comparable to the Allen-anchored literature; gene-expression/cell-type layers give mechanistic hypotheses for region-selective vulnerability (why sulcal depths, why specific tracts) that pure imaging cannot supply.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Data lives on Allen Institute servers (API-accessed): per-region gene expression, cell-type and connectivity tables — labelled reference data (structure labels from the atlas ontology). Labels exist (atlas ontology + curated cell types); these are reference labels, not patient outcomes.
7. **PROVENANCE** — Original Allen Institute code. Not a fork; license NOASSERTION per API (Allen terms apply to data).
8. **VERDICT** — LEARN-ONLY

## B-R2-33 — Braindecode
- **Repo:** braindecode/braindecode — 1339★ · last push 2026-11-05 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Deep-learning toolbox for EEG/MEG/ECG decoding on PyTorch: CNN architectures (EEGNet family, ShallowConvNet, DeepConvNet), windowed decoding pipelines and MOABB integration — the DL layer of the open EEG stack. (API description: "Deep learning software to decode EEG, ECG or MEG signals")
2. **WHERE** — https://github.com/braindecode/braindecode
3. **HOW TO USE IT** — pip install braindecode; build windowed datasets from MNE objects (B-R1-41), train benchmark architectures with its trainers; the standard way to test whether EEG carries decodable concussion signal before designing custom models.
4. **WHICH SYSTEM** — GSI electrophysiology line — B-1 supplied capture (BrainFlow) and classical analysis (MNE); braindecode is the missing deep-learning leg for EEG biomarker work. GSE tie-in: none.
5. **SECOND-ORDER** — Benchmarks run through MOABB (B-R2-34) for honest cross-dataset claims; decoded-EEG features join the multimodal recovery panel (NeuroKit autonomics B-R1-40 + VOMS B-R2-03 + imaging) as the electrophysiology block.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Ships loaders for public labelled EEG datasets (via MOABB/MNE fetchers — motor-imagery/sleep labels for method development). Metrics = windowed EEG epochs + model embeddings. Clinical concussion labels: external — braindecode supplies leakage-aware training machinery (subject-wise splits are the named discipline).
7. **PROVENANCE** — Original Braindecode project (Freiburg brain-computer-interfacing lineage). Not a fork. BSD-3-Clause.
8. **VERDICT** — ADOPT

## B-R2-34 — MOABB (Mother of All BCI Benchmarks)
- **Repo:** NeuroTechX/moabb — 1083★ · last push 2026-10-29 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Benchmarking framework for brain-computer-interface EEG paradigms: standardized datasets, pipelines and evaluation (within/cross-session, cross-subject) over dozens of public EEG datasets — the reproducibility standard for EEG decoding claims. (API description confirms)
2. **WHERE** — https://github.com/NeuroTechX/moabb
3. **HOW TO USE IT** — pip install moabb; select datasets/paradigms, run benchmark pipelines (Riemannian, CSP, DL via braindecode), get comparable accuracy tables with fixed evaluation protocols.
4. **WHICH SYSTEM** — GSI electrophysiology line — the evaluation harness: any GSI EEG-biomarker claim should be stated in MOABB-style protocols (cross-subject generalization is where concussion-EEG papers usually fail). GSE tie-in: its benchmark discipline mirrors GSE's walk-forward evaluation doctrine (internal methods transfer).
5. **SECOND-ORDER** — MOABB's dataset registry is also a discovery index of labelled public EEG corpora — GSI can prototype on these before collecting athlete EEG, and the registry's metadata (subjects, sessions, paradigms) is itself a catalogue GSI study design should mine.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Data lives in the public datasets MOABB indexes (downloaded per-dataset under their terms): labelled EEG epochs (task/rest labels, subject/session IDs) — real labelled training/benchmark data for method development, not concussion cohorts. Cross-subject split definitions are part of the asset.
7. **PROVENANCE** — Original NeuroTechX community project. Not a fork. BSD-3-Clause.
8. **VERDICT** — ADOPT

## B-R2-35 — MNE-ICALabel
- **Repo:** mne-tools/mne-icalabel — 125★ · last push 2026-11-05 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Automatic labeling of ICA components for MNE-Python: the Python implementation of ICLabel — classifies independent components (brain, muscle, eye, heart, line noise, channel noise) so EEG artefact rejection is automated and reproducible. (API description: "Automatic labeling of ICA components in Python")
2. **WHERE** — https://github.com/mne-tools/mne-icalabel
3. **HOW TO USE IT** — pip install mne-icalabel; after ICA in MNE (B-R1-41), call label_components to get per-component class probabilities; reject non-brain components under a documented threshold instead of by-eye decisions.
4. **WHICH SYSTEM** — GSI electrophysiology line — B-1 noted ICLabel as EEGLAB's labelled asset (B-R1-43); this is its native-Python form inside GSI's main EEG stack, removing the MATLAB dependency for the same classifier. GSE tie-in: none.
5. **SECOND-ORDER** — Component-class probabilities are QC features per recording: a post-impact EEG with abnormal artefact structure is itself a (confounded) signal — log the probabilities in the dataset rather than silently cleaning them away.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Ships the pretrained ICLabel model (trained on expert-labelled ICA components — real labelled asset, as in B-R1-43). Metric = per-component class-probability vectors per recording. Clinical labels external.
7. **PROVENANCE** — Original MNE community project (ICLabel model lineage: UCSD SCCN). Not a fork. BSD-3-Clause.
8. **VERDICT** — TEST

## B-R2-36 — PyRiemann
- **Repo:** pyRiemann/pyRiemann — 784★ · last push 2026-11-04 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Machine learning for multivariate signals through Riemannian geometry of covariance matrices: tangent-space classification, Riemannian alignment and related methods — the strongest classical-ML family for EEG decoding and a MOABB reference pipeline. (API description confirms)
2. **WHERE** — https://github.com/pyRiemann/pyRiemann
3. **HOW TO USE IT** — pip install pyriemann; compute covariance features from EEG epochs (MNE objects), classify in tangent space with scikit-learn pipelines; use its alignment methods for cross-session/cross-subject domain adaptation.
4. **WHICH SYSTEM** — GSI electrophysiology line — the classical counterpart to braindecode's DL (B-R2-33): on small clinical EEG samples (GSI's reality), Riemannian methods routinely beat deep nets — the honest baseline every GSI EEG claim must clear. GSE tie-in: none.
5. **SECOND-ORDER** — Covariance-alignment is also a harmonization idea: the same math that aligns EEG across subjects parallels ComBat's site alignment in imaging (B-R1-25) — one mental model for GSI's cross-site problems in both modalities.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo (works on MOABB/MNE data, B-R2-34). Metrics = covariance matrices + tangent-space feature vectors per epoch/subject. Labels: external (paradigm/diagnosis); the geometry supplies features that stay well-behaved at small n — the property GSI training sets need most.
7. **PROVENANCE** — Original PyRiemann project (Alexandre Barachant lineage). Not a fork. BSD-3-Clause.
8. **VERDICT** — TEST

## B-R2-37 — Homer3 (fNIRS processing)
- **Repo:** BUNPC/Homer3 — 137★ · last push 2024-08-13 · MATLAB · license none stated
1. **WHAT IT IS** — MATLAB application for functional near-infrared spectroscopy (fNIRS) data processing and visualization: the Homer lineage standard for converting optical-density signals to hemoglobin concentration changes and GLM analysis. (API description confirms)
2. **WHERE** — https://github.com/BUNPC/Homer3
3. **HOW TO USE IT** — Run in MATLAB; import fNIRS recordings (incl. portable headband systems), process motion correction/bandpass/GLM; outputs HbO/HbR block averages and channel statistics.
4. **WHICH SYSTEM** — GSI neuroimaging/physiology line — fNIRS is the portable hemodynamic modality: sideline and rehab-clinic cortical-oxygenation assessment where MRI is impossible; B-1's stack had no fNIRS entry (Brainstorm supports it, B-R1-44, but Homer3 is the dedicated pipeline). GSE tie-in: none.
5. **SECOND-ORDER** — fNIRS + EEG (MNE) + HRV (NeuroKit) is the fully-portable post-impact panel — all three collectible in a training room; Homer3's GLM outputs are the hemodynamic block of that panel.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo (example data via its wiki ecosystem); metrics = per-channel HbO/HbR time series and GLM betas per task block. Labels: task-block labels in the acquisition files; diagnosis labels external.
7. **PROVENANCE** — Original Boston University Neurophotonics Center (BUNPC) code. Not a fork; no license stated in API record.
8. **VERDICT** — TEST

## B-R2-38 — OpenSim Models
- **Repo:** opensim-org/opensim-models — 98★ · last push 2025-11-05 · HTML · license none stated
1. **WHAT IT IS** — The distributed OpenSim model library: .osim musculoskeletal models and example files shipped with OpenSim (gait, lower-limb, upper-limb, full-body and sport-relevant models) — the model assets OpenSim Core (B-R1-09) computes on. (API description confirms)
2. **WHERE** — https://github.com/opensim-org/opensim-models
3. **HOW TO USE IT** — Clone and load models into OpenSim/Moco/SCONE workflows; start from the closest existing model (e.g., full-body or neck-containing models) rather than building anatomy from zero for tackling/landing simulations.
4. **WHICH SYSTEM** — GSI biomechanics-simulation line — the model inventory for the musculoskeletal-injury seam: ACL/hamstring loading studies start from these lower-limb models; head-neck response studies from its full-body/neck models. GSE tie-in: model-derived load metrics are candidate availability-research features (internal only).
5. **SECOND-ORDER** — Model provenance is a results input: two studies using different base models are not directly comparable — GSI dataset cards should record model file + modifications, the same discipline as imaging pipeline versions.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Assets = parameterized anatomical models (segment inertias, muscle paths, joint definitions) + example motion data. No outcome labels; the models define the feature space (which muscles/joints exist to compute loads for) for injury-mechanism work.
7. **PROVENANCE** — Original SimTK/Stanford NMBL model collection (opensim-org). Not a fork; no license stated in API record.
8. **VERDICT** — ADOPT

## B-R2-39 — SCONE
- **Repo:** opensim-org/SCONE — 67★ · last push 2021-03-09 · C++ · license GPL-3.0
1. **WHAT IT IS** — Open-source software for predictive simulation of biological motion: optimization-based prediction of movement (reflex/ neural-control models + OpenSim dynamics) — simulates motions that were never measured, the predictive counterpart to OpenSim's descriptive IK/ID. (API description: "Open Source Software for Predictive Simulation of Biological Motion")
2. **WHERE** — https://github.com/opensim-org/SCONE
3. **HOW TO USE IT** — Install SCONE, define a scenario (model + controller + objective, e.g., jump/land or gait under a load constraint), run the optimizer; receive predicted kinematics/muscle activations — e.g., predicted landing mechanics under fatigue or brace conditions for ACL-loading hypotheses.
4. **WHICH SYSTEM** — GSI biomechanics-simulation line — predictive simulation for injury-mechanism counterfactuals (what movement emerges when a hamstring is weakened — the strain-injury question stated computationally). This entry also closes B-1's "sconepy" thread in substance: SCONE is the verified home project (see gap audit for the bindings disposition). GSE tie-in: none direct.
5. **SECOND-ORDER** — SCONE predictions vs Moco optimal-control solutions (B-R1-11) on the same task = two independent predictive frameworks; agreement strengthens a technique recommendation, disagreement localizes the objective-function assumptions.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No human dataset; generates predicted trajectories + activation patterns (synthetic labels, model-generated — flag as synthetic in any training use, same caution as Moco B-R1-11). Dormant since 2021 per API push date — treat as a stable reference implementation.
7. **PROVENANCE** — Original project by Thomas Geijtenbeek (SCONE author), hosted under opensim-org. Not a fork. GPL-3.0.
8. **VERDICT** — TEST

## B-R2-40 — OpenSim Fitter
- **Repo:** opensim-org/opensim-fitter — 7★ · last push 2026-11-05 · Python · license Apache-2.0
1. **WHAT IT IS** — A new (2026) Python library for fitting OpenSim model geometry and kinematics to motion-capture and video-based data sources — automated model scaling/calibration from measured data. (API description confirms)
2. **WHERE** — https://github.com/opensim-org/opensim-fitter
3. **HOW TO USE IT** — pip-install per repo docs; point it at mocap/video-derived kinematics to fit a subject-specific OpenSim model (geometry + joint parameters) — the automation layer between OpenCap-style capture (B-R1-14) and subject-specific simulation.
4. **WHICH SYSTEM** — GSI biomechanics line — subject-specificity is the credibility gap in musculoskeletal injury modeling (generic models misestimate individual ACL/hamstring loads); this is the OpenSim org's current answer. GSE tie-in: none.
5. **SECOND-ORDER** — Fitted-model parameters (segment lengths, joint centers) are themselves per-athlete features; longitudinal refits across a season could track growth/rehab change in youth/returning athletes — a feature family nobody in the corpus currently computes.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo (brand-new, 7★, created 2026 — early-stage, expect API churn). Metrics = fitted model parameter sets per subject. Labels: none; fit quality is measured against the source mocap/video data itself.
7. **PROVENANCE** — Original opensim-org project. Not a fork. Apache-2.0.
8. **VERDICT** — TEST

## B-R2-41 — Biorbd
- **Repo:** pyomeca/biorbd — 88★ · last push 2026-11-06 · C++ · license MIT
1. **WHAT IT IS** — Biomechanical add-ons to the Rigid Body Dynamics Library (RBDL): a C++/Python musculoskeletal dynamics library with biorbd-specific models (.bioMod), inverse/forward dynamics and muscle geometry — the Pyomeca ecosystem's dynamics core. (API description confirms)
2. **WHERE** — https://github.com/pyomeca/biorbd
3. **HOW TO USE IT** — pip/conda install biorbd; load a .bioMod model, run kinematics/dynamics from C3D (via ezc3d, B-R1-48) in Python — an OpenSim-alternative dynamics stack fully inside the Python ecosystem.
4. **WHICH SYSTEM** — GSI biomechanics line — second dynamics engine beside OpenSim/Simbody (B-R1-09/10): cross-engine agreement is the same robustness pattern as the imaging stacks. GSE tie-in: none.
5. **SECOND-ORDER** — biorbd + bioptim (B-R2-42) is a self-contained optimal-control biomechanics stack in Python; pyorerun/pyosim bridges (held out, see gap audit) connect it back to OpenSim models when a study needs both.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; metrics = joint kinematics/kinetics and muscle-geometry outputs per trial. Labels: trial conditions live in C3D/metadata (as with ezc3d, B-R1-48).
7. **PROVENANCE** — Original Pyomeca project code (RBDL upstream: Felix Ruppert lineage). Not a fork. MIT.
8. **VERDICT** — TEST

## B-R2-42 — Bioptim
- **Repo:** pyomeca/bioptim — 121★ · last push 2026-11-05 · Python · license MIT
1. **WHAT IT IS** — An optimal-control framework for biomechanics linking CasADi, Ipopt and ACADOS with biorbd models: trajectory optimization of human movement (the biorbd ecosystem's counterpart to OpenSim Moco, B-R1-11). (API description confirms)
2. **WHERE** — https://github.com/pyomeca/bioptim
3. **HOW TO USE IT** — Define an optimal-control problem over a biorbd model (states, controls, objective — e.g., minimize knee load in a cutting maneuver), solve, inspect predicted kinematics/muscle controls.
4. **WHICH SYSTEM** — GSI biomechanics-simulation line — counterfactual technique modeling in the Python stack: ACL-loading and hamstring-strain questions (which movement strategy unloads the tissue?) are bioptim-shaped problems. GSE tie-in: technique-load findings are coaching-relevant situational knowledge (internal research).
5. **SECOND-ORDER** — Moco (B-R1-11) vs bioptim on the same maneuver is the cross-stack check for any protective-technique claim; bioptim's ACADOS path also enables real-time-capable formulations (biofeedback prototypes).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; generates optimized trajectories + control signals (synthetic, model-generated labels — flag as synthetic). Objective-function choices are part of the training record.
7. **PROVENANCE** — Original Pyomeca project code. Not a fork. MIT.
8. **VERDICT** — TEST

## B-R2-43 — AddBiomechanics
- **Repo:** keenon/AddBiomechanics — 68★ · last push 2026-08-03 · TypeScript · license NOASSERTION
1. **WHAT IT IS** — A tool/platform to automatically process and share biomechanics data: automated marker-based mocap processing (scaling, IK, ID) producing standardized, shareable biomechanics datasets — "addbiomechanics.org" from the Nimble author (B-R1-13). (API description: "A tool to automatically process and share biomechanics data")
2. **WHERE** — https://github.com/keenon/AddBiomechanics
3. **HOW TO USE IT** — Use the web platform or deploy the processing stack: upload mocap trials, receive automatically processed kinematics/kinetics in a standard format, and (by design) contribute to a shared, growing biomechanics corpus.
4. **WHICH SYSTEM** — GSI biomechanics line — automation + data-sharing for mocap: the field's labelled-data scarcity is partly a processing bottleneck; this attacks both, and its shared corpus model is the template for any GSI multi-site biomechanics pooling. GSE tie-in: none.
5. **SECOND-ORDER** — Its auto-processing is Nimble-powered (B-R1-13 differentiable fitting at platform scale); processed outputs are OpenSim-ready, feeding B-R1-09/B-R2-40 subject-specific workflows without hand IK.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Platform hosts user-contributed processed biomechanics datasets (access per platform terms; not downloaded here). Metrics = standardized joint kinematics/kinetics per trial with processing provenance. Labels: trial/subject metadata per contributing study — heterogeneous; document per-source.
7. **PROVENANCE** — Original code by Keenon Werling (Stanford). Not a fork; license NOASSERTION per API.
8. **VERDICT** — TEST

## B-R2-44 — CEINMS
- **Repo:** CEINMS/CEINMS — 34★ · last push 2026-08-26 · C++ · license Apache-2.0
1. **WHAT IT IS** — Calibrated EMG-Informed Neuromusculoskeletal Modelling Toolbox: estimates muscle forces and joint moments by driving/calibrating musculoskeletal models with measured EMG — the EMG-informed counterpart to OpenSim's static-optimization muscle estimates. (API description confirms; canonical name CEINMS/CEINMS via API)
2. **WHERE** — https://github.com/CEINMS/CEINMS
3. **HOW TO USE IT** — Feed OpenSim-model + EMG + motion data; calibrate subject-specific muscle parameters, then estimate muscle forces/joint loads for trials — e.g., hamstring force estimates during sprinting/rehab progressions where EMG exists.
4. **WHICH SYSTEM** — GSI biomechanics line — muscle-force estimation with measured-activation grounding: for hamstring-strain and ACL-rehab questions, EMG-informed forces beat purely optimized forces where the question is about a specific muscle. GSE tie-in: none direct.
5. **SECOND-ORDER** — CEINMS forces vs OpenSim/Moco estimates on the same trials quantify how much EMG information changes the answer — the value-of-measurement study that decides whether GSI collects EMG in field protocols at all.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; metrics = calibrated muscle parameters + per-trial muscle forces/joint moments. Labels: EMG signals are the supervisory signal (measured, not clinical outcomes); injury-outcome labels external.
7. **PROVENANCE** — Original CEINMS project (Griffith University / Univ. of Padua lineage — Sartori et al.). Not a fork. Apache-2.0.
8. **VERDICT** — TEST

## B-R2-45 — FreeMoCap
- **Repo:** freemocap/freemocap — 10708★ · last push 2026-11-04 · TypeScript · license AGPL-3.0
1. **WHAT IT IS** — Free, open-source markerless motion capture for everyone: webcam-based multi-camera capture with pose estimation, 3D reconstruction and export (incl. toward Blender/OpenSim-style workflows) — the lowest-cost credible mocap system available. (API description: "Free Motion Capture for Everyone")
2. **WHERE** — https://github.com/freemocap/freemocap
3. **HOW TO USE IT** — Install, record synchronized webcam video of movements (drills, rehab exercises, combine-style tests), receive 3D joint trajectories; the field-screening option where OpenCap's two-phone setup (B-R1-14) doesn't fit the room.
4. **WHICH SYSTEM** — GSI video-biomechanics line — democratized movement capture for distributed data collection (multiple schools/clinics with webcams), the scale end of the screening stack. GSE tie-in: movement-screen features are candidate availability-research inputs (internal only).
5. **SECOND-ORDER** — FreeMoCap vs OpenCap vs lab mocap (ezc3d reference) is a three-tier accuracy ladder GSI can publish once and reuse: each tier's error bars decide which research questions it may answer. AGPL terms govern redistribution — note before any product embedding.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; metrics = 3D joint trajectories per recorded session. Labels: none clinical — pair with clinician decisions (return-to-play) as with OpenCap (B-R1-14).
7. **PROVENANCE** — Original FreeMoCap project (Skelly FreeMoCap Foundation lineage). Not a fork. AGPL-3.0.
8. **VERDICT** — TEST

## B-R2-46 — DeepLabCut
- **Repo:** DeepLabCut/DeepLabCut — 5814★ · last push 2026-11-06 · Python · license LGPL-3.0
1. **WHAT IT IS** — Markerless pose estimation with deep learning: train a network on a small set of hand-labelled frames to track user-defined body parts in video (ResNet/transfer-learning based) — the reference trainable pose tracker from neuroscience, widely adopted in human biomechanics. (API description confirms)
2. **WHERE** — https://github.com/DeepLabCut/DeepLabCut
3. **HOW TO USE IT** — Label ~100-200 frames of GSI footage (head, neck, joints of interest), train, track entire collections; export trajectories for kinematics — a custom-keypoint option where OpenPose/mmpose fixed skeletons (B-R1-06/B-R2-48) lack the points a study needs (e.g., helmet landmarks).
4. **WHICH SYSTEM** — GSI video-biomechanics line — the trainable member of the pose family: bespoke landmark sets for tackling/head-impact video analysis. GSE tie-in: pose-derived contact features complement tracking data (internal research only).
5. **SECOND-ORDER** — Its label-efficient training loop is the pattern for GSI video annotation generally (same active-learning shape as MONAI Label, B-R2-28, in a different modality); tracked head landmarks feed the video-impact kinematics cross-check against mouthguard data (B-R1-01/03).
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: The workflow PRODUCES labelled data: hand-labelled frames (labels created by the analyst) become training sets; tracked trajectories are the features. Public example datasets in its ecosystem carry labelled frames for method development. Concussion/impact labels: external joins (video review).
7. **PROVENANCE** — Original DeepLabCut project (Mathis Lab lineage). Not a fork. LGPL-3.0.
8. **VERDICT** — ADOPT

## B-R2-47 — SLEAP
- **Repo:** talmolab/sleap — 621★ · last push 2026-10-20 · Python · license BSD-3-Clause-Clear
1. **WHAT IT IS** — Deep-learning framework for multi-animal (multi-instance) pose tracking: bottom-up/top-down multi-instance pose estimation with a labeling GUI and active learning — the multi-subject counterpart to DeepLabCut. (API description: "A deep learning framework for multi-animal pose tracking"; canonical home talmolab/sleap via API)
2. **WHERE** — https://github.com/talmolab/sleap
3. **HOW TO USE IT** — Label skeletons in its GUI, train multi-instance models, track all players in frame simultaneously with identity handling — the multi-player case (a tackle involves two bodies) that single-instance trackers handle poorly.
4. **WHICH SYSTEM** — GSI video-biomechanics line — multi-player pose for contact events: both athletes' kinematics through a collision from ordinary video. GSE tie-in: none direct (internal research).
5. **SECOND-ORDER** — SLEAP's identity-through-occlusion handling is the technical crux of contact-moment analysis; its proofreading workflow complements DeepLabCut (B-R2-46) — pick per study (single-subject precision vs multi-subject contact), and say which in the methods.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Produces labelled pose datasets in-tool (analyst labels, as B-R2-46); ships example labelled projects for method development. Metrics = per-instance keypoint trajectories. Impact/clinical labels external.
7. **PROVENANCE** — Original Talmo Lab code (Salk Institute lineage). Not a fork. BSD-3-Clause-Clear.
8. **VERDICT** — TEST

## B-R2-48 — MMPose
- **Repo:** open-mmlab/mmpose — 8033★ · last push 2025-08-04 · Python · license Apache-2.0
1. **WHAT IT IS** — OpenMMLab's pose-estimation toolbox and benchmark: a large zoo of maintained 2D/3D whole-body pose models (top-down/bottom-up, COCO-WholeBody-class keypoints) with standardized benchmarks — the engineering-grade pose stack. (API description confirms)
2. **WHERE** — https://github.com/open-mmlab/mmpose
3. **HOW TO USE IT** — pip install via OpenMMLab (mmengine/mmdetection ecosystem); run pretrained whole-body models on game/practice video at scale; export keypoints for downstream kinematics — the batch-processing option beside OpenPose (B-R1-06).
4. **WHICH SYSTEM** — GSI video-biomechanics line — production pose inference for large video corpora (seasons of film), where a maintained model zoo and benchmarks matter more than trainability. GSE tie-in: pose features for internal situational research only.
5. **SECOND-ORDER** — Cross-check OpenPose vs MMPose keypoints on identical footage (inter-model agreement = measurement error estimate for video-derived kinematics); whole-body (face/hands) keypoints add head-orientation detail relevant to impact-anticipation research.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Pretrained models trained on labelled public pose corpora (COCO etc. — labels exist in those datasets, referenced not bundled). Metrics = per-frame keypoints + confidences per player. Football impact labels: external.
7. **PROVENANCE** — Original OpenMMLab project. Not a fork. Apache-2.0.
8. **VERDICT** — LEARN-ONLY

## B-R2-49 — YASA (sleep analysis)
- **Repo:** raphaelvallat/yasa — 595★ · last push 2026-10-25 · Python · license BSD-3-Clause
1. **WHAT IT IS** — Python package for polysomnography analysis: automatic sleep staging, spindle/slow-wave detection, and sleep statistics from EEG — the standard open PSG analysis library (Yet Another Spindle Algorithm). (API description confirms)
2. **WHERE** — https://github.com/raphaelvallat/yasa
3. **HOW TO USE IT** — pip install yasa; run sleep_staging on clinical/lab EEG (or staging from wearable-derived signals via its models), detect spindles/slow oscillations, extract sleep-architecture features per night.
4. **WHICH SYSTEM** — GSI sleep/circadian & recovery line — the lab-grade end of the sleep seam: post-concussion sleep disturbance is a core symptom domain, and sleep architecture is the recovery variable GSI can measure objectively. GSE tie-in: sleep/recovery features are a recognized athlete-readiness family (research only).
5. **SECOND-ORDER** — YASA (PSG-grade) anchors the accuracy ladder over wearable inference (asleep/GGIR, B-R2-52/50): wearable sleep claims in athlete studies should be validated against PSG scored this way on a subsample.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Ships pretrained sleep-staging models (trained on expert-scored PSG corpora — labelled asset lineage documented in its papers). Metrics = hypnograms, sleep-stage proportions, spindle/SO densities per night. Athlete/concussion labels external.
7. **PROVENANCE** — Original code by Raphael Vallat. Not a fork. BSD-3-Clause.
8. **VERDICT** — TEST

## B-R2-50 — GGIR (raw accelerometry for sleep & activity)
- **Repo:** wadpac/GGIR — 150★ · last push 2026-11-05 · R · license Apache-2.0
1. **WHAT IT IS** — R package for processing raw multi-day accelerometer data (ActiGraph/GENEActiv/Axivity): auto-calibration, sleep detection (sustained inactivity + sleep-window algorithms), activity and circadian metrics — the reference pipeline of population accelerometry research. (API description confirms it is the GGIR package code)
2. **WHERE** — https://github.com/wadpac/GGIR
3. **HOW TO USE IT** — Run GGIR over multi-day raw wearable files; receive per-day/part sleep, activity, and circadian summaries with a documented, versioned algorithm chain — the batch standard for team-issued actigraphy in recovery studies.
4. **WHICH SYSTEM** — GSI sleep/circadian & recovery line — the field-data workhorse: week-scale sleep/circadian monitoring of athletes (travel, training load, post-injury recovery curves) from devices teams already issue. GSE tie-in: circadian/travel disruption features are a plausible situational-research family (internal only).
5. **SECOND-ORDER** — GGIR outputs + YASA PSG anchors (B-R2-49) + OxWearables SSL embeddings (B-R1-05) form the complete sleep-measurement ladder: population pipeline, lab ground truth, learned features. GGIR's sleep-window outputs are also the labels wearables models (asleep, B-R2-52) are judged against.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo; metrics = per-night sleep onset/duration/efficiency, circadian (IV/IS, L5/M10) and activity summaries per athlete-week — longitudinal feature panels. Labels: algorithm-derived sleep labels (validated against PSG in its literature); clinical labels external.
7. **PROVENANCE** — Original GGIM/GGIR project (Vincent van Hees / wadpac). Not a fork. Apache-2.0.
8. **VERDICT** — ADOPT

## B-R2-51 — pyActigraphy
- **Repo:** ghammad/pyActigraphy — 168★ · last push 2026-10-30 · Python · license GPL-3.0
1. **WHAT IT IS** — Python package for actigraphy analysis: raw actigraph file IO (multiple device formats), sleep/wake scoring algorithms, circadian rhythm metrics (incl. fractal/SVD-based measures) and rest-activity statistics. (API description: "Python-based open source package for actigraphy data analysis")
2. **WHERE** — https://github.com/ghammad/pyActigraphy
3. **HOW TO USE IT** — pip install pyActigraphy; load device files, compute rest-activity and circadian features in pandas-friendly form — the Python-native counterpart to GGIR (B-R2-50) for analysts inside GSI's Python stack.
4. **WHICH SYSTEM** — GSI sleep/circadian & recovery line — circadian-phase and regularity features for travel/schedule research and post-injury recovery monitoring, computed without an R detour. GSE tie-in: schedule/circadian context is situational-research material (internal only).
5. **SECOND-ORDER** — GGIR-vs-pyActigraphy agreement on the same recordings is the cross-implementation check for circadian features; its fractal activity measures are a distinct feature family (complexity of rest-activity) with a sleep-medicine literature behind them.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: No dataset in-repo (test recordings referenced in docs); metrics = circadian indices (IS/IV, RA, L5/M10 timing), sleep/wake scores, fractal exponents per recording. Labels: algorithm-derived; PSG/diagnosis labels external.
7. **PROVENANCE** — Original pyActigraphy project (Grégory Hammad lineage). Not a fork. GPL-3.0.
8. **VERDICT** — TEST

## B-R2-52 — asleep (wearable sleep classifier, Oxford)
- **Repo:** OxWearables/asleep — 59★ · last push 2026-10-30 · Python · license NOASSERTION
1. **WHAT IT IS** — Machine-learning sleep classifier for wearable accelerometer data (Oxford Wearables): estimates sleep/wake and sleep stages from wrist accelerometry at population scale, from the group behind ssl-wearables (B-R1-05) and the UK Biobank accelerometry program. (API description: "asleep: a sleep classifier for wearable sensor data using machine learning")
2. **WHERE** — https://github.com/OxWearables/asleep
3. **HOW TO USE IT** — Run the classifier over raw wrist-accelerometry (Axivity/UKB-format pipelines); receive per-epoch sleep classifications and nightly summaries — stage-aware sleep features from the same wrist devices used for load monitoring.
4. **WHICH SYSTEM** — GSI sleep/circadian & recovery line — closes the seam's wearable end: one wrist stream yields activity (B-R1-05), steps (held-out stepcount) and now sleep staging — a single-device recovery panel for athlete monitoring studies. GSE tie-in: sleep features are readiness-family research inputs (internal only).
5. **SECOND-ORDER** — asleep's stage estimates vs GGIR's sleep windows (B-R2-50) vs YASA PSG (B-R2-49) triangulate wearable-sleep validity per population; athlete populations differ from UKB demographics — that domain gap is the named validation task before any GSI use.
6. **§8 ENGINE-TRAINING VALUE** — TRAINING VALUE: Ships trained classifier models (trained/validated against PSG-labelled cohorts per its papers — labelled lineage). Metrics = per-epoch sleep-stage classifications + nightly stage proportions per athlete. Concussion/recovery labels external; the model's own validation labels are PSG-scored sleep, not diagnoses.
7. **PROVENANCE** — Original Oxford Wearables group code (Doherty lab lineage). Not a fork; license NOASSERTION per API.
8. **VERDICT** — TEST

---

## Closing scorecard

- Counted this wave: **52** (B-R2-01…B-R2-52), all verified live on full GitHub API records, 2026-11-06. Lane B program total: 48 (REPOS-B-1, after coordinator cross-lane dedupe) + 52 = **100 — quota closed.**
- Verdict mix: ADOPT 15 · TEST 26 · LEARN-ONLY 9 · CONTEXT-ONLY 2.
- B-1 retry names (4): biomechZoo TAKEN (B-R2-04, PhilD001/biomechZoo, 40★, full record). sconepy NOT counted — tgeijten/sconepy returned HTTP 404 on two separate batch passes (the SCONE project itself is counted instead, B-R2-39). opensense NOT counted — no standalone repo resolves (opensim-org/opensense 404; GitHub search returns unrelated projects; OpenSense functionality lives inside opensim-org/opensim-core, already counted in B-1). drca-mlhm NOT counted — no repo resolves under that name or near variants (search "mlhm" returns unrelated projects); the DRCA/MLHM code from the Stanford lineage is not public under a findable name as of this sweep.
- Retries of mis-guessed owners that DID resolve and count: nipy/heudiconv (B-R2-14), talmolab/sleap (B-R2-47). (nschloe/meshio resolved too but was held out on fit — see reserves.)

## Gap audit (required — what was NOT closed, with reasons)

1. **B-1 held-out 15 — NOT RECOVERABLE AS STATED.** The brief says B-1 verified 65 repos and held out 15, named in B-1's working record incl. closing sections. The delivered B-1 wave file was read in full (556 lines) and grepped (held/gap/candidate/scratch terms): it contains exactly 50 dossiers, a one-paragraph header, and NO held-out list, gap section, or scratch reference; no B-1 scratch folder exists in lane-b-medical/. The only B-1 leftovers identifiable anywhere are the 4 never-verified names carried in this wave's brief (disposition above: 1 taken, 3 not resolvable). If a B-1 working record exists on another host (two-host rule), the coordinator should surface it; on this host the seam is empty, and this wave compensated from the second seams instead of recounting anything.
2. **Finite-element head models beyond WHIM — PARTIAL.** KTH coupling found and counted (B-R2-02, via mouthguard input). No open repos were found for: the KTH model itself as a standalone release, the Wayne State Head Injury Model, UCD/UCDBTM-class models, or GHBMC (commercial/licensed) — GitHub search "head injury finite element" returned no substantive repos. OpenRadioss (the open solver behind VIVA+ human-body-model work) has NO official org repo: OpenRadioss/OpenRadioss returned 404 and search surfaced only personal mirrors (e.g., gabrielrussell/OpenRadioss, 59★) — mirrors were not counted on provenance grounds. What would close it: a future pass through the labs' own sites (KTH/WSU/UCD publish models off-GitHub) — off-GitHub distribution is the blocker, not absence of the models.
3. **Instrumented mouthguard/helmet telemetry beyond Stanford/GTBiomech — NO OPEN SUPPLY FOUND.** GitHub search "mouthguard" returns only dental/3D-printing projects; vendor pipelines (Prevent, HitIQ, etc.) are closed. The counted mouthguard-adjacent items are the KTH evaluator (B-R2-02), BIC (B-R2-01) and B-1's HEADSport/impact_retriever. Helmet-FE (Riddell model) exists only as the training-data description inside B-R1-03's paper, not as a repo.
4. **Military blast-TBI modeling — NO SUBSTANTIVE SUPPLY.** Search returned two 0★ student/preprint-scale projects (a zebrafish bTBI workspace; a graph-attention pathogenesis exploration) — neither clears the substance bar; not counted. Blast codes at labs/DoD are not openly repo'd under findable names. Crossover value remains theoretical until a real release appears.
5. **CTE/neuropathology & brain-bank informatics — THIN, PARTIALLY COVERED.** Counted the measurement layer (QuPath B-R2-29, OpenSlide B-R2-30, AllenSDK reference data B-R2-32). No open repo was found for a CTE-specific data system or a brain-bank (BU/VA-BU-CLF-style) informatics platform — those run on restricted-access infrastructure by design. Not counted: anything requiring credentialed brain-bank data (wave rules: public code/docs only; nothing restricted was downloaded).
6. **Vestibular/ocular tech — THIN.** One manuscript-code repo counted (VOMS, B-R2-03, CONTEXT-ONLY). Pupil Labs' pupil was verified live (1,749★) but held out on fit (general eye-tracking platform, no concussion/vestibular substance of its own) — see reserves. Commercial systems (neuro-otologic/ocular-motor devices) are closed. The seam's open supply is essentially papers' analysis code.
7. **Verified-live RESERVES held out on substance/fit (24) — NOT in SEEN, NOT counted** (available if the coordinator ever expands the quota; all verified on full API records this wave): OxWearables/capture24 (60★, labelled activity-recognition dataset code), OxWearables/actipy (31★), OxWearables/stepcount (57★), OxWearables/biobankAccelerometerAnalysis (254★), OxWearables/actinet (16★), PennLINC/CuBIDS (30★), mne-tools/mne-connectivity (94★), NeuroTechX/EEG-ExPy (579★, canonical name for the repo formerly at NeuroTechX/eeg-notebooks), pyomeca/pyosim (27★), pyomeca/pyorerun (21★), nschloe/meshio (2,340★, generic mesh IO), febiosoftware/FEBioStudio (104★, GUI for counted FEBio), dandi/dandi-cli (28★), pyxnat/pyxnat (80★), graspologic-org/graspologic (1,021★), spm/spm (224★, major package — held only because the neuroimaging quota filled with NiPreps/PennLINC-lineage items; first reserve to promote), nipy/nipy (419★, legacy), nipy/nitransforms (36★), templateflow/python-client (7★), FEniCS/dolfinx (1,245★, generic FE), vmtk/vmtk (439★, vascular), SimVascular/SimVascular (354★, cardiovascular), opensim-org/opensim-gui (99★, GUI for counted core), gallantlab/pycortex (666★, visualization), pupil-labs/pupil (1,749★, see item 6).
8. **Unverifiable names (not counted):** tgeijten/sconepy (404 ×2 passes), opensim-org/opensense (404), OpenRadioss/OpenRadioss (404), drca-mlhm (no resolving repo under that or near names), plus first-pass wrong-owner guesses that were corrected and resolved (heudiconv, sleap, meshio, biomechZoo — corrections counted or reserved as noted). Jilab-biomechanics and GTBiomech org listings failed through the proxy (empty bodies) on the discovery pass — their member repos beyond B-1's three counted items remain UNENUMERATED; a coordinator-side retry of `GET /orgs/Jilab-biomechanics/repos` and `GET /orgs/GTBiomech/repos` is the closing action.
9. **Lane-boundary discipline:** no primarily-sports-analytics repo was counted, even where medically adjacent (per brief, Lane A is closed at 100 and owns that territory). Sleep/wearable items counted here are medical-monitoring tools (sleep staging, actigraphy, circadian metrics), not performance analytics.
10. **Scratch kept (disclosed):** `.scratch-REPOS-B-2/` in this lane folder — candidates lists, per-repo raw API JSON records, results TSVs, discovery output, dedupe intermediates. Kept deliberately: it is the verification evidence for every star count in this file. Nothing was written to /tmp for this wave's records (two transient grep outputs early in the session were deleted).
