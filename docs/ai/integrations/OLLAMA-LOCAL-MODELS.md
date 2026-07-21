# Ollama: Local LLMs for Cost Reduction + Privacy

> Source: `ollama/ollama` (MIT, 106k★)
> Purpose: Run open-source LLMs locally — zero API cost for routine tasks, privacy for sensitive research, LiteLLM integration for seamless model switching

## What This Solves

Every AI call in GSN currently hits Anthropic's API — even cheap tasks like:
- Pre-screening 50 games to identify the 5 worth deep analysis (Haiku at $0.0025/1k tokens × 50 games daily = cost adds up)
- Generating embeddings for semantic search (voyage-3 at $0.02/1M tokens)
- Research on sensitive betting strategies you wouldn't want logged externally

Ollama adds a local model tier:
- **Zero cost** for inference on local hardware (Mac M-series, Linux + GPU)
- **Privacy** — sensitive research stays on your machine
- **LiteLLM integration** — already in your stack; add Ollama as a backend without changing pick generation code
- **nomic-embed-text** — free local embeddings alternative to voyage-3 for pgvector

## Installation

```bash
# macOS
brew install ollama
ollama serve  # Starts API server on http://localhost:11434

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1:8b         # 4.7GB — best free/cheap task model
ollama pull nomic-embed-text    # 274MB — local embeddings for pgvector
ollama pull mistral:7b          # 4.1GB — alternative for reasoning tasks
ollama pull phi3.5              # 2.2GB — smallest capable model for quick checks

# Test
ollama run llama3.1:8b "Who will win the Super Bowl?"
```

## LiteLLM Integration (Existing Stack — Zero Code Change)

GSN already uses LiteLLM. Adding Ollama is a config change, not a code change:

**`packages/ai/src/litellm-config.yaml`** (extend existing config):
```yaml
model_list:
  # ... existing models ...

  # Ollama local models
  - model_name: ollama/llama3.1:8b
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: http://localhost:11434

  - model_name: ollama/nomic-embed-text
    litellm_params:
      model: ollama/nomic-embed-text
      api_base: http://localhost:11434

  # Production alternative: use cloud embedding when local not available
  - model_name: embedding-default
    litellm_params:
      model: voyage/voyage-3
      api_key: os.environ/VOYAGE_API_KEY
```

Now call Ollama through LiteLLM exactly like Claude:
```typescript
import { litellm } from "@/lib/litellm";

// Switch models by changing the model name — no other code changes
const response = await litellm.completion({
  model: "ollama/llama3.1:8b",  // or "claude-haiku-4-5-20251001" — same API
  messages: [{ role: "user", content: "..." }],
});
```

## GSN Use Case 1: Pre-Screen Games Before Expensive Analysis

Before sending a game to Claude Sonnet for deep analysis, use a local model to filter:

```typescript
import { litellm } from "@/lib/litellm";

export async function prescreenGames(games: Game[]): Promise<Game[]> {
  const BATCH_PROMPT = `
You are a sports betting analyst. Review these games and identify which are worth
deep analysis. A game is worth analyzing if:
- It has meaningful line movement (>1.5 points)
- There's a significant injury to a key player
- The public is heavily backing one side (>70%)
- There's a weather concern for outdoor games

Return a JSON array of game IDs worth analyzing, and skip the rest.

Games: ${JSON.stringify(games.map(g => ({
    id: g.id,
    matchup: `${g.awayTeam} @ ${g.homeTeam}`,
    spread: g.spread,
    publicPct: g.publicBettingPct,
    injuries: g.injuries,
  })))}
  `;

  const response = await litellm.completion({
    model: "ollama/llama3.1:8b",  // Free, local, fast
    messages: [{ role: "user", content: BATCH_PROMPT }],
    response_format: { type: "json_object" },
  });

  const { gameIds } = JSON.parse(response.choices[0].message.content ?? "{}");

  // Only send pre-screened games to expensive Claude Sonnet
  return games.filter(g => gameIds.includes(g.id));
}
```

If 50 games/day are pre-screened to 10 for deep analysis, Claude Sonnet costs drop 80%.

## GSN Use Case 2: Local Embeddings for pgvector

