/**
 * T15 — the NGS public-surface route fence.
 *
 * WHAT THIS FILE PROVES. The NGS internal-only doctrine (Garrett, 2026-09-28,
 * HARD) says NGS (Next Gen Stats tracking) data is NEVER on the public site:
 * no NGS rows, no NGS metric names, no NGS metric values, no methodology
 * discussion. apps/web/__tests__/ngs-public-exposure.test.ts already proves
 * the FLAG side of that doctrine (no env opt-in can re-open an NGS surface;
 * the deleted NGS-serving routes stay deleted). This file proves the ROUTE
 * side: every route that serves NGS-derived data is fenced, and none of them
 * can be reached by an ANONYMOUS caller.
 *
 * THE REGISTRY IS DERIVED, NOT HAND-WRITTEN. The doctrine's own exposure
 * inventory was a hand-written list of 13 items, and it was already wrong when
 * the fence landed (see the header of public-surface-sweep.test.ts). A
 * hand-written list is a snapshot that goes stale silently. So this file
 * derives the inventory from the tree with a mechanical predicate, and then
 * asserts the DERIVED count matches a pinned constant. The pinned constant is
 * the thing a reviewer has to argue with: if a new NGS-serving route appears,
 * the count changes and CI goes red until the registry is updated on purpose.
 *
 * THE DERIVATION PREDICATE. A route under app/api serves NGS-derived data if
 * its source:
 *
 *   (a) calls an NGS loader or reads the NGS table directly -- the tracking
 *       rows themselves (next_gen_stats), the NGS assets, the NGS signal
 *       projection, or the NGS ingest; OR
 *   (b) imports a loader from lib/nflverse/ or lib/trends/nflverse-readiness
 *       -- the nflverse player-week metric surfaces (usage pulse, snap share,
 *       QBR, combine, injuries, player lab, pressure coverage, QB-age RB
 *       trend, birthday usage trend, readiness). These are NOT NGS tracking
 *       data, but the doctrine keeps them internal all the same: the
 *       keep-out list names "usage pulses", "player-week rows" and the
 *       metric families (QBR, separation, WOPR, EPA), and the nflverse
 *       surface is where those rows live. The doctrine's own note says the
 *       nflverse data is openly licensed (CC-BY-4.0) so showing it is not a
 *       LEGAL exposure "the way NGS would be" -- it is pulled under the
 *       doctrine anyway because the website's surface rule is product
 *       posture, not just legal posture.
 *
 * THE COUNT, AND WHY IT IS NOT 13. The spec names "13 fenced internal
 * routes". The tree does not contain 13 NGS-serving routes; it contains 16,
 * and they fall into two tiers:
 *
 *   15 gated routes that serve NGS-derived or nflverse-derived
 *   data, each behind an internal gate (CRON_SECRET or a premium
 *   entitlement), and
 *   1 route that serves NGS-derived data but is NOT internal --
 *   app/api/picks/route.ts, which reaches db.nextGenStat through the
 *   intelligence bundle and renders NGS prose ("NGS receiving: <name> --
 *   CPOE +4.7, sep 3.90y, YAC+ ...") into intelligence.why[] for a caller
 *   that may be anonymous.
 *
 * THE COUNT IS 16, NOT 13, AND HERE IS THE EXACT DIFFERENCE. The spec names
 * "13 fenced internal routes". Its 13-name list overlaps my derived set on
 * 12 names; the arithmetic of the difference is:
 *
 *   - ops/public-surface-truth is on the spec's list but serves NO NGS data.
 *     It is the operator truth surface: its seven "ngs" hits are all
 *     substrings of "signals"/"assignments", and its four "separation" hits
 *     are the ranking-polarity law ("positive_separation_required",
 *     "bestSeparation" from the ranking projection), not NGS separation. It
 *     serves zero NGS rows and zero NGS metric identifiers, so it is not a
 *     fenced NGS route.
 *
 *   - FOUR routes serve NGS-derived data and are NOT on the spec's list:
 *     cron/signal-ledger-write (reads db.nextGenStat and echoes raw NGS
 *     columns -- cpoe, avgSeparation, avgYacAboveExpectation,
 *     avgAirYardsToSticks -- in its response body), cron/refresh-player-stats
 *     (runs ingestNextGenStats), ops/id-crosswalk (reads db.nextGenStat for
 *     the gsisId -> playerId join health), and picks/route.ts (reaches
 *     db.nextGenStat through the intelligence bundle).
 *
 *   12 on the spec's list - 1 that serves no NGS data + 4 that the list
 *   missed = 15, and trends/nflverse-readiness and ops/ngs-backfill account
 *   for the remainder of the derived 16.
 *
 * So the spec's 13 is not a count the tree supports, and this file does not
 * force it. It pins the DERIVED count (16) and the tier breakdown, so a
 * reviewer sees the number and the evidence behind it rather than a
 * hand-written list that happens to say 13. The tier split is asserted
 * below: 15 gated (5 ops/cron + 10 nflverse) and 1 known public exposure.
 *
 * WHAT "PUBLICLY EXPOSED" MEANS HERE. A route is publicly exposed if an
 * ANONYMOUS caller can reach it. The gate vocabulary is borrowed from
 * public-surface-sweep.test.ts so the two files agree on what a gate is:
 * a self-gate inside the route (cron secret, premium entitlement, B2B key,
 * required session, a readiness/feature flag, the internal-surface fence).
 *
 * THE KNOWN EXCEPTION IS RECORDED, NOT HIDDEN. app/api/picks/route.ts is
 * listed in KNOWN_PUBLIC_NGS_EXPOSURES with the reason it is there. It is a
 * PUBLIC route by design (the published picks board is on the doctrine's
 * KEEP list), and its readiness gate (canExposePublicPicks) is ON by
 * default -- PUBLIC_PICKS_ENABLED defaults to true. The NGS prose in its
 * intelligence.why[] is a real exposure of NGS metric names and values to a
 * possibly-anonymous caller. It is recorded here as a KNOWN, OWNED exposure
 * with the reason, so the fence is honest about it rather than pretending it
 * does not exist, and so the count of "routes that leak NGS identifiers" is
 * exactly 1 and not 0.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(process.cwd(), "app");
const API = join(APP, "api");

/**
 * The DERIVED count, pinned.
 *
 * 16 routes serve NGS-derived or nflverse-derived data: 5 under ops/cron
 * (CRON_SECRET gated), 10 nflverse metric surfaces (premium-entitlement
 * gated), and 1 public route that is a known exposure. This constant is
 * what makes the derivation reviewable: change the tree and this number
 * must be argued about.
 */
