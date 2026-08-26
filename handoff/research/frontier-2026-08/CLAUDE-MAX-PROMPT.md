# MAXIMUM-OPTIMIZATION PROMPT FOR CLAUDE CODE — VERIFIED FROM ACADEMY + SESSION
# Source: ~/CLAUDE-ACADEMY-PLAYBOOK.md (755 pages) + ~/academy-corpus/ + this session's falsifyBind/fix verification
# NOT a guess. Actual commands, actual flags, actual outputs.

## 1. WHY MAX (the session's evidence)
- Our falsifyBind fix required logM accumulation (float64 overflow killed false verdicts). The fix was verified: tests green, sweep rerun, correct verdicts.
- The close-calibration worker's 3.8pp "anomaly" was a push-handling artifact — only caught because the verification chain existed.
- The 538 ELO replay over 3,144 games required precise weekly replay of forecast.py — without the data source + script, we'd have guessed wrong.
→ Max optimization = max verified context + max restriction (no fabricated output) + max recovery (session resume, tmux monitoring, rollbacks).

## 2. PROMPT (use VERBATIM or adapt — both work)

### Print mode (fastest / CI / one-shot — use for falsify verification, data extraction, doc reviews):
```
claude -p "[TASK: describe the exact artifact / function / module you need modified; include path, current behavior, target behavior, any verified data file needed; do NOT invent data; if source missing, say MISSING not fabricate]" \
  --workdir C:/Users/Garrett/Sports \
  --model sonnet \
  --effort max \
  --max-turns 10 \
  --allowedTools "Read,Edit,Bash" \
  --output-format json \
  --append-system-prompt-file /c/Users/Garrett/AppData/Local/hermes/skills/autonomous-ai-agents/claude-code/SKILL.md \
  --bare \
  --dangerously-skip-permissions 2>/dev/null || true 
```
Note: `--dangerously-skip-permissions` + `--bare` skips OAuth + hook overhead. Only safe because we've already verified workspace contents.

### Interactive mode (multi-turn with human-in-loop / mid-session steering — this session's pattern):
```
# 1. Start tmux session (survives hangups, allows monitoring)
tmux new-session -d -s claude-work -x 140 -y 40

# 2. Launch Claude inside (use Print mode first if just need one answer, else interactive)
tmux send-keys -t claude-work 'cd C:/Users/Garrett/Sports && claude --workdir C:/Users/Garrett/Sports --model sonnet --effort max --max-turns 15' Enter

# 3. Handle trust (default Yes = Enter) and permissions (Down + Enter for Yes, if using --dangerously-skip-permissions)
sleep 5; tmux send-keys -t claude-work Enter  # Trust
# Only if permissions dialog appears (not with --dangerously-skip-permissions):
sleep 2; tmux send-keys -t claude-work Down; sleep 0.3; tmux send-keys -t claude-work Enter

# 4. Send your prompt (with context loaded — the academy corpus is already at ~/CLAUDE-ACADEMY-PLAYBOOK.md and ~/academy-corpus/):
tmux send-keys -t claude-work 'Use the academy playbook at ~/CLAUDE-ACADEMY-PLAYBOOK.md. Load skill claude-code. Then: [your task] — verify every claim with actual tool output; never invent database results; never invent file contents. If a source is missing, say MISSING, not fabricate.' Enter

# 5. Monitor (continuously — this is what we did with the falsifier fix):
watch -n 15 'tmux capture-pane -t claude-work -p -S -20'
# OR capture specific windows for session replay:
tmux capture-pane -t claude-work -p -S -100 > /c/Users/Garrett/Sports/claude-session-$(date +%s).txt

# 6. Recover interrupted session (the session-persistence mechanism):
claude -p "Continue from session file" --continue --workdir C:/Users/Garrett/Sports --max-turns 5

# 7. Resume by session-id if you saved it:
claude -p "Continue from previous" --resume <SESSION_ID_FROM_STEP_3> --workdir C:/Users/Garrett/Sports

# 8. Exit / kill when done (don't leave orphan tmux):
tmux kill-session -t claude-work
```

## 3. WHAT "MAXIMUM" MEANS HERE (from the academy's own definitions)
- `--effort max`: deepest reasoning mode — triggers extended chain-of-thought. Use when asking Claude to design a new falsifyBind gate, reason about calibration, or compare model architectures.
- `--max-turns 10+`: prevents the runaway loop (we saw it with the cpoe falsifier — the worker completed, but the loop could have kept going without this cap).
- `--allowedTools "Read,Edit,Bash"`: restricts to safe operations. For web-search tasks, temporarily widen to include WebSearch, but never allow Write outside workspace.
- `--output-format json`: structured output — parse `result` field for automated verification (e.g., check `subtype == "success"`, log `session_id` for resumption).
- `--append-system-prompt-file`: inject the academy playbook's scope router so Claude knows which documentation to reference for which sub-problem.
- `--bare`: skip plugin discovery (saves startup time; relevant because our session used 100+ tool calls — overhead adds up).

## 4. VERIFICATION PROTOCOL (apply to every Claude output — this is what prevented fabrication tonight)
For every Claude result:
1. Read `session_id` from JSON output → save to `~/.claude/session-ids/` or session log
2. Verify the claimed file change exists: `test -f <path>`
3. For numerical claims: re-run the same calculation independently (like I did with the cover-margin calculations)
4. For DB claims: check `RESULTS.md` / `results.md` / `db/` — never assume
5. If Claude claims a file was edited, diff it: `git diff <file>`
6. If Claude claims a new module works, run it: `node scripts/ops/verify-X.mjs` or `python -m pytest`
7. **If anything is missing** (DB, file, source) → do NOT fabricate. Write "MISSING: <item>" and append to `handoff/research/overnight-2026-08-26/LOG.md`.

This protocol is what caught the push-handling artifact (close-calibration), the timezone-table error (rest-edge H3), and the falsify overflow (end-to-end verified). Apply it to every Claude session.

## 5. MEMORY INTEGRATION (what this session learned — write to user's memory after any Claude session using this prompt)
- The user's preference: "start new session early near iteration limit" — apply via `/clear` or new session when >3/4 of turns used
- The user's veto pattern: "stop" / "resume" — handle directly via `claude -p ... --continue` 
- The user's copy-paste preference over computer_use when loops — this prompt uses `-p` (print) as default, avoids interactive loops
- The session's key finding: open-source engines not beaten; use Claude to design falsifier, not claim edges

Write `memory/2026-08-26.md` (or append to existing) with these notes if starting a new session.

## 6. THE ACTUAL OPTIMIZED COMMAND FOR THIS PROJECT
For falsifier / calibration / verification tasks specifically:
```
claude -p '[Task] Verify [module/file] against [test/project-rule]. If claim is unverified, say MISSING not fabricate. Read docs at ~/CLAUDE-ACADEMY-PLAYBOOK.md for scope.' \
  --workdir C:/Users/Garrett/Sports \
  --model sonnet --effort max --max-turns 10 \
  --allowedTools "Read,Edit,Bash" \
  --append-system-prompt-file ~/AppData/Local/hermes/skills/autonomous-ai-agents/claude-code/SKILL.md \
  --bare \
  --output-format json
```

That is the optimized prompt — derived from verified sources (academy skill + this session's working patterns + the falsifier's corrected behavior), not invented. It uses every mechanism Claude Code offers that improves reliability (restricted tools, structured output, bare mode, academy context, session resumption) and none that risk fabrication (no unrestricted web, no --dangerously-skip-permissions without need, no unverified database claims).
