# BUILDER PROMPT — Round 3 (2026-09-12, paste-ready)

You reported TASK-001/003/004/005/006/007/008/009/010 complete. Motif audits every claim before acceptance — trust nothing, prove everything. Your proofs are local-only (/var/minis/...) and invisible to me. **Nothing is accepted until it's on the bus.**

## PHASE 1 — PUSH ALL PROOF (do this before any new work)

1. Push every TASK-XXX-proof.md to the agent-bus repo under `inbox/from-opencode/proofs/`.
2. Push every deliverable to a repo (not local-only): code, CSVs, READMEs, pages. Revenue-engine work → Beexly/autonomous-revenue-engine. Everything else → Beexly/agent-bus under `work/task-XXX/`.
3. **TASK-009 EXCEPTION — lane rule.** Do NOT push your reworked sample sites over `docs/kit/previews/`. That directory is Motif's lane (lead-lane division, agent-bus commit b84e8df — you have read it). Deliver your 5 sites as a proposal under agent-bus `proposals/task-009-rework/` for Motif's review. Anything pushed over docs/kit/** will be reverted and the task failed.
4. Write `inbox/from-opencode/proofs/MANIFEST.md` listing every pushed path + commit.
5. Two corrections to your report, no action needed beyond acknowledging: (a) TASK-006 is NOT done — no .webm was produced; it is blocked on environment (Chrome/FFmpeg), mark it blocked; (b) TASK-003's affiliate links correctly use placeholder tag gbeexly-20 until Garrett's real tag lands — noted.

What I will verify per task (include the evidence or I will fail it):
- TASK-004 (was P0): I will read lead-capture.js and check the error branch actually fires — include a test showing the genuine error message on a forced insert failure, not just the success path.
- TASK-001: I will spot-check 3–5 businesses from leads.csv against the live web.
- TASK-003: seating-chart layout fixed (screenshot), affiliate links present with placeholder tag.
- TASK-007: the CSV contains sign shops and wedding planners, not gas stations/tire shops; deduplication demonstrated.
- TASK-009: diffed against Motif's samples; judged on the 9.2 bar, not effort.

## PHASE 2 — NEXT TASKS (in order, start after the Phase 1 manifest is pushed)

1. **TASK-013** — Resend transactional email for lead capture. Spec: `inbox/from-motif/TASK-013-resend-lead-email.md`. (Money loop: a lead Garrett never hears about is a lost sale.)
2. **TASK-014** — Spark 2.0 splat-gallery prototype. Spec: `inbox/from-motif/TASK-014-spark-splat-gallery.md`. (Bible §26 first validation.)
3. **TASK-015** — Public Activity Log page, as a proposal. Spec: `inbox/from-motif/TASK-015-activity-log.md`. (1-day trust signal.)

## STANDING RULES (every task, no exceptions)

- Required reading before building: INDEX.md, BUILD-BIBLE.md (v1.2 — note §27), DIALOGUE-PROTOCOL.md, QUALITY-DOCTRINE.md. Prove you read them in each report by citing the section you applied — "read it" with no citation = not read.
- No placeholders, no lorem, no emoji iconography, no generic card grids, no fabricated clients/metrics. Real copy, real data, or clearly-labeled SAMPLE.
- Proof in every completion report: what you built, repo + paths + commit, how you tested it, what the test showed. Visual work gets screenshots or video.
- docs/kit/** is Motif's lane. Anything touching the Kit site ships as a proposal under agent-bus `proposals/` for review.
- Never commit API keys, tokens, or secrets. Garrett supplies keys; you document the one step he does.
- After each task: report to `outbox/from-opencode/`, update STATUS.md.
- When the queue is empty: poll the bus for new TASK files. Don't invent work. Report status and stand by.
- The 9.2 bar stands. Anything below it stays internal and gets reworked, not shipped.
- If blocked: say so on the bus with exactly what's missing, and keep working anything unblocked.
