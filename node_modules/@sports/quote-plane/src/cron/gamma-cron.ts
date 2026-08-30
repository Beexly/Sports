/**
 * Live Gamma cron runner — free path, no Odds API key.
 * Rate-limited + TTL-cached. Route: /api/cron/gamma with dual CRON_SECRET.
 *
 * Auth: timing-safe via authorizeCronSecret (packet util twin of monorepo
 * apps/web/lib/cron/authorize.ts). Dual-secret: primary + previous.
 * Do NOT reintroduce string ===.
 */

import { authorizeCronSecret } from "@sports/util";
import { TtlCache, quoteCacheKey } from "../cache/ttl-cache";
import type { QuoteLine, QuoteProvider } from "../types";
import type { ClosingArchive } from "../archive/closing-archive";

export interface GammaCronConfig {
  readonly scheduleCron: string; // "*/15 * * * *"
  readonly cacheTtlMs: number;
  readonly maxMarketsPerRun: number;
  readonly sports: readonly string[];
  readonly requireCronSecret: true;
}

export const DEFAULT_GAMMA_CRON: GammaCronConfig = {
  scheduleCron: "*/15 * * * *",
  cacheTtlMs: 12 * 60 * 1000, // slightly under 15m
  maxMarketsPerRun: 50,
  sports: ["NFL", "NBA", "MLB", "NHL", "MULTI"],
  requireCronSecret: true,
};

export interface GammaCronAuth {
  readonly providedSecret: string | null | undefined;
  readonly expectedSecret: string | null | undefined;
  /** Optional CRON_SECRET_PREVIOUS for rotation */
  readonly previousSecret?: string | null | undefined;
}

export function authorizeCron(auth: GammaCronAuth): {
  ok: boolean;
  code: string;
  matched: "primary" | "previous" | null;
} {
  return authorizeCronSecret(auth);
}

export interface GammaCronRunResult {
  readonly ok: boolean;
  readonly code: string;
  readonly ranAt: string;
  readonly sports: string[];
  readonly linesIngested: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly archived: number;
  readonly errors: string[];
  readonly oddsApiRequired: false;
  readonly authMatched?: "primary" | "previous" | null;
}

export class GammaCronRunner {
  private readonly cache: TtlCache<QuoteLine[]>;
  private lastRun: GammaCronRunResult | null = null;

  constructor(
    private readonly gamma: QuoteProvider,
    private readonly archive: ClosingArchive,
    private readonly config: GammaCronConfig = DEFAULT_GAMMA_CRON,
  ) {
    this.cache = new TtlCache<QuoteLine[]>(config.cacheTtlMs, 200);
  }

  getCache() {
    return this.cache;
  }

  last(): GammaCronRunResult | null {
    return this.lastRun;
  }

  /**
   * One cron tick. Auth must pass before network/cache work.
   */
  async run(opts: {
    auth: GammaCronAuth;
    now?: Date;
  }): Promise<GammaCronRunResult> {
    const now = opts.now ?? new Date();
    const auth = authorizeCron(opts.auth);
    if (!auth.ok) {
      const refused: GammaCronRunResult = {
        ok: false,
        code: auth.code,
        ranAt: now.toISOString(),
        sports: [],
        linesIngested: 0,
        cacheHits: 0,
        cacheMisses: 0,
        archived: 0,
        errors: [auth.code],
        oddsApiRequired: false,
        authMatched: null,
      };
      this.lastRun = refused;
      return refused;
    }

    let linesIngested = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    let archived = 0;
    const errors: string[] = [];
    const sportsRun: string[] = [];

    for (const sport of this.config.sports) {
      sportsRun.push(sport);
      const key = quoteCacheKey({
        providerId: this.gamma.id,
        sport,
      });
      try {
        const { value, cacheHit } = await this.cache.getOrSet(
          key,
          async () => {
            const lines = await this.gamma.fetchQuotes({
              sport,
              asOf: now.toISOString(),
            });
            return lines.slice(0, this.config.maxMarketsPerRun * 2);
          },
          this.config.cacheTtlMs,
          now.getTime(),
        );
        if (cacheHit) cacheHits++;
        else cacheMisses++;
        linesIngested += value.length;
        archived += this.archive.ingestLines(value, now);
      } catch (e) {
        errors.push(`${sport}:${e instanceof Error ? e.message : "fetch_fail"}`);
      }
    }

    const result: GammaCronRunResult = {
      ok: errors.length === 0,
      code: errors.length ? "partial_or_fail" : "ok",
      ranAt: now.toISOString(),
      sports: sportsRun,
      linesIngested,
      cacheHits,
      cacheMisses,
      archived,
      errors,
      oddsApiRequired: false,
      authMatched: auth.matched,
    };
    this.lastRun = result;
    return result;
  }
}

/** Handler shape for Next/Vercel route — pure decision layer */
export function handleGammaCronRequest(input: {
  authorizationHeader: string | null;
  cronSecretEnv: string | null | undefined;
  cronSecretPreviousEnv?: string | null | undefined;
  runner: GammaCronRunner;
  now?: Date;
}): Promise<GammaCronRunResult> {
  const provided =
    input.authorizationHeader?.replace(/^Bearer\s+/i, "").trim() || null;
  return input.runner.run({
    auth: {
      providedSecret: provided,
      expectedSecret: input.cronSecretEnv,
      previousSecret: input.cronSecretPreviousEnv,
    },
    now: input.now,
  });
}
