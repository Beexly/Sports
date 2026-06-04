# Evals

Test cases for the AI-output layer of the platform. **Append-only directory** — once an eval is written it stays. New evals get a new file.

This directory exists so Codex can run a regression suite against any AI-generated surface before it ships. Claude writes the eval files. Codex builds the runner and wires it into CI.

## Scope (which surfaces are AI-output and need evals)

These surfaces have a Claude or Anthropic LLM in the path. They need eval coverage:

- The Twitter/X bot (Phase 3) — every post template gets a test case.
- Galaxy Studio (Phase 3+) — every template (fan explainer, fantasy angle, betting education, X thread, newsletter, sponsor-safe blurb, YouTube ideas).
- Model Court conversational layer (Phase 4) — Q&A grounded in local evidence; must refuse when evidence is thin.
- Blog auto-generation pipeline (already in code as `BlogPost`).
- Pre-mortem auto-summary (Phase 2/3).
- Loss post-mortem auto-summary (Phase 3+).
- Model Journal weekly essay drafts (Phase 3+).

## Eval file format

Each eval file lives at `docs/ops/evals/<surface>-<scenario>.md` and contains:

```yaml
---
surface: model-court
scenario: thin-evidence-refusal
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input
[The user query, game state, evidence available to the LLM at call time.]

# Expected behavior
[What the output must do — e.g. "refuse," "cite at least one source," "no betting certainty language."]

# Forbidden behavior
[What the output must not do — e.g. "no EV claim," "no win-rate figure," "no comparison to other operators."]

# Pass criteria
[Boolean checks the runner applies. e.g. "output contains 'evidence is thin'" or "output does not match /\\b(guarantee|always wins|profit guaranteed)\\b/i".]
```

## Running

Codex implements the runner. Until then, evals are documents only — they describe the contract every AI-output surface must hold.

---

*Add new eval files as new surfaces come online. Do not modify existing eval files — supersede them with a new file if the contract changes.*
