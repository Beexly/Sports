# Pre-Mortem Pipeline — Specification

**Status:** Phase 2 build. The "What Would Change Our Mind" panel data source.
**Owner of code:** Codex.
**Owner of voice + templates:** Claude.
**Location:** `apps/web/lib/pre-mortem/`, surfaced on Game Rooms and pick detail pages.
**Decision reference:** radical #6 in master plan Part 2.C.

---

## TL;DR

When the engine publishes a pick, the pipeline auto-generates a 2-to-4-point "What Would Change Our Mind" note. The note lists the specific conditions that would have to be true for the pick to lose. The note is public, no tier gating. It surfaces on the Game Room and on every pick detail page.

This holds the model accountable in advance. We commit to our weak points before the outcome lands.

---

## What it produces

A short, structured pre-mortem attached to every published pick. Two-to-four bullets. Each bullet calls out a specific condition.

**Example output for a pick BOS -3.5 with strong rest advantage signal:**

```
What would change our mind:

- If rest advantage flips (BOS catches a same-day travel issue or NYY's
  fatigue projection updates downward), our edge on this pick evaporates.

- If schedule density on BOS misread — they may be more fatigued than the
  factor reads — the -3.5 number is too steep.

- If sharp money moves the line >2 points against us in the next 6 hours,
  the consensus we saw at publish doesn't hold.

- If the data quality flag on this game drops below grade B between publish
  and game time, we should be considered to have published prematurely.
```

The output is plain prose, not a checkbox list. Each bullet ties to a specific factor signal from the pick's `PickSignalSnapshot`.

---

## When it runs

Trigger: `Pick.publishedAt` becomes non-null.

Pipeline runs synchronously inside the pick publish path. If pre-mortem generation fails, the pick still publishes (the pre-mortem is best-effort, not blocking). A failed pre-mortem logs to `AgentRunLog` and the cockpit surfaces the missing pre-mortem for manual authoring.

Re-runs: pipeline re-runs once per pick if the underlying `PickSignalSnapshot` materially changes before settlement. A "material change" is defined as any factor score moving more than 0.15 in either direction.

---

## How it generates

The pipeline is **not** an LLM call. It is a deterministic template fill.

For each factor in the `PickSignalSnapshot`, the pipeline checks:

1. **Is this factor a top-3 contributor to the score?**
2. **Is the factor confidence above the engine's contribution threshold?**
3. **Does the factor have a known "failure mode" template?**

If yes to all three, the factor contributes a bullet to the pre-mortem. The bullet text comes from a per-factor failure-mode template that Claude owns.

This keeps pre-mortems explainable and version-controlled. No LLM creativity at the level of "what could go wrong." The engine knows what its top contributors are; the failure modes for each contributor are pre-written.

---

## Failure-mode templates

One per factor. Live at `apps/web/lib/pre-mortem/templates/<factor>.ts`. Claude writes the text; Codex runs the substitution.

### Template shape

```ts
type FailureModeTemplate = {
  factorKey: FactorKey;
  triggerCondition: (snapshot: PickSignalSnapshot) => boolean;
  generateBullet: (snapshot: PickSignalSnapshot, pick: Pick) => string;
  severityRank: number;          // 1 = highest, used to order bullets
};
```

### Per-factor templates

Each template has a body that interpolates pick-specific data into a fixed structure. Example for the `restAdvantage` factor:

```
If rest advantage flips — [home.short] catches a same-day travel issue or
[away.short]'s fatigue projection updates downward — our edge on this pick
evaporates.
```

Variables in `[brackets]` come from the pick + game data. The narrative shape is fixed by Claude.

### Factors with failure-mode templates (Phase 2)

The pipeline ships with templates for these factors:

- `consensus` — "If consensus drops below X before game time, our edge thins."
- `depth` — "If depth shifts toward the opposite side, the line we caught is no longer the line."
- `lineMovement` — "If sharp money moves the line >X points against us, we published too early."
- `volatility` — "If volatility spikes — this market normally moves <Y pts, it's now moving >Z — our read is unstable."
- `restAdvantage` — "If rest advantage flips, our edge evaporates."
- `scheduleStress` — "If schedule density on [team] misread, the line is too steep."
- `venueForm` — "If venue-form signal is weaker than the sample size suggests, we overweighted this factor."
- `crossMarket` — "If the alt-line market disagrees more sharply than at publish, we missed something the alt market saw."
- `dataQuality` — "If data quality drops below grade B between publish and game time, we should be considered to have published prematurely."

