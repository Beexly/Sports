# 1696 Balance asymmetry predicts subsequent injury (arXiv:2210.11802)

**Citation:** Fatma Chaari, Sébastien Boyas, Sonia Sahli, Thouraya Fendri, Mohammed A. Harrabi, Haithem Rebai, Abderrahmane Rahmani (2022). *Postural balance asymmetry and subsequent noncontact lower extremity musculoskeletal injuries among Tunisian soccer players with groin pain: A prospective case control study*. arXiv:2210.11802. Published: Gait & Posture 98 (2022) 134–140. DOI: 10.1016/j.gaitpost.2022.09.004. URL: https://arxiv.org/abs/2210.11802
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections through references).
**Verdict:** ADAPT — a prospective injury-prediction study with a very large effect (OR 7.48 for subsequent injury) built on cheap, field-deployable screens (Y-Balance Test, force-platform symmetry index); the "minor non-time-loss injury → measurable asymmetry → major subsequent injury" cascade is directly portable to GSE's NFL availability modeling.

## 1. Research question

Do soccer players with non-time-loss groin pain (GP) show greater static/dynamic unipedal balance asymmetry than healthy peers, and does that asymmetry translate into higher risk of subsequent noncontact lower-extremity injuries over 10 months?

## 2. Method / model

- **Design:** prospective case-control; 27 male soccer players with current non-time-loss GP (GPG; Doha-agreement clinical entities, ≥2 months, no rehab) + 27 healthy matched controls (CG; matched on age, height, weight, BMI, experience, training/match exposure); Tunisian elite second division; 10-month injury surveillance via monthly phone/email.
- **Static balance:** force platform (PostureWin, 40 Hz), single-leg stance, eyes open/closed × 3 trials; parameter = mean CoP velocity (CoPVm); asymmetry via symmetry index SI (0 = perfect symmetry; positive = more oscillation on injured/non-dominant limb).
- **Dynamic balance:** Y-Balance Test — max reach in anterior, posteromedial, posterolateral directions, normalized to limb length; composite score; side-to-side asymmetry. Pre-registered risk cutoffs: ≥4 cm posteromedial asymmetry and ≤89.6% composite score.
- **Injury definition:** first noncontact lower-extremity musculoskeletal injury requiring ≥1 day absence (physician-diagnosed, imaging-confirmed as needed); overuse injuries, contusions, stress fractures excluded.
- **Stats:** a priori power analysis (G*Power; d>0.80, power 0.80, α=0.05 → 26/group); two-way repeated-measures ANOVA (group × vision) on SI; independent t-tests + Cohen's d for Y-BT; one-sample t-tests vs cutoffs; chi-square + Cramer's V and binary logistic regression for injury incidence.

## 3. Mathematics / equations / assumptions

- Symmetry index: SI from CoPVm of injured vs non-injured limb (formula figure in paper; SI=0 perfect symmetry).
- Y-BT composite = mean of 3 normalized max reaches (% limb length); asymmetry = |limb difference| in cm and normalized.
- Logistic regression: subsequent injury (yes/no) ~ GP group membership.
- Assumptions: monthly self-report captures all qualifying injuries; matched controls adequately balance exposure (exposure hours NOT recorded — acknowledged limitation); GP diagnosis per Doha taxonomy is reliable.

## 4. Dataset / schema

- **Source:** authors' lab + club recruitment, Sfax Tunisia; n=54.
- **Schema per player:** demographics, HAGOS questionnaire, force-platform SI (EO/EC × limb), Y-BT reaches (3 directions × limb), 10-month injury indicator + diagnosis.
- **Access:** individual values in supplementary materials (per paper); no public repository stated.

## 5. Features / target

- **Features:** SI (static asymmetry), Y-BT directional asymmetries + composite score, GP status.
- **Target:** first subsequent noncontact lower-extremity injury within 10 months (binary).

## 6. Validation design

- **Design:** prospective — predictors measured at baseline, outcomes observed forward in time; matched case-control; pre-registered cutoffs from prior literature (4 cm, 89.6%).
- **Effect sizes reported throughout** (Cohen's d, ηp², Cramer's V), not just p-values.

