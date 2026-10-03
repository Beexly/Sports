# MINIS OVERNIGHT QA CAMPAIGN — paste into Minis as one message

You are the builder agent (Hermes) on the overnight shift. It is ~01:00 America/Chicago. Work until the checklist below is complete or 06:00 America/Chicago, whichever comes first. Log progress to the repo every hour. Do NOT message Garrett overnight — write everything to the repo; deliver one summary in the morning.

## SETUP

1. Pull latest `Beexly/agent-bus`. Read STATUS.md, then INDEX.md in its required reading order, then QUALITY-DOCTRINE.md and DIALOGUE-PROTOCOL.md.
2. Standing rules, no exceptions: 9.2/10 quality floor (anything below stays internal and is never shown to Garrett for judgment); Unseen Studio (unseen.co) is the design bar — if our examples don't inspire awe, they don't ship; no placeholders; verify everything; proof in every report; never invent results, screenshots, or verification you didn't actually perform.

## JOB 1 — KIT PAGE QA SWEEP (highest priority)

Target: https://autonomous-revenue-engine-eight.vercel.app/kit/

- Viewports: 375px (mobile), 768px (tablet), 1440px (desktop). Screenshot each full page.
- The five sample sites in phone frames: inspect them ON the 375px viewport. A previous mobile render was bad enough to be embarrassing — verify no horizontal scroll, no overlapping text, no clipped frames, no broken images, tap targets at least 44px.
- Click/tap every link and CTA on the page. The Instagram DM-KIT CTA must resolve to a real destination. FAQ anchors must jump to the right answers. Zero dead links.
- Accessibility pass: every image has alt text, body text contrast at least 4.5:1, keyboard tab order is sane, no `✳` characters anywhere on the page, the generic workbench section doesn't look unfinished.
- Deliverable: push `inbox/from-builder/QA-KIT-2026-09-13.md` with screenshots (or exact file paths), every issue severity-rated P0/P1/P2, and for each issue either a fix commit or a precise fix spec a fix commit can be built from.

## JOB 2 — CLAIMED-COMPLETE AUDIT

TASK-001/003/004/005/006/007/008/009/010 were claimed complete with proofs that stayed phone-local. For each task, verdict is either ACCEPTED or BLOCKED:

- ACCEPTED requires: deliverables actually on the repo (not phone-local — push them or they don't count), a manifest entry of task → files → commits → tests run, and evidence the thing works.
- BLOCKED requires: the exact missing piece stated plainly.
- TASK-006 stays BLOCKED until a real `.webm` exists — no video, no accept. TASK-009 work lives under `proposals/task-009-rework/`, never under `docs/kit/`.
- Deliverable: push `inbox/from-builder/TASK-AUDIT-2026-09-13.md` with the full manifest table and per-task verdict.

## JOB 3 — SIGNPREVIEW QA

Target: `/signpreview.html` on the same Vercel deploy.

- Same three-viewport screenshot sweep.
- Run the mockup generator with a deliberately tricky business name (example: "Schwarzenegger's Schnitzel Haus") and verify the name renders spelled 100% correctly — the deterministic client-side typography composite must hold; any AI-mangled lettering is a P0.
- Verify the $150 design-package upsell section and the Vow & Post wedding tease render cleanly at all viewports. The words "AI wedding signs" must not appear anywhere — that phrasing is banned.
- Deliverable: append results to the QA report file from Job 1.

## JOB 4 — ROUND-3 QUEUE

Check `inbox/from-motif/BUILDER-PROMPT-2026-09-12-round-3.md`. If TASK-013 (Resend lead email), TASK-014 (Spark splat gallery), or TASK-015 (Activity Log proposal) is incomplete, advance whichever is next in that prompt's Phase 2 order, following its spec exactly.

## HARD RULES

- No spending money. No public posts or DMs. No creating accounts. Never touch `gse-grok-build-sandbox`.
- "Trust no claims, even your own": report only what you actually verified. If your tooling cannot take real screenshots, say so explicitly and do DOM/text-level checks instead — a stated limitation beats a faked proof.
- Don't ask questions; figure it out. If you hit a true hard block that only Garrett himself can clear (a sign-in, a purchase, his phone's settings), log it as a MORNING HARD-BLOCK and move to the next job — never stall the night on it.
- Push every report, screenshot, and proof to the repo before 06:00. Morning summary message: what you verified, what you fixed (with commits), what's blocked — with file links. Nothing else.

Go.
