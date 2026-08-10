/**
 * Shadow ensemble orchestrator — wires the particle filter, Hawkes steam
 * detector, remote-model client, prior-only information-edge gate, robust
 * Kelly and the forecast-skill E-process into one call per game. SHADOW ONLY:
 * nothing here writes a `Pick`, nothing here decides what gets published, and
 * this is NOT called from the live pick-generation path. See the module
 * header of each wrapped module for why — the particle filter starts cold
 * (unfit on real history), the remote endpoints list defaults to empty
 * (`gse-ml-service` is not deployed anywhere as of this module's introduction
 * — see `gse-ml-service/README.md`), and none of these modules are `priced`
 * (every result they return carries `status: "shadow"`). Replacing real pick
 * generation with this output is a separate, deliberate decision for a human
 * to make once there is real history to evaluate it against — not something
 * this file does on its own.
 *
 * Persistence is deliberately OUT OF SCOPE. `evaluateGame`/`settleGame` return
 * plain data; the caller decides whether/how to store it. This package has no
 * database dependency (see package.json) and this file does not add one — no
 * flat-file log either, since this runs inside a Next.js app deployed to
 * Vercel, where the filesystem is not durable across invocations. If durable
 * shadow-signal storage is wanted, that is a Prisma migration, decided and
 * reviewed on its own, not an implicit side effect of importing this module.
 *
 * NOT included: a "HyperPredictive Potential" gate. A prior spec for one
 * hard-coded a `causalRobustness` constant and mislabeled `abs(p - 0.5)` as
 * Murphy's RES — both fabricated-data problems under this repo's own rules.
 * Declined; see the session's response to that spec for the full reasoning.
 * If a real causal-robustness signal exists later, it can be added as an
 * additional field on `ShadowSignalObservation` then.
 */

import {
  TeamStrengthFilter,
  type TeamStrengthFilterOptions,
  type StrengthUpdateReport,
  type FilterDiagnostics,
  type TeamIntervention,
} from "../team-strength-filter.js";
import { HawkesSteamDetector, type SteamEvent, type SteamSignal, type HawkesSteamOptions } from "../hawkes-steam.js";
import { priorOnlyEdgeBits } from "../information-edge-bits.js";
import { robustKellyFraction, type RobustKellyResult } from "../robust-kelly.js";
import {
  initForecastSkillFold,
  foldForecastSkillPick,
  summarizeForecastSkillFold,
  type ForecastSkillFoldState,
  type ForecastSkillOptions,
  type ForecastSkillResult,
} from "../forecast-skill-eprocess.js";
import {
  getRemoteProbabilities,
  type ModelEndpoint,
  type GameContext as RemoteGameContext,
  type RemoteProbabilitiesResult,
  type FetchModelPredictionDeps,
} from "../ensemble/remote-model-client.js";

export interface OrchestratorOptions {
  /** Passed through to `TeamStrengthFilter` verbatim — `nTeams`/`seed` are required there too. */
  readonly filter: TeamStrengthFilterOptions;
  /** Remote model endpoints to query. Default `[]` — safe when no sidecar is deployed. */
  readonly endpoints?: readonly ModelEndpoint[];
  readonly fetchDeps?: FetchModelPredictionDeps;
  readonly hawkesOptions?: HawkesSteamOptions;
  readonly forecastSkillOptions?: ForecastSkillOptions;
  /** Forwarded to `robustKellyFraction` as `alpha`. Default module default (0.10). */
  readonly kellyAlpha?: number;
  /** Forwarded to `robustKellyFraction` as `cap`. No default cap. */
  readonly kellyCap?: number;
}

export interface OrchestratorGameContext {
  readonly gameId: string;
  readonly homeTeamIdx: number;
  readonly awayTeamIdx: number;
  /** De-vigged market-implied home win probability, in [0,1]. */
  readonly marketHomeProb: number;
  /** Decimal odds on the home side (b = decimalOdds − 1). */
  readonly decimalOddsHome: number;
  /** This game's own line-movement history. Empty/omitted ⇒ no steam signal. */
  readonly oddsEvents?: readonly SteamEvent[];
  /** Evaluation time for the Hawkes intensity query. Defaults to the last event's time, or 0. */
  readonly evaluatedAt?: number;
  /** Extra fields forwarded to remote model endpoints as part of their GameContext. */
  readonly remoteContext?: Readonly<Record<string, unknown>>;
}

