# AWS Bedrock: Route Claude Spend to AWS Activate Credits

> Source: `lib/claude-api/providers/bedrock.ts` (already written, zero new code)
> Purpose: The AI routing layer is built. Apply for AWS Activate ($25k–$100k in credits), set `CLAUDE_PROVIDER=bedrock` + 3 env vars, and every Claude API call routes through Bedrock instead of the Anthropic bill — same model, same output, $0 variable AI cost in year 1

## What This Solves

GSN's biggest variable cost is Claude API usage. At scale:
- 10k picks/month × ~$0.003/pick = $30/month (today)
- 100k picks/month × $0.003 = $300/month
- With studio, journal, content, brief surfaces running: $500–2,000/month by Series A

AWS Activate provides AWS credits that cover Bedrock. Claude on Bedrock is **the same model family at the same pricing**, but the spend is billable to AWS credits instead of cash.

**Credit reality check:** self-funded Activate awards start far below the $100k headline — the higher tiers require qualifying through an Activate Provider (VC/accelerator). Track every program as AVAILABLE → APPLIED → APPROVED → ACTIVATED → EXHAUSTED; only approved-and-activated balances are usable runway. A maximum program award is not an asset.

**The code is already written.** This is a zero-development play — env vars and an application form.

**Fallback is now policy-gated.** With `LLM_COST_MODE=credits-only` (or `zero-cash`), a Bedrock failure fails closed instead of silently falling back to the billable Anthropic API (`lib/claude-api/cost-policy.ts`). The default `normal` mode keeps reliability-first fallback — a funded company's default, not a cash-constrained one's.

## What Already Exists in the Codebase

### Multi-provider routing — fully implemented

```
lib/claude-api/providers/
  bedrock.ts          ← AWS SigV4 signing, InvokeModel API, model resolution
  aws-sigv4.ts        ← zero-dependency SigV4 signer (no AWS SDK)
  vertex.ts           ← Google Vertex AI Claude adapter
  google-oauth.ts     ← service account JWT minting for Vertex
  cerebras.ts         ← OpenAI-compatible free-lane provider
provider-dispatch.ts  ← the router: CLAUDE_PROVIDER env var selects provider
model-router.ts       ← surface → model tier mapping
```

The dispatch logic in `provider-dispatch.ts`:
```typescript
if (isBedrockProviderSelected(env)) {
  try {
    return await callBedrockClaudeMessages(providerRequest, env);
  } catch (error) {
    // Falls back to Anthropic on ANY Bedrock error — reliability never regresses
    if (!(error instanceof BedrockMessagesError) && !(error instanceof BedrockConfigError)) {
      throw error;
    }
  }
}
return callClaudeMessages(request); // fallback
```

**Bedrock is inert by default.** With no `CLAUDE_PROVIDER=bedrock`, behavior is byte-identical to today. Bedrock only activates when you explicitly turn it on.

## AWS Activate: How to Get the Credits

**AWS Activate for Startups** gives pre-seed/seed startups $25k in AWS credits; Accelerate tier (portfolio of a VC or accelerator) gives $100k.

### Application: `aws.amazon.com/activate`

Requirements for the free $25k:
1. Company less than 10 years old
2. Incorporated (LLC counts)
3. Have not previously received AWS Activate credits
4. Brief description of what you're building

Requirements for $100k (Accelerate tier):
- Must be a portfolio company of a participating investor/accelerator
- OR apply through a cloud provider partner

**Tip:** If you've been through any accelerator, cohort, or pitch competition, check if they're an AWS Activate partner — many are, and their portfolio companies get auto-approved for the higher tier.

**Time to apply:** 20 minutes. Credits typically approved within 1–5 business days.

**What credits cover:** EC2, RDS, S3, SES, SQS, **Bedrock (Claude via AWS Activate GenAI credits)**, Lambda, and 200+ other services.

### Activate GenAI Credits

AWS specifically launched Bedrock GenAI credits for AI startups. In the application:
- Select "AI/ML" as your primary use case
- Mention Bedrock / Claude usage
- Request the GenAI add-on (separate from the base AWS credits)

GenAI credits are specifically for Foundation Model API calls on Bedrock — this is the exact spend path GSN uses.

## Activating Bedrock for GSN: 3 Environment Variables

Once your AWS account has Activate credits:

### Step 1: Enable Claude model access in Bedrock console

1. Go to `us-east-1.console.aws.amazon.com/bedrock/home` → Model Access
2. Request access to "Anthropic Claude" (all variants)
3. Access is granted within minutes to hours

### Step 2: Get your Bedrock model IDs

