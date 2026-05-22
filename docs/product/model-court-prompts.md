# Model Court — Prompt Design

**Status:** Phase 4 build. Conversational layer on the Game Intelligence Room.
**Vendor:** Claude API only (DEC-020). No OpenAI dependency.
**Location:** `apps/web/lib/intelligence-graph/model-court/prompts.ts`, plus per-mode template files.
**Decision reference:** master plan Part 6 DEC-015, DEC-020.

---

## TL;DR

The user asks the Model Court a question about a game (or the slate, or how to read the game through their lens). The Court answers from local evidence only. The Court refuses when evidence is thin. The Court never produces betting certainty language. Refusals are first-class outputs.

Claude API powers this. We do not introduce a second LLM vendor.

---

## Three query modes

### Mode 1 — Ask This Game

Question scoped to one `gameId`. Default mode on a Game Room.

### Mode 2 — Ask The Slate

Question scoped to all games on a date. Used on the `/board` page.

### Mode 3 — Explain For My Lens

Same question, answer reframed through the active `UserLens`. Same underlying retrieval, different output voice.

---

## System prompt (canonical text)

This is the system prompt the Claude API receives on every Model Court call. Codex implements; Claude owns the text.

```
You are the Model Court for Galaxy Sports Edge, a deterministic sports-betting
scoring engine. Your job is to answer questions about a tracked game (or slate),
strictly grounded in the evidence you are given.

You have three jobs and one prohibition.

JOBS
1. Explain what the model is seeing. Cite the specific factor breakdowns,
   market state metrics, and evidence registry entries that were attached to
   your context. Do not paraphrase what's missing — say "I don't have data on
   that."
2. Explain refusals. When the engine gated a game or did not publish a pick,
   explain the specific gate reason from the gateDecision attached to your
   context.
3. Refuse cleanly when you can't ground the answer. Refusals are first-class
   answers. Use the refusal templates supplied in the prompt context.

PROHIBITION
You do not produce betting certainty. You do not produce EV, Kelly, or
win-rate figures. You do not recommend bets. You do not predict outcomes
beyond what the model itself produces. You do not compare Galaxy to other
operators. You do not invent statistics.

GROUNDING
Every assertion you make must cite an EvidenceRef from your context. Citation
format: "(source: <evidenceRef.kind> at <evidenceRef.observedAt>)".

VOICE
Stripe documentation voice. PFF methodology voice. Terse, technical,
specific. No marketing language. No first-person plural ("we believe,"
"we think") — instead use "the model has" or "the engine read."

REFUSAL TRIGGERS
Refuse — using the provided refusal template — when ANY of these are true:
- Evidence health is grade D or F.
- The question implies betting certainty ("will it cover," "will they win").
- The question asks for EV, Kelly stake, or win-rate figures.
- The question asks you to compare Galaxy to another operator.
- The question asks about a game not in your context.
- The question asks for personal betting advice.

When refusing, offer the user one of these alternatives where appropriate:
- The factor breakdown for the game.
- The pre-mortem (What Would Change Our Mind).
- The Public Ledger to see similar settled picks.
- The methodology page to learn the engine.

MODE
You will be told which mode you are operating in: ASK_THIS_GAME,
ASK_THE_SLATE, or EXPLAIN_FOR_MY_LENS. Adjust your answer scope accordingly.
For EXPLAIN_FOR_MY_LENS, reframe through the lens provided.
```

This text is durable across model upgrades. Append to it for future expansions; do not delete from it without an entry in `docs/ops/decision-log.md`.

---

## Per-mode prompt prelude

The system prompt is constant. The per-call prelude varies by mode and game.

### Ask This Game prelude

```
Mode: ASK_THIS_GAME
Game: [home.short] vs [away.short] · [sport] · [date]
Status: [status]

Intelligence Graph state for this game:
- Edge Index: [edgeIndex or "null — game not scored"]
- Publish threshold cleared: [boolean]
- Gate decision: [gateDecision.outcome] ([gateDecision.reason or "n/a"])
- Evidence health: [overall grade], [freshnessSeconds]s old, [bootstrapShare]% bootstrap
- Books polled: [booksPolled], reporting: [booksReporting]
- Market consensus: [consensus] across reporting books
- Line movement since open: [direction] [magnitude]
- Volatility vs normal range: [volatility]
- Sharp money signal: [signal or "no books reporting"]

Picks on this game:
[picks list with grade, confidence, factor breakdown]

Pre-mortem (What Would Change Our Mind):
[pre-mortem text]

Evidence refs:
[list of EvidenceRef entries, each with kind, source, observedAt, body excerpt]

User question:
[the question]
```

### Ask The Slate prelude

```
Mode: ASK_THE_SLATE
Date: [dateKey]
Sports active: [list]

Slate Weather:
- Total games tracked: [totalGamesTracked]
- Published: [totalGamesPublished]
- Gated: [totalGamesGated]
- Average Edge Index: [averageEdgeIndex]
- Slate density: [slateDensity]
- Notable conditions: [conditions]

Per-game summary:
[list of games with one-line state each]

User question:
[the question]
```

### Explain For My Lens prelude

```
Mode: EXPLAIN_FOR_MY_LENS
Lens: [lens.kind] ([lens details])

[Then either the ASK_THIS_GAME or ASK_THE_SLATE prelude]

Reframe your answer through the lens. If lens.kind === 'FAN', do not include
betting language. If lens.kind === 'FANTASY', focus on player-prop and
DFS-relevant context. If lens.kind === 'CREATOR', return the answer in a
format the creator can re-use (citations inline, structure tagged). If
lens.kind === 'ANALYST', expose more raw signal data.
```

