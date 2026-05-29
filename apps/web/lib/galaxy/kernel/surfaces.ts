/**
 * Galaxy Surface Registry — typed manifest of every major product surface.
 *
 * No methodology, weights, thresholds, or prompt content here.
 * This is structural/navigational metadata only.
 */

export type SurfaceKind =
  | "habit-loop"       // daily-use surfaces (today, picks, tracker)
  | "decision-quality" // analytical tools (autopsy, parlay-mri, market-mirage)
  | "intelligence"     // network / research surfaces
  | "academy"          // learning surfaces
  | "commercial"       // pricing, about, methodology
  | "cockpit"          // operator-only admin surfaces
  | "social"           // shareable / OG artifact surfaces
  | "concept";         // editorial / vision concept pages

export type TrustClass =
  | "betting-adjacent" // compliance + trust score ≥ 9 required
  | "educational"      // no betting action directly implied
  | "operator-only";   // auth-gated, never indexed

export type LaunchStatus =
  | "live"
  | "beta"
  | "preview"
  | "planned"
  | "cockpit-only";

export interface SurfaceEntry {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly kind: SurfaceKind;
  readonly trustClass: TrustClass;
  readonly status: LaunchStatus;
  readonly tier: "free" | "pro" | "elite" | "all" | "operator";
  readonly priority: number;
  readonly summary: string;
  /** Whether the surface must expose a TrustStrip (C36). */
  readonly requiresTrustStrip: boolean;
  /** Whether this surface must include a methodology link. */
  readonly requiresMethodologyLink: boolean;
  /** Whether this surface must include a responsible-play link. */
  readonly requiresResponsiblePlayLink: boolean;
  /** Noindex surfaces are never in the sitemap. */
  readonly noindex?: boolean;
}