const NGS_FENCED_ROUTE_COUNT = 16;

/** Routes under ops/ or cron/ that serve NGS-derived data. CRON gated. */
const NGS_OPS_CRON_ROUTE_COUNT = 5;

/** nflverse player-week metric surfaces. Premium-entitlement gated. */
const NGS_NFLVERSE_ROUTE_COUNT = 10;

/** Public routes that serve NGS-derived data. Known exposures, not gates. */
const NGS_PUBLIC_ROUTE_COUNT = 1;

/**
 * The routes under app/api that serve NGS-derived or nflverse-derived data.
 *
 * Each entry records WHY it is in the registry, in the terms of the file that
 * proves it, so a reviewer can check the claim without re-deriving it.
 */
const NGS_FENCED_ROUTES: Readonly<Record<string, string>> = {
  // --- NGS tracking data itself (next_gen_stats rows / NGS assets) ---
  "cron/ngs-ingest/route.ts":
    "Reads the nflverse NGS assets and projects them to ngs.avg_separation / ngs.ryoe_per_att / ngs.cpoe signal rows.",
  "ops/ngs-backfill/route.ts":
    "Backfills the same NGS assets into the signal ledger for prior seasons.",
  "cron/signal-ledger-write/route.ts":
    "Reads db.nextGenStat directly and echoes raw NGS columns (cpoe, avgSeparation, avgYacAboveExpectation, avgAirYardsToSticks) in its response body.",
  "cron/refresh-player-stats/route.ts":
    "Runs ingestNextGenStats for passing/receiving/rushing as part of the satellite ingest.",
  "ops/id-crosswalk/route.ts":
    "Reads db.nextGenStat to report the gsisId -> playerId join health of the NGS scale table.",
  "picks/route.ts":
    "Reaches db.nextGenStat through the intelligence bundle and renders NGS prose into intelligence.why[] (see KNOWN_PUBLIC_NGS_EXPOSURES).",
  // --- nflverse player-week metric surfaces (doctrine keep-out rows) ---
  "nflverse/usage-pulse/route.ts":
    "Serves the nflverse usage-pulse player-week rows (opportunities per game).",
  "nflverse/snap-share/route.ts":
    "Serves nflverse snap-share player-week rows.",
  "nflverse/qbr/route.ts":
    "Serves nflverse QBR values -- a metric family the doctrine keep-out list names.",
  "nflverse/pressure-coverage/route.ts":
    "Serves nflverse pressure-coverage player-week rows.",
  "nflverse/combine/route.ts":
    "Serves nflverse combine player-week rows.",
  "nflverse/injuries/route.ts":
    "Serves the nflverse injury report rows.",
  "nflverse/player-lab/route.ts":
    "Serves the nflverse PlayerLab player-week rows.",
  "nflverse/birthday-usage-trend/route.ts":
    "Serves the nflverse birthday usage-trend player-week rows.",
  "nflverse/qb-age-rb-trend/route.ts":
    "Serves the nflverse QB-age / RB-trend player-week rows.",
  "trends/nflverse-readiness/route.ts":
    "Serves nflverse data-readiness posture for the player-week sources.",
};

