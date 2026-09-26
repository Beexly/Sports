# GSE Claude Code Kit — install

Additive and reversible. Nothing here modifies existing repo files.

## 1. Hooks (rung 0 — the enforcement layer)

    cp -r .claude/hooks /path/to/Sports/.claude/
    chmod +x /path/to/Sports/.claude/hooks/*.sh

Merge `.claude/settings.json` into your existing one (do not overwrite — you may
already have keys there). The `hooks` and `permissions` blocks are the payload.

Then start a session and run `/hooks` to confirm registration.

NOTE: `.claude/` is on your own §5 never-modify list, and the sealed-path hook
enforces that list. Installing the kit is therefore a founder/operator action by
your own rules — an agent seat should not self-install it.

## 2. Verify before trusting

The Stop hook assumes these scripts exist and behave per §7.3:
  npm run typecheck      (greps for "error TS")
  npm run check:ledger
  npm run agent:eval

Run one interactive session and make a trivial edit. If the hook misfires,
remove the `Stop` block from settings.json and report which script disagreed.

Escape hatch, already built in: write `.claude/.stop-override` with a reason to
let a turn close once (consumed on use). This exists for the §12 BLOCKED
protocol — an honest partial must always be able to land.

## 3. Subagents

    cp .claude/agents/*.md /path/to/Sports/.claude/agents/

Invoke as `@agent-cold-reviewer` / `@agent-stat-adversary`, or by name.

## 4. Skills (optional, higher touch)

    cp -r .claude/skills/* /path/to/Sports/.claude/skills/

These duplicate content currently in SONNET-MAX-LEVERAGE-PROMPT.md §7.2/§10.
Once installed, that content can be deleted from the always-on prompt — but that
edit belongs behind a normal ledger claim, since the live Sonnet seat owns that
queue.

## 5. Business prompts

`business/BUSINESS-PROMPTS.md` — no install, just use. Start with #1 (the weekly
funnel question), which NORTHSTAR names as the one measurement never taken.

## Test matrix

The hooks were validated against 12 cases including false-positive checks:
  - blocks: prisma schema, .github/workflows, .env.local, push to main,
    gh pr merge, gate flips, head/tail-masked verify commands
  - allows: normal source edits, push to sonnet/*, clean typecheck,
    normal commits, a branch named "maintenance-branch"
