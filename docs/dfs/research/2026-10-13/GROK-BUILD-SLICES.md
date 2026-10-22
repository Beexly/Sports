# Paste these ONE AT A TIME into the existing TanStack Studio Grok Build chat.

## Message 0 — lock + schema
Read src/lib/clip-*.ts and studio routes. Do not switch to Next.js. Do not touch House checkout.

Replace/extend clip-schema.ts with the domain types from the attached clip-schema.ts (full VideoJob, ledger, sceneSpec, series, characters, presets, BrandKit, VideoProvider). Persist new fields in clip-store. Do not implement B–G behavior yet. Keep 5s 720p pick-2 = 1 credit working.

## Message 1 — Slice A Money OS
Implement clip-pricing.ts, clip-ledger.ts, rewrite clip-credits.ts so every reserve/charge/refund/grant/download writes an append-only ledger row in the same transaction. Idempotent on (reason, referenceId, creditType, variationIndex). Home shows balances + last 20 ledger rows. Tests: pick-2 1 debit; pick-4 2 debits; all-fail refund; replay charge no double debit; regen amount 0; Pro download waived. grantPlan used by Plans stub. Add plan_grant helper for House $990 later. No live Stripe charges.

## Message 2 — Slice B Intelligence OS
Add clip-quality.ts + clip-optimizer.ts. Preview stores qualityReport + sceneSpec. Animate disabled if blocking. Checklist overlay binds to issues. Remix payload includes rawPrompt, optimizedPrompt, sceneSpec, directorBeats, modelId, aspect, capability.

## Message 3 — Slice C Control OS + router
Add clip-director.ts chips + parser, clip-presets.ts (8 recipes), clip-router.ts. Director Mode persists beats JSON. two_stage when provider.supportsNativeExtend is false. Live quoteCredits on Animate. Mock stamps ending beat on metadata. Pro/Ultra may pass explicit modelId; others use router.

## Message 4 — Slice D Identity OS
Brand kit split: logoScene manual vs logoSocial auto. Characters CRUD. If job.characterIds set, copy refs and prefer keyframe_i2v. Template slots get optional smartMix: logo_social | product | never. Do not add 2000 templates.

## Message 5 — Slice E Network OS
clip-series.ts format contracts. /studio/series CRUD. generateEpisode creates parent Episode + child VideoJobs per beat, one combined reserve, checkpoint nextSceneIndex, review status, Post stub only (no OAuth). Five formats only.

## Message 6 — Slice F 3D OS
clip-3d.ts + 3D/Camera drawer on Make. Persist capability, camera, exportGlb. Price via quoteCredits multipliers. Expand VideoProvider method types. Mock badges only. No nerfstudio, no training.

## Message 7 — Slice G seams
Server functions for STUDIO_TOOLS in clip-mcp.ts. Ad remake stub page or Make input. .env.example lists keys; empty = mock. Stop and demo the full Make + Series happy paths.

## After that
Only if demo is solid: editor consuming layers, vendor avatar wrap, OAuth post, org pooled credits, House Skills. Never train a DiT.