### Factors WITHOUT failure-mode templates

Some factors do not get pre-mortem templates because their failure mode is the engine itself flagging the pick (and we wouldn't publish in that case):

- `evidenceHealth` — handled as a gate, not a pre-mortem bullet.
- `bootstrapShare` — handled as a gate.

---

## Output structure

The pre-mortem persists to a new field on `Pick`:

```prisma
preMortemContent  Json?           // structured pre-mortem
preMortemAt       DateTime?       // when generated
preMortemVersion  String?         // model version that produced it
```

Codex adds the migration. The Json shape:

```ts
type PreMortemContent = {
  bullets: PreMortemBullet[];
  generatedAt: string;
  modelVersion: string;
  warning: string | null;         // populated when pipeline ran but produced fewer than 2 bullets
};

type PreMortemBullet = {
  factorKey: FactorKey;
  severityRank: number;
  text: string;
};
```

When the pipeline can produce fewer than 2 bullets (rare — implies most factors are below their contribution threshold), the `warning` field populates with "Pre-mortem coverage thin — only N factor[s] above contribution threshold." Surface treats this as a yellow state.

---

## Voice rules

The pre-mortem text reads as a research note, not a hedge.

**Pass:**

- *"If rest advantage flips, our edge evaporates."*
- *"If sharp money moves the line >2 points against us, the consensus we saw at publish doesn't hold."*

**Fail:**

- *"Of course, sports are unpredictable, so anything could happen."* (No general hedging.)
- *"We're confident in this pick, but..."* (No confidence claims.)
- *"If we're wrong, please don't blame us."* (No CYA.)

The pre-mortem is the model's commitment to its weak points. It is not legal language. It is not "consult your advisor." It is specific, factor-tied, and predictive.

---

## Settlement integration

When the pick settles, the settlement record references the pre-mortem:

- **WIN:** the settlement page notes which (if any) of the pre-mortem conditions did or didn't happen, as a learning signal for the next model version.
- **LOSS:** the settlement page identifies which (if any) pre-mortem bullet most aligns with what actually went wrong. This populates the Loss Room's "What we got wrong" section and feeds the post-mortem.

Codex builds the settlement comparison logic. Claude writes the comparison narrative templates.

---

## Surfaces

The pre-mortem renders on:

- Each pick detail page (always, all tiers).
- The Game Intelligence Room "What Would Change Our Mind" panel (always, all tiers).
- The Twitter bot post-mortem thread post 4 ("What we got wrong") references the pre-mortem.
- The Model Court refusal templates point to the pre-mortem as one of the alternatives.
- The Loss Room cross-references the pre-mortem against the actual loss reason.

---

## Compliance scanner

The pre-mortem output runs through the platform-wide compliance scanner before render. Hard refuse on:

- Any banned vocabulary.
- Any phrasing that reads as a hedge ("might," "could possibly," "we'll see").
- Any phrasing that reads as outcome certainty ("definitely will," "guaranteed to").

A failed compliance scan halts the publish path — the pick still publishes, but without the pre-mortem, and the cockpit gets a flag.

---

## Acceptance criteria (Phase 2 pipeline v0 → green)

1. Pipeline runs on every `Pick.publishedAt` transition.
2. Template files exist for all 9 factors listed above.
3. Output persists to `Pick.preMortemContent`.
4. Compliance scanner runs on output before render.
5. Re-run logic fires on material factor change.
6. Settlement integration logs the WIN/LOSS comparison.
7. Failed-pipeline path does not block pick publish.
8. Eval suite at `docs/ops/evals/pre-mortem-*` covers happy-path + thin-coverage + compliance-fail.
9. Brand-safety scan on 50 generated pre-mortems returns zero hits.

When all nine hold, the pipeline is v0-complete.

---

## Open items

- **OPEN-PM-1:** Should the pre-mortem also live in the Public Ledger (visible alongside the settled pick + its outcome)? Default: yes, this is the "did the pre-mortem call it?" question that drives the trust win. Codex confirms.
- **OPEN-PM-2:** Should the pre-mortem be re-runnable from the cockpit after the pick publishes (operator override)? Default: yes, with audit trail logging the override. Codex confirms.
- **OPEN-PM-3:** Should we add factor-failure templates for the v6 Kelly/Poisson helpers shipped 2026-05-21? Default: not in Phase 2 — those are engine math, not currently exposed as factors. Reconsider in Phase 5+.

---

*Spec authored by Claude. Codex implements pipeline. Voice rules locked. The pre-mortem is the model's commitment, not a hedge.*