export interface ShadowSignalObservation {
  readonly gameId: string;
  readonly homeTeamIdx: number;
  readonly awayTeamIdx: number;
  readonly particleFilterProb: number;
  readonly remoteProbabilities: RemoteProbabilitiesResult;
  readonly steamSignal: SteamSignal;
  /** Simple mean of [particleFilterProb, ...successful remote probabilities], plus the
   *  signed, bounded Hawkes nudge. NOT an "Oracle Blender" — a placeholder average,
   *  documented as such, until a real weighted ensemble is built and backtested. */
  readonly blendedProb: number;
  /** Prior-only bits vs the module's base rate (default 0.5) — a CONFIDENCE measure,
   *  gameable by an overconfident model, NOT accuracy and NOT "beats the market". See
   *  information-edge-bits.ts's module header. */
  readonly edgeBitsVsBaseRate: number;
  /** blendedProb − marketHomeProb. A diagnostic, not an information-theoretic quantity. */
  readonly marketDisagreement: number;
  readonly kelly: RobustKellyResult;
  readonly filterDiagnostics: FilterDiagnostics;
  readonly evaluatedAt: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface SettlementResult {
  readonly gameId: string;
  readonly filterUpdate: StrengthUpdateReport;
  readonly forecastSkill: ForecastSkillResult | null;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0.5;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Stateful, in-memory shadow pipeline for ONE league's worth of teams (one
 * `TeamStrengthFilter`). Not thread-safe across concurrent callers by design —
 * mirrors `TeamStrengthFilter` itself, which documents the same constraint.
 */
export class LiveOrchestrator {
  private readonly filter: TeamStrengthFilter;
  private readonly endpoints: readonly ModelEndpoint[];
  private readonly fetchDeps: FetchModelPredictionDeps;
  private readonly hawkesOptions: HawkesSteamOptions;
  private readonly kellyAlpha: number | undefined;
  private readonly kellyCap: number | undefined;
  private forecastSkillState: ForecastSkillFoldState | null;
  /** What was actually shown to the ensemble pre-settlement, keyed by gameId — so
   *  `settleGame` folds the SAME probability that was evaluated, not a probability
   *  re-derived after the filter has already moved on. */
  private readonly pendingObservations = new Map<string, { readonly p: number; readonly m: number }>();

  constructor(options: OrchestratorOptions) {
    this.filter = new TeamStrengthFilter(options.filter);
    this.endpoints = options.endpoints ?? [];
    this.fetchDeps = options.fetchDeps ?? {};
    this.hawkesOptions = options.hawkesOptions ?? {};
    this.kellyAlpha = options.kellyAlpha;
    this.kellyCap = options.kellyCap;
    this.forecastSkillState = initForecastSkillFold(options.forecastSkillOptions ?? {});
  }

  /**
   * Advance the filter's dynamics by ONE scheduled time step (e.g. once per
   * day of slate generation) — NOT once per game. Calling this per-game would
   * over-diffuse the state, since `predictStates` adds process noise for every
   * team on every call regardless of how many games are actually being
   * evaluated in that cycle. See `TeamStrengthFilter`'s own "intended call
   * pattern" doc.
   */
  advanceTimeStep(interventions?: readonly TeamIntervention[]): void {
    this.filter.predictStates(interventions);
  }

