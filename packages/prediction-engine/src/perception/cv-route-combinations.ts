/**
 * Route combination ontology — private template priors for play-concept recognition.
 *
 * This is STAGE 7 of the Madden-derived ontology program. Madden's playbooks
 * have already mapped every combination; this file distills those into a
 * machine-usable prior for the CV pipeline. It is PRIVATE research fuel —
 * never copied geometry, never calibration truth, never public.
 *
 * Layer model:
 *   L1: individual routes (cv-route-extract.ts: go, slant, out, dig, post,
 *       corner, curl, comeback, flat, wheel, screen, drag, seam, hitch)
 *   L2: route combinations (THIS FILE — named 2-4 route groupings)
 *   L3: play concepts (combination + formation + personnel + situation)
 *   L4: gameplan tendencies (aggregate over L3)
 *
 * Each combination defines:
 * - constituent routes with their spatial roles (not exact coordinates)
 * - the coverage stress it creates (why it works)
 * - the pre-snap tells (formation/alignment hints)
 * - the CV signature (what the tracker should look for)
 */

export type RouteName =
  | "go" | "slant" | "out" | "dig" | "post" | "corner"
  | "curl" | "comeback" | "flat" | "wheel" | "screen" | "drag"
  | "seam" | "hitch" | "unknown";

export type FieldSide = "left" | "right" | "middle";
export type RouteDepth = "short" | "intermediate" | "deep";

export interface CombinationRole {
  route: RouteName;
  side: FieldSide;
  depth: RouteDepth;
  /** What this route does to the coverage. */
  purpose: "clear" | "stretch" | "settle" | "primary" | "checkdown" | "decoy";
}

export interface RouteCombination {
  name: string;
  aliases: string[];
  roles: CombinationRole[];
  /** Coverage stress: which defenders are put in conflict. */
  stress: string;
  /** Pre-snap tells the formation classifier should weight. */
  tells: string[];
  /** What the CV tracker looks for: relative geometry + timing. */
  cvSignature: string;
  /** Common variants. */
  variants?: string[];
}

