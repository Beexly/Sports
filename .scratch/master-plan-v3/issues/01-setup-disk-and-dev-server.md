# 01: Matt Setup, Coding Standards, rclone Offload & localhost:3000 Dev Recovery

**What to build:** Configure Matt Pocock engineering skill metadata, Google-anchored `CODING_STANDARDS.md`, pure-domain `GLOSSARY.md`, `ADR-0011..0012`, cross-platform `rclone` cold-offload cleanup, and `localhost:3000` startup fixes (safe dev heap/cache/boot-ingest handling + `/dfs` redirect).

**Blocked by:** None (can start immediately)

**Status:** implemented-awaiting-shell-verify

- [ ] `docs/agents/{issue-tracker,domain,triage-labels}.md`, `CODING_STANDARDS.md`, updated `GLOSSARY.md`, and `CLAUDE.md` pointers exist without breaking existing docs.
- [ ] `apps/web/next.config.mjs` resolves `@` via `here`, skips persistent webpack cache when `< 10 GB` free in dev, and permanently redirects `/dfs` -> `/fantasy/dfs`.
- [ ] Cross-platform Node launcher `scripts/ops/start-web-dev.mjs` + `apps/web/instrumentation.ts` dev ingest skip allow `localhost:3000` to boot cleanly on Windows and Linux.
- [ ] `scripts/ops/rclone-r2-offload.mjs` safely audits merged worktrees and cold artifacts without deleting source/data.
