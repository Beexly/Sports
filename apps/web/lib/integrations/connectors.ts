/**
 * Connector registry — the honest, single source of truth for which fantasy /
 * DFS platforms Galaxy Sports Edge can legally sync, and how.
 *
 * Every entry states the real legal + technical position. We do NOT scrape
 * closed platforms or use unofficial private-cookie endpoints, even when a user
 * names the platform — instead we say plainly what's possible and what it would
 * take. The only connector live today is Sleeper, whose read API is public and
 * documented for third-party apps (GET-only; we never write).
 *
 * Status meanings:
 *   - "live"          : works now, read-only, no setup beyond entering a handle.
 *   - "oauth-gated"   : an official API exists; needs a founder-registered app
 *                       + the user's one-time sign-in. Built behind the gate.
 *   - "licensed-feed" : no roster/lineup import, but the underlying data
 *                       (e.g. DFS salaries) is available via a licensed provider.
 *   - "unavailable"   : no legal automated read path. We will not use unofficial
 *                       or ToS-violating endpoints. Manual entry only.
 *
 * Pure data + selectors — fully testable, no I/O.
 */

export type ConnectorStatus = "live" | "oauth-gated" | "licensed-feed" | "unavailable";
export type ConnectorKind = "season" | "best-ball" | "pick-em" | "dfs";

export interface Connector {
  readonly key: string;
  readonly name: string;
  readonly kind: ConnectorKind;
  readonly status: ConnectorStatus;
  /** How a user authenticates / how we read (plain language). */
  readonly auth: string;
  /** What the user gets when this connector is available. */
  readonly enables: string;
  /** What it would take to turn this on (null when already live). */
  readonly path: string | null;
  /** The legal / technical reason for the status. Always truthful. */
  readonly why: string;
}

