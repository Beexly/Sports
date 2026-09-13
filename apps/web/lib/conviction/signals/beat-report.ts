/**
 * Beat-report signal — does independent reporting back the side the engine took?
 *
 * WHAT IT READS. The news wire, through the scoring that already exists in
 * `lib/news/impact.ts`: `rankWireCorroborated()` (tier weight x signal magnitude
 * x freshness decay, lifted when a story is corroborated) and `corroborate()`
 * (two or more DISTINCT sources on the same team+player+signal). Nothing here
 * re-implements that scoring; this module only turns it into a gate verdict.
 *
 * THE CORROBORATION RULE, which is the whole point. A single unconfirmed rumour
 * NEVER produces a verdict. Only a story with `corroboration.confirmed` (2+
 * distinct sources) can CONFIRM or CONTRADICT, and only from a tier that does
 * primary reporting — Insider, Beat, Verified. Aggregator and Unconfirmed items
 * are read, counted, and then never allowed to vote: a re-poster with no primary
 * sourcing is not a second source.
 *
 * WHAT IT CANNOT DO. Like every signal behind `gate-contract.ts`, it can only
 * withhold publication. It never scores, never ranks, never edits a selection,
 * and it returns `null` — not NEUTRAL, not 0 — whenever it has nothing real to
 * say. Absent data is not evidence.
 *
 * HONESTY CONSTRAINT — READ THIS BEFORE WIRING IT UP.
 *
 *   The wire this repo ships today (`lib/news/wire.ts` DEMO_WIRE) is SAMPLE
 *   data with fictional reporters and fictional reports. A fabricated wire must
 *   never gate a real pick: a made-up "two sources say the starting QB is out"
 *   would hold a real published row for a reason that does not exist, and the
 *   held-row explanation shown to a reader would be a lie.
 *
 *   So `live` defaults to FALSE and the signal returns null unconditionally
 *   until an operator passes `live: true` alongside a loader backed by real
 *   ingested reporting. Wiring this module in before that flip is a no-op by
 *   construction, which is exactly the intent.
 */

import type { GateCandidate, SignalFn, SignalRead } from "../gate-contract";
import {
  rankWireCorroborated,
  signalLabel,
  type NewsItem,
  type SignalType,
  type Tier,
} from "@/lib/news/impact";

/** Tiers that do primary reporting. Only these may produce a verdict. */
const VERDICT_TIERS: ReadonlySet<Tier> = new Set<Tier>(["Insider", "Beat", "Verified"]);

/**
 * How a signal type reads for the TEAM THE ITEM IS ABOUT.
 *
 * This is a LOCAL mapping on purpose. The founder's queue asks for a
 * `coach-report` signal type, and that belongs in the shared taxonomy, not here
 * — but another agent may be in that file, and widening a shared union from a
 * leaf module is how two agents collide.
 *
 * TODO(founder-blocked): add a `coach-report` member to the `SignalType` union
 * at `apps/web/lib/news/impact.ts:25` (plus its row in the `SIGNAL` magnitude
 * table) and map it here as "hurts" when the report is a scheme/staff change
 * against the team it names. AGENTS.md scraping-queue item 3 lists this as
 * founder-blocked: "Founder: provide the feed URLs" for each team's top beat
 * reporter before a coach-report tier has anything real to read.
 *
 * Signs agree with the existing `SIGNAL` market magnitudes in impact.ts, with
 * two deliberate exceptions marked "irrelevant" because their sign is NOT
 * knowable from the type alone:
 *   - `trade`: a trade can strengthen or gut the team it names.
 *   - `weather`: not team-specific; it lands on both sides of the same game.
 */
const TEAM_DIRECTION: Record<SignalType, "helps" | "hurts" | "irrelevant"> = {
  "injury-out": "hurts",
  "injury-return": "helps",
  "role-up": "helps",
  "role-down": "hurts",
  trade: "irrelevant",
  // A scheme shift reads as a positive for the team it names (impact.ts market
  // +22). A scheme change AGAINST our side therefore arrives as a "helps" on
  // the OPPONENT's row, which this signal flips to CONTRADICTS for us.
  scheme: "helps",
  suspension: "hurts",
  weather: "irrelevant",
  "depth-chart": "helps",
};

/** Net read for OUR side, after flipping items that are about the opponent. */
type Effect = "favours-us" | "against-us" | "no-read";

export type BeatReportDeps = {
  /**
   * Real reporting for one game. Injected: this module opens no sockets and
   * reads no database, so it is testable and cannot smuggle a network call into
   * the gate path.
   */
  readonly loadWireForGame: (
    gameId: string,
    teams: { home: string; away: string },
  ) => Promise<readonly NewsItem[]>;
  /**
   * TRUE only when `loadWireForGame` is backed by real ingested reporting.
   * Default FALSE, and while false this signal returns null on every candidate.
   * A fabricated wire must never gate a real pick.
   */
  readonly live?: boolean;
};