  /**
   * Pre-settlement evaluation for one game. Pure with respect to filter state
   * (does not call `update`) except for recording the blended probability so
   * `settleGame` can fold the SAME number later.
   */
  async evaluateGame(ctx: OrchestratorGameContext): Promise<ShadowSignalObservation> {
    const events = ctx.oddsEvents ?? [];
    const evaluatedAt = ctx.evaluatedAt ?? (events.length > 0 ? events[events.length - 1]!.time : 0);

    // Deliberately `observeEvent`, never `refit`, here: `refit` re-ESTIMATES mu/alpha/beta
    // from the very window it is given, so calling it on nothing but the burst we are
    // trying to detect would let the burst become the new "normal" and mask itself (MLE
    // absorbs the spike into a higher mu). `observeEvent` only folds events into the O(1)
    // recursive intensity statistic and leaves the fit at its prior (or at
    // `hawkesOptions`'s caller-supplied prior) — so a real burst shows up as a deviation
    // ABOVE a baseline that the burst itself never got to move.
    //
    // IMPORTANT: the module's own default prior sets `priorAlpha = 0` ("no evidence of
    // self-excitation yet" — see hawkes-steam.ts's HawkesPrior doc). With alpha=0,
    // intensity = mu + 0·(anything) = mu ALWAYS, so with the bare default this detector
    // can NEVER report steam, by construction — not a bug, an honest "we have not told it
    // clustering happens" starting point. Live steam detection requires the caller to pass
    // a `hawkesOptions.priorAlpha` reflecting real, ideally back-tested, self-excitation
    // behavior (e.g. from `fitHawkesToWindow` run offline against a broad, mostly-quiet
    // baseline window — a periodic re-calibration job, deliberately not wired into this
    // orchestrator yet).
    const hawkes = new HawkesSteamDetector(this.hawkesOptions);
    const sortedEvents = [...events].sort((a, b) => a.time - b.time);
    for (const event of sortedEvents) hawkes.observeEvent(event.time, event.side);
    const steamSignal = hawkes.steamSignal(evaluatedAt);
    const signedNudge =
      steamSignal.side === "home"
        ? steamSignal.suggestedProbabilityNudge
        : steamSignal.side === "away"
          ? -steamSignal.suggestedProbabilityNudge
          : 0;

    const particleFilterProb = this.filter.predictHomeWinProbability(ctx.homeTeamIdx, ctx.awayTeamIdx);

    const remoteGameContext: RemoteGameContext = {
      gameId: ctx.gameId,
      ...ctx.remoteContext,
    };
    const remoteProbabilities = await getRemoteProbabilities(this.endpoints, remoteGameContext, this.fetchDeps);

    const rawSignals = [particleFilterProb, ...remoteProbabilities.succeeded.map((r) => r.probability)];
    const blendedProb = clamp01(mean(rawSignals) + signedNudge);

    const edgeBitsVsBaseRate = priorOnlyEdgeBits(blendedProb);
    const marketDisagreement = blendedProb - ctx.marketHomeProb;

    const filterDiagnostics = this.filter.diagnostics();
    const kelly = robustKellyFraction({
      probability: blendedProb,
      decimalOdds: ctx.decimalOddsHome,
      // Global settled-observation count across the WHOLE filter (not this specific
      // team pair) as a deliberately conservative, honestly-zero-at-cold-start proxy
      // for "how much evidence backs this belief". NOT the particle-cloud ESS
      // (`filterDiagnostics.ess`) — that stays near `nParticles` from the moment the
      // filter is constructed regardless of how many real games it has seen, which
      // would silently defeat the whole point of the uncertainty haircut. See
      // `robust-kelly.ts`'s header for why n=0 fails safely (wide Beta(1,1) set,
      // worst case near the tail) rather than crashing or overclaiming.
      effectiveSampleSize: filterDiagnostics.observations,
      alpha: this.kellyAlpha,
      cap: this.kellyCap,
    });

    this.pendingObservations.set(ctx.gameId, { p: blendedProb, m: ctx.marketHomeProb });

    return {
      gameId: ctx.gameId,
      homeTeamIdx: ctx.homeTeamIdx,
      awayTeamIdx: ctx.awayTeamIdx,
      particleFilterProb,
      remoteProbabilities,
      steamSignal,
      blendedProb,
      edgeBitsVsBaseRate,
      marketDisagreement,
      kelly,
      filterDiagnostics,
      evaluatedAt,
      priced: false,
      status: "shadow",
    };
  }

  /**
   * Fold a settled outcome: updates the particle filter's posterior for both
   * teams, and folds the SAME pre-registered `(p, m)` pair (from the matching
   * `evaluateGame` call) into the forecast-skill E-process. Returns
   * `forecastSkill: null` if `evaluateGame` was never called for this
   * `gameId` (nothing to score against the market) or if the options passed
   * to the constructor were refused (see `initForecastSkillFold`'s doc).
   */
  settleGame(gameId: string, homeTeamIdx: number, awayTeamIdx: number, outcome: 0 | 1): SettlementResult {
    const filterUpdate = this.filter.update(homeTeamIdx, awayTeamIdx, outcome);

    const pending = this.pendingObservations.get(gameId);
    this.pendingObservations.delete(gameId);

    let forecastSkill: ForecastSkillResult | null = null;
    if (pending !== undefined && this.forecastSkillState !== null) {
      const next = foldForecastSkillPick(this.forecastSkillState, {
        p: pending.p,
        m: pending.m,
        y: outcome,
      });
      if (next !== null) {
        this.forecastSkillState = next;
        forecastSkill = summarizeForecastSkillFold(next);
      }
    }

    return { gameId, filterUpdate, forecastSkill };
  }

  /** Current forecast-skill E-process summary, or null before any settled pick. */
  currentForecastSkill(): ForecastSkillResult | null {
    return this.forecastSkillState === null ? null : summarizeForecastSkillFold(this.forecastSkillState);
  }

  diagnostics(): FilterDiagnostics {
    return this.filter.diagnostics();
  }
}
