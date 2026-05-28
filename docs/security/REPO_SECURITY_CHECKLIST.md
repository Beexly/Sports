# Repository Security Checklist — Galaxy Sports Edge

Investor-grade repo hygiene. Each item has a current status and a
target state. The gap between current and target is the security
roadmap.

Anchor: NIST SSDF practices (PO — prepare organization, PS — protect
software, PW — produce well-secured software, RV — respond to
vulnerabilities).

## Legend

- ✅ in place today
- ⚠️ partial or in progress
- ❌ not done

---

## Access control

| Control | Status | Notes |
|---|---|---|
| Private repository | ✅ | Repo is `beexly/sports`, private |
| 2FA required for all collaborators | ⚠️ | Required by GitHub org policy; verify org setting |
| SSO for repo access | ❌ | Requires GitHub Enterprise; future |
| Least-privilege collaborator roles | ✅ | Single collaborator (founder); review when adding |
| Documented access list | ❌ | Add `docs/security/ACCESS_LIST.md` |
| Quarterly access review | ❌ | Establish cadence |
| Revoke-on-departure procedure | ⚠️ | Documented in `CONTRACTOR_ACCESS_RULES.md` |

## Branch and merge controls

| Control | Status | Notes |
|---|---|---|
| Branch protection on `main` | ❌ | Recommended; PR review required |
| Require PR before merge to `main` | ❌ | Currently working on dev branch `claude/determined-keller-dUcdG` |
| Require status checks (lint/typecheck/test/build) before merge | ❌ | CI exists; promote to required |
| Require signed commits | ❌ | Future |
| Linear history on `main` | ❌ | Recommended |
| No force push to `main` | ⚠️ | Policy not enforced via branch protection |
| CODEOWNERS file | ❌ | Add when contributors grow |

## Secrets management

| Control | Status | Notes |
|---|---|---|
| No secrets in repo | ✅ | `.env*` in `.gitignore`; verify periodically |
| GitHub secret scanning enabled | ⚠️ | Verify in repo settings |
| Push protection enabled | ⚠️ | Verify in repo settings |
| Secrets manager (1Password / Doppler / Vault) | ❌ | Future when team grows |
| Per-environment secrets (dev / staging / prod) | ⚠️ | Stub mode in dev; production secrets not yet provisioned |
| Rotation procedure documented | ❌ | Add when first secret provisioned |
| Documented `.env.example` with safe placeholders | ⚠️ | Verify presence and currency |
| No production keys in local development | ✅ | Stub mode active |

## Dependency hygiene

| Control | Status | Notes |
|---|---|---|
| Dependabot security alerts | ⚠️ | Verify enabled |
| Dependabot version updates | ⚠️ | Verify enabled |
| `npm audit` on CI | ❌ | Add |
| Lockfile committed (`package-lock.json`) | ✅ | Confirmed |
| No unpinned dependencies | ✅ | Lockfile pins all |
| Periodic third-party-license review | ❌ | Add quarterly |
| SBOM generation | ❌ | Future for enterprise sales |

## Code scanning

| Control | Status | Notes |
|---|---|---|
| GitHub code scanning (CodeQL) | ❌ | Enable |
| Static analysis (ESLint) | ✅ | `npm run lint` |
| TypeScript strict mode | ✅ | `tsc --noEmit` clean |
| `no-explicit-any` enforced | ✅ | Strict mode |
| Custom guardrails — trust gate | ✅ | `scripts/guardrails/trust-gate.mjs` — 0 violations |
| Custom guardrails — no-fake-percentages | ✅ | Vitest suite |
| Pre-commit hooks (lint, typecheck) | ❌ | Add via husky |

## CI/CD security

| Control | Status | Notes |
|---|---|---|
| CI runs on every push and PR | ⚠️ | Verify GitHub Actions config |
| Required checks: lint, typecheck, test, build | ✅ | Pipeline exists |
| Production deploy gated by branch | ❌ | No production deploy configured yet |
| Manual approval for production | ❌ | Establish before production |
| Build artifact provenance | ❌ | SLSA L1 attestation; future |
| No secrets in CI logs | ⚠️ | Standard masking; verify |
| Per-environment deploy tokens | ❌ | Future |

