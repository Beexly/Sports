# Contractor & Collaborator Access Rules — Galaxy Sports Edge

If anyone other than the founder contributes code, design, copy, data
architecture, strategy, branding, or reports to Galaxy, this document
governs the agreements and access they must operate under.

**Why this matters:** Without an executed IP assignment and confidentiality
agreement, a contractor can later claim joint ownership of their
contribution, reuse the structure elsewhere, or publicly disclose
proprietary methodology. That destroys defensibility.

> Without paper, vibes don't hold up.

## Required agreements

Every external contributor — engineer, designer, analyst, writer, advisor,
or part-time helper — must sign **before access**:

### 1. Non-Disclosure Agreement (NDA)

Mutual or one-way as appropriate. Must include:

- Defined "Confidential Information" covering all Galaxy IP, code, data,
  strategy, roadmap, customer data, financials, prompts, model
  configurations, and any unreleased product surfaces.
- Survival of confidentiality obligations for at least 5 years post
  termination (longer for trade secrets).
- Return-or-destroy of all confidential materials at termination.
- No public statements about working on or with Galaxy without written
  consent.
- No portfolio publication without written approval per item.

### 2. IP Assignment Agreement

- Assigns to Galaxy (or to the operating entity once formed) all work
  product created in the scope of engagement.
- "Work made for hire" language where contributor type qualifies.
- Pre-existing IP carve-out: contributor lists any prior IP they will
  use; everything not listed is presumed Galaxy's.
- No reuse of Galaxy-created work in subsequent engagements.
- No derivative works built on Galaxy-supplied materials.
- Moral rights waiver where jurisdiction recognizes them.

### 3. Acceptable Use / Access Terms

- Defines which systems contributor may access
- Forbids sharing access credentials
- Forbids cloning the repo to personal devices unless explicitly
  required
- Forbids uploading Galaxy source/data to public AI tools (separate AI
  Confidentiality Policy applies — see
  `docs/security/AI_TOOL_CONFIDENTIALITY_POLICY.md`)
- Forbids screenshots that reveal proprietary scoring or admin surfaces
  in any external context (Discord, X, blog, portfolio, podcast)
- Forbids reverse engineering or re-implementation of Galaxy methodology
  for any third party during the engagement and for a defined period
  after

### 4. Non-Solicit (where appropriate)

- For senior contractors, optionally include a non-solicit of Galaxy
  customers/employees.

---

## Access discipline

### Repository access

- Default access: **none**
- Granting access requires:
  - Signed NDA + IP Assignment
  - Specific business justification documented
  - Least-privilege scope (read-only where possible)
- GitHub access:
  - 2FA required
  - SSO required once available
  - Personal access tokens scoped narrowly
  - Removed within 24 hours of engagement end
- Branch protection on `main` and any release branches
- No direct push to `main` — PR review required

### Environment access

- Production environment access: founder only at this stage
- Staging environment: contractor-specific, time-limited
- Local dev: contractor may run locally with stub data only
- Secrets: never shared via Slack, Discord, email, or chat
- Secrets distribution: use a secrets manager (1Password, Doppler, or
  similar)
- API keys: per-contractor where possible, never shared

### Data access

- User data (PII, betting history): **founder only**
- Aggregated analytics: case-by-case access
- Test/synthetic data only for contractor experimentation
- No exporting of user data to external tools

### Model and prompt access

- System prompts: founder only until centralized
- Per-task prompts: contractor may receive task-scoped prompts
- Full prompt library: not shared
- AI tool outputs containing proprietary prompts: do not store outside
  Galaxy systems

---

## Documentation requirements per engagement

For each contractor engagement, maintain:

- [ ] Executed NDA (PDF, signed)
- [ ] Executed IP Assignment (PDF, signed)
- [ ] Statement of Work or engagement letter
- [ ] Scope of access granted (which systems, which permissions)
- [ ] Date access granted / date access removed
- [ ] List of repos / branches / files touched
- [ ] Inventory of work product delivered
- [ ] Confirmation of return-or-destroy at engagement end

Store these in a contractor records file (off-repo) or in the entity's
corporate documents once formed.

---

## Current contributor list

| Name | Role | Status | NDA | IP Assignment |
|---|---|---|---|---|
| Founder | Owner | Active | N/A (founder) | Pending entity formation |

_No external contributors at the time of this writing._

---

## AI agents as contributors (Claude, Codex, etc.)

AI agents that contribute code to the repo are not parties to NDAs. The
**operator of the agent** is.

- Founder operating Claude Code: founder remains the legal author and
  assignee of all generated work
- Future contractors operating AI tools: their IP Assignment must
  cover AI-generated work in scope, since the contractor is the
  operator and the legal author per current U.S. Copyright Office
  guidance
- All AI agents must comply with `docs/security/AI_TOOL_CONFIDENTIALITY_POLICY.md`

---

## What to do if a contractor disclosure happens

If a current or former contractor publishes Galaxy materials, screenshots
of admin surfaces, proprietary methodology, prompts, or strategic
information:

1. Document the disclosure (URL, screenshot, timestamp)
2. Confirm the materials are covered by an executed NDA/IP Assignment
3. Send a written cease-and-desist requesting takedown
4. If platform-based, file a takedown via the platform's process
5. Escalate to counsel for damages claim if commercial harm
6. Review remaining access and revoke immediately
7. Update this register

## Review cadence

- Reviewed on every new engagement
- Quarterly audit of current access grants
- Pre-acquisition full inventory