export const CONNECTORS: readonly Connector[] = [
  {
    key: "sleeper",
    name: "Sleeper",
    kind: "season",
    status: "live",
    auth: "Public read API — no login, GET-only",
    enables: "Import your leagues, rosters, and standings; resolve real players. Read-only.",
    path: null,
    why: "Sleeper publishes a documented, public read API for third-party apps. We only ever GET — never write, post, or change anything in your league.",
  },
  {
    key: "sleeper-bestball",
    name: "Sleeper Best Ball",
    kind: "best-ball",
    status: "live",
    auth: "Public read API — no login, GET-only",
    enables: "Your best-ball drafts and rosters come through the same public Sleeper read API.",
    path: null,
    why: "Same public Sleeper API as season leagues — read-only.",
  },
  {
    key: "yahoo",
    name: "Yahoo Fantasy",
    kind: "season",
    status: "oauth-gated",
    auth: "Official Yahoo OAuth 2.0 — your one-time sign-in",
    enables: "Read-only Yahoo roster + league sync once connected.",
    path: "Needs a founder-registered Yahoo developer app (client id/secret) and your one-time OAuth consent. The read flow is built; it activates behind the founder gate.",
    why: "Yahoo offers an official Fantasy Sports API with read scopes via OAuth. It is permitted with a registered app and user consent — no scraping required.",
  },
  {
    key: "espn",
    name: "ESPN Fantasy",
    kind: "season",
    status: "unavailable",
    auth: "No official public or partner fantasy API",
    enables: "Manual entry only until ESPN ships a supported read API.",
    path: "Blocked: ESPN has no public/partner fantasy API. The widely-shared endpoints require private account cookies (SWID / espn_s2), and automating them violates ESPN's Terms of Use — so we will not.",
    why: "Using unofficial private-cookie endpoints would breach ESPN's ToS. We don't do that. If ESPN releases a supported API, we wire it the same day.",
  },
  {
    key: "nfl",
    name: "NFL.com Fantasy",
    kind: "season",
    status: "unavailable",
    auth: "No public read API",
    enables: "Manual entry only.",
    path: "Blocked: NFL.com Fantasy exposes no public or partner read API for third-party roster sync.",
    why: "No documented, permitted read path. We won't scrape it.",
  },
  {
    key: "underdog",
    name: "Underdog Fantasy",
    kind: "best-ball",
    status: "unavailable",
    auth: "No public read API",
    enables: "Best-ball draft tools work on our own data; we can't auto-import your Underdog rosters.",
    path: "Blocked: Underdog has no public API and its Terms prohibit automated access/scraping. ADP and draft tooling run on our own legal data instead.",
    why: "Automating Underdog would violate its Terms of Service. We respect that and build the draft tools on cleared sources.",
  },
  {
    key: "prizepicks",
    name: "PrizePicks",
    kind: "pick-em",
    status: "unavailable",
    auth: "No public read API",
    enables: "Pick'em line-edge tooling runs on cleared lines/projections, not a PrizePicks import.",
    path: "Blocked: PrizePicks offers no public API and its Terms prohibit automated access. We do not scrape it.",
    why: "Respecting PrizePicks' Terms. The Pick'em Edge tool compares against legally-sourced lines only.",
  },
  {
    key: "dabble",
    name: "Dabble",
    kind: "pick-em",
    status: "unavailable",
    auth: "No public read API",
    enables: "Same as PrizePicks — edge tooling on cleared data, no account import.",
    path: "Blocked: no public API; Terms prohibit automated access.",
    why: "Respecting Dabble's Terms. No scraping.",
  },
  {
    key: "drafters",
    name: "Drafters",
    kind: "best-ball",
    status: "unavailable",
    auth: "No public read API",
    enables: "Best-ball tooling on our own data; no auto-import.",
    path: "Blocked: no public/partner API for third-party reads.",
    why: "No permitted read path. We won't scrape it.",
  },
  {
    key: "rtsports",
    name: "RTSports",
    kind: "season",
    status: "unavailable",
    auth: "No public read API",
    enables: "Manual entry only.",
    path: "Blocked: no public/partner API. A future CSV import is the realistic legal path.",
    why: "No documented read API. A user-provided CSV export would be the clean, consented route if added.",
  },
  {
    key: "fanduel",
    name: "FanDuel",
    kind: "dfs",
    status: "licensed-feed",
    auth: "No lineup import; salaries via licensed provider",
    enables: "FanDuel DFS salaries flow through a licensed data provider (founder-gated). We can't import your entered lineups.",
    path: "Salaries activate when the licensed DFS provider key is set (SportsDataIO / FantasyData). Direct lineup import is not offered — no permitted API.",
    why: "FanDuel has no public lineup API. DFS salaries are obtained from a licensed provider under contract — never scraped.",
  },
  {
    key: "draftkings",
    name: "DraftKings",
    kind: "dfs",
    status: "licensed-feed",
    auth: "No lineup import; salaries via licensed provider",
    enables: "DraftKings DFS salaries flow through a licensed data provider (founder-gated). We can't import your entered lineups.",
    path: "Salaries activate when the licensed DFS provider key is set. The unofficial DraftKings endpoint is forbidden (Terms of Use), so we use a licensed feed instead.",
    why: "DraftKings' hidden endpoint violates its Terms of Use (and the hiQ v. LinkedIn caution). We obtain salaries from a licensed provider under contract.",
  },
] as const;

const STATUS_ORDER: readonly ConnectorStatus[] = ["live", "oauth-gated", "licensed-feed", "unavailable"];

export const CONNECTOR_STATUS_LABEL: Record<ConnectorStatus, string> = {
  live: "Live now",
  "oauth-gated": "Founder-gated (OAuth)",
  "licensed-feed": "Licensed data feed",
  unavailable: "No legal sync",
};

/** Connectors grouped by status, in display order (live first). */
export function connectorsByStatus(connectors: readonly Connector[] = CONNECTORS): {
  readonly status: ConnectorStatus;
  readonly label: string;
  readonly items: readonly Connector[];
}[] {
  return STATUS_ORDER.map((status) => ({
    status,
    label: CONNECTOR_STATUS_LABEL[status],
    items: connectors.filter((c) => c.status === status),
  })).filter((group) => group.items.length > 0);
}

/** A single connector by key. */
export function connectorByKey(key: string, connectors: readonly Connector[] = CONNECTORS): Connector | null {
  return connectors.find((c) => c.key === key) ?? null;
}

/** Counts for a readiness line: how many sync live now vs. total. */
export function connectorSummary(connectors: readonly Connector[] = CONNECTORS): {
  readonly live: number;
  readonly gated: number;
  readonly total: number;
} {
  return {
    live: connectors.filter((c) => c.status === "live").length,
    gated: connectors.filter((c) => c.status === "oauth-gated" || c.status === "licensed-feed").length,
    total: connectors.length,
  };
}