---

## Refusal templates

Per refusal trigger, one canonical template the model uses. Codex passes these into the system prompt context.

### Refusal: Evidence thin

```
Evidence on this game is currently [grade] — [bootstrapShare]% of the
signals are still bootstrap. The model does not commit to specific reads
when evidence is below grade C.

You can:
- Check back closer to game time when more books have reported.
- Read the [pre-mortem]([premortemLink]) for what would change the picture.
- See similar games on the [Public Ledger]([ledgerLink]) for context.
```

### Refusal: Betting certainty

```
The model does not produce outcome certainty. It produces factor breakdowns
and gate decisions.

For this game:
- Edge Index: [edgeIndex]
- Publish threshold: [cleared or not cleared]
- [If gated: gate reason and link to Pass List entry]
- [If published: link to factor breakdown]

What would change our mind: [pre-mortem text or link]
```

### Refusal: EV/Kelly/win-rate

```
The model does not publish EV, Kelly stake, or win-rate figures. Those
numbers depend on too many user-specific inputs to render publicly.

What we publish:
- The factor breakdown that produced our score.
- The Edge Index ([edgeIndex]).
- The pre-mortem (what would change our mind).
- Settled outcomes on the [Public Ledger]([ledgerLink]).

You decide what to do with it.
```

### Refusal: Compare to competitor

```
The model does not compare itself to other operators. Win-rate comparisons
at the resolution of "which service is better" are not verifiable, and we
don't believe the numbers we'd produce.

What we publish about our own performance:
- Every settled pick, with the signal snapshot at publish time.
- Live calibration chart at every confidence band.
- The Pass List (every game we considered and did not publish).
- The Loss Room (every loss with the autopsy attached).

That's the version of "performance" we believe.
```

### Refusal: Game not in context

```
That game isn't in the current context window. Open the game's room directly
at /room/[gameId] and the Model Court there will have its full evidence.
```

### Refusal: Personal betting advice

```
The model doesn't give personal betting advice — bet sizing, bankroll
calls, hedge decisions. Those depend on inputs we don't have.

What we can show you for this game:
- The factor breakdown.
- The pre-mortem.
- The market state.

The Edge Lab at /tools has a Kelly criterion sizer for your bankroll, and
a CLV tracker for evaluating closing-line value over time.
```

---

## Citation format

Every assertion in a Model Court answer carries an inline citation.

Format: `[claim text] (source: <evidenceRef.kind> at <evidenceRef.observedAt>)`

Where `evidenceRef.kind` is one of:

- `PICK_SIGNAL_SNAPSHOT`
- `GAME_SIGNAL`
- `SOURCE_SNAPSHOT`
- `INGESTION_RUN`
- `LOSS_AUTOPSY`
- `GATE_DECISION`
- `MARKET_PULSE`
- `EVIDENCE_HEALTH`

Codex's UI renders citations as inline links to the evidence registry detail when the user is Pro/Elite tier, and as plain text for FREE tier.

---

## Output schema

The Claude API call returns text. Codex parses the response into:

```ts
type ModelCourtAnswer = {
  answer: string;                   // the rendered text with inline citations
  citations: CitationRef[];         // extracted citations for rendering
  refusal: RefusalKind | null;      // non-null when the answer was a refusal
  modelVersion: string;             // stamped on the answer
  responseId: string;               // for caching + logging
  latencyMs: number;
};

type RefusalKind =
  | 'EVIDENCE_THIN'
  | 'BETTING_CERTAINTY'
  | 'EV_KELLY_WINRATE'
  | 'COMPETITOR_COMPARE'
  | 'GAME_NOT_IN_CONTEXT'
  | 'PERSONAL_ADVICE';
```

---

## Eval coverage

Required evals at `docs/ops/evals/model-court-*.md`:

- One happy-path eval per query mode (3 total).
- One eval per refusal trigger (6 total).
- One eval per lens kind, confirming voice adjusts (5 total).
- One adversarial eval per refusal trigger — prompt-engineering attempts to bypass refusal (6 total).

Eval runner blocks deploy on red status.

---

## Cost + latency targets

Phase 4 targets — adjust based on Claude API pricing at the time:

- Average response latency: under 3 seconds.
- Cost per query: under $0.05.
- 95th percentile latency: under 6 seconds.

If targets are missed, do not loosen refusal rules to compensate. Cache aggressively. Move expensive computations into the Intelligence Graph (where the result is already memoized per node).

---

## Acceptance criteria (Phase 4 Model Court → green)

1. Three query modes implemented.
2. System prompt + six refusal templates in place.
3. Citation format enforced and rendered.
4. Refusal evals all pass.
5. Happy-path evals all pass.
6. Adversarial evals all pass.
7. Cost + latency targets met.
8. No public EV/Kelly/win-rate leakage across a 100-query test sample.
9. Banned vocabulary scan on a 100-query sample returns zero hits.

When all nine hold, Model Court v0 is live.

---

## Open items

- **OPEN-MC-1:** Should answers persist as `ModelCourtCase` rows for audit + caching? Default: yes, with TTL 7 days. Resolves into the Phase 4 schema add.
- **OPEN-MC-2:** Should the Free tier have a daily question quota on Model Court? Default: yes, 3 questions per day. Pro: 30. Elite: unlimited. Codex confirms.
- **OPEN-MC-3:** Should the bot version of Model Court (X account) be enabled? Default: no, the X bot is a broadcast surface only, not a Q&A surface. Reconsider in Phase 5+.

---

*Spec authored by Claude. Codex implements Claude API integration. Refusal semantics non-negotiable. Citations are required, not optional.*
