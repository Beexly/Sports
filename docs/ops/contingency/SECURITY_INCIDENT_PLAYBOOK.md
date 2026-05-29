# Security Incident Playbook

What Galaxy does when a security event is detected or suspected.

## Severity ladder for security events

| Sev | Examples |
|---|---|
| SEV-1 | Secret leaked publicly, DB credentials exposed, RCE confirmed, PII exfiltration, methodology leak (Constitution #20), payment data exposure |
| SEV-2 | Unauthorized access to a single non-payment surface, suspicious admin login, abnormal egress from a worker |
| SEV-3 | DDoS-class abuse, scraping at scale, brute-force auth attempt |
| SEV-4 | Single failed auth attempt, dependency CVE without exploit |

## First-hour response (SEV-1)

```
Detect → Classify → STOP THE BLEEDING → Preserve evidence → Communicate → Patch
```

### 1. Classify within 5 minutes

Pull the alert, identify:
- What surface / endpoint / secret is affected?
- Is the issue still active or contained?
- What's the blast radius (users, surfaces, data)?

### 2. Stop the bleeding

| Threat | Action |
|---|---|
| Leaked secret | Revoke at issuer immediately. See `SECRETS_ROTATION_PLAYBOOK.md` emergency procedure. |
| Active exploit | Disable the affected route (kill switch from `FEATURE_FLAG_KILL_SWITCHES.md`) |
| Suspected RCE | Demote launch mode to `internal-calibration`, isolate worker pod |
| Auth compromise | Force all sessions to log out (rotate `NEXTAUTH_SECRET`); rotate provider credentials |
| Methodology leak | Pull the leaked artifact, audit public projection of `PROTECTED_KINDS`, run trust-gate scan |
| PII exfiltration | Halt the involved worker, audit egress logs, retain full forensic trail |

### 3. Preserve evidence

Do NOT alter logs to "clean up." Take a snapshot before any rollback:
- Worker logs (last 24h)
- DB write trail for affected tables
- Webhook delivery logs
- CDN access logs for affected routes
- Git history for the affected files

Forensic preservation comes before convenience.

### 4. Communicate

Internal first (within 30 min): SEV-1 declaration per `INCIDENT_RESPONSE_MATRIX.md`, on-call lead identified, communication channel opened.

External (within 60 min, SEV-1):
- Status page T1 template
- If PII or payment data potentially exposed: prepare T5 trust-incident template
- If regulatory disclosure thresholds apply: legal review of timing and content

### 5. Patch

Patch the vulnerability before re-enabling the affected path. Re-enabling on faith is forbidden — patches require:
- Code change committed and reviewed
- Test that fails without the patch and passes with it
- Verification in staging

## Common patterns

### Leaked API key

1. Revoke at the provider (Stripe, Anthropic, Odds API, GitHub, etc).
2. Rotate locally per `SECRETS_ROTATION_PLAYBOOK.md`.
3. Audit provider activity for the exposure window.
4. Scrub the leak path (git history, log scrubbing, screenshot deletion).
5. Add gitleaks rule covering the pattern that escaped.

### Methodology leak (Constitution #20)

1. Identify the leaked content (which file, which field, which surface).
2. Pull the surface offline via launch-mode demotion.
3. Add the leaked term to `lib/galaxy/kernel/graph.ts` `PROTECTED_KINDS` or the trust-gate banned phrase list.
4. Add a runtime-convergence test covering the leak path.
5. Audit the public projection of every adjacent surface for similar exposure.
6. Re-enable the surface only after the test passes.

### Account takeover

1. Force logout of the affected account.
2. Audit recent activity for collateral damage (subscription changes, saved cards, etc).
3. Email the account holder (out-of-band channel).
4. Reset auth credentials, require fresh sign-in.
5. Cross-check for the same pattern on other accounts (was this a single takeover or a credential-stuffing wave?).

### Suspicious admin login

1. Verify the login was actually unauthorized (compare to known operator IPs, hardware keys).
2. If yes: revoke session, rotate admin credentials, audit admin actions taken during the session.
3. If admin actions were taken: treat each as a potential incident (entitlement writes, content changes, secret access).

## Forbidden response patterns

- Silently rolling forward without acknowledging the incident
- Deleting logs to "tidy up"
- Closing an incident without a prevention test
- Treating a methodology leak as cosmetic
- Disabling alerting after an incident to "reduce noise"
- Sharing security-incident details in unencrypted channels

## Reporting and disclosure

For incidents that meet regulatory thresholds (GDPR / state breach notification / FTC):
- Engage legal counsel within 24h.
- Do not publicly speculate on cause before facts are confirmed.
- Notify affected users per the applicable jurisdiction's timeline.

## Drill cadence

Quarterly tabletop covering:
- Simulated leaked API key
- Simulated PII exposure via telemetry payload
- Simulated unauthorized admin login
- Simulated methodology leak

Drill participation is mandatory for the on-call rotation.