## 7. Exact results and baselines (numbers)

- **Static:** group × vision interaction on SI: F=4.508, p=0.03, ηp²=0.08; GPG higher SI than CG only eyes-closed (p<0.01); vision removal increased SI in GPG (p<0.001) but not CG (p=0.66).
- **Dynamic:** GPG asymmetry higher in all directions (p<0.001): anterior d=2.23, posteromedial d=2.11, posterolateral d=1.53, composite d=2.83.
- **Cutoffs:** GPG injured-limb composite significantly below 89.6% (p<0.001, d=−11.0); posteromedial asymmetry significantly above 4 cm (p<0.001).
- **Injury:** 17/27 (63%) GPG vs 5/27 (18.5%) CG sustained subsequent injury (p<0.001, V=0.45); **OR = 7.48 [95% CI 2.15–26.00], p<0.01**.

## 8. Code / data availability

**Stated:** individual values provided as supplementary materials; no code or public repository.

## 9. Leakage and limitations

- **No exposure recorded** — groups matched on self-reported training/match frequency, but true exposure hours unknown; the OR could partly reflect differential exposure (acknowledged).
- **n=54, single league/level** — wide CI on the OR (2.15–26.00); generalizability to other sports/levels untested.
- **No position stratification** — balance demands differ by field position (acknowledged).
- **Monthly self-report** for injuries — possible recall/reporting bias; only first subsequent injury analyzed.
- **Soccer-specific** — groin-pain cascade may not map 1:1 to NFL injury types.

## 10. GSE overlap

GSE's injury models use injury-history features but lack the *mechanistic cascade* framing: a minor non-time-loss complaint → measurable physical asymmetry → major subsequent injury. The NFL analogue: players listed as questionable/limited with minor soft-tissue issues who then suffer season-altering injuries. No existing GSE doc implements asymmetry-style "vulnerability state" features or the subsequent-injury cascade.

## 11. GSE implementation spec

- **Target:** subsequent-injury risk flag in GSE's availability model.
- **Data:** NFL injury reports 2015–2024; define "minor non-time-loss injury" = player appears on injury report (limited/questionable) but plays; target = time-loss injury (missed games) within the next 8 weeks.
- **Method:** replicate the prospective design — cohort of player-weeks with minor-injury designation vs matched healthy controls; logistic regression / survival model for subsequent time-loss injury; report OR with CI; test whether the effect concentrates in soft-tissue injuries (the mechanistic analogue of the groin-pain cascade).
- **Serving:** "re-injury risk" annotations on GSE's injury report content; availability-risk adjustments in fantasy projections for players carrying minor designations.
- **Effort:** 1–2 weeks.

## 12. Reproducible test

- **Dataset:** NFL injury reports 2018–2024 (public: nflverse injuries); snap counts for exposure approximation.
- **Metric:** odds ratio of time-loss injury within 8 weeks for "minor designation but played" vs matched healthy player-weeks; Cox model with the minor-injury flag as a time-varying covariate.
- **Baseline to beat:** a naïve model using only prior-season injury counts; the cascade model passes if the minor-injury flag carries an adjusted OR ≥ 2.0 (p<0.05) after controlling for age, position, and prior-season injuries — a smaller but real analogue of the paper's 7.48.
- **Window:** 2018–2024 seasons.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the cascade feature if the NFL replication shows adjusted OR ≥ 2.0 for subsequent time-loss injury within 8 weeks of a minor designation (p<0.05). REJECT if OR < 1.3 (the cascade doesn't exist in NFL data — e.g., because NFL medical staffs already manage it).
- **Improvement experiment:** the paper's design can't separate the asymmetry mechanism from unmeasured confounding — add a **dose-response test**: grade minor injuries by games-missed-with-designation (0 = played full, 1 = limited snaps) and test for a monotonic risk gradient, which would support a real vulnerability-state mechanism over pure selection. Second: test **position-specific cascades** (e.g., hamstring → calf for speed positions), the paper's acknowledged gap.

**Verdict:** ADAPT — the prospective minor-injury → subsequent-injury cascade with OR 7.48 is a concrete, testable feature for GSE's availability modeling.
