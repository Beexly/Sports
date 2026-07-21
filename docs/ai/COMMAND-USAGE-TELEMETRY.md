# Command-Usage Telemetry (opt-in, local-only)

> Replaces the original Phase 1 unit 4 plan ("park commands unused in the last 2 weeks") from `docs/ai/MASTER-PLAN-SONNET-2026-07-21.md`. There is no usage telemetry for the 53 existing slash commands, and every command sampled during triage turned out to be concretely tied to a real GSN surface (cockpit, picks, ledgers, audits) — not generic scaffolding. Guessing which ones are "unused" from filenames alone would be arbitrary categorization dressed up as a decision. This instruments the real signal instead.

## What this is

A `UserPromptSubmit` hook that appends one line — timestamp + command name — to `.claude/command-usage.log` whenever a slash command is invoked. Both the hook wiring (`.claude/settings.json`) and the log file are **local-only and never committed**, matching this repo's existing convention (`.gitignore`: `.claude/* / !.claude/commands/`).

## One-time setup (per machine, opt-in)

```
node scripts/claude/install-command-usage-hook.mjs
```

Safe to re-run — it's idempotent and merges into any existing `.claude/settings.json` without touching other keys.

## Files

- `scripts/claude/log-command-usage.mjs` — the hook itself. Reads the prompt from stdin, extracts a leading `/command`, appends to the log. Fails safe: any error (malformed JSON, no match, missing dir) is swallowed and it exits 0 — a broken logger must never block a prompt submission.
- `scripts/claude/install-command-usage-hook.mjs` — the one-time local installer described above.
- `.claude/command-usage.log` — the output (gitignored, never committed, per-machine).

## Revisiting the parking decision

After 2+ weeks of real local usage across the team, the log gives an evidence-based answer to "which of the 53 commands are actually reached for." At that point, run:

```
cut -f2 .claude/command-usage.log | sort | uniq -c | sort -rn
```

and use the actual distribution — not a filename guess — to decide what (if anything) moves to `docs/ai/parked/`. Until there's real data, all 53 commands stay where they are.
