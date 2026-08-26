# Deep extraction — founder paper batch 1 (2026-08-26)

**Scope:** full-text deep pass over six founder-selected arXiv ids, correcting the
one-line triage in `ORBIT_NEXT_50.md` rows 78–83 (wave 5). Every paper below was
read in FULL TEXT this session — ar5iv HTML where served, arXiv PDF where ar5iv had
no content. Nothing here is inferred from an abs page alone.

| id | ar5iv | arXiv PDF | read |
|---|---|---|---|
| 2606.24443 | no content | 21 pp PDF | FULL |
| 2505.23703 | full HTML | — | FULL |
| 2406.17947 | full HTML | — | FULL |
| 2504.08747 | abs redirect only | 16 pp PDF | FULL |
| 2606.28570 | full HTML | — | FULL |
| 2405.20681 | full HTML | — | FULL |

**Verdict summary (corrections vs ORBIT rows 78–83):**

| id | what it actually is | ORBIT row said | deep-pass verdict |
|---|---|---|---|
| 2606.24443 | Relaxed-NFL auto-formalization pipeline (SJTU) | 78: ignore — no fit | **skill-doc (low)** — harnessed-LLM elaboration pattern for relation-level claim verification |
| 2505.23703 | NL-FL HybridReasoning (Lean4 prover boosts NL math QA) | 79: ignore — no fit | **ignore CONFIRMED** — NONE AFTER FULL READ (reason sharpened) |
| 2406.17947 | Intergroup-bias tagging of NFL fan comments grounded in WP | 80: skill-doc (low) | **skill-doc (low) CONFIRMED — content corrected** (triage overstated the "linguistic WP" finding) |
| 2504.08747 | GridMind: Telemetry Sports multi-agent NL-query product paper | 81: skill-doc (low) | **skill-doc (low) CONFIRMED** — value is the honest 58%-accuracy benchmark + hard-example-mining eval loop |
| 2606.28570 | LangGraph athlete-profiling agents; LLM-as-a-Judge fail-closed loop | 82: skill-doc (low) | **skill-doc (medium)** — the judge recipe is more concrete than triage credited; its own numbers are internally inconsistent |
| 2405.20681 | NFL theorem = No-Free-Lunch bound for privacy-preserving LLM inference | 83: ignore — no fit | **ignore CONFIRMED** — NONE AFTER FULL READ (regime never arises at GSE) |

None of the six touches EDGE-PATH §2 (E1 calibration / E2 resolution / E3 proof).
The live matter is entirely in the §3 ops lane: numeric fidelity, claim
verification, judge gates for the content/agent fleet. That is consistent with the
wave-5 corpus-discipline note ("the corpus's value is concentrated").

---

## 1. arXiv:2606.24443 — "Verifiable Auto-Formalization of Mathematics Using a Relaxed Natural Formal Language"

**Read:** arXiv PDF, 21 pages (ar5iv served "No content available"). Hui, Xie, Qi,
Li, Lan, Cao — Shanghai Jiao Tong University, cs.LO, submitted 23 Jun 2026.

### (a) Full-text content, method level

Genuinely a theorem-proving-infrastructure paper; the "NFL" in the title is
**Natural Formal Language** — a third distinct expansion of the acronym in this
corpus (not football, not No-Free-Lunch).

Pipeline (their Fig. 2): Natural language → **Relaxed NFL** (auto-formalizer) →
**Core NFL** (proof elaborator) → **proof gaps** (gap generator) → verification
(proof-script generator + theorem libraries + domain-specific solvers).

- **Relaxed NFL (§2.1, grammar in Appendix B):** a declarative surface proof
  language with formally specified syntax that deliberately keeps informal
  ambiguity — partially specified terms, overloaded notation, free variables,
  implicit scopes. LLMs target THIS instead of Lean/Mizar, shrinking the
  representational gap.
- **Core NFL (§2.3):** small formal kernel. `PState = Term* × Term` (sequent
  Γ ⊢ G); `Proof ::= Forward(M,P,π) | Backward(M,P,π) | Subgoal(P,π1,π2) | QED`;
  `Program = PState × Proof`.
