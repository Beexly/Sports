# Sports OS — Agentic OWASP Controls

**Status**: Doctrine. Binding on all agents and operators. Security-critical.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/audit/codemod-safety-policy.md` — safe code change rules
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — prompt security
- `docs/audit/piracy-malware-do-not-use-register.md` — banned packages
- `CLAUDE.md` — non-negotiable platform rules

---

## Purpose

OWASP (Open Web Application Security Project) publishes widely-used security
guidance for web applications. As Sports OS employs AI agents (Claude API,
autonomous coding agents, scheduled workers), additional agent-specific
attack surfaces emerge that traditional web OWASP guidance does not cover.

This document adapts the most relevant OWASP controls for the Sports OS
agentic context, with Sports OS-specific risk analysis and mitigation rules.

The categories addressed are drawn from:
- OWASP Top 10 for Web Applications (2021)
- OWASP Top 10 for LLM Applications (2023/2025)
- OWASP API Security Top 10

---

## Section 1 — LLM-Specific Controls (OWASP LLM Top 10)

### LLM01 — Prompt Injection

**Risk**: A malicious actor injects instructions into a data field that
an AI agent then processes, causing the agent to take actions outside
its intended scope.

**Sports OS exposure vectors**:
- User-submitted game or team names processed by the Brain query system
- Odds API responses containing unexpected text fields processed by content agents
- Social media data (Tier 5 sources) processed for weak signal detection

**Mitigations**:
1. Agent inputs from external sources must be treated as untrusted data, not
   as instructions. The Claude API prompt architecture must enforce a clear
   system/user boundary.
2. Structured data from external APIs must be parsed and validated against
   a schema before being passed to any language model. Free-text fields from
   external APIs must be sanitized before model processing.
3. The Brain query response must not execute instructions embedded in
   user query text. The system prompt must be authoritative.
4. Any content generation pipeline that processes Tier 3–5 data must log
   inputs for audit review.

**Forbidden**:
- Passing raw Tier 5 (community/Reddit) content directly to Claude API calls
- Using unsanitized user input as part of a Claude API system prompt
- Processing external API free-text fields as instructions to an agent

---

### LLM02 — Insecure Output Handling

**Risk**: AI-generated output is trusted and rendered without sanitization,
creating XSS, injection, or false-claim risks.

**Sports OS exposure vectors**:
- Brain answers rendered in the web UI
- Claude API-generated pick card copy rendered as HTML
- Model Journal entries rendered as markdown

**Mitigations**:
1. All Claude API output must pass through the claim governance scanner
   before being stored or rendered.
2. Claude API output rendered in the UI must be sanitized (no `dangerouslySetInnerHTML`
   with unescaped model output).
3. Markdown rendered from Claude API output must use a safe renderer
   (no HTML passthrough without sanitization).
4. Claude API output must never be used as-is for a pick recommendation
   without the evidence chain verification step.

**Forbidden**:
- `dangerouslySetInnerHTML` with raw Claude API output
- Storing Claude API output as evidence (it is Tier 6 — content only)
- Publishing Claude API output without operator review

---

### LLM03 — Training Data Poisoning

**Risk**: Malicious data in training sets causes model behavior to deviate
from intended design.

**Sports OS exposure vectors**: This risk applies to the future local model
lane (see `docs/models/local-model-lane.md`). The current Claude API model
is maintained by Anthropic and is not subject to direct training data poisoning
by Sports OS inputs.

**Mitigation for future local model lane**:
- All training data must come from licensed T1/T2 sources
- Training data provenance must be logged and auditable
- No community (Tier 5) or synthetic (Tier 6) data may be used in training

---

### LLM04 — Model Denial of Service

**Risk**: Excessive AI API calls exhaust quotas, create cost spikes, or
degrade service for legitimate users.

**Sports OS exposure vectors**:
- Automated workers calling Claude API without rate limits
- User-triggered Brain queries without per-user or per-session rate limits
- Scheduled content generation jobs that loop without bound

**Mitigations**:
1. Claude API calls must be rate-limited per user session.
2. Scheduled workers must have a maximum call count per run with a circuit breaker.
3. Claude API cost monitoring must be active — see
   `docs/design/obs-inspired-scene-system.md` cockpit monitoring specs.
4. A daily and monthly Claude API budget must be set. Calls that would exceed
   the budget must fail gracefully with a fallback response, not loop.

**Implementation note**: The `ClaudeApiCallRecord` and `ClaudeApiBudget` schema
proposals in the production operations specs govern this monitoring.

---

### LLM05 — Supply Chain Vulnerabilities

**Risk**: A compromised AI provider, model, or AI tooling SDK introduces
malicious behavior.

**Sports OS exposure vectors**:
- The Anthropic SDK (`@anthropic-ai/sdk`) could be compromised via supply chain
- A future local model weight file could contain embedded malicious payload
- An AI-adjacent npm package could introduce malicious behavior

**Mitigations**:
1. Pin the Anthropic SDK to an exact version. Review release notes before upgrading.
2. Run `npm audit` before any dependency upgrade.
3. Never load model weights from unofficial redistribution sources
   (see `docs/models/local-model-lane.md` Section 4.2).
4. Verify model weight checksums against published hashes before loading.

---

### LLM06 — Sensitive Information Disclosure

**Risk**: An AI agent reveals sensitive information — API keys, system prompts,
internal configuration, user data — in its responses.

**Sports OS exposure vectors**:
- Claude API responses echoing back system prompt content
- Brain answers that expose cockpit-internal data
- Error messages from AI pipelines that include configuration details

**Mitigations**:
1. The Claude API system prompt must explicitly instruct the model not to
   repeat or summarize the system prompt content.
2. All API error responses from AI-facing routes must be sanitized before
   reaching the client.
3. No API key, session token, or internal configuration may appear in any
   Claude API call context (user turn or system turn) via user input injection.

**Rule**: See `docs/audit/prompt-leak-and-sensitive-source-policy.md`
for the full prompt security policy.

---

### LLM07 — Insecure Plugin Design

**Risk**: Agent tool/plugin implementations have weak input validation,
excessive permissions, or allow indirect prompt injection via tool responses.

**Sports OS exposure vectors**:
- Sports OS background workers acting as agent tool implementations
- Future MCP server integrations acting as tool providers

**Mitigations**:
1. Any tool called by an AI agent must validate its input schema strictly.
2. Tool responses must be sanitized before being returned to the agent as
   context — a tool response is untrusted external data.
3. Tools must operate with minimum necessary permissions. A content generation
   tool must not have access to the database write path.
4. Tool implementations must log all calls with input and output for audit.

---

### LLM08 — Excessive Agency

**Risk**: An AI agent is given more autonomy than it needs, takes actions
with unintended real-world consequences, or escalates its own privileges.

**Sports OS exposure vectors**:
- Autonomous Codex or Claude agents with write access to production routes
- Scheduled workers with unrestricted database write access
- AI content generation that auto-publishes without operator review

**Mitigations**:
1. No AI agent may auto-publish to any public surface without an operator
   approval step. This is non-negotiable — see `docs/design/stitch-agent-workflow.md`.
2. Scheduled workers must have database write permissions scoped to their
   specific tables — not unrestricted write access.
3. The autonomous loop protocol (CLAUDE.md) requires: Analyze → Identify →
   Implement → Test → Fix → Document. No autonomous production deployment.
4. The agent must stop at schema, dependency, or route changes and request
   human approval. It must never self-approve these changes.

---

### LLM09 — Overreliance

**Risk**: The platform or its users treat AI-generated output as factual truth
without verification.

**Sports OS mitigation**:
This is the platform's core design principle. AI outputs are Tier 6 — content
generation tools only, never evidence sources. The claim governance system,
source tier taxonomy, evidence chain requirements, and public transparency
disclosures all exist to prevent overreliance.

Additional controls:
1. Pick confidence scores are calibrated against settled results — they are
   statistical estimates, never certainties.
2. Every public pick includes a "For entertainment purposes only" disclosure.
3. The methodology page publicly explains that AI is used for content formatting,
   not for generating picks.

---

### LLM10 — Model Theft

**Risk**: A proprietary model is extracted, inverted, or stolen via
adversarial queries.

**Sports OS exposure vectors**: Sports OS uses the Anthropic Claude API —
it does not own the model weights and cannot be the target of model theft
in the traditional sense. However, if a local model is activated (see
`docs/models/local-model-lane.md`), local model weights stored on Sports OS
infrastructure become a theft target.

**Mitigation for future local model lane**:
- Model weights must be stored with access control — not in a public S3 bucket
- Model inference must not be exposed as a public API endpoint
- Any inference endpoint must be authenticated and rate-limited

---

## Section 2 — Web Application Controls (OWASP Top 10 Adaptation)

### A01 — Broken Access Control

**Sports OS rule**: Paywall enforcement is always server-side. No
client-only access control is acceptable. Every protected data endpoint
must verify session and tier before returning data.

**Specific checks**:
- `/api/picks` must validate tier before returning confidence scores
- `/api/brain` must validate authentication before processing any query
- Cockpit routes must validate operator role before rendering cockpit data

---

### A02 — Cryptographic Failures

**Sports OS rule**: All secrets (API keys, database credentials, session
secrets) must be stored as environment variables. No secret may appear
in committed code.

**Specific checks**:
- `NEXTAUTH_SECRET` must be a cryptographically random 32-byte value
- `STRIPE_WEBHOOK_SECRET` must be rotated if ever exposed
- Database connection strings must never appear in any tracked file

---

### A03 — Injection

**Sports OS rule**: All user input processed by database queries must use
parameterized queries (enforced by Prisma). All user input rendered in the
UI must be sanitized (enforced by React's default escaping).

**AI-specific rule**: User input that reaches the Claude API must be in the
user turn, clearly separated from the system prompt, with explicit instructions
not to follow user-injected instructions.

---

### A05 — Security Misconfiguration

**Sports OS checks**:
- `npm audit --production` must return zero High or Critical vulnerabilities
- No debug endpoints (`/api/debug`, `/api/test`) are accessible in production
- `NEXTAUTH_URL` must be set to the production domain in production environment
- Feature flags must be reviewed before any production deployment

---

### A07 — Identification and Authentication Failures

**Sports OS rule**: NextAuth.js v5 is the authentication system. Session
validation must occur on every protected route via server-side session check,
not via cookie reading in client code.

---

### A09 — Security Logging and Monitoring Failures

**Sports OS rule**: Every AI API call, every pick generation event, every
evidence chain write, and every paywall access attempt must be logged with
enough context to reconstruct the event for audit.

Log format minimum:
```typescript
{
  event: string,       // e.g., "pick.generated", "brain.query", "tier.gate.checked"
  userId?: string,     // hashed or UUID
  tier?: string,       // FREE | PRO | ELITE
  modelVersion: string,
  timestamp: string,   // ISO 8601
  outcome: string      // success | denied | error
}
```

---

## Section 3 — API Security Controls (OWASP API Top 10)

### API1 — Broken Object Level Authorization

**Sports OS rule**: Every `/api/picks/:id` or `/api/brain/:queryId` endpoint
must verify that the requesting user has access to the specific object —
not just that they are authenticated.

### API3 — Broken Object Property Level Authorization

**Sports OS rule**: The picks API response must not include confidence scores
in the response payload for Free tier users — the field must be omitted at
the API level, not just hidden in the UI.

### API8 — Security Misconfiguration

**Sports OS rule**: CORS policy on all API routes must be restrictive.
Only the production domain and localhost (dev) are permitted origins.

---

## Approval Gates

| Control category | Who validates |
|---|---|
| LLM input sanitization changes | Operator |
| New AI agent tool/plugin | Owner |
| Auto-publish capability removal of review gate | Never permitted |
| New scheduled worker | Operator + rate limit plan |
| Production secret rotation | Owner |

---

## Validation Expectations

- `npm audit --production` returns zero High or Critical findings
- All protected API routes have server-side session + tier validation
- No system prompt text appears in any API error response
- All Claude API calls are logged with event type, model version, and outcome
- No auto-publish path exists for any AI-generated content

---

## Codex Audit Requirements

1. Verify all `/api/picks` variants include server-side tier validation
2. Verify no debug route (`/api/debug`, `/api/test`) is accessible without auth
3. Verify Claude API calls log `modelVersion` and `outcome`
4. Verify `dangerouslySetInnerHTML` does not appear in any component that renders
   AI-generated text
5. Verify `npm audit --production` output — report any High/Critical as P0
6. Verify CORS policy on all API routes restricts to known-good origins
7. Report any auto-publish capability as a P0 violation
