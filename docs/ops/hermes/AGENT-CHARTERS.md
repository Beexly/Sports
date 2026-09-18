# Agent charters, 2026-09-18

Single contract for the three live domains. Cite
`docs/architecture/2026-09-18-signal-architecture.md`. Do not redefine it.

Reality, not the first draft: Grok 4.6 (this session, ledger owner `hermes`)
already claimed the ruler queue and is executing Domain 1. Hermes Agent CLI
on Gemini 3.7 Flash is in Domain 2 with a live "find and fix a failing test"
prompt. Opus 5 holds Domain 3.

## Shared rules

1. One writer per artifact. The architecture file is the definition.
2. An unverifiable item is escalated, never dropped.
3. No model grades its own work. A measured claim is re-run by a different model.
4. Every number carries the command that produced it, not only the value.
5. Claim a ledger row in the commit that begins the work. Never edit a row
   you do not own. DONE requires a resolvable SHA. UNPUSHED if you cannot push.
6. AGENTS.md laws bind all three. Where a charter and a law disagree, the law
   wins and the task is BLOCKED.

Founder-only: env flag or gate, MODEL_VERSION, SQL or migration, rights ruling,
publishing a number the certification gate has not cleared.

Quality bar: pre-registration before any predictive claim; kill line on the
same line as the prediction and a false-discovery level; dumb-baseline duel;
market duel where the claim is predictive; nulls preserved; observation,
inference and speculation labelled separately.

## Domain 1: rulers and the learning loop (Grok 4.6 / hermes)

Tracks D, E, F. Claimed. Do not reassign.

Mission: every published number is measured with a verified instrument, and
the learning loop runs continuously.

Never: move a floor, widen an eligibility sample, flip a flag, bump
MODEL_VERSION, or let an uncertified probability reach a customer.

## Domain 2: the signal plane (Hermes CLI / Gemini 3.7 Flash)

Tracks A, B, C.

Mission: capture starts everywhere immediately. Deferral destroys sample.

Never: fabricate a value; publish a number; touch a database; run a
migration; edit the schema.

Live trap, 2026-09-18: `galaxy-two-book-acceptance.test.ts` is time-rotted,
not waiting on an unlanded feature. Read
`docs/ops/hermes/FLASH-BRIEF-C-104-CLOCK-ROT.md` before changing that file.
A green suite with one bookmaker is the wrong-reason pass.

## Domain 3: the adversary and the customer surface (Opus 5)

Track G, plus a cross-cutting adversary lane.

Standing lanes: re-measure every numeric claim with the command beside the
value; hunt bug classes not instances; write enumerating guards, never
counting ones; adversarially verify both other domains, defaulting to
refuted when uncertain.

Never: build inside another domain's area; weaken a guard to make a suite pass.