- **Elaboration Relaxed→Core (§3) — the part that matters for us.** Three worked
  steps, each showing the same discipline for using an LLM inside a verifiable
  pipeline:
  1. *Notation resolution (§3.1):* overloaded `|x|` disambiguated to `Abs`/`Card`
     via soft-type annotations (`IsReal`, `IsSet`) + deterministic constraint
     propagation over operator signatures; **the LLM is queried only when the
     environment leaves >1 candidate, and only to pick from that finite set**.
  2. *Problem-solving translation (§3.2):* `Find all x such that P(x)` — the LLM
     proposes the candidate solution set S; validity is then verified symbolically
     (`∀x, x ∈ S ⇔ P(x)` becomes a proof obligation). Propose-then-verify.
  3. *Implicit scope resolution (§3.3):* LLM emits explicit `[@scope …@]`
     annotations; a **deterministic checker verifies every annotated free
     variable sits in a matching scope and that no other part of the proof was
     modified** before the annotation is accepted and mechanically eliminated.
- **Proof-gap generation (§4.1):** semantics of a Core-NFL program is a
  structurally recursive function
  `PGG : PState × Proof → P_fin(Gap)`, e.g.
  `PGG(Γ ⊢ G, Forward(M,P,π)) = {Γ ⊢_M P} ∪ PGG(Γ·P ⊢ G, π)`; program certified
  iff every gap discharges (`CheckProgram = ∧ CheckGap`).
- **Discharge (§4.2):** LLM writes scripts in a 12-command tactic DSL (Table 1:
  assert/apply/rewrite/… + `auto_solve`, `auto_replace`, `get_prop`) backed by 11
  domain solvers (Table 2: PolyRat, SmtLra, Deriv, Integral, Interval, …) composed
  by BFS.
- **Eval (§5, Table 3):** 3,600 Demidovich analysis problems (OCR). Few-shot
  Qwen3-235B: 44.4%/72.3% pass@1/@3 (no CoT), 70.3%/90.4% with CoT. LoRA-tuned
  Qwen2.5-7B on 2,000 pairs: **83.6% pass@1** — a 7B model beats the 235B with
  CoT once the target language is close to natural writing. Pass = generates
  semantically well-defined proof gaps (discharge not scored).

### (b) THE APPLICATION

**Skill-doc: the harnessed-elaboration pattern, aimed at `numeric-guard` v2
(relation-level claim verification).** The math machinery (grammar, PGG, solvers)
does not port. What ports is the paper's answer to "how do you keep an LLM step
verifiable": (i) give the LLM a *relaxed intermediate representation* close to its
natural output instead of the final formal target; (ii) elaborate with
deterministic rules first, invoking the LLM **only to choose among finite,
rule-generated candidates**; (iii) accept LLM output only after a deterministic
checker confirms it added exactly the requested annotation and touched nothing
else; (iv) compile the elaborated form into mechanically generated verification
conditions, each discharged by deterministic checkers.

GSE's current guard (`apps/web/lib/claude-api/numeric-guard.ts`) is a
value-membership check: it extracts stat-shaped numbers and verifies each value
exists in the grounding payload (±0.1). It cannot catch a number that is grounded
in value but attached to the wrong relation ("covered 7 of last 10" where 7 is a
different stat's value in the same payload). The paper's pattern is the design for
the next rung:

- **Target module:** `apps/web/lib/claude-api/numeric-guard.ts` +
  `apps/web/lib/content-engine/` (compose into `readiness.ts` the way
  `public-claim-compiler.ts` composes gates today — never a parallel gate).
- **Mechanism:** content generator emits, alongside prose, a typed claim IR —
  `{relation: "ATS_RECORD", subject: teamId, window: 10, value: 7}` — the "Relaxed
  NFL" of the content lane (close to what the model already says, machine
  parseable). A deterministic discharger re-computes each relation against the
  structured payload; prose renders only if every claim discharges;
  fail-closed otherwise. The LLM is never the verifier.
- **Data:** the same structured pick/odds/results payload the copy is generated
  from; no new sources.
- **Gate:** discharge-rate 100% required to publish (mirrors `CheckProgram = ∧
  CheckGap`); anything less routes to the existing BLOCKED path.

