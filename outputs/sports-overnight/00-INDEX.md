# 00-INDEX.md — Overnight APEX Outputs

**Repo:** beexly/sports  
**Branch:** claude/magical-volta-8aaB4  
**Session start:** 2026-05-27T07:03:00Z

## Output Files

| File | Purpose |
|------|---------|
| STATE.md | Current run number, mode, before/after metrics, next priorities |
| COORDINATION.md | Active stream claims with TTLs, completed streams |
| BLOCKED_NEED_G.md | Yes/no questions requiring human decision |
| findings/findings.jsonl | All findings with evidence and disprove gates |
| metrics/metrics.jsonl | Per-run performance metrics |
| dashboard.html | Visual summary of run results |
| 06-summary.md | Human-readable run narrative |

## Code Changes (Run 1)

| File | Change |
|------|--------|
| `apps/web/package.json` | Added `@testing-library/dom@^10.4.0` to devDependencies |
| `apps/web/tsconfig.json` | Added `"ignoreDeprecations": "5.0"` |
| `apps/web/lib/auth.ts` | DEV_FAKE_ADMIN guarded by NODE_ENV !== production (2 locations) |
| `apps/web/lib/entitlements.ts` | DEV_FAKE_ADMIN guarded by NODE_ENV !== production |
| `apps/web/middleware.ts` | DEV_FAKE_ADMIN guarded by NODE_ENV !== production |
| `scripts/guardrails/security-audit.mjs` | NEW — security audit guardrail with exception registry |
| `.github/workflows/ci.yml` | Added security-audit CI job (#8) |
| `package.json` | Added `guard:security` script, security-audit in `guardrails` composite |

## Summary

Run 1 eliminated all active test/type breakage (109→110 passing test files, 96→0 TS errors),
hardened the auth bypass, and planted a security guardrail that will catch new CVEs automatically.
14 Next.js CVEs remain tracked — upgrade to v15 is the top priority for Run 2.
