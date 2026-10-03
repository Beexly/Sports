# Labeling Workflows

New local workflow:
- `apps/web/lib/fable/labeling.ts`

What exists:
- A Zod-backed local manifest schema.
- A local cost simulator for manual labeling/review.
- Explicit `provider: local` and `priced: false` flags.

What does not exist:
- No AWS Ground Truth job.
- No labeling vendor integration.
- No paid resource activation.
- No AWS account mutation.

Allowed local pattern:
1. Generate a manifest from uncertainty-ranked or rights-review candidates.
2. Review locally.
3. Store reviewed labels only after source rights and data-retention policy allow it.
4. Record cost assumptions separately from actual spend.