function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lastToken(normalized: string): string {
  const parts = normalized.split(" ");
  const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
  return last ?? "";
}

/** Conservative team match: exact, containment, or a shared nickname token. */
function teamMatches(a: string, b: string): boolean {
  const x = normalizeTeam(a);
  const y = normalizeTeam(b);
  if (x.length === 0 || y.length === 0) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  const xLast = lastToken(x);
  const yLast = lastToken(y);
  // 4+ chars so "sox", "jets" style collisions on short tokens cannot fire.
  return xLast.length >= 4 && xLast === yLast;
}

/** The team the engine actually backed, or null when there isn't one. */
function ourTeamOf(candidate: GateCandidate): string | null {
  if (candidate.side === "home") return candidate.homeTeamName;
  if (candidate.side === "away") return candidate.awayTeamName;
  // Totals ("over"/"under") and an undetermined side have no team to back, so
  // a team-scoped report cannot be read for or against them. Null, not a guess.
  return null;
}

function effectOf(item: NewsItem, ourTeam: string): Effect {
  const direction = TEAM_DIRECTION[item.signal];
  if (direction === "irrelevant") return "no-read";
  const aboutUs = teamMatches(item.team, ourTeam);
  if (direction === "hurts") return aboutUs ? "against-us" : "favours-us";
  return aboutUs ? "favours-us" : "against-us";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the signal. Returns a `SignalFn` the gate can consult like any other;
 * it answers null whenever it has nothing real, which is most of the time.
 */
export function createBeatReportSignal(deps: BeatReportDeps): SignalFn {
  const live = deps.live ?? false;

  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    // Sample wire => no vote, ever. See the module header.
    if (!live) return null;

    const ourTeam = ourTeamOf(candidate);
    if (ourTeam === null) return null;

    const opponent =
      ourTeam === candidate.homeTeamName ? candidate.awayTeamName : candidate.homeTeamName;

    const items = await deps.loadWireForGame(candidate.gameId, {
      home: candidate.homeTeamName,
      away: candidate.awayTeamName,
    });
    if (items.length === 0) return null;

    const relevant = items.filter(
      (it) => teamMatches(it.team, ourTeam) || teamMatches(it.team, opponent),
    );
    if (relevant.length === 0) return null;

    // Reuse the wire's own scoring: tier weight x magnitude x freshness, with
    // the corroboration lift. Sorted by urgency, so index 0 is the loudest.
    const ranked = rankWireCorroborated(relevant);
    const corroborated = ranked.filter((r) => r.corroboration.confirmed);

    // Nothing reached two distinct sources: rumour only. No verdict, no vote.
    if (corroborated.length === 0) return null;

    const completeness = round2(corroborated.length / relevant.length);
    const basis =
      "news wire, corroborated (lib/news/impact.ts corroborate + rankWireCorroborated; 2+ distinct sources)";

    const eligible = corroborated.filter(
      (r) => VERDICT_TIERS.has(r.item.tier) && effectOf(r.item, ourTeam) !== "no-read",
    );

    if (eligible.length === 0) {
      return {
        key: "beat-report",
        verdict: "NEUTRAL",
        reason: `We found ${corroborated.length} confirmed report${corroborated.length === 1 ? "" : "s"} on this game, but none of them move ${ourTeam} either way.`,
        basis,
        completeness,
      };
    }

    const against = eligible.filter((r) => effectOf(r.item, ourTeam) === "against-us");
    const favouring = eligible.filter((r) => effectOf(r.item, ourTeam) === "favours-us");

    // CONTRADICTS wins outright: one credible piece of evidence against our
    // side is enough, and the gate's worst failure must stay "we said nothing".
    const lead = against.length > 0 ? against[0] : favouring[0];
    if (lead === undefined) return null;

    const who = lead.item.player ?? lead.item.team;
    const sources = lead.corroboration.sourceNames.join(", ");
    const label = signalLabel(lead.item.signal).toLowerCase();

    if (against.length > 0) {
      return {
        key: "beat-report",
        verdict: "CONTRADICTS",
        reason: `${lead.corroboration.sources} sources have ${who} (${lead.item.team}) ${label} — ${sources}. That runs against ${ourTeam}, so we are not putting this one out.`,
        basis,
        completeness,
      };
    }

    return {
      key: "beat-report",
      verdict: "CONFIRMS",
      reason: `${lead.corroboration.sources} sources have ${who} (${lead.item.team}) ${label} — ${sources}. That lands on the side of ${ourTeam}.`,
      basis,
      completeness,
    };
  };
}