Free embeddings for semantic search — alternative to voyage-3:

```typescript
import { Ollama } from "ollama";

const ollama = new Ollama({ host: "http://localhost:11434" });

export async function embedLocal(text: string): Promise<number[]> {
  const response = await ollama.embed({
    model: "nomic-embed-text",
    input: text,
  });
  return response.embeddings[0];
}

// Use in pgvector similarity search (same as voyage-3, different source)
export async function findSimilarPicks(pickText: string, limit = 5) {
  const embedding = await embedLocal(pickText);

  return db.$queryRaw<Pick[]>`
    SELECT *, embedding <-> ${JSON.stringify(embedding)}::vector AS distance
    FROM "Pick"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <-> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;
}
```

**Note**: nomic-embed-text produces 768-dimensional vectors; voyage-3 produces 1024.
If switching, re-embed all existing picks and update the Prisma schema vector dimension.

## GSN Use Case 3: Private Research (Sensitive Queries)

Some research you don't want logged by external APIs:

```bash
# Research competitor strategies locally — never leaves your machine
ollama run llama3.1:8b "
Analyze these sports betting patterns and identify potential arbitrage angles:
[your sensitive market data here]
"

# Or via API (for scripts):
curl http://localhost:11434/api/generate \
  -d '{"model": "llama3.1:8b", "prompt": "...", "stream": false}'
```

## GSN Use Case 4: Model Routing via LiteLLM

Route tasks to the cheapest model that can handle them:

```typescript
// packages/ai/src/model-router.ts
type TaskType = "prescreen" | "analysis" | "embedding" | "narrative";

const MODEL_MAP: Record<TaskType, string> = {
  prescreen: "ollama/llama3.1:8b",      // Free, local
  embedding: "ollama/nomic-embed-text", // Free, local
  analysis: "claude-sonnet-5",          // Best quality
  narrative: "claude-haiku-4-5-20251001",       // Cheap cloud
};

export function getModelForTask(task: TaskType): string {
  // Fall back to cloud if Ollama isn't running
  const isOllamaAvailable = process.env.OLLAMA_BASE_URL !== undefined;
  if (!isOllamaAvailable && task === "prescreen") return "claude-haiku-4-5-20251001";
  if (!isOllamaAvailable && task === "embedding") return "voyage/voyage-3";
  return MODEL_MAP[task];
}
```

## GPU Acceleration

For faster inference on the dev machine:

```bash
# macOS (M1/M2/M3/M4) — Metal acceleration automatic
ollama run llama3.1:8b  # Uses Apple Silicon GPU automatically

# Linux + NVIDIA
# Install CUDA, then Ollama uses it automatically

# Check GPU usage
ollama ps  # Shows running models and GPU memory used
```

## API Reference

Ollama's REST API is OpenAI-compatible:

```bash
# Generate
curl http://localhost:11434/api/generate \
  -d '{"model": "llama3.1:8b", "prompt": "NFL picks for today?"}'

# Chat (OpenAI-compatible)
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "..."}]
  }'

# Embeddings
curl http://localhost:11434/api/embed \
  -d '{"model": "nomic-embed-text", "input": "Kansas City Chiefs spread"}'
```

## What This Does NOT Cover

- Production AI inference (latency, availability SLAs) → use Anthropic API
- Fine-tuning on GSN-specific data → separate workflow
- Distributed inference across multiple machines → not needed at GSN scale

## Environment Variables

```bash
# Optional — only set if Ollama is running somewhere non-standard
OLLAMA_BASE_URL=http://localhost:11434

# LiteLLM picks this up automatically when you use ollama/ prefix
```

## Status

- [ ] `brew install ollama && ollama serve` (local dev machine)
- [ ] `ollama pull llama3.1:8b && ollama pull nomic-embed-text`
- [ ] Add Ollama models to LiteLLM config in `packages/ai/`
- [ ] Build `prescreenGames()` with `llama3.1:8b` — reduce Sonnet calls by 80%
- [ ] Test local embeddings with `nomic-embed-text` against voyage-3 quality
- [ ] Add `getModelForTask()` router — graceful fallback when Ollama not running
- [ ] Benchmark: local vs. cloud latency for pre-screening tasks