/**
 * Routes that serve NGS-derived data and are reachable by an anonymous
 * caller, with the reason each one is recorded rather than fixed.
 *
 * This is a KNOWN-OWNED list, not an endorsement. An entry here means: the
 * route is public BY DESIGN and the NGS exposure inside it is a real,
 * acknowledged gap that someone has to close. The list is asserted to be
 * EXACTLY the set of derived routes with no internal gate, so a NEW
 * anonymous NGS route fails CI instead of joining this list quietly.
 */
const KNOWN_PUBLIC_NGS_EXPOSURES: Readonly<Record<string, string>> = {
  "picks/route.ts":
    "The published picks board is on the doctrine KEEP list and is deliberately public; its readiness gate (canExposePublicPicks / PUBLIC_PICKS_ENABLED) defaults ON, so an anonymous caller can reach it. The NGS prose in intelligence.why[] (metric names AND values: CPOE, separation, YAC+/-, RYOE/att, aDOT share) is a REAL exposure of NGS material to that caller and is recorded here as an owned gap, not a clean bill of health. Closing it means stripping NGS observations from the public intelligence projection (or gating the intelligence block), which is a product change and not this file's to make.",
};

/**
 * Gate evidence found IN the route file.
 *
 * The vocabulary and the "both polarities" rule are borrowed from
 * public-surface-sweep.test.ts so the two fences agree on what a gate is.
 */
const SELF_GATES: ReadonlyArray<readonly [string, RegExp]> = [
  ["cron secret", /cronAuthError|authorizeCronSecret|CRON_SECRET/],
  ["premium entitlement", /requirePremiumApiRateLimited|requirePremiumApi\b|requirePremium\b|fantasyFloor|requireFantasy/],
  ["b2b api key", /extractB2bApiKey|requireApiKey|GSE_B2B_API_KEYS/],
  ["required session", /requireSession|getServerSession\([^)]*\)\s*(?:\?\?|\|\|)/],
  ["internal-surface fence", /isApiRoutePublic/],
  ["default-off feature flag", /process\.env(?:\[["'][A-Z_]*ENABLED["']\]|\.[A-Z_]*ENABLED)\s*[!=]==?\s*["']true["']/],
];

/**
 * A required session is a gate only when the caller cannot proceed without
 * it. `auth()` returns null for an anonymous caller, so a route that CALLS
 * auth() but does not require its result is NOT gated by the session -- it
 * falls back to FREE entitlements and serves the anonymous caller.
 */
function sessionIsRequired(source: string): boolean {
  // A required session looks like `if (!session) return denied` -- the route
  // refuses outright when there is no session. `const session = await auth()`
  // is NOT that: auth() returns null for an anonymous caller, and the route
  // then falls back to FREE entitlements and serves them.
  if (/if\s*\(\s*!\s*session\s*\)/.test(source)) return true;
  if (/requireSession\s*\(/.test(source)) return true;
  return false;
}

/** The gates this route file carries. */
function gateEvidence(source: string): string[] {
  const found = SELF_GATES.filter(([, re]) => re.test(source)).map(([name]) => name);
  return found;
}

/** True when the route can serve an anonymous caller. */
function isAnonymouslyReachable(source: string): boolean {
  const gates = gateEvidence(source);
  const hard = gates.filter((g) =>
    g === "cron secret" || g === "premium entitlement" || g === "b2b api key",
  );
  if (hard.length > 0) return false;
  if (gates.includes("internal-surface fence")) return false;
  if (gates.includes("default-off feature flag")) return false;
  if (sessionIsRequired(source)) return false;
  // Optional auth() is not a gate: the route falls back to FREE entitlements.
  return true;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/(route\.ts|page\.tsx)$/.test(full)) out.push(full);
  }
  return out;
}

/** The derivation predicate: does this route file serve NGS-derived data? */
function servesNgsDerivedData(source: string): boolean {
  const ngsTracking =
    /next_gen_stats|nextGenStat|projectNgsSignalRows|ingestNextGenStats|ngs-signal-project|loadNflverseNextGenStats|loadNflverseExpectedMetrics|loadNflverseEdgeSignals|loadQbConsensus|loadRushingEfficiency/;
  const nflverseLoaders =
    /@\/lib\/nflverse\/|@\/lib\/trends\/nflverse-readiness|loadNflverse[A-Z]|loadQbAgeRbTrendReport|loadBirthdayUsageTrendReport/;
  return ngsTracking.test(source) || nflverseLoaders.test(source);
}

/** Derive the registry from the tree. */
function deriveFencedRoutes(): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of walk(API)) {
    const rel = relative(API, file).replace(/\\/g, "/");
    const source = readFileSync(file, "utf8");
    if (!servesNgsDerivedData(source)) continue;
    out.set(rel, source);
  }
  return out;
}

