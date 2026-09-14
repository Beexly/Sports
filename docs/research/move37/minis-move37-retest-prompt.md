# PROMPT FOR MINIS — PROJECT MOVE-37: independent re-test, twice

Paste the brief below into Minis. It is self-contained. Work it top to bottom, no shortcuts.

---

## BRIEF

You are the SECOND lab for PROJECT MOVE-37 (Galaxy Sports Edge machine-discovery program).
A first lab already ran everything once. Your job is not to trust it. Your job is to
re-test everything yourself, document what you find, then run a second pass hunting for
everything the first pass missed.

Founder's standing rules for this program: trust no claims, not even your own. Every
theory must beat a dumb baseline on held-out data. Nulls and falsifications are
preserved, never buried. Nothing is a discovery until it survives adversarial validation.
No placeholders, no fabricated numbers, no "as expected" without the log line to prove it.

### 0. Setup

1. Clone `Beexly/Sports` (or pull latest `main` if you already have it). All work happens
   in this repo. Never touch `gse-grok-build-sandbox` — it is isolated by design.
2. Python 3.11. Allowed imports for test scripts: `nflreadpy`, `scikit-learn`, `numpy`,
   `pandas` (+ `scipy` if genuinely needed). If a script needs something else, say so in
   your report instead of installing blindly.
3. nflverse data downloads are large and slow. Start data loads FIRST, in the background,
   then do document work while they run. Never fake a result because a download was slow —
   mark it NOT RUN and say why.

### 1. Required reading (in this order)

1. The `AGENTS.md` section titled PROJECT MOVE-37 (top of the file, newest first).
2. Every file under `docs/research/move37/` — the full corpus: phase reports, the
   theorist's responses, the lab's audits, the send-backs, the scripts.
3. `docs/ops/AGENT_LEDGER.md` — read its Rules section so you don't break the guard.
   (You do NOT need to add a ledger row. If you do, follow the Rules exactly.)

### 2. PASS 1 — re-execute everything yourself

Reproduce, don't review. For each item, run the code or the check yourself and record
YOUR numbers next to the claimed numbers.

a. **IRL Prelec script.** `docs/research/move37/move37_irl_prelec.py` — run it VERBATIM.
   Do not "improve" it. Record: γ̂, β̂, boundary-check verdict, train NLL, test accuracy
   vs both baselines, test log-loss. Apply the kill criteria exactly as written:
   γ̂ ∉ (0,2] or |γ̂−1| < 0.02 ⟹ the family DIES. Their pre-registered prediction was
   γ̂ ∈ [0.6, 1.2], point 0.85 — score it honestly.

b. **Prelec citation check (N-30).** Independently verify the formula
   w(p;γ) = exp(−(−ln p)^γ) against the actual Prelec (1998) source. Web search it.
   Report VERIFIED or REFUTED with the source URL and the exact formula as published.
   If the formula is wrong, the IRL repair is dead — say so in capital letters.

c. **T3 (HMM regimes), T7 (persistent homology), T9 (causal forest).** Each has a repaired
   protocol with kill criteria in the corpus. Execute each protocol as specified, in full:
   the gates, the nulls (Null A AND Null B for T7 — both, 200 reps each), the duels
   against the dumb baselines. If a protocol step is ambiguous, document the ambiguity
   and choose the more adversarial reading.

d. **Kills confirmation (W1, W2, W3, W4).** These were killed. Re-run the SINGLE
   cheapest kill test per family to confirm each kill still holds on your machine.
   Do not burn compute re-proving all four exhaustively.

e. **Unsourced numbers.** The theorist flagged 5 unsourced numbers (N-30, N-36, N-41,
   N-42, N-43). Replace each with a real computed value from the data, or mark it
   UNRESOLVED with the reason.

For every item: AGREE / DISAGREE / NOT RUN, with the evidence (script path, log file,
line number, or URL). "The first lab said so" is never evidence.

### 3. Document PASS 1 in AGENTS.md

1. Read the current top of `AGENTS.md` first.
2. PREPEND a new section: `**UPDATED <today's date> (Minis — MOVE-37 pass 1 independent re-test).**`
   Never edit, delete, or reorder another agent's section. Leave their hunks byte-identical.
3. The section must contain: what you re-ran, your numbers vs claimed numbers, what
   reproduced, what didn't, kills confirmed or overturned (with the exact failing line),
   unresolved items, and your verdict per family: CONFIRMED / KILLED / NEEDS REPAIR.
4. Commit: `git commit -m "[minis-move37] pass 1 independent re-test — <one-line verdict>"`.
   Push only if you have a working authenticated path; otherwise report the commit SHA
   and the exact push command you would run.

### 4. PASS 2 — find what pass 1 missed, then test it

Now turn adversarial on YOURSELF and on the whole program:

1. List everything pass 1 (yours AND the first lab's) could have missed: untested
   assumptions, alternative parameterizations, different baselines, data quirks,
   branches of the protocols nobody walked down.
2. Design NEW tests — not repeats of pass 1. New angles, new kill criteria stated
   BEFORE you run them. If the data suggests a new theory, write it up with a
   pre-registered prediction and a kill line, then test it.
3. Run them. New lessons go in the report even when (especially when) they are nulls.
4. Document in `AGENTS.md` again: prepend a second section,
   `**UPDATED <today's date> (Minis — MOVE-37 pass 2: missed-angles sweep).**`
   Same rules: prepend only, never touch other sections.
5. Commit and report as in step 3.

### 5. Hard rules

- Every factual claim in your report needs proof: a file path, a log line, or a URL.
  No proof = don't write it.
- A test you did not run is NOT RUN, never "presumed fine."
- Nulls are findings. Publish them in the report with the same care as positives.
- You do not declare discoveries. You declare: CONFIRMED / KILLED / NEEDS REPAIR /
  NOT RUN. The founder declares discoveries.
- If the repo's checks (typecheck, lint, ledger guard) fail because of your change,
  fix your change. Never weaken a check.
- Keep AGENTS.md sections tight: complete, but no padding. Future agents load this file.

### 6. Report back to the founder

When both passes are done, report: what you ran, what reproduced, what you killed,
what's new from pass 2, and the commit SHAs. Lead with the single most surprising
result. No option menus — findings, not questions.

--- END BRIEF ---
