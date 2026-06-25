/**
 * GSE GALILEO — Counterfactual Line Oracle (Invention 8).
 *
 * "If reality changed THIS way, which related markets SHOULD move, and which direction?"
 * Given a hypothetical state change (total drops, QB downgraded, RB limited, wind worsens,
 * spread shifts) and a roster context, it propagates the expected ripple across the market
 * graph as a list of predicted moves with rationale and relative strength.
 *
 * This is the engine's expectation generator: pair its predictions with the OBSERVED surface
 * (via incoherence-residual) and the markets that SHOULD have moved but didn't become stale
 * candidates. Rule-based to start (the spec's instruction), pure, and easy to extend.
 *
 * It does not bet and it is not a probability of profit — it is "what coherence requires."
 */

export type StateChange =
  | { readonly kind: "total_shift"; readonly deltaPoints: number; readonly team?: string }
  | { readonly kind: "qb_downgrade"; readonly team: string; readonly severity: number }
  | { readonly kind: "rb_limited"; readonly player: string; readonly team: string }
  | { readonly kind: "wind_worsens"; readonly deltaMph: number }
  | { readonly kind: "spread_shift"; readonly deltaHome: number };

export type MoveDir = "up" | "down";

export interface PredictedMove {
  /** Market instance key or class, e.g. "player_pass_yds:QB1" or "team_total:KC". */
  readonly market: string;
  readonly side?: "OVER" | "UNDER" | "HOME" | "AWAY";
  readonly direction: MoveDir;
  readonly rationale: string;
  /** Relative expected magnitude 0..1 (not a probability). */
  readonly strength: number;
}

export interface OracleContext {
  readonly homeTeam?: string;
  readonly awayTeam?: string;
  readonly qbByTeam?: Readonly<Record<string, string>>;
  readonly receiversByTeam?: Readonly<Record<string, readonly string[]>>;
  readonly deepReceiversByTeam?: Readonly<Record<string, readonly string[]>>;
  readonly rbByTeam?: Readonly<Record<string, readonly string[]>>;
  readonly backupRbByTeam?: Readonly<Record<string, string>>;
}

const passKey = (p: string) => `player_pass_yds:${p}`;
const recYdKey = (p: string) => `player_reception_yds:${p}`;
const recKey = (p: string) => `player_receptions:${p}`;
const rushKey = (p: string) => `player_rush_yds:${p}`;
const teamTotalKey = (t: string) => `team_total:${t}`;