In the Bedrock console → Foundation Models → Claude models, each model has an ID like:
```
anthropic.claude-3-5-sonnet-20241022-v2:0
anthropic.claude-3-haiku-20240307-v1:0
```

Note: Bedrock model IDs are account- and region-specific. `bedrock.ts` intentionally has no default — you supply a verified `BEDROCK_MODEL_MAP` from the console.

### Step 3: Set env vars in Vercel/production

```bash
# Provider selection
CLAUDE_PROVIDER=bedrock

# AWS credentials (IAM user with AmazonBedrockFullAccess or least-privilege equivalent)
AWS_BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Model map: Anthropic id → Bedrock id (get these from the Bedrock console)
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"anthropic.claude-3-5-sonnet-20241022-v2:0","claude-haiku-4-5-20251001":"anthropic.claude-3-haiku-20240307-v1:0","claude-opus-4-8":"anthropic.claude-3-opus-20240229-v1:0"}
```

That's the entire activation. No code changes. Every `callClaude()` call routes through Bedrock from this point forward.

### IAM Permissions (least-privilege)

Create an IAM user with this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.*"
  }]
}
```

## How Call Sites Use It

Currently, call sites use `callClaudeMessages()` directly. Switch any surface to `callClaude()` from `provider-dispatch.ts` to make it credits-routable:

```typescript
// Before (Anthropic bill):
import { callClaudeMessages } from "@/lib/claude-api/messages";
const result = await callClaudeMessages({ system, user, maxTokens: 1000, surface: "studio" });

// After (credits when CLAUDE_PROVIDER=bedrock):
import { callClaude } from "@/lib/claude-api/provider-dispatch";
const result = await callClaude({ system, user, maxTokens: 1000, surface: "studio" });
```

The output contract is identical. Downstream governance (claim scanner, brand safety, usage ledger) runs unchanged.

## Observability: Know When You're on Credits

The `modelName` field in `ClaudeMessagesResult` tells you which provider served the call:
- `claude-sonnet-4-6` → direct Anthropic (billed to Anthropic)
- `anthropic.claude-3-5-sonnet-20241022-v2:0` → Bedrock (billed to AWS credits)

A silent Bedrock → Anthropic fallback shows an Anthropic id in the usage ledger — the cost/usage ledger already records this, so you can see the fallback rate in the Cockpit.

## Prompt Caching on Bedrock

`bedrock.ts` supports `cache_control` on the system prompt:

```typescript
const result = await callClaude({
  system: "You are a sports pick analyst...",
  user: userPrompt,
  maxTokens: 2000,
  surface: "studio",
  cache: { system: true }, // 86% token savings on system prompt
});
```

Bedrock supports the same prompt caching as the direct Anthropic API. Combine with AWS credits for near-zero effective cost on pick generation.

## Cost Model

| Scenario | Direct Anthropic | Bedrock (credits year 1) | Bedrock (after credits) |
|---|---|---|---|
| 10k picks/month | $30 | $0 | $30 |
| 100k picks/month | $300 | $0 | $300 |
| All surfaces | ~$800/mo | $0 | ~$800/mo |
| Studio (Sonnet) | ~$200/mo | $0 | ~$200/mo |

With $25k in credits: 2–3 years of AI compute at current burn. With $100k: effectively infinite runway on AI costs until Series A.

## AWS Marketplace Listing (Bonus Revenue Channel)

With an active AWS account in Activate, GSN qualifies for the AWS ISV Accelerate program, which includes:
- Co-sell support (AWS reps bring enterprise deals)
- AWS Marketplace listing (sports analytics SaaS)
- 5-15% AWS Marketplace co-funding on qualified deals

Sports analytics + AI = a category AWS actively co-sells into enterprise (stadiums, media companies, fantasy platforms).

## Status

- [ ] Apply at `aws.amazon.com/activate` (20 min, $25k free)
- [ ] Check if any investor/accelerator is an AWS Activate partner → Accelerate tier ($100k)
- [ ] Enable Claude model access in Bedrock console (`us-east-1`)
- [ ] Note Bedrock model IDs from console for `BEDROCK_MODEL_MAP`
- [ ] Create IAM user with `bedrock:InvokeModel` policy
- [ ] Set `CLAUDE_PROVIDER=bedrock`, `AWS_BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_MAP` in Vercel/prod
- [ ] Switch high-volume call sites from `callClaudeMessages` to `callClaude`
- [ ] Verify Cockpit usage ledger shows Bedrock model IDs (confirms credits are being consumed)
- [ ] Apply for AWS ISV Accelerate program (Marketplace co-sell)
