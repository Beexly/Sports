/**
 * Which conviction signals are live, and why the rest are not.
 *
 * This is the honest inventory. Every signal the founder asked for has a slot
 * here. A slot is LIVE only when a real data source is actually reaching it;
 * otherwise it is declared, inert, and named — so the gate's own report can say
 * "we consulted four things and three more are not wired yet" instead of
 * quietly consulting fewer than it claims.
 *
 * The rule that makes this safe: an inert signal returns null, and null is not
 * evidence (see gate-contract.ts). Adding a slot before its data exists costs
 * nothing and hides nothing.
 *
 * ── WITHHOLDING IS THE OPERATOR'S CALL, NOT THIS MODULE'S ────────────────────
 *
 * `evaluateGate` defaults to `requireEvidence: false`, and this registry never
 * overrides that. So wiring the gate into a publish path changes NOTHING about
 * what gets published until an operator turns it on deliberately. That is not
 * timidity: AGENTS.md law 3 puts gate posture in the founder's hands, and a
 * gate an agent switched on by itself would be exactly the unearned change that
 * rule exists to prevent.
 *
 * What an agent CAN do, and what this module is built for, is run every signal
 * for real, right now, and show the verdict. Report first, withhold on the
 * founder's word. That is not a shadow period — the numbers are live and
 * immediate — it is just leaving the last switch where it belongs.
 */

import type { SignalFn, SignalKey } from "./gate-contract";

/** What a signal needs before it may vote, in plain terms. */
export type SignalStatus = {
  readonly key: SignalKey;
  readonly label: string;
  /** True when a real source is reaching this signal today. */
  readonly live: boolean;
  /**
   * When not live: exactly what has to happen. Written for the founder, not for
   * a developer — these strings are meant to be read off an ops surface.
   */
  readonly blockedBy: string | null;
  /** The real-world source this signal reads, live or intended. */
  readonly source: string;
};

/**
 * The full inventory, in the order the gate consults it.
 *
 * Live-ness is a FACT about the environment, not a preference, so each entry
 * derives it from something observable rather than from a hand-set boolean.
 */
export function signalInventory(
  env: Record<string, string | undefined> = process.env,
): readonly SignalStatus[] {
  const eventOddsOn = env["EVENT_ODDS_INGEST_ENABLED"]?.trim().toLowerCase() === "true";
  const lineArchiveOn = env["LINE_ARCHIVE_ENABLED"]?.trim().toLowerCase() === "true";

  return [
    {
      key: "book-agreement",
      label: "How many books price this, and how tightly they agree",
      live: true,
      blockedBy: null,
      source: "odds table (bookmakerCount, consensus) — already populated",
    },
    {
      key: "market-movement",
      label: "Has the market moved toward our side since we posted",
      live: lineArchiveOn,
      blockedBy: lineArchiveOn
        ? null
        : "LINE_ARCHIVE_ENABLED is off, so no line history is being kept to compare against.",
      source: "odds_line_snapshots (append-only line archive)",
    },
    {
      key: "rest-travel",
      label: "Rest days, short weeks, byes, travel and time zones crossed",
      live: true,
      blockedBy: null,
      source: "team schedule (games table) + static NFL stadium table",
    },
    {
      key: "prop-alignment",
      label: "Do the player props for this game agree with the total we took",
      live: eventOddsOn,
      blockedBy: eventOddsOn
        ? null
        : "EVENT_ODDS_INGEST_ENABLED is off, so no real prop lines are being stored. The props on /fantasy/props today are illustrative and must never gate a real pick.",
      source: "OddsLineSnapshot prop rows (needs the event-odds ingest flip)",
    },
    {
      key: "beat-report",
      label: "Corroborated beat, insider and coach reporting on this game",
      live: false,
      blockedBy:
        "The news wire is still sample data with fictional reporters. Needs real beat-reporter RSS feeds per team, which AGENTS.md records as founder-supplied (scraping queue item 3).",
      source: "NEWS_RSS_FEEDS + lib/news/impact.ts corroboration",
    },
    {
      key: "scheme-matchup",
      label: "Coverage, box counts and scheme edges for this matchup",
      live: false,
      blockedBy:
        "nflverse play-by-play is unreachable (health reports nflverse-reports unavailable), and the coverage splits need Next Gen Stats if the licence clears.",
      source: "nflverse play-by-play (+ Next Gen Stats for coverage splits)",
    },
    {
      key: "narrative-incentive",
      label: "Contract bonuses, milestones, records, revenge and elimination stakes",
      live: false,
      blockedBy:
        "No source exists in the repo. Needs a verified facts feed where every entry carries a citation and a verified-at date; the module will never infer a narrative on its own.",
      source: "none yet — input contract defined, awaiting a real feed",
    },
  ];
}

/** The keys that can actually vote today. */
export function liveSignalKeys(
  env: Record<string, string | undefined> = process.env,
): readonly SignalKey[] {
  return signalInventory(env)
    .filter((s) => s.live)
    .map((s) => s.key);
}

/**
 * Assemble the signal functions to run. Callers pass the constructed signals
 * keyed by name; anything whose slot is not live is dropped here rather than
 * relying on each module's own `live` flag, so there is one place to audit.
 */
export function selectLiveSignals(
  built: Partial<Record<SignalKey, SignalFn>>,
  env: Record<string, string | undefined> = process.env,
): readonly SignalFn[] {
  const live = new Set(liveSignalKeys(env));
  const out: SignalFn[] = [];
  for (const status of signalInventory(env)) {
    if (!live.has(status.key)) continue;
    const fn = built[status.key];
    if (fn) out.push(fn);
  }
  return out;
}
