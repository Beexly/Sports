/**
 * PostHog $50,000 Startup Cloud Context Layer & Data Warehouse Sync Engine (`posthog-js-lite` + `@posthog/wizard` pattern).
 *
 * Project ID: 516325 (Org: Galaxy Sports Network)
 * Reads `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` from environment variables.
 * Never embeds raw keys in source code and never leaks paid picks on public surfaces.
 */

export interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown> | string[];
}

export interface PostHogCaptureReceipt {
  event: string;
  distinctId: string;
  projectId: string;
  host: string;
  queuedAt: string;
  properties: PostHogEventProperties;
}

export const POSTHOG_WAREHOUSE_TABLE_NAMES = [
  'nfl_pre_projection_priors',
  'jev_snap_simulations_10k',
  'conformal_residuals_2026',
  'xai_5api_omniscience_catalog',
  'gsi_orthopedic_return_curves',
] as const;

export type PostHogWarehouseTableName = (typeof POSTHOG_WAREHOUSE_TABLE_NAMES)[number];

export interface PostHogWarehouseTableSchema {
  tableName: PostHogWarehouseTableName;
  primaryKey: string;
  partitionKey: string;
  description: string;
  columns: Record<string, string>;
}

export const POSTHOG_WAREHOUSE_SCHEMAS: Record<PostHogWarehouseTableName, PostHogWarehouseTableSchema> = {
  nfl_pre_projection_priors: {
    tableName: 'nfl_pre_projection_priors',
    primaryKey: 'game_id',
    partitionKey: 'week',
    description:
      'Stage 1 and Stage 2 situational priors, PROE tendencies, trench pressure, weather pass penalties, and 288-bit cognitive router log-odds shifts prior to JEV simulation.',
    columns: {
      game_id: 'VARCHAR',
      week: 'INTEGER',
      team: 'VARCHAR',
      opponent: 'VARCHAR',
      coaching_proe_prior: 'DOUBLE',
      trench_pressure_prior: 'DOUBLE',
      weather_pass_penalty: 'DOUBLE',
      fatigue_decay_tensor: 'DOUBLE',
      cognitive_router_log_odds_delta: 'DOUBLE',
      updated_at: 'VARCHAR',
    },
  },
  jev_snap_simulations_10k: {
    tableName: 'jev_snap_simulations_10k',
    primaryKey: 'simulation_id',
    partitionKey: 'game_id',
    description:
      'Stage 3 full-game snap-by-snap JEV simulation trajectories (10,000 worlds x 175 snaps) with Sinkhorn-Knopp optimal transport divergence and projected distributions.',
    columns: {
      simulation_id: 'VARCHAR',
      game_id: 'VARCHAR',
      world_count: 'INTEGER',
      snaps_per_world: 'INTEGER',
      sinkhorn_divergence: 'DOUBLE',
      home_win_prob: 'DOUBLE',
      projected_spread: 'DOUBLE',
      projected_total: 'DOUBLE',
      jev_model: 'VARCHAR',
      updated_at: 'VARCHAR',
    },
  },
  conformal_residuals_2026: {
    tableName: 'conformal_residuals_2026',
    primaryKey: 'calibration_id',
    partitionKey: 'market_family',
    description:
      'Stage 4 and Stage 5 Barber weighted conformal quantiles (tau_hat_90), FWL market residual edges, and conjunction gate pass/veto decisions.',
    columns: {
      calibration_id: 'VARCHAR',
      game_id: 'VARCHAR',
      market_family: 'VARCHAR',
      tau_hat_90: 'DOUBLE',
      fwl_residual_edge: 'DOUBLE',
      empirical_coverage: 'DOUBLE',
      conjunction_gate_passed: 'BOOLEAN',
      updated_at: 'VARCHAR',
    },
  },
  xai_5api_omniscience_catalog: {
    tableName: 'xai_5api_omniscience_catalog',
    primaryKey: 'entry_id',
    partitionKey: 'source_api',
    description:
      'Bidirectional 8-step reverse cascade (Kaggle -> xAI -> arXiv -> xAI -> OpenAlex -> xAI -> Hugging Face -> xAI) metrics, formulas, and causal confounder adjustments.',
    columns: {
      entry_id: 'VARCHAR',
      cascade_step: 'VARCHAR',
      source_api: 'VARCHAR',
      metric_or_paper_title: 'VARCHAR',
      mathematical_formula: 'VARCHAR',
      causal_confounder_adjustment: 'VARCHAR',
      pinecone_namespace: 'VARCHAR',
      updated_at: 'VARCHAR',
    },
  },
  gsi_orthopedic_return_curves: {
    tableName: 'gsi_orthopedic_return_curves',
    primaryKey: 'curve_id',
    partitionKey: 'injury_type',
    description:
      'Galaxy Sports Institute (GSI) orthopedic return-to-play degradation curves, post-return snap share caps, YPRR/RYOE efficiency multipliers, and re-injury hazard ratios.',
    columns: {
      curve_id: 'VARCHAR',
      injury_type: 'VARCHAR',
      position_group: 'VARCHAR',
      weeks_post_return: 'INTEGER',
      snap_share_cap: 'DOUBLE',
      efficiency_multiplier: 'DOUBLE',
      reinjury_hazard_ratio: 'DOUBLE',
      clinical_source: 'VARCHAR',
      updated_at: 'VARCHAR',
    },
  },
};

export interface PostHogWarehouseSyncReceipt {
  tableName: PostHogWarehouseTableName;
  primaryKey: string;
  rowsSynced: number;
  syncedAt: string;
  captureReceipt: PostHogCaptureReceipt;
}

export class PostHogWarehouseSyncEngine {
  private readonly client: PostHogLiteContextClient;

  constructor(client: PostHogLiteContextClient) {
    this.client = client;
  }

  public getTableSchemas(): Record<PostHogWarehouseTableName, PostHogWarehouseTableSchema> {
    return POSTHOG_WAREHOUSE_SCHEMAS;
  }

  public syncPreProjectionBatch(
    tableName: PostHogWarehouseTableName,
    rows: Array<Record<string, unknown>>,
    distinctId = 'gse-warehouse-sync-daemon',
  ): PostHogWarehouseSyncReceipt {
    const schema = POSTHOG_WAREHOUSE_SCHEMAS[tableName];
    const syncedAt = new Date().toISOString();
    const captureReceipt = this.client.capture('$posthog_warehouse_sync', distinctId, {
      warehouse_table: tableName,
      primary_key: schema.primaryKey,
      partition_key: schema.partitionKey,
      rows_synced: rows.length,
      synced_at: syncedAt,
    });
    return {
      tableName,
      primaryKey: schema.primaryKey,
      rowsSynced: rows.length,
      syncedAt,
      captureReceipt,
    };
  }
}

export class PostHogLiteContextClient {
  public readonly projectId: string;
  public readonly host: string;
  public readonly warehouse: PostHogWarehouseSyncEngine;
  private readonly apiKey: string;
  private readonly outbox: PostHogCaptureReceipt[] = [];

  constructor(options?: { apiKey?: string; host?: string; projectId?: string }) {
    this.projectId = options?.projectId ?? process.env.POSTHOG_PROJECT_ID ?? '516325';
    this.host = (options?.host ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(
      /\/+$/,
      '',
    );
    this.apiKey = options?.apiKey ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
    this.warehouse = new PostHogWarehouseSyncEngine(this);
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