export const SURFACES: ReadonlyArray<SurfaceEntry> = [
  // ── Habit loop ──────────────────────────────────────────────────────────
  {
    id: "today",
    path: "/today",
    label: "Today's Board",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.95,
    summary: "Daily intelligence briefing — scored picks, board passes, market signals.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "picks",
    path: "/picks",
    label: "PickPilot",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.9,
    summary: "Scored pick archive. Free tier: 1/day. Pro/Elite: full slate.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "no-bet",
    path: "/no-bet",
    label: "No-Bet Engine",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "What the model passed on and why. The discipline layer.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "briefing",
    path: "/briefing",
    label: "Personal Briefing",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Personalized daily briefing based on your tracked slate.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "tracker",
    path: "/tracker",
    label: "Tracker",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Your tracked picks and their outcomes. Process grading over results.",
    requiresTrustStrip: true,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "command",
    path: "/command",
    label: "Command Center",
    kind: "habit-loop",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.9,
    summary: "Decision home. What to understand before acting today.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  // ── Decision quality ────────────────────────────────────────────────────
  {
    id: "autopsy",
    path: "/autopsy",
    label: "Post-Bet Autopsy",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Grade past decisions by process, not result.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "parlay-mri",
    path: "/parlay-mri",
    label: "Parlay MRI",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Structural scan of parlay correlation and expected-value drain.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "market-mirage",
    path: "/market-mirage",
    label: "Market Mirage",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "pro",
    priority: 0.8,
    summary: "Where public narrative diverges from actual market signals.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "roster-shock",
    path: "/roster-shock",
    label: "Roster Shock",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "pro",
    priority: 0.8,
    summary: "Impact model for breaking roster news on open picks.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "coaching-edge",
    path: "/coaching-edge",
    label: "Coaching Edge",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "pro",
    priority: 0.75,
    summary: "Situational coaching and tactical tendencies graded against market.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "profile",
    path: "/profile",
    label: "Betting Brain",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.75,
    summary: "Your decision-quality maturity profile and behavior patterns.",
    requiresTrustStrip: true,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: true,
  },
  // ── Intelligence network ─────────────────────────────────────────────────
  {
    id: "intelligence",
    path: "/intelligence",
    label: "The Network",
    kind: "intelligence",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.9,
    summary: "Map of the full Sports OS intelligence ecosystem.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: false,
  },
  {
    id: "reports",
    path: "/reports",
    label: "Reports",
    kind: "intelligence",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Orbit, Edge, Market Mirage, Signal, Season Preview, and No-Bet reports.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: false,
  },
  {
    id: "brain",
    path: "/brain",
    label: "Research Brain",
    kind: "intelligence",
    trustClass: "educational",
    status: "beta",
    tier: "all",
    priority: 0.8,
    summary: "Q&A with the model. Evidence-cited. No picks, no betting advice.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: false,
  },
  {
    id: "market-gravity",
    path: "/market-gravity",
    label: "Market Gravity",
    kind: "intelligence",
    trustClass: "betting-adjacent",
    status: "beta",
    tier: "pro",
    priority: 0.75,
    summary: "Directional pressure visualization of market movement.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "rumor-radar",
    path: "/rumor-radar",
    label: "Rumor Radar",
    kind: "intelligence",
    trustClass: "educational",
    status: "beta",
    tier: "pro",
    priority: 0.7,
    summary: "Weak signal detection from injury reports, weather, lineups.",
    requiresTrustStrip: true,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: false,
  },
  {
    id: "fantasy",
    path: "/fantasy",
    label: "Fantasy War Room",
    kind: "intelligence",
    trustClass: "educational",
    status: "beta",
    tier: "pro",
    priority: 0.7,
    summary: "Fantasy-specific grading of props and lineup implications.",
    requiresTrustStrip: false,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: false,
  },
  // ── Academy ─────────────────────────────────────────────────────────────
  {
    id: "academy",
    path: "/academy",
    label: "Galaxy Academy",
    kind: "academy",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.8,
    summary: "Structured learning tracks on process-first betting discipline.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  // ── Commercial ──────────────────────────────────────────────────────────
  {
    id: "pricing",
    path: "/pricing",
    label: "Pricing",
    kind: "commercial",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "Three tiers. No upsell games.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "methodology",
    path: "/methodology",
    label: "Methodology",
    kind: "commercial",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.85,
    summary: "How Galaxy scores, ranks, and gates picks. No secret sauce.",
    requiresTrustStrip: false,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: false,
  },
  {
    id: "responsible-play",
    path: "/responsible-play",
    label: "Responsible Play",
    kind: "commercial",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.8,
    summary: "Bankroll rules, support resources, and the no-bet doctrine.",
    requiresTrustStrip: false,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: false,
  },
  // ── Concept / editorial ─────────────────────────────────────────────────
  {
    id: "orbit",
    path: "/orbit",
    label: "Orbit View",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.7,
    summary: "Spatial intelligence map concept. What Galaxy sees.",
    requiresTrustStrip: false,
    requiresMethodologyLink: false,
    requiresResponsiblePlayLink: false,
  },
  // ── Decision Room ────────────────────────────────────────────────────────
  {
    id: "decision-room",
    path: "/room",
    label: "Decision Room",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.88,
    summary: "Per-game intelligence room — evidence, verdict, related intel, coach.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "eyeglass",
    path: "/eyeglass",
    label: "Galaxy Eyeglass",
    kind: "concept",
    trustClass: "educational",
    status: "preview",
    tier: "all",
    priority: 0.78,
    summary: "Future Galaxy companion: paste a game URL, get Galaxy's read. Concept page; not deployed.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "canvas",
    path: "/canvas",
    label: "Slate Canvas",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.83,
    summary: "Spatial view of today's slate. Each game orbits the model center, sized by edge index.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "stream",
    path: "/stream",
    label: "Decision Stream",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.87,
    summary: "Append-only public timeline of every Galaxy decision.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "model-pulse",
    path: "/model-pulse",
    label: "Model Pulse",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.88,
    summary: "Public real-time visualization of the model's metabolism. State, not method.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "decisions",
    path: "/decisions",
    label: "Architecture Decisions",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.84,
    summary: "Public ADR archive — every architectural decision Galaxy has made, with trade-offs.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "we-were-wrong",
    path: "/we-were-wrong",
    label: "We were wrong",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.86,
    summary: "Public model autopsy: what we said, what actually happened, what we changed.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "we-are-not",
    path: "/we-are-not",
    label: "What we refuse",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.9,
    summary: "The conversion patterns Galaxy refuses to use, with evidence of why each is harmful.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "the-evidence",
    path: "/the-evidence",
    label: "The Evidence",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.94,
    summary: "Long-form companion to the canonical ledger. Manifesto excerpt, constellation, no-bet doctrine, publication boundaries.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "manifesto",
    path: "/manifesto",
    label: "Manifesto",
    kind: "concept",
    trustClass: "educational",
    status: "live",
    tier: "all",
    priority: 0.95,
    summary: "Outcome is noise. Process is everything. The 11-beat Galaxy thesis.",
    requiresTrustStrip: false,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
  {
    id: "ledger-canonical",
    path: "/ledger/canonical",
    label: "Canonical Ledger",
    kind: "decision-quality",
    trustClass: "betting-adjacent",
    status: "live",
    tier: "all",
    priority: 0.92,
    summary: "Append-only public record of settled canonical picks. Honest empty state until canonical history accumulates.",
    requiresTrustStrip: true,
    requiresMethodologyLink: true,
    requiresResponsiblePlayLink: true,
  },
] as const;

/** Surfaces that require compliance + trust score ≥ 9 before public launch. */
export const BETTING_ADJACENT_SURFACES = new Set(
  SURFACES.filter((s) => s.trustClass === "betting-adjacent").map((s) => s.id)
);

/** Surfaces that must expose a TrustStrip (C36). */
export const TRUST_STRIP_REQUIRED_SURFACES = new Set(
  SURFACES.filter((s) => s.requiresTrustStrip).map((s) => s.id)
);

/** Surfaces that must link to /methodology. */
export const METHODOLOGY_LINK_REQUIRED_SURFACES = new Set(
  SURFACES.filter((s) => s.requiresMethodologyLink).map((s) => s.id)
);

export function getSurface(id: string): SurfaceEntry | undefined {
  return SURFACES.find((s) => s.id === id);
}

export function getSurfaceByPath(path: string): SurfaceEntry | undefined {
  return SURFACES.find((s) => s.path === path);
}