/** Propagate a hypothetical state change into the related markets that should move. */
export function propagate(change: StateChange, ctx: OracleContext = {}): PredictedMove[] {
  const out: PredictedMove[] = [];
  const add = (m: Omit<PredictedMove, "strength"> & { strength?: number }) =>
    out.push({ strength: m.strength ?? 0.5, ...m });
  const teamsInGame = [ctx.homeTeam, ctx.awayTeam].filter((t): t is string => !!t);

  switch (change.kind) {
    case "total_shift": {
      const dir: MoveDir = change.deltaPoints < 0 ? "down" : "up";
      const mag = Math.min(1, Math.abs(change.deltaPoints) / 7);
      for (const t of teamsInGame) {
        add({ market: teamTotalKey(t), direction: dir, rationale: `Total ${dir} ${Math.abs(change.deltaPoints)} → team totals ~${dir} half that.`, strength: mag });
        for (const p of ctx.receiversByTeam?.[t] ?? []) add({ market: recYdKey(p), side: "OVER", direction: dir, rationale: "Scoring environment shift moves receiving-yard lines.", strength: mag * 0.8 });
        for (const p of ctx.rbByTeam?.[t] ?? []) add({ market: rushKey(p), side: "OVER", direction: dir, rationale: "Scoring environment shift moves rush-yard lines.", strength: mag * 0.6 });
        const qb = ctx.qbByTeam?.[t];
        if (qb) add({ market: passKey(qb), side: "OVER", direction: dir, rationale: "Lower/higher total implies fewer/more passing yards.", strength: mag * 0.7 });
      }
      break;
    }
    case "qb_downgrade": {
      const mag = Math.min(1, change.severity);
      add({ market: teamTotalKey(change.team), direction: "down", rationale: "QB downgrade lowers the team's scoring expectation.", strength: mag });
      const qb = ctx.qbByTeam?.[change.team];
      if (qb) add({ market: passKey(qb), side: "OVER", direction: "down", rationale: "Downgraded passer → lower passing-yard line.", strength: mag });
      for (const p of ctx.receiversByTeam?.[change.team] ?? []) {
        add({ market: recYdKey(p), side: "OVER", direction: "down", rationale: "Receivers lose volume with a downgraded QB.", strength: mag * 0.9 });
        add({ market: recKey(p), side: "OVER", direction: "down", rationale: "Reception counts fall with a downgraded passer.", strength: mag * 0.7 });
      }
      for (const p of ctx.rbByTeam?.[change.team] ?? []) add({ market: rushKey(p), side: "OVER", direction: "up", rationale: "Run-leaning script with a backup QB lifts rush volume.", strength: mag * 0.5 });
      // The team's spread worsens (more of an underdog).
      if (ctx.homeTeam && ctx.awayTeam) {
        const homeIsTeam = change.team === ctx.homeTeam;
        add({ market: "spread", side: "HOME", direction: homeIsTeam ? "down" : "up", rationale: "Downgraded team becomes a bigger underdog.", strength: mag });
      }
      break;
    }
    case "rb_limited": {
      add({ market: rushKey(change.player), side: "OVER", direction: "down", rationale: "Limited RB1 → fewer carries/yards (alt unders richen).", strength: 0.8 });
      add({ market: recYdKey(change.player), side: "OVER", direction: "down", rationale: "Limited RB1 → fewer routes/receiving yards.", strength: 0.6 });
      add({ market: recKey(change.player), side: "OVER", direction: "down", rationale: "Limited RB1 → fewer receptions.", strength: 0.6 });
      const backup = ctx.backupRbByTeam?.[change.team];
      if (backup) {
        add({ market: rushKey(backup), side: "OVER", direction: "up", rationale: "Backup RB inherits carries.", strength: 0.7 });
        add({ market: recKey(backup), side: "OVER", direction: "up", rationale: "Backup RB inherits passing-down work.", strength: 0.6 });
      }
      break;
    }
    case "wind_worsens": {
      const mag = Math.min(1, change.deltaMph / 20);
      for (const t of teamsInGame) {
        const qb = ctx.qbByTeam?.[t];
        if (qb) add({ market: passKey(qb), side: "OVER", direction: "down", rationale: "Wind suppresses passing yards.", strength: mag });
        for (const p of ctx.deepReceiversByTeam?.[t] ?? []) add({ market: recYdKey(p), side: "OVER", direction: "down", rationale: "Wind hurts deep receivers most.", strength: mag * 0.9 });
        for (const p of ctx.rbByTeam?.[t] ?? []) add({ market: rushKey(p), side: "OVER", direction: "up", rationale: "Wind shifts offenses run-heavy.", strength: mag * 0.5 });
      }
      add({ market: "total", side: "OVER", direction: "down", rationale: "Wind lowers the game total (unders).", strength: mag });
      break;
    }
    case "spread_shift": {
      const dir: MoveDir = change.deltaHome > 0 ? "up" : "down"; // home spread number rises = home more of a dog
      add({ market: "spread", side: "HOME", direction: dir, rationale: "Spread shift repositions the favorite.", strength: Math.min(1, Math.abs(change.deltaHome) / 7) });
      // The newly-trailing team's RB rush lines should soften (carry suppression).
      const dogTeam = change.deltaHome > 0 ? ctx.homeTeam : ctx.awayTeam;
      if (dogTeam) for (const p of ctx.rbByTeam?.[dogTeam] ?? []) add({ market: rushKey(p), side: "OVER", direction: "down", rationale: "Team became a bigger underdog → carry suppression.", strength: 0.6 });
      break;
    }
  }
  return out;
}