This is deliberately a design note, not a build order — the value-membership
guard plus banned-phrase scanner already holds the brand line; the claim-IR rung
is the documented upgrade path when relation-level fabrication is observed in the
wild or in SportsMetrics-style evals
(`docs/ops/edge/2026-08-26-paper-spec-sportsmetrics-numeric-fidelity.md`).

### (c) Corrected lens/priority vs ORBIT row 78

Row 78 said **ignore — no fit**. Corrected to **skill-doc (low)**. The triage
pattern-matched "auto-formalization of mathematics" to off-domain and missed that
§3 is a general, carefully worked recipe for verifiable LLM elaboration — the
exact discipline GSE's no-fabricated-stats lane is built on, one rung above where
`numeric-guard` currently sits.

---

## 2. arXiv:2505.23703 — "Let's Reason Formally: Natural-Formal Hybrid Reasoning Enhances LLM's Math Capability"

**Read:** ar5iv full HTML (~11.2k words). Wang, Li, Fung, Zhang — UIUC/HKUST.

### (a) Full-text content, method level

End-to-end framework (NL-FL HybridReasoning) to make a formal-language (Lean4)
prover improve natural-language math QA:

1. **NL-FL Problem Alignment (§2.1):** QA problems ("find the smallest C…") are
   rewritten by a general LLM into *existence* problems ("prove there exists a
   smallest C…") — removing the need to know the answer before formalizing
   (traditional formalization bakes the answer into the statement). The existence
   form is then auto-formalized to a Lean4 statement (Kimina-Autoformalizer),
   e.g. `∃ (C : ℝ), IsLeast {C | 0 < C ∧ ∀ v, ‖Av‖ ≤ C*‖v‖} C` (their Fig. 4).
2. **Mixed Problem Input (§2.2):** the prover (Kimina-Prover-Preview-7B) receives
   BOTH the NL QA problem and the FL existence statement;
   `Prover(x_FL, x_NL) = z_CoT, y_FL`. Observed behavior: the FL prover solves
   the NL question inside its Long CoT first, then writes the proof — the answer
   appears *implicitly* in the CoT.
3. **Answer Extraction (§2.3):** a general LLM (non-thinking mode) pulls the
   boxed NL answer out of the prover's CoT; some FL outputs are randomly dropped
   in favor of direct NL solving to blend both knowledge sources.

Results (§3, Table 1, pass@16 vs Qwen3-8B): MATH-500 85.20→89.80 (+4.60pp), AMC
79.52→84.34 (+4.82pp); biggest subject gain Geometry +14.63pp. §3.4/Table 2: the
30 problems only HybridReasoning solved stay at 0% for the NL baseline even at
pass@64. Ablations (Table 3): dropping existence alignment costs 4.42pp avg and
falls *below* the NL baseline on AMC; swapping the expert prover for the general
LLM costs 2.55pp. **Limitations section admits the key point: "the verifiability
of FL is not properly used in the framework"** — the Lean proof is never actually
used to check the extracted answer; the prover functions as a differently-trained
reasoner, not a verifier.

### (b) THE APPLICATION

**NONE AFTER FULL READ.** Specific reasons, from the text rather than the title:

1. The framework's payoff is better *LLM-side math problem-solving*. GSE's
   binding architecture (CLAUDE.md: AI layer is "content generation only — not
   source of truth"; prediction engine rules) computes every number in TypeScript
   against structured data. There is no surface where GSE wants an LLM to derive
   a quantitative answer — parlay math, devig, EV all live in code
   (`packages/prediction-engine`, `apps/web/lib/parlay`, `lib/market`). Importing
   a prover-in-the-loop to make an LLM better at arithmetic would move
   computation in exactly the direction the platform's invariants forbid.
2. The one property that could have justified a port — verified answers — is the
   property the paper concedes it does not deliver (Limitations, quoted above).
   As a "verification of claims" method it is weaker than what GSE already runs
   (`numeric-guard` + `public-claim-compiler` are deterministic and fail-closed).
3. Residual value is a corpus footnote only: independent evidence that
   expert-model routing + answer extraction beats a generalist on tasks with a
   verifiable core, and that *problem re-formulation into a checkable form*
   (QA→existence) is where most of the gain lives (their own ablation). That
   rhymes with paper #1's lesson and adds nothing implementable beyond it.

### (c) Corrected lens/priority vs ORBIT row 79

Row 79 said **ignore — no fit**. **Confirmed ignore** — but now for the right,
specific reason (the framework enhances LLM math answering, which GSE
architecturally excludes, and its verifiability is unused by its own admission),
not by title pattern-match.

---

## 3. arXiv:2406.17947 — "Do they mean 'us'? Interpreting Referring Expressions in Intergroup Bias"

**Read:** ar5iv full HTML (~9.3k words). Govindarajan, Zang, Mahowald, Beaver,
Li — Ithaca/Brown/UT Austin.

### (a) Full-text content, method level

Computational sociolinguistics on NFL fan language, grounded in win probability:

- **Corpus (§3.1):** 6M+ game-time comments from the 32 NFL team subreddits
  (2021–22, 2022–23 seasons; 1,104 game threads, 569 games), parallel across
  both fandoms of each game. Each comment timestamp-joined to play-level **win
  probability from nflfastR** (Baldwin's calibrated WP model) — WP as the
  non-linguistic state-of-the-world variable.
- **Task (§3.2–3.3):** tag referring expressions as `[in]` / `[out]` / `[other]`,
  incl. sentence-level implicit reference via a `[sent]` token. Expert gold set
  1,499 comments; 3 crowd annotators on the 318-comment test split; Fleiss κ =
  0.69; human-vs-expert "ceiling" accuracy 0.65.
- **Modeling (§5, Table 1):** GPT-4o few-shot vs LoRA-finetuned Llama-3-8B (with
  GPT-4o-generated CoT explanations). Conditions: numeric WP / no WP /
  **linguistic WP** (scalar description "Team A is very likely to win") /
  ±sin(π·WP) temperature scaling. Llama-3 finetuned best overall (71.0 F1);
  both beat the human-ceiling number.
- **The WP findings, precisely (§5.2):**
  - Linguistic WP nudges GPT-4o few-shot overall F1 from 66.8 to 69.0 — but the
    paper states this is **not statistically significant under a bootstrap
    test**, and the abstract's own verb is "occasionally perform better".
  - Finetuned Llama-3 gets **no benefit from WP in any form** (numeric,
    linguistic, loss-scaling — all within noise).
  - Error analysis: **"GPT-4o's fickleness and inability to reason over
    numerical scales — it reasons that WPs ranging from 1% to as high as 41%
    are 'low'"**, and it "rarely uses the numbers to infer the WP for the
    out-group." This is the robust, quotable finding.
- **Large-scale analysis (§6, Table 2):** tagging 100k comments reveals clean
  linear WP trends: any-reference frequency falls with WP (slope −19.3e−4,
  R²=0.72); in-group reference falls (−2.8e−4); out-group and no-reference rise;
  `we[in]` used more when losing (in-group protection), `they` as an out-group
  "other-ing" term. LIB-consistent, at scale.
- Data: Reddit API, comment/post ids only, MIT license, anonymized usernames.

### (b) THE APPLICATION

**Skill-doc for the content lane + one concrete eval addition.** Two honest
pieces:

1. **A documented LLM failure mode GSE's rules already defend against — now with
   a citation and test cases.** GPT-4o treating 1%–41% as one "low" bucket and
   failing complement inference (P(out) = 1 − P(in)) is exactly the class of
   error that motivates GSE's rule that probability language is computed in code
   and the LLM only narrates. Implementable slice: add two adversarial case
   families to the SportsMetrics-style numeric-fidelity eval
   (`docs/ops/edge/2026-08-26-paper-spec-sportsmetrics-numeric-fidelity.md`):
   (i) *probability-band consistency* — same prompt, WPs across 5–45%, assert the
   model's qualitative label tracks the band the code assigns, and
   (ii) *complement inference* — given P(team A), assert copy about team B is
   consistent with 1−P. Gate: these cases run in the content-lane eval before
   any prompt-template change ships; regressions block the template.
   Target: eval fixtures beside the numeric-guard tests; no product code change.
2. **Tone note for fan-facing copy (bias-mirror adjacent):** the WP-linear
   reference trends (§6) are a real, replicated-at-scale description of how fans
   talk while winning vs losing. Useful as background for
   `apps/web/lib/bias-mirror/` copy and community-content tone guidelines
   ("we-when-losing" is a bias signature, not a data signal). Not a model
   feature — GSE has no fan-comment ingestion surface, and building one for this
   would be speculative scope (and a clearance-engine question besides).

Explicitly NOT the application: encoding "give LLMs linguistic probabilities
instead of numbers" as a design rule on the strength of this paper — see (c).

### (c) Corrected lens/priority vs ORBIT row 80

Row 80's **skill-doc (low)** priority stands, but its stated content —
"the finding that LLMs handle linguistic descriptions of win probabilities better
than raw numbers" — **overstates the paper**. Full text: the linguistic-WP gain
is GPT-4o-few-shot-only, not significant under bootstrap, and absent for the
finetuned model. The durable finding is the *negative* one (LLMs mis-reason over
numeric probability scales), which supports GSE's existing
code-computes/LLM-narrates invariant and supplies the two eval-case families
above. Note also the corrected note should not cite this paper as license to
phrase probabilities linguistically *instead of* showing calibrated numbers —
GSE's product shows calibrated numbers; the LLM just must not be the thing
interpreting them.

---

## 4. arXiv:2504.08747 — "GridMind: A Multi-Agent NLP Framework for Unified, Cross-Modal NFL Data Insights"

**Read:** arXiv PDF, 16 pages (ar5iv redirected to the abs page). Chipka, Moyer,
Troyer, Fuelling, Hochstedler — **Telemetry Sports** (industry), submitted to
Sloan Sports Analytics Conference 2025.

### (a) Full-text content, method level

A product/architecture paper — no algorithmic contribution, no released
benchmark, no ablations. Verified against the full text:

- **Architecture (§3):** agents in a message-passing graph — Prompt Augmentation
  Agent (injects current stats/context into the prompt), Query Interpretation
  Agent (LLM → MongoDB/SQL commands), three Data Retrieval agents (structured
  DB; semi-structured Next-Gen-Stats/tracking; unstructured embeddings over
  docs/audio via Sentence-BERT + Whisper + Pinecone), Synthesis Agent (merges +
  links play-ID video). CoT decomposition of compound queries into parallel
  sub-tasks (§3.4). Dialogue memory for multi-turn.
- **Grounding stance (§4.1):** "well-defined data models provide precise query
  control, reducing risks of hallucinations" — i.e., the same
  structured-data-as-source-of-truth position GSE already holds as invariant.
- **Evaluation (§7) — the honest numbers:** a closed alpha with **ten
  participants**; **58% accuracy on binary good/bad feedback** (bad = incorrect
  OR poorly worded OR missing detail); **17.5 s average response time**
  sequentially, 20+ s outliers. §8: fails on nuanced queries; a user
  thumbs-downed a *correct* answer because "OB-LB" positional labels were
  unfamiliar — perceived accuracy ≠ accuracy.
- **Ops loop (§8.5):** as prompt volume grows, manual grading is replaced by a
  hybrid: an automated **challenge score** per prompt (complexity of the query
  graph → higher error likelihood) prioritizes which prompts get human
  evaluation — **hard-example mining** for the tuning loop.
- Everything demonstrable leans on proprietary Telemetry metrics (tWAR, QB IQ,
  Passing Composite) — nothing portable there.

### (b) THE APPLICATION

**Skill-doc, two small pieces — no port.**

1. **A realism benchmark for any GSE conversational NL-over-data surface.** A
   funded sports-data company with a dedicated MAS shipped 58% user-rated
   accuracy at 17.5 s latency in a 10-person alpha. If/when the Trend Lab
   conversational-query idea (ORBIT row 85, SPORTSQL, pattern-medium) is built,
   this is the sobriety line: pre-register an acceptance bar (>‌58% binary-good on
   a fixed query set; latency budget) before shipping, and expect the
   "correct-but-unfamiliar-vocabulary" failure class — GSE's factor-trail
   vocabulary will hit the same OB-LB problem. Target: acceptance criteria in
   whatever spec instantiates row 85; no code today.
2. **Hard-example-mining for the eval harness.** §8.5's challenge-score loop is a
   portable ops idea for `scripts/agent-eval/` when an LLM lane is added: score
   eval prompts by structural complexity, spend human review on the hard tail
   rather than uniformly. One paragraph of process, not a dependency.

### (c) Corrected lens/priority vs ORBIT row 81

Row 81 (**skill-doc (low)** — "architecture reference…no concrete algorithm to
port; GSE's content layer already keeps structured data as source of truth") is
**confirmed by the full text** and sharpened: the durable extract is the honest
58%/17.5 s benchmark plus the §8.5 hard-example-mining loop; the architecture
diagram itself is generic 2024-era RAG-MAS. No priority change.

---

## 5. arXiv:2606.28570 — "Digitizing Coaching Intelligence: An Agentic Framework for Holistic Athlete Profiling using VLM and RAG"

**Read:** ar5iv full HTML (~7.3k words). Ghosal, Sen, Ansar, Chakrabarti —
University of Calcutta; Sports Authority of India (SAI) protocol alignment.

### (a) Full-text content, method level

LangGraph-orchestrated pipeline turning exercise videos (push-ups/sit-ups) into
athlete profiles:

- **Agent 1 — guardrail:** lightweight pre-scan (exercise present? occlusion?
  corruption?) that halts the pipeline before tokens are spent. Benchmarked
  (Table 2): llama-4-scout at 2 FPS = 1.000 accuracy; at 3 FPS accuracy *drops*
  to 0.95 — more frames saturate context ("loss in the middle"), a
  counterintuitive sampling-rate result.
- **Agent 2.1 — VLM qualitative:** 3×3 "Smart Grid" temporal chunking — 9
  sequential frames stitched into one image, timestamps watermarked per cell;
  ~88% token reduction while keeping temporal continuity ("hips sagged at
  T:8.0s"). Llama-4-scout chosen over maverick (Table 3: maverick hallucinated
  exercise identity, 4.2 s vs 1.5 s inference).
- **Agent 2.2 — CV quantitative:** MediaPipe 33-landmark pose; joint angles via
  dot product; FSM **with hysteresis thresholds** for valid-rep counting
  (partial reps rejected).
- **Agent 3 — assessor:** weighted score
  `S_final = W1·Reps + W2·F_qual + W3·E_vlm` (e.g. 0.4/0.4/0.2) + LLM narrative
  feedback.
- **Agent 4 — LLM-as-a-Judge (§3.2.2), the part that matters:** an independent
  auditor that **cross-references the deterministic CV numbers against the
  qualitative VLM prose** for logical contradictions (zero valid reps vs
  "excellent form" praise). Output is **structured tool-calling with an enforced
  schema** — `{confidence 0–100, justification, contradiction tags, severity}` —
  never prompt-only JSON. Flow: confidence ≥70% → persist; <70% → re-inference
  loop with the judge's correction instructions injected into the retry prompt;
  **fail-closed**: an invalid/timeout judge response is treated as low
  confidence, and exceeding the retry limit flags for manual review.
- **Agents 5–8:** dual persistence (Google Sheets relational + ChromaDB vectors,
  gemini-embedding-001) feeding a RAG retrieval pair (top-k=3 similarity search
  → low-temperature (0.1) analyst persona with mandatory data-point citation and
  a graceful no-match fallback).
- **Evaluation caveat — read skeptically.** The paper's own numbers contradict
  each other: §4.1.1 says "80 total video samples" then lists 60 push-ups + 60
  sit-ups; the user study (Table 5 vs its own analysis text) reports mean
  assessment time 7.5 min in the table and "over 12 minutes" in the prose, and
  1.5 min vs "1.2 minutes" for the API arm. The 91.5% rubric-agreement and
  SUS-88.2 claims therefore carry little evidential weight. Adopt the
  *pattern*, not the *results*.

### (b) THE APPLICATION

**The fail-closed cross-modal judge recipe, for the content lane and agent
fleet.** GSE already enforces output policy deterministically
(`apps/web/lib/pick-explainer/policy.ts` rejects; `numeric-guard` grounds
values; `content-engine/compliance.ts` blocks banned phrases). What §3.2.2 adds
that GSE does not have is the *structured judge verdict + bounded feedback
retry + escalation* shape:

- **Target module:** `apps/web/lib/content-engine/` (a judge pass between
  `build-draft.ts` and `persist-draft.ts`, surfaced through `readiness.ts`), and
  the agent-fleet eval lane (`scripts/agent-eval/` + `docs/agent-skills/`).
- **Mechanism (ported 1:1 from Agent 4):** judge receives the generated draft
  AND the structured payload it was generated from; must return an enforced
  schema `{confidence, justification, contradictionTags[], severity}` via tool
  calling (GSE equivalent: zod-validated tool result — never free JSON);
  contradiction check is *cross-modal*: prose sentiment/claims vs the
  deterministic numbers (e.g. draft praises a "hot streak" while the payload
  shows 2-8 L10 → contradiction tag). Confidence ≥ threshold → proceed; below →
  ONE bounded retry with the judge's justification prepended to the regeneration
  prompt; invalid judge output or retry exhaustion → **fail-closed** into the
  existing human-review/BLOCKED path. Fail-closed-on-judge-failure is the
  specific discipline worth writing down: a judge that errors must never
  default-approve.
- **Data:** existing draft + structured source payload; no new data.
- **Gate:** ship behind the same posture as other content gates (default
  additive: judge can only block, never unblock something compliance blocked);
  add fixture cases to `scripts/agent-eval/` asserting (i) judge-timeout ⇒
  BLOCKED, (ii) contradiction fixture ⇒ BLOCKED with tag, (iii) retry cap
  honored.

Secondary note: the 2-FPS-beats-3-FPS guardrail result (Table 2) is a compact
citation for "more context is not more accuracy" in fleet prompt design.
The athlete-profiling domain itself, the Smart Grid trick, MediaPipe, and the
Sheets/ChromaDB stack have no GSE surface — confirmed no product fit.

### (c) Corrected lens/priority vs ORBIT row 82

Row 82 said **skill-doc (low)** — "LLM-as-judge self-correction and RAG
persistence patterns are loosely relevant." Corrected to **skill-doc (medium)**:
the judge recipe is not loose — it is a concrete, directly portable checklist
(enforced schema, cross-modal contradiction tags, threshold, bounded
feedback-retry, fail-closed on judge failure, escalation) that slots into an
existing named module. Simultaneously, mark the paper's empirical claims
untrustworthy (internal inconsistencies documented above) — the recipe is
adopted on engineering merit, not on their user study.

---

## 6. arXiv:2405.20681 — "No Free Lunch Theorem for Privacy-Preserving LLM Inference"

**Read:** ar5iv full HTML (~11.3k words). Zhang, Pang, Kang, Chen, Fan, Jin,
Yang — HUST/WeBank/HKUST.

### (a) Full-text content, method level

Theory paper on the privacy–utility trade-off when a client perturbs prompts
before querying a black-box LLM (the "NFL" is **No-Free-Lunch**; wave-5's fourth
distinct expansion of the acronym):

- **Setting (§3):** semi-honest LLM server as attacker; client applies a
  randomization mechanism M to token embeddings (`w̃ = w + δ`, then
  nearest-token replacement; instances: dχ-privacy noise, InferDPT random
  adjacency lists). Attacks considered: BERT-mask input inference, embedding
  inversion (nearest neighbor), LLM-assisted reconstruction.
- **Definitions:** privacy leakage `ε_p = R(P̃) − R(P̆)` (Def 3.1) — attacker's
  recovery extent on the protected prompt minus recovery extent under a
  prompt-independent baseline (random guessing); utility loss
  `ε_u = U(P) − U(P̃)` (Def 3.2). Problem: minimize ε_u s.t. ε_p ≤ ξ (Eq. 3).
- **Machinery (§4):** near-optimal embedding set W_c (Def 4.2) with a density
  bound tied to TV(P‖P̃) (Assumption 4.1, defines α); bi-Lipschitz encoding
  (Assumption 4.2); self-bounded attacker regret Θ(I^p) — satisfied by
  AdaGrad/Adam with p=1/2 (Assumption 4.3). Lemma 4.2: ε_p ≥ C₁·TV(P̃‖P̆);
  Lemma 4.3: ε_u ≥ (α/2)·TV(P‖P̃).
- **Theorem 4.4 (the NFL theorem):**
  `(C₂/C₁)·ε_p + ε_u ≥ C₂·TV(P‖P̆)` — the weighted sum of privacy leakage and
  utility loss is bounded below by a problem-dependent, mechanism-independent
  positive constant. You cannot drive both to zero; every unit of privacy bought
  by prompt randomization is paid for in utility.
- **Experiment (§5):** InferDPT on CNN/DailyMail continuation, GPT-3.5-turbo
  remote + Vicuna-7b local extraction, 24 privacy levels; recovery measured by
  cosine similarity; utility by BERTScore/BLEU/ROUGE/etc. Curves match the
  theorem's direction (higher ε budget → more leakage, less utility loss).

### (b) THE APPLICATION

**NONE AFTER FULL READ.** The theorem quantifies a trade-off that only exists
*inside* the prompt-randomization regime — a client that must send
privacy-sensitive content to a black-box LLM and chooses to perturb it. GSE is
never in that regime, by architecture rather than by accident:

1. GSE's LLM calls carry its **own non-sensitive structured sports data** (odds,
   picks, stats) for content generation; there is nothing to perturb.
2. For actual personal data, GSE's control is **categorical exclusion**, not
   randomization: user PII does not go into LLM prompts at all, and the scraping
   data-rules already require privacy review before personal data is extracted
   anywhere. Exclusion sits outside the theorem's trade-off (no perturbation ⇒
   no ε_u; leakage handled by never transmitting), and is strictly stronger.
3. The only conceivable future touchpoint — an LLM feature over user betting
   journals or bias-mirror self-reports — is already designed the same way
   (bias-mirror computes locally, "nothing is sent or stored"). If that posture
   ever changed, the actionable takeaway would be one sentence ("DP-perturbing
   user text into an external LLM has a proven utility floor cost — keep
   excluding instead"), which does not merit a port, a module, or a gate.

### (c) Corrected lens/priority vs ORBIT row 83

Row 83 said **ignore — no fit**. **Confirmed ignore**, now with the specific
regime argument above rather than a keyword-collision presumption. (The triage's
collision hypothesis was itself correct: this is a No-Free-Lunch paper with no
football content.)

---

## Cross-batch synthesis

1. **The founder's six ids reduce to one theme with teeth:** making LLM output
   *verifiable* inside a pipeline. Papers 1 and 5 supply the two halves GSE can
   actually use — (1) constrained elaboration + mechanically generated,
   deterministically discharged verification conditions (claim-IR upgrade path
   for `numeric-guard`), and (5) the fail-closed structured judge loop for the
   content engine. Paper 3 supplies the eval cases proving why the discipline is
   needed (LLMs mis-read probability scales). Papers 2 and 6 establish, from
   full text, that their machinery lives in regimes GSE's invariants exclude.
   Paper 4 contributes a sobriety benchmark for any future NL-query surface.
2. **No E1/E2/E3 impact.** Nothing here changes the calibration, resolution, or
   proof program. All adoptions are §3 ops-lane (content integrity + fleet
   evals) and are founder-gated to wire as usual.
3. **Acronym ledger for the corpus:** across wave 5 + this batch, "NFL" has now
   meant: football, No-Free-Lunch (optimization), No-Free-Lunch (privacy),
   Negative Federated Learning, nerve fiber layer, neural feedback loops, No
   Forgetting Learning, and **Natural Formal Language** (2606.24443). Future
   triage of "NFL" hits starts from the assumption of collision.

*Deep pass performed 2026-08-26. Sources: ar5iv.labs.arxiv.org full HTML
(2505.23703, 2406.17947, 2606.28570, 2405.20681); arxiv.org PDFs (2606.24443,
2504.08747). Not committed — founder review first.*
