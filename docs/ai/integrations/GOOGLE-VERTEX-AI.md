# Google Vertex AI: Route Claude Spend to the Vertex Partner-Model Credit

> Source: `lib/claude-api/providers/vertex.ts` + `lib/claude-api/providers/google-oauth.ts` (already written, zero new code)
> Purpose: Set `CLAUDE_PROVIDER=vertex` + 4 env vars and Claude API calls route through Vertex AI. Spend is offsettable by the **separate partner-model benefit** (~$10k for Claude on Vertex), not the headline Google for Startups award.

## Credit Reality Check (read first)

**Google's ordinary startup cloud credits generally do NOT pay for third-party models like Claude.** The headline Google for Startups award (up to $200k across tiers, staged and conditional) covers first-party GCP infrastructure. The pool that actually pays for Claude on Vertex is a **separate qualifying partner-model benefit, closer to $10,000**. Pursue both, but only the partner-model benefit is Claude runway — and only credits that are **APPROVED and ACTIVATED** count as usable. Track every program as: AVAILABLE → APPLIED → APPROVED → ACTIVATED → EXHAUSTED. A maximum program award is not an asset.

## What This Solves

Same mechanism as AWS Bedrock, different (smaller) credit pool. Claude runs on Vertex AI (Model Garden, publisher "anthropic") — the same models, billed to the GCP account, offsettable by the partner-model credit while it is active.

**The code is already written.** `vertex.ts` implements a full Claude-on-Vertex adapter with service account OAuth2 authentication. Zero development required.

**Fallback is now policy-gated.** With `LLM_COST_MODE=credits-only` (or `zero-cash`), a Vertex failure fails closed instead of silently falling back to the billable Anthropic API — see `lib/claude-api/cost-policy.ts`. The default `normal` mode keeps reliability-first fallback.

## What Already Exists

```
lib/claude-api/providers/
  vertex.ts          ← Vertex AI rawPredict endpoint, OAuth2 bearer, model resolution
  google-oauth.ts    ← service account JWT minting (no Google SDK)
provider-dispatch.ts ← CLAUDE_PROVIDER=vertex routes here automatically
```

The dispatch in `provider-dispatch.ts`:
```typescript
if (isVertexProviderSelected(env)) {
  try {
    return await callVertexClaudeMessages(providerRequest, env);
  } catch (error) {
    if (!(error instanceof VertexMessagesError) && !(error instanceof VertexConfigError)) {
      throw error;
    }
  }
}
return callClaudeMessages(request); // fallback to Anthropic
```

**Vertex is inert by default.** With no `CLAUDE_PROVIDER=vertex`, behavior is byte-identical to today.

## Google for Startups: How to Get the Credits

**Google for Startups** offers staged, conditional GCP credit awards to early-stage startups (headline maximums up to $200k across tiers; the accessible bootstrapped tier is materially smaller). These cover GCP infrastructure — apply for the **partner-model benefit separately** for Claude-on-Vertex coverage.

### Application: `cloud.google.com/startup`

Requirements:
1. Pre-seed or seed stage startup
2. Incorporated (LLC counts)
3. Building on Google Cloud (Vertex AI qualifies)
4. Under 10 years old

**The AI-specific track** — apply specifically through the "AI Startup" path:
- Mention Vertex AI / Claude on Model Garden usage
- $200k credit allocation is targeted at AI/ML workloads on GCP

**Time to apply:** 30 minutes. Credits typically approved within 1–2 weeks.

**What credits cover:** Compute Engine, GKE, Cloud Run, Cloud Storage, BigQuery, **Vertex AI (Claude via Model Garden)**, and all other GCP services.

### Google Workspace for Startups (Bonus)

Separately: Google Workspace for Startups gives 12 months of Business Plus free. If GSN uses Google Drive, Docs, Gmail, Meet — that's another $5k+ in saved SaaS spend per year. Apply at `workspace.google.com/startups`.

## Activating Vertex for GSN: 4 Environment Variables

### Step 1: Enable Vertex AI API and Claude model access

1. Go to `console.cloud.google.com` → APIs & Services → Enable "Vertex AI API"
2. In Vertex AI → Model Garden → search "Claude" → request access to Anthropic Claude models
3. Note: Vertex AI Claude is available in specific regions. `us-east5` (Columbus) has the widest Claude model availability

### Step 2: Create a service account

1. IAM & Admin → Service Accounts → Create Service Account
2. Name: `gsn-claude-vertex` (or similar)
3. Role: `roles/aiplatform.user` (allows `rawPredict` calls)
4. Create key → JSON → download (this becomes `GOOGLE_APPLICATION_CREDENTIALS_JSON`)

### Step 3: Note your Vertex model IDs

In Vertex AI → Model Garden, Claude models appear with IDs like:
```
claude-sonnet-4-6@20241022
claude-3-haiku@20240307
claude-opus-4@20240229
```

Note the exact IDs — `vertex.ts` has no defaults (same as Bedrock).

### Step 4: Set env vars in Vercel/production

