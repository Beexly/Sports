/**
 * GSE GALILEO — Incoherence Residual (Invention 2).
 *
 * A residual is the gap between what the market SHOULD show if it were internally consistent
 * and what it actually shows. This scores the eight structural residuals over the twin's
 * surface (and a before/after pair for the temporal ones), emitting a uniform record per
 * residual: type, affected market/book, expected vs observed direction, magnitude, timestamp,
 * explanation, confidence, and data-quality status.
 *
 * It reuses the tested market-physics coherence + alt-line primitives — this layer is the
 * structured scoring/observability surface on top of them. Pure. No pick, no global verdict.
 */

import {
  type MarketSurface,
  getInstance,
  outcomeOf,
  bookOutlierFlags,
} from "../market-physics/market-surface.js";
import {
  checkSpreadTotalTeamTotal,
  checkQbReceiverConservation,
  checkRbRoleCoherence,
  checkTotalToPropTransmission,
  detectStaleBooks,
} from "../market-physics/coherence.js";
import { checkAltLadder, type AltRung } from "../market-physics/alt-line-curvature.js";

export type ResidualType =
  | "spread_total_team_total"
  | "game_total_to_prop"
  | "qb_passing_to_receiver_yardage"
  | "qb_passing_to_receptions"
  | "rb_rush_receiving_gamescript"
  | "alt_line_curvature"
  | "book_outlier_stale"
  | "role_change_to_prop_lag";

export type Direction = "up" | "down" | "none";
export type DataQuality = "ok" | "warn" | "insufficient";

export interface IncoherenceResidual {
  readonly residualType: ResidualType;
  readonly affectedMarket: string;
  readonly affectedBook: string | null;
  readonly expectedDirection: Direction;
  readonly observedDirection: Direction;
  readonly magnitude: number;
  readonly timestamp: string;
  readonly explanation: string;
  /** 0..1 — rises with magnitude and severity; never a probability of profit. */
  readonly confidence: number;
  readonly dataQualityStatus: DataQuality;
}

