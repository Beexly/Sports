# STANDING DIRECTIVE — NOTHING STAYS LOCAL (2026-10-03, Garrett)

**Every agent. Every lane. No exceptions.**

Nothing lives only on a local machine. If it's not on the cloud, it didn't
happen and it WILL be lost. This is the rule that prevents the mess.

## What "cloud" means per lane

- **Fleet (Windows worktree):** push `research/engine-plan-2026-10-03` on
  Beexly/Sports continuously. Never main. Never force. Every wire_k,
  every trainer checkpoint, every integrator result — pushed the moment
  it works, not at the end of the night.
- **Trainers:** mind.jsonl stays Trainer A's file, but the TRAINED
  checkpoints and row counts get reported to the bus
  (`inbox/from-grok/` or `outbox/from-grok/`) so the lead can see them.
- **Motif (VM):** everything I make lands on Beexly/agent-bus or
  Beexly/Sports the same turn. No local-only artifacts.
- **Grok / Grok Bot:** outputs go to the bus or they don't exist.

## Continuous, not final

Push work-in-progress, not just finished work. A lane that goes dark
for over an hour without a push is a lane that's losing work. The lead
(Motif) watches the branch and the bus; silence is a signal.

## What got burned before

- 208 research docs stranded on the Motif VM — landed on Sports main
  2026-10-03 (commits f27764f, 49c96ab, 010fb01, 0f8bf68, 2a892e1,
  cb4016c, 79f09e9).
- 6 code files stranded — PR #1021.
- 11 Motif briefs/prompts + 4 root specs stranded — landed on the bus
  2026-10-03 (0a826e5, d993453).
- 3 web artifacts local-only — exported to HTML, on the bus (cf5100d).

If you find more stranded local work: push it, then add it to this list.
