# OpenTelemetry: Distributed Tracing for the Full Pick Request Path

> Source: `open-telemetry/opentelemetry-js` (Apache-2.0)
> Purpose: Trace every pick request from HTTP receipt through BullMQ → PostgreSQL → Claude API → response delivery — find where the 4-second latency lives

## What This Solves

GSN has pick generation latency that's hard to diagnose:
- Sentry captures errors, not traces
- AgentOps traces Claude sessions, not the HTTP or database layers
- Vercel logs show route duration, not sub-operation breakdown

A pick request hits: HTTP handler → auth check → database query → BullMQ job → Odds API → Claude API → database write → response.

Without distributed tracing, you can't tell which step is slow. OpenTelemetry gives you:
- **Flame graphs** showing every span in the pick generation pipeline
- **Database query attribution** — which Prisma query takes 800ms?
- **BullMQ job visibility** — queue wait time vs. execution time
- **Claude API latency** — how much of the 4s is waiting for Claude?
- **Cross-service correlation** — trace follows the request from Next.js → worker process

## What This Does NOT Duplicate

| Tool | What it traces |
|---|---|
| AgentOps | Claude API calls, token usage, prompt/completion pairs |
| Sentry | Errors, crashes, performance (p95 route latency only) |
| PostHog | User behavior, conversion funnels |
| **OpenTelemetry** | **Full distributed trace: HTTP → BullMQ → Prisma → Claude → response** |

These are complementary. OpenTelemetry is the only tool that shows the pick request as a single waterfall spanning all layers.

## Installation

```bash
# Core SDK + Node.js auto-instrumentation
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  --workspace=apps/web

# For BullMQ instrumentation
npm install @opentelemetry/instrumentation-bull --workspace=packages/ingestion-pipeline
```

## Instrumentation Setup

### `apps/web/src/instrumentation.ts` (Next.js built-in hook)

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

