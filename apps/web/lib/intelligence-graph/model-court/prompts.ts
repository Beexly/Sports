/**
 * Model Court — Claude API prompts and refusal templates.
 *
 * Powers the conversational Q&A panel on Game Intelligence Rooms (Phase 4).
 *
 * Spec: docs/product/model-court-prompts.md
 * Decision: master plan Part 6 DEC-020 (Claude API only).
 *
 * Voice rules are locked. Do not modify the SYSTEM_PROMPT or REFUSAL_TEMPLATES
 * without an entry in docs/ops/decision-log.md.
 */

export type ModelCourtMode =
  | "ASK_THIS_GAME"
  | "ASK_THE_SLATE"
  | "EXPLAIN_FOR_MY_LENS";

export type RefusalKind =
  | "EVIDENCE_THIN"
  | "BETTING_CERTAINTY"
  | "EV_KELLY_WINRATE"
  | "COMPETITOR_COMPARE"
  | "GAME_NOT_IN_CONTEXT"
  | "PERSONAL_ADVICE";

/**
 * Canonical system prompt. Locked text — modify only via decision-log entry.
 */
export const SYSTEM_PROMPT = `You are the Model Court for Galaxy Sports Edge, a deterministic sports-betting
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
For EXPLAIN_FOR_MY_LENS, reframe through the lens provided.`;

/**
 * Refusal templates. One per RefusalKind. Each template uses placeholders that
 * the runtime fills with game-specific data.
 */
export const REFUSAL_TEMPLATES: Record<RefusalKind, string> = {
  EVIDENCE_THIN: `Evidence on this game is currently {{grade}} — {{bootstrapSharePct}}% of the
signals are still bootstrap. The model does not commit to specific reads
when evidence is below grade C.

You can:
- Check back closer to game time when more books have reported.
- Read the [pre-mortem]({{premortemLink}}) for what would change the picture.
- See similar games on the [Public Ledger]({{ledgerLink}}) for context.`,

  BETTING_CERTAINTY: `The model does not produce outcome certainty. It produces factor breakdowns
and gate decisions.

For this game:
- Edge Index: {{edgeIndex}}
- Publish threshold: {{publishStatus}}
{{gateOrPickContext}}

What would change our mind: {{premortemTextOrLink}}`,

  EV_KELLY_WINRATE: `The model does not publish EV, Kelly stake, or win-rate figures. Those
numbers depend on too many user-specific inputs to render publicly.

What we publish:
- The factor breakdown that produced our score.
- The Edge Index ({{edgeIndex}}).
- The pre-mortem (what would change our mind).
- Settled outcomes on the [Public Ledger]({{ledgerLink}}).

You decide what to do with it.`,

  COMPETITOR_COMPARE: `The model does not compare itself to other operators. Win-rate comparisons
at the resolution of "which service is better" are not verifiable, and we
don't believe the numbers we'd produce.

What we publish about our own performance:
- Every settled pick, with the signal snapshot at publish time.
- Live calibration chart at every confidence band.
- The Pass List (every game we considered and did not publish).
- The Loss Room (every loss with the autopsy attached).

That's the version of "performance" we believe.`,

  GAME_NOT_IN_CONTEXT: `That game isn't in the current context window. Open the game's room directly
at /room/{{gameId}} and the Model Court there will have its full evidence.`,

  PERSONAL_ADVICE: `The model doesn't give personal betting advice — bet sizing, bankroll
calls, hedge decisions. Those depend on inputs we don't have.

What we can show you for this game:
- The factor breakdown.
- The pre-mortem.
- The market state.

The Edge Lab at /tools has a Kelly criterion sizer for your bankroll, and
a CLV tracker for evaluating closing-line value over time.`,
};

/**
 * Per-mode prelude builders. Codex aligns the GameIntelligenceNode shape
 * during integration.
 */
export function buildAskThisGamePrelude(
  node: unknown,
  question: string,
): string {
  // Codex: replace the cast below with a typed reference during integration.
  const n = node as Record<string, unknown>;

  return `Mode: ASK_THIS_GAME
Game: ${formatField(n["matchup"])} · ${formatField(n["sport"])} · ${formatField(n["startsAt"])}
Status: ${formatField(n["status"])}

Intelligence Graph state for this game:
- Edge Index: ${formatField(n["edgeIndex"])}
- Publish threshold cleared: ${formatField(n["publishThresholdCleared"])}
- Gate decision: ${formatField(n["gateDecisionOutcome"])} (${formatField(n["gateDecisionReason"])})
- Evidence health: ${formatField(n["evidenceHealthGrade"])}, ${formatField(n["evidenceFreshnessSeconds"])}s old, ${formatField(n["bootstrapSharePct"])}% bootstrap
- Books polled: ${formatField(n["booksPolled"])}, reporting: ${formatField(n["booksReporting"])}
- Market consensus: ${formatField(n["consensus"])} across reporting books
- Line movement since open: ${formatField(n["lineMovement"])}
- Volatility vs normal range: ${formatField(n["volatility"])}
- Sharp money signal: ${formatField(n["sharpMoneySignal"])}

Picks on this game:
${formatField(n["picksSummary"])}

Pre-mortem (What Would Change Our Mind):
${formatField(n["premortemText"])}

Evidence refs:
${formatField(n["evidenceRefsList"])}

User question:
${question}`;
}

export function buildAskTheSlatePrelude(
  slate: unknown,
  question: string,
): string {
  const s = slate as Record<string, unknown>;

  return `Mode: ASK_THE_SLATE
Date: ${formatField(s["dateKey"])}
Sports active: ${formatField(s["sportsActive"])}

Slate Weather:
- Total games tracked: ${formatField(s["totalGamesTracked"])}
- Published: ${formatField(s["totalGamesPublished"])}
- Gated: ${formatField(s["totalGamesGated"])}
- Average Edge Index: ${formatField(s["averageEdgeIndex"])}
- Slate density: ${formatField(s["slateDensity"])}
- Notable conditions: ${formatField(s["notableConditions"])}

Per-game summary:
${formatField(s["perGameSummary"])}

User question:
${question}`;
}

export function buildExplainForMyLensPrelude(
  node: unknown,
  question: string,
  lens: { kind: string; details: unknown },
): string {
  const base = buildAskThisGamePrelude(node, question);

  return `Mode: EXPLAIN_FOR_MY_LENS
Lens: ${lens.kind} (${formatField(lens.details)})

${base}

Reframe your answer through the lens. If lens.kind === 'FAN', do not include
betting language. If lens.kind === 'FANTASY', focus on player-prop and
DFS-relevant context. If lens.kind === 'CREATOR', return the answer in a
format the creator can re-use (citations inline, structure tagged). If
lens.kind === 'ANALYST', expose more raw signal data.`;
}

function formatField(value: unknown): string {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}