export interface ResidualContext {
  readonly homeTeam?: string;
  readonly awayTeam?: string;
  readonly qbKey?: string;
  readonly receiverYardKeys?: readonly string[];
  readonly receptionKeys?: readonly string[];
  readonly rb?: { readonly rushKey: string; readonly team: string };
  readonly altLadders?: ReadonlyArray<{ market: string; book?: string; rungs: AltRung[] }>;
  /** A prior snapshot, enabling the temporal residuals. */
  readonly before?: MarketSurface;
  /** Player props to test for total→prop and QB→receptions transmission. */
  readonly transmissionPropKeys?: readonly string[];
  /** Role events: a prop that should have moved after a role shock but did not. */
  readonly roleLags?: ReadonlyArray<{ propKey: string; eventTime: string; movedSinceEvent: boolean }>;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function residual(
  partial: Omit<IncoherenceResidual, "confidence"> & { confidence?: number },
): IncoherenceResidual {
  return { confidence: partial.confidence ?? clamp01(0.3 + 0.1 * partial.magnitude), ...partial };
}

/** Static (single-surface) residuals: algebra, conservation, role, alt-line, book outliers. */
export function computeStaticResiduals(surface: MarketSurface, ctx: ResidualContext): IncoherenceResidual[] {
  const out: IncoherenceResidual[] = [];
  const ts = surface.instances[0]?.latestTimestamp ?? "";

  // 1. spread/total/team-total
  if (ctx.homeTeam && ctx.awayTeam) {
    for (const f of checkSpreadTotalTeamTotal(surface, { homeTeam: ctx.homeTeam, awayTeam: ctx.awayTeam })) {
      const team = f.subjects[0]!.replace("team_total:", "");
      const marketTT = outcomeOf(getInstance(surface, f.subjects[0]!), "OVER")?.consensusPoint ?? 0;
      out.push(residual({
        residualType: "spread_total_team_total",
        affectedMarket: `team_total:${team}`,
        affectedBook: null,
        expectedDirection: marketTT > marketTT - f.metric ? "down" : "up",
        observedDirection: "none",
        magnitude: f.metric,
        timestamp: ts,
        explanation: f.detail,
        confidence: f.severity === "contradiction" ? 0.7 : 0.45,
        dataQualityStatus: "ok",
      }));
    }
  }

  // 3. QB passing → receiver yardage conservation
  if (ctx.qbKey && ctx.receiverYardKeys?.length) {
    for (const f of checkQbReceiverConservation(surface, { qbKey: ctx.qbKey, receiverKeys: ctx.receiverYardKeys })) {
      out.push(residual({
        residualType: "qb_passing_to_receiver_yardage",
        affectedMarket: ctx.qbKey,
        affectedBook: null,
        expectedDirection: f.metric > 1 ? "down" : "up", // over-stuffed receivers should fall; thin should rise
        observedDirection: "none",
        magnitude: Math.abs(f.metric - 0.8),
        timestamp: ts,
        explanation: f.detail,
        confidence: f.severity === "contradiction" ? 0.7 : 0.4,
        dataQualityStatus: "ok",
      }));
    }
  }

  // 5. RB rush / game script
  if (ctx.rb && ctx.homeTeam && ctx.awayTeam) {
    for (const f of checkRbRoleCoherence(surface, { rbRushKey: ctx.rb.rushKey, rbTeam: ctx.rb.team, homeTeam: ctx.homeTeam, awayTeam: ctx.awayTeam })) {
      out.push(residual({
        residualType: "rb_rush_receiving_gamescript",
        affectedMarket: ctx.rb.rushKey,
        affectedBook: null,
        expectedDirection: "down",
        observedDirection: "none",
        magnitude: f.metric,
        timestamp: ts,
        explanation: f.detail,
        confidence: 0.4,
        dataQualityStatus: "ok",
      }));
    }
  }

  // 6. alt-line curvature
  for (const ladder of ctx.altLadders ?? []) {
    for (const f of checkAltLadder(ladder.rungs)) {
      out.push(residual({
        residualType: "alt_line_curvature",
        affectedMarket: ladder.market,
        affectedBook: ladder.book ?? null,
        expectedDirection: f.type === "tail_mispriced" ? (f.metric > 1 ? "down" : "up") : "none",
        observedDirection: "none",
        magnitude: Math.abs(f.metric),
        timestamp: ts,
        explanation: `[${f.type}] ${f.detail}`,
        confidence: f.type === "monotonicity" || f.type === "density_negative" ? 0.75 : 0.45,
        dataQualityStatus: ladder.rungs.length < 3 ? "insufficient" : "ok",
      }));
    }
  }

  // 7. book outlier (static cross-section) on the main markets
  for (const key of ["spread", "total"]) {
    const inst = getInstance(surface, key);
    if (!inst) continue;
    for (const o of inst.outcomes) {
      for (const flag of bookOutlierFlags(o)) {
        out.push(residual({
          residualType: "book_outlier_stale",
          affectedMarket: `${key}:${o.outcome}`,
          affectedBook: flag.book,
          expectedDirection: flag.deltaImplied > 0 ? "down" : "up",
          observedDirection: flag.deltaImplied > 0 ? "up" : "down",
          magnitude: Math.abs(flag.deltaImplied),
          timestamp: o.latestTimestamp,
          explanation: `${flag.book} ${key} ${o.outcome} implied prob ${flag.deltaImplied > 0 ? "+" : ""}${(flag.deltaImplied * 100).toFixed(1)}pp vs consensus.`,
          confidence: clamp01(0.3 + flag.deltaImplied * 4),
          dataQualityStatus: o.nBooks < 3 ? "warn" : "ok",
        }));
      }
    }
  }

  return out;
}

/** Temporal residuals: total→prop, QB→receptions transmission, book staleness, role-lag. */
export function computeTemporalResiduals(after: MarketSurface, ctx: ResidualContext): IncoherenceResidual[] {
  const out: IncoherenceResidual[] = [];
  if (!ctx.before) return out;
  const ts = after.instances[0]?.latestTimestamp ?? "";

  // 2. game total → prop transmission
  if (ctx.transmissionPropKeys?.length) {
    const r = checkTotalToPropTransmission(ctx.before, after, { propKeys: ctx.transmissionPropKeys });
    const dir: Direction = r.totalMove > 0 ? "up" : r.totalMove < 0 ? "down" : "none";
    for (const lag of r.lagging) {
      out.push(residual({
        residualType: "game_total_to_prop",
        affectedMarket: lag.key,
        affectedBook: null,
        expectedDirection: dir,
        observedDirection: "none",
        magnitude: Math.abs(r.totalMove),
        timestamp: ts,
        explanation: `Total moved ${r.totalMove.toFixed(1)} but ${lag.key} held at ${lag.afterPoint}.`,
        confidence: clamp01(0.35 + Math.abs(r.totalMove) * 0.08),
        dataQualityStatus: "ok",
      }));
    }
  }

  // 4. QB passing → receptions transmission (sibling: QB line moved, receptions stale)
  if (ctx.qbKey && ctx.receptionKeys?.length) {
    const qbBefore = outcomeOf(getInstance(ctx.before, ctx.qbKey), "OVER")?.consensusPoint;
    const qbAfter = outcomeOf(getInstance(after, ctx.qbKey), "OVER")?.consensusPoint;
    if (qbBefore != null && qbAfter != null && Math.abs(qbAfter - qbBefore) >= 5) {
      const dir: Direction = qbAfter > qbBefore ? "up" : "down";
      for (const k of ctx.receptionKeys) {
        const b = outcomeOf(getInstance(ctx.before, k), "OVER")?.consensusPoint;
        const a = outcomeOf(getInstance(after, k), "OVER")?.consensusPoint;
        if (b != null && a != null && Math.abs(a - b) < 0.01) {
          out.push(residual({
            residualType: "qb_passing_to_receptions",
            affectedMarket: k,
            affectedBook: null,
            expectedDirection: dir,
            observedDirection: "none",
            magnitude: Math.abs(qbAfter - qbBefore),
            timestamp: ts,
            explanation: `QB passing line moved ${(qbAfter - qbBefore).toFixed(0)} but ${k} receptions did not adjust.`,
            confidence: 0.45,
            dataQualityStatus: "ok",
          }));
        }
      }
    }
  }

  // 7. book staleness (temporal, consensus-moved-first)
  for (const key of ["spread", "total"]) {
    for (const side of ["OVER", "HOME"]) {
      const { stale } = detectStaleBooks(ctx.before, after, { instanceKey: key, outcome: side });
      for (const s of stale) {
        out.push(residual({
          residualType: "book_outlier_stale",
          affectedMarket: `${key}:${side}`,
          affectedBook: s.book,
          expectedDirection: s.consensusAfter > s.consensusBefore ? "up" : "down",
          observedDirection: "none",
          magnitude: s.lag,
          timestamp: ts,
          explanation: `${s.book} left ${key} at ${s.bookPoint} after consensus moved ${s.consensusBefore}→${s.consensusAfter}.`,
          confidence: clamp01(0.4 + s.lag * 0.1),
          dataQualityStatus: "ok",
        }));
      }
    }
  }

  // 8. role change → prop lag
  for (const rl of ctx.roleLags ?? []) {
    if (!rl.movedSinceEvent) {
      out.push(residual({
        residualType: "role_change_to_prop_lag",
        affectedMarket: rl.propKey,
        affectedBook: null,
        expectedDirection: "none",
        observedDirection: "none",
        magnitude: 1,
        timestamp: ts,
        explanation: `Role event at ${rl.eventTime} but ${rl.propKey} has not moved since.`,
        confidence: 0.4,
        dataQualityStatus: "ok",
      }));
    }
  }

  return out;
}

/** All residuals (static + temporal) for a twin surface. */
export function computeResiduals(after: MarketSurface, ctx: ResidualContext): IncoherenceResidual[] {
  return [...computeStaticResiduals(after, ctx), ...computeTemporalResiduals(after, ctx)];
}