// This file is loaded by Next.js before the app starts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: "gsn-web",
        [ATTR_SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
        "deployment.environment": process.env.NODE_ENV,
      }),

      traceExporter: new OTLPTraceExporter({
        // Send traces to Jaeger (local dev) or Grafana Tempo (production)
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
      }),

      instrumentations: [
        getNodeAutoInstrumentations({
          // Prisma queries are traced automatically via @prisma/instrumentation
          "@opentelemetry/instrumentation-http": { enabled: true },
          "@opentelemetry/instrumentation-fetch": { enabled: true },
          // Disable noisy instrumentation
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();

    process.on("SIGTERM", () => sdk.shutdown());
  }
}
```

Next.js 15 loads `instrumentation.ts` automatically — no additional wiring needed.

## Manual Spans for Pick Generation

Auto-instrumentation covers HTTP and Prisma. Add manual spans for business-logic steps:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("pick-generation");

export async function generatePick(gameId: string) {
  return tracer.startActiveSpan("pick.generate", async (span) => {
    span.setAttribute("game.id", gameId);

    try {
      // Step 1: Fetch odds (child span created automatically by HTTP instrumentation)
      const odds = await tracer.startActiveSpan("pick.fetch-odds", async (s) => {
        const data = await fetchOddsForGame(gameId);
        s.setAttribute("odds.markets", Object.keys(data).length);
        s.end();
        return data;
      });

      // Step 2: Build prompt (pure computation — worth timing)
      const prompt = await tracer.startActiveSpan("pick.build-prompt", async (s) => {
        const p = buildPickPrompt(odds);
        s.setAttribute("prompt.tokens.estimate", Math.floor(p.length / 4));
        s.end();
        return p;
      });

      // Step 3: Claude API (auto-instrumented HTTP, but add AI attributes)
      const analysis = await tracer.startActiveSpan("pick.claude-api", async (s) => {
        s.setAttribute("gen_ai.system", "anthropic");
        s.setAttribute("gen_ai.request.model", "claude-sonnet-5");
        const result = await callClaude(prompt);
        s.setAttribute("gen_ai.usage.input_tokens", result.usage.input_tokens);
        s.setAttribute("gen_ai.usage.output_tokens", result.usage.output_tokens);
        s.end();
        return result;
      });

      // Step 4: Parse + persist (Prisma auto-instrumented)
      const pick = await parsePick(analysis);
      await db.pick.create({ data: pick });

      span.setAttribute("pick.id", pick.id);
      span.setStatus({ code: SpanStatusCode.OK });
      return pick;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## BullMQ Worker Tracing

The worker process runs separately — trace context must be propagated:

```typescript
// packages/ingestion-pipeline/src/workers/instrumented-worker.ts
import { trace, propagation, context } from "@opentelemetry/api";

const tracer = trace.getTracer("gsn-worker");

// When enqueuing a job, attach the current trace context
export async function enqueuePickJob(gameId: string) {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  await pickQueue.add("generate-pick", {
    gameId,
    traceContext: carrier,  // Pass trace context as job data
  });
}

// In the worker processor, restore the trace context
export const pickWorker = new Worker("pick-generation", async (job) => {
  const parentContext = propagation.extract(
    context.active(),
    job.data.traceContext ?? {}
  );

  return context.with(parentContext, () =>
    tracer.startActiveSpan("worker.generate-pick", async (span) => {
      span.setAttribute("job.id", job.id ?? "");
      span.setAttribute("job.attempts", job.attemptsMade);
      try {
        await generatePick(job.data.gameId);
        span.end();
      } catch (err) {
        span.recordException(err as Error);
        span.end();
        throw err;
      }
    })
  );
});
```

## Local Development: Jaeger

```bash
# Run Jaeger locally — all-in-one trace collector + UI
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Open Jaeger UI: http://localhost:16686
# Set env var:
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

After starting the dev server, make a pick generation request. Open Jaeger and search for service `gsn-web`. You'll see the full waterfall: HTTP → auth → BullMQ → Prisma SELECT → Claude API → Prisma INSERT.

## Production: Grafana Tempo (or Honeycomb)

```bash
# Option 1: Grafana Cloud (free tier: 50GB traces/month)
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo-us-central1.grafana.net/tempo
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(instance:token)>

# Option 2: Honeycomb (free tier: 20M events/month)
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<your-api-key>
```

Both offer free tiers sufficient for GSN's volume.

## What You'll Discover

After adding tracing and generating a few picks, the flame graph will show something like:

```
pick.generate [total: 4,200ms]
  ├── HTTP auth check [45ms]
  ├── prisma:query (SELECT User) [12ms]
  ├── pick.fetch-odds [180ms]
  │   └── HTTP GET api.the-odds-api.com [180ms]
  ├── pick.build-prompt [8ms]
  ├── pick.claude-api [3,400ms]   ← THIS is the bottleneck
  │   └── HTTP POST api.anthropic.com [3,400ms]
  └── prisma:query (INSERT Pick) [22ms]
```

Now you know: 81% of latency is Claude API. The fix is streaming responses, not
optimizing database queries.

## Sampling Strategy

```typescript
import { ParentBasedSampler, TraceIdRatioBased } from "@opentelemetry/sdk-trace-base";

// Sample 10% of pick generation traces in production (they're long, generate lots of spans)
// Sample 100% of error traces always
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBased(0.1),
});
```

## Environment Variables

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces  # Local dev
# In Vercel:
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo.grafana.net/tempo
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic ...
OTEL_SERVICE_NAME=gsn-web
```

## Status

- [ ] `npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http`
- [ ] Create `apps/web/src/instrumentation.ts`
- [ ] Run Jaeger locally: `docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest`
- [ ] Generate a pick and inspect the flame graph in Jaeger
- [ ] Identify the slowest span in `pick.generate` — it's almost certainly `pick.claude-api`
- [ ] Add manual spans to `generatePick()` in the production pick generation code
- [ ] Add BullMQ trace context propagation (carrier inject/extract)
- [ ] Sign up for Grafana Cloud free tier (50GB/month)
- [ ] Add `OTEL_EXPORTER_OTLP_ENDPOINT` + `OTEL_EXPORTER_OTLP_HEADERS` to Vercel env
- [ ] Set sampling to 10% production / 100% dev