```bash
# Provider selection
CLAUDE_PROVIDER=vertex

# GCP project and region
GOOGLE_VERTEX_PROJECT=your-gcp-project-id
GOOGLE_VERTEX_REGION=us-east5

# Service account key (entire JSON file contents, inline)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"YOUR_PROJECT","private_key_id":"PLACEHOLDER","private_key":"PLACEHOLDER_PASTE_FULL_KEY_JSON_HERE","client_email":"gsn-claude-vertex@your-project.iam.gserviceaccount.com"}

# Model map: Anthropic id → Vertex id (get from Model Garden)
VERTEX_MODEL_MAP={"claude-sonnet-4-6":"claude-sonnet-4-6@20241022","claude-haiku-4-5-20251001":"claude-3-haiku@20240307","claude-opus-4-8":"claude-opus-4@20240229"}
```

That's the entire activation. No code changes.

## How Authentication Works (Zero Dependencies)

`google-oauth.ts` mints a service account JWT and exchanges it for a bearer token with no Google SDK:

```typescript
// RFC 7523 JWT bearer flow — pure Node crypto
const jwt = await buildSignedJwt(serviceAccountKey, {
  scope: "https://www.googleapis.com/auth/cloud-platform",
  now: Date.now(),
});
const { token, expiresAtMs } = await fetchAccessToken(serviceAccountKey);
```

`vertex.ts` caches the access token in-memory with a 60-second pre-expiry refresh — no token refresh overhead on individual requests.

The Vertex endpoint:
```
POST https://${region}-aiplatform.googleapis.com/v1/projects/${project}/locations/${region}/publishers/anthropic/models/${modelId}:rawPredict
Authorization: Bearer ${accessToken}
```

The request body is identical to the Anthropic Messages API — same JSON, same fields.

## Prompt Caching on Vertex

`vertex.ts` passes `cache_control` through to Vertex AI, which supports the same prompt caching as the direct Anthropic API:

```typescript
const result = await callClaude({
  system: "You are a sports pick analyst...",
  user: userPrompt,
  maxTokens: 2000,
  surface: "studio",
  cache: { system: true }, // 86% token savings on system prompt
});
```

## Switching Call Sites

```typescript
// Before (Anthropic bill):
import { callClaudeMessages } from "@/lib/claude-api/messages";
const result = await callClaudeMessages({ system, user, maxTokens: 1000, surface: "studio" });

// After (credits when CLAUDE_PROVIDER=vertex):
import { callClaude } from "@/lib/claude-api/provider-dispatch";
const result = await callClaude({ system, user, maxTokens: 1000, surface: "studio" });
```

The output contract is identical. Downstream governance (claim scanner, brand safety, usage ledger) runs unchanged.

## Observability

The `modelName` field in `ClaudeMessagesResult` tells you which provider served:
- `claude-sonnet-4-6` → direct Anthropic (cash)
- `claude-sonnet-4-6@20241022` → Vertex AI (GCP credits)

Monitor the usage ledger Cockpit for Vertex model IDs to confirm credits are being consumed.

## Cost Model

| Scenario | Direct Anthropic | Vertex (while partner credit active) | After credit exhausted |
|---|---|---|---|
| 10k picks/month | $30 | $0 | $30 |
| All surfaces | ~$800/mo | $0 | ~$800/mo |

A ~$10k partner-model credit at ~$800/mo all-surfaces burn ≈ 12 months of Claude runway — real, but not "unlimited." Model these numbers against your actual usage ledger, not projections.

## AWS Bedrock vs. Vertex AI: Which to Use

Both providers run the same Claude model family. Pick based on which credit pool is actually ACTIVATED:

| | AWS Bedrock | Google Vertex AI |
|---|---|---|
| Claude-eligible credits | AWS Activate (self-funded tier starts small; higher tiers via an Activate Provider) | Partner-model benefit (~$10k) — NOT the main GCP award |
| Auth | SigV4 (AWS IAM) | Service account OAuth2 |
| Fallback (normal mode) | Auto → Anthropic on error | Auto → Anthropic on error |
| Fallback (credits-only / zero-cash) | Fails closed — no cash billing | Fails closed — no cash billing |

Recommendation: apply for both (non-exclusive), but record only approved-and-activated balances as usable runway. Route spend to whichever pool is activated; set `LLM_COST_MODE=credits-only` so a provider failure can never silently become an Anthropic cash charge.

## Status

- [ ] Apply at `cloud.google.com/startup` for Google for Startups Founders Fund ($200k)
- [ ] Apply for Google Workspace for Startups (12 months free Business Plus)
- [ ] Enable Vertex AI API in GCP console
- [ ] Request Claude model access in Vertex AI → Model Garden
- [ ] Create service account `gsn-claude-vertex` with `roles/aiplatform.user`
- [ ] Download service account JSON key
- [ ] Note Vertex model IDs from Model Garden for `VERTEX_MODEL_MAP`
- [ ] Set `CLAUDE_PROVIDER=vertex`, `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_REGION`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `VERTEX_MODEL_MAP` in Vercel/prod
- [ ] Switch high-volume call sites from `callClaudeMessages` to `callClaude`
- [ ] Verify Cockpit usage ledger shows Vertex model IDs (confirms GCP credits are being consumed)
