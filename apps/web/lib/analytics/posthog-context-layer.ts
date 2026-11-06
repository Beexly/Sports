/**
 * PostHog $50,000 Startup Cloud Context Layer — Lightweight Web Client (`posthog-js-lite` pattern).
 *
 * Project ID: 516325 (Org: Galaxy Sports Network)
 * Reads `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` from environment variables.
 * Never embeds raw keys in source code and never leaks paid picks on public surfaces.
 */

export interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

export interface PostHogCaptureReceipt {
  event: string;
  distinctId: string;
  projectId: string;
  host: string;
  queuedAt: string;
  properties: PostHogEventProperties;
}

export class PostHogLiteContextClient {
  public readonly projectId: string;
  public readonly host: string;
  private readonly apiKey: string;
  private readonly outbox: PostHogCaptureReceipt[] = [];

  constructor(options?: { apiKey?: string; host?: string; projectId?: string }) {
    this.projectId = options?.projectId ?? process.env.POSTHOG_PROJECT_ID ?? '516325';
    this.host = (options?.host ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(
      /\/+$/,
      '',
    );
    this.apiKey = options?.apiKey ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public capture(
    event: string,
    distinctId: string,
    properties: PostHogEventProperties = {},
  ): PostHogCaptureReceipt {
    const mergedProps: PostHogEventProperties = {
      $lib: 'posthog-js-lite-gse',
      posthog_project_id: this.projectId,
      ...properties,
    };
    const receipt: PostHogCaptureReceipt = {
      event,
      distinctId,
      projectId: this.projectId,
      host: this.host,
      queuedAt: new Date().toISOString(),
      properties: mergedProps,
    };
    this.outbox.push(receipt);

    if (typeof fetch === 'function' && this.isConfigured) {
      void fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          event,
          distinct_id: distinctId,
          properties: mergedProps,
        }),
      }).catch(() => undefined);
    }

    return receipt;
  }

  public captureAiGeneration(params: {
    distinctId: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    traceId?: string;
    gameId?: string;
  }): PostHogCaptureReceipt {
    return this.capture('$ai_generation', params.distinctId, {
      $ai_model: params.model,
      $ai_provider: params.provider,
      $ai_input_tokens: params.inputTokens,
      $ai_output_tokens: params.outputTokens,
      $ai_latency_ms: params.latencyMs,
      $ai_trace_id: params.traceId ?? 'gse-trace-default',
      game_id: params.gameId ?? 'NFL-2026-W9',
    });
  }

  public getBufferedEvents(): PostHogCaptureReceipt[] {
    return [...this.outbox];
  }
}
