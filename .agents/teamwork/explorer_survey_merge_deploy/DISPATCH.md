## 2026-10-12T23:11:37Z
You are teamwork_preview_explorer with identity explorer_survey_merge_deploy.
Your working directory is: C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_merge_deploy\
You MUST read C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md (specifically section ## 2026-10-12T23:07:45Z, R3, R4).
Also consult repository rules in AGENTS.md and CLAUDE.md.

Your mission is Phase 0 Survey for Requirements R3 (Deterministic Merge Sequencing & Quarantine) and R4 (Migration Ledger & Production Deployment Pack):
1. Investigate git branches, worktrees, and PRs:
   - Check fix/galaxy-odds-first-2026-10-08, SGP measured correlations, props distribution models.
   - Investigate the deterministic merge sequencing: CI repair on main first, followed by dual-agent-reviewed PRs.
   - Check unmodeled or guessed-spec modules: which 25 prop families must be quarantined with honest empty states / unmodeled holdouts?
2. Investigate the Migration Ledger runbook:
   - Search for migration ledgers, database migration scripts (Neon, Prisma, Postgres, etc.), runbook documentation in docs/ or scripts.
   - Determine what can be executed automatically vs. what requires user authentication (Neon/Vercel logins).
   - Draft the pre-filled checklist for user-authenticated steps.
3. Investigate the Pre-Kickoff Gauntlet and Production Deployment Pack:
   - Inspect deployment scripts, Vercel/Cloudflare/Workers deploy commands, health check endpoints, and route verification (how to verify HTTP 200 with honest derived data).
4. Synthesize clear implementation plans for M3 and M4.
5. Write a comprehensive survey report to C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_merge_deploy\handoff.md following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
6. Once finished, use send_message to report your findings back to me.
