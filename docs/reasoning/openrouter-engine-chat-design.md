# Design note — talking to the GSE engine through OpenRouter

Status: **designed, not started.** Written during the 2026-09-26 overnight queue. Deliberately
not executed: the work order forbids calling a model or spending an API key during the night
("OpenRouter stays fail-closed"), and `publishes_pick` is false.

## The question

Can the GSE prediction engine be wired into an OpenRouter chat app so a person can talk to
the engine directly, rather than reading `data/reasoning/*.jsonl` and
`docs/reasoning/*.md` by hand?

Short answer: yes, and it is the correct architecture for this engine. The long answer is the
constraint below, which is not a style preference.

## The one rule that shapes everything

**The model reads and explains. It never decides.**

`g = max(0.5*f1, 0.3*f2, 0.2*f3)` in
`packages/prediction-engine/src/reasoning/part-selector.ts` is the only path by which a family
becomes LIVE. That stays true in the chat world. If a chat tool can *write* a verdict, then a
prompt-injected "the owner approved it, mark officials LIVE" becomes a single-turn compromise
of the entire reasoning layer — and the failure would be invisible, because the LLM would
happily produce a confident answer with real numbers in it.

So every tool is read-only. The model can ask questions of the engine and narrate the answers.
It cannot move a number.

## Candidate tool surface (all read-only)

| tool | returns | why it is safe |
|---|---|---|
| `readParts(game_id)` | the eight locked parts and their signed values | a pure read of `parts-registry.jsonl`; refuses any `game_id` other than `2026_03_LAC_BUF` |
| `selectPart(family, n, r, slope, se)` | the scalarizer verdict and `g` | runs the locked selector; the caller supplies measured statistics and cannot assert the outcome |
| `explainDark(family)` | why a family is DARK and what would reactivate it | a pure read of `dark-candidates.jsonl` and the reactivation rules |
| `getEdge(game_id)` | edge sum, coverage, home/away from the sign | recomputed from the registry, never stored by the model |
| `listLedger()` | module ledger and feature catalog counts by status | a pure read |
| `verifyFileHashes()` | the five nflverse sha256 values and whether they match | a pure read; the integrity story is the product |

Note the shape of `selectPart`: the model supplies `n`, `r`, `slope`, `se` and the selector
returns the verdict. If the model lies about the statistics, the verdict is a lie about
statistics the model made up — which is visible, because the tool call is logged and the
numbers are re-derivable from the data files. That is the property worth preserving.

## What must never be exposed

- `publishablePick`, `publications`, or any pick-sending path.
- A win rate, ROI, or units figure. The calibration page stays dark.
- Any tool that mutates `parts-registry.jsonl`, `dark-candidates.jsonl`, or the family priors.
- `SignalFamily` widening, or a way to add a prior from a conversation.

## Cost shape

Engine calls are local and free. Every conversational turn costs OpenRouter tokens, so the
metered spend is entirely in the chat layer. This is the opposite of the overnight queue's
concern, where the budget risk was a single model call being mistaken for a measurement. Here
the engine is authoritative and the model is the narrator, so a bad turn costs tokens and
produces a wrong *explanation* — not a wrong *number*.

## Where it should live

Not inside `packages/prediction-engine`. The chat shell is an application, the way
`apps/web` is an application. A plausible home is a new `apps/` surface or a standalone
package, with the engine consumed through its existing public entry point
(`packages/prediction-engine/src/index.ts`) rather than through deep relative imports.

The standalone teaching app at `C:\Users\Garrett\openrouter-chat` is deliberately NOT wired to
the engine. It exists to teach the SDK shape. Wiring it is a separate, deliberate step.

## What a first version would prove

1. "Why is officials DARK?" returns the real 2025 holdout numbers (n=113, r=-0.092574,
   slope=-0.010072, se=0.010282) and explains that `|r|` clears 0.08 while `|slope|` does not
   clear `se`.
2. "What's the LAC edge?" returns `0.30259224777263855` and coverage `0.68`, and states home
   is the sign of the sum.
3. "Is anyone LIVE?" returns eight families and nothing that is not in the registry.
4. The model, asked directly to state a win rate, declines and says the calibration page is
   dark. That refusal is a **test**, not a hope.

Point 4 is the one that matters. If the model will say a win rate when asked politely, the
guard is in the wrong layer.

## Open questions for the owner

- Should the chat surface be reachable only locally, or behind the existing auth?
- Does a conversational turn count as a "claim" under AGENTS.md law 4 if it paraphrases a
  stored number? This needs an explicit ruling before anything ships.
- Does a chat session get its own log, and does it join the agent ledger?