## Environment separation

| Control | Status | Notes |
|---|---|---|
| Distinct dev / staging / prod environments | ⚠️ | Currently dev only |
| Per-environment databases | ⚠️ | Stub mode in dev |
| No cross-environment data leakage | ✅ | No prod data yet |
| Environment-specific feature flags | ⚠️ | Bootstrap mode flag exists |

## Authentication and authorization

| Control | Status | Notes |
|---|---|---|
| NextAuth.js v5 | ✅ | Implemented |
| OAuth (Google) | ✅ | Configured |
| Server-side session validation | ✅ | Auth checked in server components |
| Role-based access (ADMIN vs user) | ✅ | Cockpit gated on `session.user.role !== "ADMIN"` |
| Session expiry policy | ⚠️ | Verify NextAuth config |
| Rate limiting on auth endpoints | ❌ | Add before launch |
| Brute-force protection | ❌ | Add |

## Data protection

| Control | Status | Notes |
|---|---|---|
| PII data minimization | ✅ | No PII collected in current state |
| Encryption at rest | ⚠️ | Provider-managed once DB live |
| Encryption in transit | ✅ | HTTPS-only via Next.js |
| Password hashing (NextAuth handles) | ✅ | Via NextAuth adapter |
| User data deletion procedure | ❌ | Document and implement |
| Backup procedure | ❌ | Establish before production data exists |
| Backup encryption | ❌ | Provider-managed |
| Backup restoration test | ❌ | Test annually |

## API security

| Control | Status | Notes |
|---|---|---|
| Rate limiting per endpoint | ❌ | Add via middleware |
| Input validation on every endpoint | ✅ | TypeScript + Zod-style validators |
| Server-side enforcement of paywalls | ✅ | Entitlements checked server-side |
| No proprietary scoring in API responses | ✅ | Outputs only, no formulas |
| CORS configured | ⚠️ | Verify production config |
| CSRF protection | ✅ | NextAuth handles for auth flows |

## Logging and audit

| Control | Status | Notes |
|---|---|---|
| Application logs (no PII / no secrets) | ⚠️ | Standard Next.js logging |
| Audit log for admin actions | ❌ | Add when cockpit actions become mutative |
| Error tracking (Sentry / similar) | ❌ | Add before launch |
| Log retention policy | ❌ | Establish |
| Log access controls | ❌ | Provider-managed |

## Incident response

| Control | Status | Notes |
|---|---|---|
| Incident response plan documented | ❌ | Add minimal IR runbook |
| Severity classification | ❌ | P0–P4 framework; add |
| Contact list / on-call | ❌ | Founder-only currently |
| Public security disclosure process (security.txt) | ❌ | Add `/.well-known/security.txt` |
| Post-incident review template | ❌ | Add |

## Vendor / third-party security

| Control | Status | Notes |
|---|---|---|
| Vendor list maintained | ⚠️ | In `DATA_RIGHTS_REGISTER.md` |
| Vendor risk assessment | ❌ | Add per critical vendor |
| Data Processing Agreements where required | ❌ | Add per vendor at activation |
| Sub-processor list maintained | ❌ | Future |

---

## Top 10 priorities to close

1. Branch protection on `main` + required CI status checks
2. Enable GitHub secret scanning + push protection (confirm)
3. Enable Dependabot security + version updates (confirm)
4. Enable CodeQL code scanning
5. Add pre-commit hook (lint + typecheck)
6. Add rate limiting on auth endpoints
7. Add error tracking (Sentry-like)
8. Add `/.well-known/security.txt` for disclosure
9. Document user-data deletion procedure
10. Document incident response runbook

## Review cadence

- Monthly self-audit while pre-launch
- Quarterly review with attorney once entity formed
- Annual external penetration test once revenue justifies
- Re-audit at any acquisition diligence event
