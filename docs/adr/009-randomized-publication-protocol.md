# ADR-009 — The randomized-publication protocol (the coin)

**Status:** DECIDED — parameters fixed; activation gated on the two owner
actions in §5.
**Date:** 2026-08-14
**Driver:** CEPT Part II (`docs/research/cept/HONEST_CEPT.md` §7–§8): no
transcript statistic can distinguish forecasting skill from echo (Theorem 7);
randomizing what gets published makes the product's causal claim about itself
anytime-testable, uniformly over every possible reaction of the world
(Theorem 9), and additionally separates prediction-value from influence-value
(Remark 13) and puts Theorem 1's reaction menu on sequential trial
(Theorem 12).

The owner's standing directive is that decisions be made, not presented as
options. Every parameter below is therefore a decision with its rationale.
Changing any of them requires a new entry here and a new coin epoch — never a
mid-epoch edit, which would corrupt the audit trail.

## 1. Decisions

| Parameter | Decision | Why |
|---|---|---|
| ε (baseline-slate rate) | **0.15** | Proposition 10: validity holds for any ε > 0; power degrades continuously. 0.15 keeps ~85% of days on the candidate board (product quality) while giving the baseline arm ~4–5 settled days/month — enough for the shift test's strata to fill within a season. |
| π_t | **0.85, constant** | Constant π maximizes auditability (one number to verify) and keeps the Hoeffding width w = B/(π(1−π)) fixed at ≈ 7.84B. Adaptive π (Prop. 10(ii)) is a later epoch's decision once second moments are measured. |
| Randomization unit | **The board-day** (whole slate), not per-pick | Per-pick mixing would leak arm identity through slate composition and contaminate strata; the day is the natural exposure unit users experience. |
| Baseline slate | **De-vigged market-mirror board** (same games, market-implied probabilities, no candidate model input) | A genuine, publishable forecast — no user receives degraded content; the contrast is exactly "our model vs. the market," which is the product claim. |
| Reward R_t | **Flat-stake 1u per published pick at closing odds; per-pick return clipped to [−1, +1]; day reward = mean over picks mapped affinely to [0, 1]** (B = 1) | Bounded by construction (Theorem 9 requires it), user-meaningful (it is what a follower experiences), and clip-then-average keeps one longshot from dominating w. |
| Shift-test strata | **Candidate mean edge terciles, fixed now:** \|p̄ − 0.5\| in [0, 0.05) / [0.05, 0.10) / [0.10, 0.5] | Remark 13's marginal-rate trap makes stratification load-bearing; edge terciles are the coarsest partition that still separates echo from knowledge, and fixing them pre-data forecloses stratum-shopping. |
| Significance | **α = 0.01 per instrument** (value, shift, menu-audit), reported separately, never merged | These are three different claims (paper's standing rule). Ville needs no multiplicity correction across time; across instruments we report three labeled verdicts, not one composite. |
| The coin | **Committed-seed HMAC** (`publication-coin.ts`): monthly epochs; SHA-256(seed‖epoch) commitment recorded in `docs/research/cept/coin-commitments.json` BEFORE the epoch; u = HMAC-SHA256(seed, "publication-coin:v1:" + date); baseline iff u < ε; seed revealed after epoch end into the same file | Removes "trust us we randomized" from the story. Git timestamps the commitment; any third party replays the epoch. The seed's operator-knowledge does not break exogeneity — the draw depends on the calendar date alone. |
| e-process tuning | **Value:** plug-in λ (predictable, capped 1/(4B)). **Shift:** Beta(1,1) per-arm-per-stratum posteriors against the known π-mixture | Both are validity-independent choices (predictability carries the proofs); both implemented and tested in `instrumented-eprocess.ts`. |
| Rollout | **Shadow first, live at launch.** From the first epoch: draw the coin daily, compute BOTH slates, log `(date, Z, π, u, both slates, commitment ref)` to the settlement ledger — but publish the candidate board regardless, until `PUBLIC_PICKS` goes live. The day picks go public, the coin's arm decision starts binding. | Shadow mode exercises the entire pipeline, accumulates dry-run ledger rows, and costs zero product risk. Flipping publication gates remains an owner action; this ADR flips nothing. |

## 2. What is already built and tested

- `packages/prediction-engine/src/publication-coin.ts` — the committed-seed
  coin: draw, commitment, and third-party epoch verification. 9 tests,
  including frozen vectors that pin the exact HMAC mapping forever.
- `packages/prediction-engine/src/instrumented-eprocess.ts` — the value
  e-process (Theorem 9) and stratified shift e-process (Remark 13). 8 tests,
  including the executable Theorem 7 demonstration.

## 3. Integration checklist (mechanical; any agent may execute under its laws)

1. Settlement ledger rows gain: `coinEpoch`, `coinU`, `publishedCandidate`,
   `pi`, `rewardMapped`, `stratum`. (If this needs a Prisma change it is
   owner-gated; until then an append-only JSONL beside the ledger is
   acceptable for shadow rows.)
2. A daily job draws the coin (seed from `PUBLICATION_COIN_SEED`), computes
   both slates, logs the row, and — in shadow — publishes the candidate.
3. Settlement wiring feeds `updateValueEProcess` / `updateShiftEProcess`;
   the three running `log M` values land on the founder diagnostic
   (`ops:preflight` step 3) next to the Murphy decomposition.
4. Epoch turnover: on the 1st, reveal last month's seed and commit next
   month's commitment to `docs/research/cept/coin-commitments.json`.

## 4. What this ADR does NOT do

No gate or env flag is flipped; no schema is migrated; no user-visible
behavior changes until the owner takes the §5 actions. The protocol's
activation is deliberately inert without them.

## 5. Owner actions (the only two)

1. Generate the first seed and set `PUBLICATION_COIN_SEED` in the deploy env
   (`openssl rand -hex 32`), and paste its commitment for epoch `2026-09`
   into `docs/research/cept/coin-commitments.json` (format in that file).
2. Provide the production `DATABASE_URL` session so the δ-sweep (Prop. 5)
   and the shadow-coin wiring land against real settled data.