export const ROUTE_COMBINATIONS: RouteCombination[] = [
  // ── Vertical stress ──────────────────────────────────────────────
  {
    name: "verticals",
    aliases: ["four-verticals", "all-go"],
    roles: [
      { route: "go", side: "left", depth: "deep", purpose: "stretch" },
      { route: "seam", side: "middle", depth: "deep", purpose: "primary" },
      { route: "seam", side: "middle", depth: "deep", purpose: "stretch" },
      { route: "go", side: "right", depth: "deep", purpose: "stretch" },
    ],
    stress: "Stresses safeties vertically; forces single-high to choose a seam.",
    tells: ["4 WR or 3x1", "no back in protection", "shotgun"],
    cvSignature: "4+ traces with sustained vertical displacement, minimal lateral break, parallel headings.",
    variants: ["switch-verticals (slot/OLB exchange releases)"],
  },
  {
    name: "yankee",
    aliases: ["mills", "post-dig"],
    roles: [
      { route: "post", side: "left", depth: "deep", purpose: "primary" },
      { route: "dig", side: "right", depth: "intermediate", purpose: "stretch" },
    ],
    stress: "High-lows the deep safety: post over the top, dig underneath.",
    tells: ["2x2", "play-action fake", "single-high safety"],
    cvSignature: "One deep in-breaking trace crossing the hash, one intermediate in-breaker from opposite side; converging then diverging.",
  },

  // ── Horizontal stretch ───────────────────────────────────────────
  {
    name: "levels",
    aliases: ["levels-concept"],
    roles: [
      { route: "dig", side: "left", depth: "intermediate", purpose: "primary" },
      { route: "drag", side: "left", depth: "short", purpose: "stretch" },
    ],
    stress: "High-lows the hook/curl defender: dig over, drag under.",
    tells: ["3x1", "bunch or trips", "man-coverage indicator (drag is a man-beater)"],
    cvSignature: "Two same-side in-breakers at clearly separated depths, parallel headings after the break.",
    variants: ["double-levels (both sides)"],
  },
  {
    name: "spacing",
    aliases: ["spacing-concept"],
    roles: [
      { route: "hitch", side: "left", depth: "short", purpose: "settle" },
      { route: "hitch", side: "middle", depth: "short", purpose: "primary" },
      { route: "hitch", side: "right", depth: "short", purpose: "settle" },
    ],
    stress: "Floods zones horizontally; forces zone defenders to declare.",
    tells: ["3x1 or 2x2", "quick-game situation (3rd-and-short)"],
    cvSignature: "3+ short traces that plant and settle at similar depth, spread across the width.",
  },

  // ── Flood / sail ─────────────────────────────────────────────────
  {
    name: "flood",
    aliases: ["sail", "flood-concept"],
    roles: [
      { route: "go", side: "right", depth: "deep", purpose: "clear" },
      { route: "corner", side: "right", depth: "intermediate", purpose: "primary" },
      { route: "flat", side: "right", depth: "short", purpose: "stretch" },
    ],
    stress: "Three-level flood to one side: clears the corner, attacks the flat defender's leverage.",
    tells: ["3x1 to the flood side", "bootleg or sprint-out action"],
    cvSignature: "Three same-side traces at three distinct depths, all with outward lateral component.",
    variants: ["sail (corner is the primary vs flood's flat read)"],
  },

  // ── Mesh ─────────────────────────────────────────────────────────
  {
    name: "mesh",
    aliases: ["mesh-concept", "shallow-cross"],
    roles: [
      { route: "drag", side: "left", depth: "short", purpose: "primary" },
      { route: "drag", side: "right", depth: "short", purpose: "primary" },
      { route: "corner", side: "left", depth: "intermediate", purpose: "clear" },
    ],
    stress: "Crossing drags create a natural pick vs man; corner clears the zone.",
    tells: ["bunch or stacked", "man-coverage indicator", "motion into bunch"],
    cvSignature: "Two shallow crossing traces that intersect near the formation center, plus an outward breaker.",
    variants: ["return-mesh (drags pivot back)", "mesh-wheel (wheel replaces corner)"],
  },

  // ── Dagger ───────────────────────────────────────────────────────
  {
    name: "dagger",
    aliases: ["dagger-concept"],
    roles: [
      { route: "go", side: "middle", depth: "deep", purpose: "clear" },
      { route: "dig", side: "middle", depth: "intermediate", purpose: "primary" },
    ],
    stress: "Vertical clear by the seam/go holds the safety; dig settles in the void.",
    tells: ["2x2", "slot seam release", "single-high or Tampa-2"],
    cvSignature: "One sustained vertical trace with a second trace breaking in underneath it at intermediate depth.",
  },

  // ── Smash ────────────────────────────────────────────────────────
  {
    name: "smash",
    aliases: ["smash-concept", "hitch-corner"],
    roles: [
      { route: "hitch", side: "right", depth: "short", purpose: "stretch" },
      { route: "corner", side: "right", depth: "intermediate", purpose: "primary" },
    ],
    stress: "High-lows the corner/flat defender: hitch underneath, corner over.",
    tells: ["2x2", "outside leverage corner", "cover-2 indicator"],
    cvSignature: "Short plant-and-settle trace with a deeper out-breaking trace from the same side.",
    variants: ["double-smash (both sides)", "smash-post (post replaces corner vs single-high)"],
  },

  // ── Slant-flat / drive ───────────────────────────────────────────
  {
    name: "slant-flat",
    aliases: ["drive"],
    roles: [
      { route: "slant", side: "left", depth: "short", purpose: "primary" },
      { route: "flat", side: "left", depth: "short", purpose: "stretch" },
    ],
    stress: "Puts the flat defender in conflict: jump the flat, open the slant window.",
    tells: ["2x2 or 3x1", "quick-game", "off-coverage"],
    cvSignature: "Short in-breaker paired with a short out-breaker to the same side, near-simultaneous breaks.",
  },

  // ── Curl-flat ────────────────────────────────────────────────────
  {
    name: "curl-flat",
    aliases: [],
    roles: [
      { route: "curl", side: "right", depth: "intermediate", purpose: "primary" },
      { route: "flat", side: "right", depth: "short", purpose: "stretch" },
    ],
    stress: "High-lows the hook/flat zone defender.",
    tells: ["2x2", "zone-coverage indicator"],
    cvSignature: "Intermediate plant-and-come-back trace with a short outward trace same side.",
  },

  // ── Screen family ────────────────────────────────────────────────
  {
    name: "bubble-screen",
    aliases: ["bubble"],
    roles: [
      { route: "screen", side: "left", depth: "short", purpose: "primary" },
      { route: "screen", side: "left", depth: "short", purpose: "primary" },
    ],
    stress: "Numbers and leverage on the perimeter; blockers lead.",
    tells: ["bunch or trips", "OL releasing", "immediate lateral movement"],
    cvSignature: "Immediate lateral traces behind the line, converging; linemen traces moving outward.",
    variants: ["tunnel-screen (inside)", "slip-screen (RB)"],
  },

  // ── Play-action shots ────────────────────────────────────────────
  {
    name: "post-wheel",
    aliases: ["switch"],
    roles: [
      { route: "post", side: "left", depth: "deep", purpose: "primary" },
      { route: "wheel", side: "left", depth: "deep", purpose: "stretch" },
    ],
    stress: "Wheel stresses the flat defender deep; post attacks the safety.",
    tells: ["play-action", "2-back or 3x1", "single-high"],
    cvSignature: "Deep in-breaker with a deep out-and-up trace from the backfield same side.",
  },
];

/**
 * Match observed route traces to known combinations.
 * Input: classified routes per receiver (from cv-route-extract).
 * Output: ranked combination hypotheses with confidence.
 *
 * This is a prior, not a classifier — it proposes what the play COULD be
 * so downstream logic can weight film evidence accordingly.
 */
export interface CombinationHypothesis {
  combination: string;
  confidence: number;
  matchedRoles: number;
  totalRoles: number;
  notes: string;
}

export function hypothesizeCombinations(
  observed: { route: RouteName; side: FieldSide; depth: RouteDepth }[]
): CombinationHypothesis[] {
  const results: CombinationHypothesis[] = [];
  for (const combo of ROUTE_COMBINATIONS) {
    let matched = 0;
    const usedObs = new Set<number>();
    for (const role of combo.roles) {
      for (let i = 0; i < observed.length; i++) {
        if (usedObs.has(i)) continue;
        const o = observed[i];
        if (!o) continue;
        if (o.route === role.route && o.side === role.side) {
          matched++;
          usedObs.add(i);
          break;
        }
      }
    }
    if (matched >= 2 || (combo.roles.length <= 2 && matched === combo.roles.length)) {
      results.push({
        combination: combo.name,
        confidence: matched / combo.roles.length,
        matchedRoles: matched,
        totalRoles: combo.roles.length,
        notes: combo.stress,
      });
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