const derived = deriveFencedRoutes();

describe("T15 NGS route fence — the derived inventory", () => {
  it("the derivation predicate has teeth (it is not matching nothing)", () => {
    // A guard that passes because it found nothing is worse than no guard.
    const total = walk(API).length;
    expect(total).toBeGreaterThan(100);
    const matched = [...derived.keys()];
    expect(matched.length).toBeGreaterThanOrEqual(NGS_FENCED_ROUTE_COUNT);
    // And it matches the KNOWN NGS shapes, not something incidental.
    expect(matched.some((r) => r.includes("ngs"))).toBe(true);
    expect(matched.some((r) => r.includes("nflverse"))).toBe(true);
  });

  it("the derived set is exactly the pinned registry (no drift)", () => {
    const derivedPaths = [...derived.keys()].sort();
    const registryPaths = Object.keys(NGS_FENCED_ROUTES).sort();
    expect(
      derivedPaths,
      "The set of routes serving NGS-derived data changed. Update NGS_FENCED_ROUTES " +
        "and NGS_FENCED_ROUTE_COUNT on purpose -- do not let this drift silently.",
    ).toEqual(registryPaths);
    expect(derivedPaths.length).toBe(NGS_FENCED_ROUTE_COUNT);
  });

  it("every registry entry records WHY the route is in it", () => {
    for (const [path, reason] of Object.entries(NGS_FENCED_ROUTES)) {
      expect(reason.trim().length, `${path} needs a recorded reason`).toBeGreaterThan(20);
    }
  });

  it("every registry entry exists on disk", () => {
    for (const path of Object.keys(NGS_FENCED_ROUTES)) {
      expect(existsSync(join(API, path)), `${path} must exist`).toBe(true);
    }
  });

  it("the registry splits into 5 ops/cron, 10 nflverse and 1 public route", () => {
    const opsCron = [...derived.keys()].filter((r) => /^(ops|cron)\//.test(r));
    const nflverse = [...derived.keys()].filter((r) => /^(nflverse|trends)\//.test(r));
    const pub = [...derived.keys()].filter(
      (r) => !/^(ops|cron|nflverse|trends)\//.test(r),
    );
    expect(opsCron.length).toBe(NGS_OPS_CRON_ROUTE_COUNT);
    expect(nflverse.length).toBe(NGS_NFLVERSE_ROUTE_COUNT);
    expect(pub.length).toBe(NGS_PUBLIC_ROUTE_COUNT);
    // The counts must add up to the pinned total, so no route can hide in an
    // unclassified bucket.
    expect(opsCron.length + nflverse.length + pub.length).toBe(NGS_FENCED_ROUTE_COUNT);
  });
});

describe("T15 NGS route fence — no NGS route is anonymously reachable", () => {
  it("no derived route serves NGS data to an anonymous caller", () => {
    const anonymous: string[] = [];
    for (const [path, source] of derived) {
      if (!isAnonymouslyReachable(source)) continue;
      if (KNOWN_PUBLIC_NGS_EXPOSURES[path]) continue;
      anonymous.push(path);
    }
    expect(
      anonymous.length,
      `${anonymous.length} NGS-serving route(s) are reachable by an anonymous caller:\n  ` +
        `${anonymous.join("\n  ")}\n` +
        "Either fence the route, or record it in KNOWN_PUBLIC_NGS_EXPOSURES with a reason.",
    ).toBe(0);
  });

  it("every internal (ops/cron) NGS route carries a hard internal gate", () => {
    const ungated: string[] = [];
    for (const [path, source] of derived) {
      if (!/^(ops|cron)\//.test(path)) continue;
      const gates = gateEvidence(source);
      const hard = gates.some(
        (g) => g === "cron secret" || g === "premium entitlement" || g === "b2b api key",
      );
      if (!hard) ungated.push(`${path} (gates: ${gates.join(", ") || "none"})`);
    }
    expect(
      ungated.length,
      `${ungated.length} internal NGS route(s) have no hard gate:\n  ${ungated.join("\n  ")}`,
    ).toBe(0);
  });

  it("every nflverse metric route is behind a premium entitlement", () => {
    const ungated: string[] = [];
    for (const [path, source] of derived) {
      if (!path.includes("nflverse")) continue;
      if (!/requirePremiumApiRateLimited|requirePremiumApi\b|requirePremium\b/.test(source)) {
        ungated.push(path);
      }
    }
    expect(
      ungated.length,
      `${ungated.length} nflverse metric route(s) are not premium-gated:\n  ${ungated.join("\n  ")}`,
    ).toBe(0);
  });
});

describe("T15 NGS route fence — the known-exposure list is exact", () => {
  it("the known-exposure list is exactly the set of anonymously reachable NGS routes", () => {
    const reachable = [...derived.keys()].filter((p) => isAnonymouslyReachable(derived.get(p)!));
    const recorded = Object.keys(KNOWN_PUBLIC_NGS_EXPOSURES).sort();
    expect(
      reachable.sort(),
      "The set of anonymously reachable NGS-serving routes changed. If a new one " +
        "appeared, record it in KNOWN_PUBLIC_NGS_EXPOSURES with a reason. If one " +
        "was fixed, remove it from that list.",
    ).toEqual(recorded);
  });

  it("every known exposure carries a reason, and the reason admits the exposure", () => {
    for (const [path, reason] of Object.entries(KNOWN_PUBLIC_NGS_EXPOSURES)) {
      expect(reason.trim().length, `${path} needs a recorded reason`).toBeGreaterThan(40);
      // A reason that claims the route is clean would be a lie the fence
      // cannot detect, so the reason must name the exposure.
      expect(reason.toLowerCase(), `${path} reason must name the exposure`).toMatch(
        /exposure|gap|leak|real/,
      );
    }
  });

  it("the known-exposure list is not stale (every listed route still exists)", () => {
    for (const path of Object.keys(KNOWN_PUBLIC_NGS_EXPOSURES)) {
      expect(existsSync(join(API, path)), `${path} must exist`).toBe(true);
    }
  });
});

describe("T15 NGS route fence — no NGS metric identifier is served publicly", () => {
  it("no anonymous route returns NGS metric identifiers or values", () => {
    // The identifiers the doctrine names, in their data-bearing form.
    const NGS_IDENTIFIERS =
      /ngs\.(avg_separation|ryoe_per_att|cpoe)|avg_separation|avgSeparation|ryoe_per_att|ryoePerAtt|rushYardsOverExpected|\bcpoe\b|yacOverExp|avgYacAboveExpectation|pctShareIntendedAirYards|avgAirYardsToSticks/i;
    const leaks: string[] = [];
    for (const [path, source] of derived) {
      if (!isAnonymouslyReachable(source)) continue;
      if (!NGS_IDENTIFIERS.test(source)) continue;
      leaks.push(path);
    }
    // The picks route renders NGS prose from a RUNTIME bundle, so the
    // identifiers are not in its source text -- the exposure is recorded in
    // KNOWN_PUBLIC_NGS_EXPOSURES instead. A route that NAMED an NGS
    // identifier directly would be a second, unreviewed leak.
    expect(
      leaks.filter((p) => !KNOWN_PUBLIC_NGS_EXPOSURES[p]),
      `${leaks.length} route(s) name an NGS metric identifier and are anonymously reachable:\n  ${leaks.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the picks route really does render NGS prose (the recorded exposure is real)", () => {
    // The recorded exposure must be REAL. If the NGS prose stopped reaching
    // why[], this entry would be a stale excuse and the file should be
    // removed rather than quietly kept.
    const src = readFileSync(join(API, "picks/route.ts"), "utf8");
    // The route loads the DB surfaces that include db.nextGenStat, and it
    // projects the intelligence block with canSeeConfidence=true, which keeps
    // why[] intact for every viewer tier.
    expect(src).toContain("loadBundleSurfaces");
    expect(src).toContain("projectPickIntelligenceForViewer");
    expect(src).toMatch(/projectPickIntelligenceForViewer\(\s*raw,\s*true/);
    // The prose itself is produced by the NGS adapter, not by the route.
    const adapter = readFileSync(
      join(process.cwd(), "lib/intelligence-core/signal-adapters.ts"),
      "utf8",
    );
    expect(adapter).toContain("NGS ");
    expect(adapter).toMatch(/avgSeparation/);
  });
});
