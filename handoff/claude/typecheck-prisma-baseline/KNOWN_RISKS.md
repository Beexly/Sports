# Known Risks

- The working tree depends on generated Prisma client artifacts in `node_modules`; fresh environments must run `npm run db:generate` before `npm run typecheck` if dependencies are installed without postinstall generation.
- No schema drift was found in this environment, but future schema edits need a matching generation step.
- No migrations were applied or validated against a live database in this pass; this was a type baseline stabilization task only.
