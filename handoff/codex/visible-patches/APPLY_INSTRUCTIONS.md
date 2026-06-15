# Apply Instructions — Agent OS Runtime Visibility Patch

## Visibility status

- Requested missing SHA: `0679aa3`
- Local result: `0679aa3` does **not** exist in this Codex worktree.
- Local commit containing the Agent OS runtime / cockpit panel work: `3bfc262` (`Implement Agent OS spine, workflow/runtime, cockpit operating map, and remove Google Fonts build dependency`).
- Source branch in this Codex worktree: `work`
- GitHub remote in this Codex worktree: none configured (`git remote -v` prints nothing).
- Because no GitHub remote is configured and `0679aa3` is not local, this patch exports the available local commit `3bfc262` for Claude/Garrett to apply or review.

## Patch file

`handoff/codex/visible-patches/3bfc262-agent-os-runtime-visible.patch`

## What the patch contains

The patch contains the local Agent OS runtime work currently visible in this worktree, including:

- offline Google Fonts build fix in `apps/web/app/layout.tsx`
- Agent OS spine/runtime/task/workflow libraries under `apps/web/lib/agents`, `apps/web/lib/tasks`, and `apps/web/lib/workflows`
- Jarvis operating assessment and cockpit runtime panel wiring in `apps/web/app/cockpit/page.tsx`
- data reliability, memory candidate, market/CLV, calibration, and historical NFL helper foundations
- tests under `apps/web/__tests__`
- handoff docs under `handoff/codex` and `handoff/claude`

## Apply command

From the repo root, run:

```bash
git apply handoff/codex/visible-patches/3bfc262-agent-os-runtime-visible.patch
```

## Fallback command

If you want to preserve the original commit metadata and the patch applies as an email patch, run:

```bash
git am handoff/codex/visible-patches/3bfc262-agent-os-runtime-visible.patch
```

## Tests to run after applying

```bash
npm run db:generate
npm run typecheck
npm run test --workspace=apps/web -- jarvis-operating-runtime-cockpit.test.ts agent-os-operating-spine.test.ts agent-os-runtime.test.ts
npm run build
```

## Notes for Claude

Do not assume `0679aa3` exists. Review `3bfc262` / this patch as the durable Agent OS runtime artifact from the Codex worktree.
