/**
 * Props slate SHADOW runner — the live call path `runPropsSlate` never had.
 *
 * Wiring-backlog 2026-10-01 item 11: "`runPropsSlate` has no caller; no cron,
 * no table". This module is the caller. It is:
 *
 *   - ENV-GATED. `PROPS_SLATE_SHADOW_ENABLED` defaults OFF (explicit
 *     1/true/yes/on only, same semantics as `envFlagEnabled`). Dark until the
 *     founder flips it.
 *   - SHADOW-ONLY. The slate is computed and reported; nothing is persisted,
 *     nothing is published, no pick is minted. The result carries
 *     `shadow: true, weight: 0` so no consumer can mistake it for a live pick.
 *   - HONEST INPUTS ONLY. Prop lines come from a `PropsSlateShadowSource`
 *     (a real feed when one is wired to this path). Model P(over) comes from
 *     the hierarchical-Bayes bridge (`estimatePropOver`) run over REAL rate
 *     samples — never invented. A prop with no samples gets no probability:
 *     `runPropsSlate` records a per-prop "missing modelProbOver" error and
 *     moves on (fail-closed), exactly as its contract requires.
 *   - FAIL-CLOSED. No source configured (the v1 default) means an empty
 *     slate, and `runPropsSlate` returns its honest "no props — nothing
 *     minted" result. An empty slate is never padded with fiction.
 *
 * The v1 default source is deliberately empty: the licensed Odds API
 * player-prop fetcher (`getEventOdds`) exists, but event discovery + market
 * mapping for this path is a separate build. When it lands, it implements
 * `PropsSlateShadowSource` and this runner needs no change.
 */

import { runPropsSlate, type PropsSlateInput, type PropsSlateResult } from "./props-slate.js";
import { estimatePropOver, type PlayerRateHistory } from "./props-hb-bridge.js";
import type { PlayerProp } from "@sports/prediction-engine";

/** Env flag that arms the shadow run. Default OFF. */
export const PROPS_SLATE_SHADOW_ENABLED_ENV = "PROPS_SLATE_SHADOW_ENABLED";

/**
 * Default-OFF env gate. Explicit 1/true/yes/on only — mirrors
 * `envFlagEnabled` in `@sports/data-ingestion` without a cross-package
 * import (this package does not depend on that barrel).
 */
export function propsSlateShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env[PROPS_SLATE_SHADOW_ENABLED_ENV] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * One posted prop line plus the optional REAL rate history used to derive an
 * honest model P(over) via the HB bridge. `rateHistory` absent = no
 * probability is computed for the prop (never imputed).
 */
export interface ShadowPropLine {
  readonly prop: PlayerProp;
  readonly rateHistory?: PlayerRateHistory;
}

/**
 * Where shadow prop lines come from. v1 ships no live implementation —
 * `loadPropLines` returning `[]` is the honest "no feed wired" state, and
 * `runPropsSlate` fail-closes on it.
 */
export interface PropsSlateShadowSource {
  readonly name: string;
  loadPropLines(): Promise<readonly ShadowPropLine[]>;
}

const EMPTY_SOURCE: PropsSlateShadowSource = {
  name: "none",
  loadPropLines: async () => [],
};

export interface PropsSlateShadowResult {
  /** Always true: this result must never be treated as a live pick. */
  readonly shadow: true;
  /** Always 0: the shadow slate moves no published number. */
  readonly weight: 0;
  readonly enabled: boolean;
  readonly source: string;
  /** Null when the gate is off (runPropsSlate was NOT invoked). */
  readonly result: PropsSlateResult | null;
  readonly note: string;
}

export interface PropsSlateShadowOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly source?: PropsSlateShadowSource;
  readonly bankroll?: number;
  readonly lineFreshnessMinutes?: number;
  readonly projectedMean?: number;
  readonly projectedStdDev?: number;
}

/**
 * Run the GSE 4-Beat props pipeline in shadow mode.
 *
 * Gate off → returns `{ enabled: false, result: null }` WITHOUT invoking
 * `runPropsSlate`. Gate on → builds the input from the source, derives honest
 * model probabilities via the HB bridge, invokes `runPropsSlate`, and returns
 * the shadow-tagged result. Never writes, never publishes.
 */
export async function runPropsSlateShadow(
  options: PropsSlateShadowOptions = {},
): Promise<PropsSlateShadowResult> {
  const env = options.env ?? process.env;
  if (!propsSlateShadowEnabled(env)) {
    return {
      shadow: true,
      weight: 0,
      enabled: false,
      source: "none",
      result: null,
      note: `${PROPS_SLATE_SHADOW_ENABLED_ENV} is not set — props slate shadow is dark by default.`,
    };
  }

  const source = options.source ?? EMPTY_SOURCE;
  const lines = await source.loadPropLines();

  // Honest model P(over): HB posterior on REAL samples only. No samples (or a
  // bridge refusal) means no entry here, and runPropsSlate records the
  // per-prop "missing modelProbOver" error — never an invented number.
  const modelProbOver: Record<string, number> = {};
  for (const line of lines) {
    const key = `${line.prop.playerId}:${line.prop.propType}`;
    const history = line.rateHistory;
    if (!history) continue;
    // The bridge is keyed independently of the posted line; bind the estimate
    // to this prop's identifiers so a mismatched history cannot leak across.
    const bound: PlayerRateHistory = { ...history, playerId: line.prop.playerId, propType: line.prop.propType };
    const est = estimatePropOver(bound);
    if (est.ok) modelProbOver[key] = est.data.pOver;
  }

  const input: PropsSlateInput = {
    props: lines.map((l) => l.prop),
    modelProbOver,
    lineFreshnessMinutes: options.lineFreshnessMinutes ?? 30,
    bankroll: options.bankroll ?? 1000,
    projectedMean: options.projectedMean ?? 0,
    projectedStdDev: options.projectedStdDev ?? 1,
  };
  const result = runPropsSlate(input);

  return {
    shadow: true,
    weight: 0,
    enabled: true,
    source: source.name,
    result,
    note:
      "shadow-only: computed, never persisted, weight 0. " +
      (lines.length === 0
        ? "No prop-line source is wired to this path yet — empty slate, fail-closed."
        : `${lines.length} prop line(s) evaluated; ${Object.keys(modelProbOver).length} honest model probabilit(ies) from real samples.`),
  };
}
