# Credit / free-lane env activation checklist

Use when founder hands a key or program grant. **No silent fallback.**

## Cerebras free lane

```bash
# Vercel / .env.local
CEREBRAS_API_KEY=...
CONTENT_FREE_LANE_ENABLED=true
```

Smoke:

1. Confirm `isFreeLaneEnabled()` true only when **both** set  
2. Route a **non-user-facing** content surface through free-lane  
3. Usage/ledger shows Cerebras model id — not silent Anthropic fallback  

## Groq internal LLM

```bash
INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1
INTERNAL_LLM_MODEL=llama-3.3-70b-versatile
INTERNAL_LLM_API_KEY=...
```

Smoke: internal classification/draft call; no user-facing Claude bill.

## Bedrock (AWS Activate / GenAI credits)

```bash
CLAUDE_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1   # or confirmed
BEDROCK_MODEL_MAP={"claude-...":"<verified-bedrock-id>"}
```

**Eligibility:** InvokeModel only. No Marketplace Claude-Platform billing.

Smoke: response metadata / ledger carries **Bedrock model id**.

## Vertex (Google partner credit)

```bash
CLAUDE_PROVIDER=vertex
GOOGLE_VERTEX_PROJECT=...
GOOGLE_VERTEX_REGION=...
GOOGLE_APPLICATION_CREDENTIALS_JSON=...
VERTEX_MODEL_MAP=...
```

## Failure visibility

If key missing: provider must **fail closed or skip** — never bill Anthropic while claiming “on credits.”
