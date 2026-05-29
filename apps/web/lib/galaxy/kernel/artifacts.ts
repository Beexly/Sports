/**
 * Galaxy Artifact Registry — typed manifest of all shareable artifact types.
 *
 * Drives: /api/og/[artifact] dynamic route, /artifacts/preview QA surface.
 *
 * Hard rule: no artifact may contain factor weights, thresholds, prompt
 * text, or calibration formulas. Enforced via containsForbiddenForPublic()
 * in tests (C44).
 */

export type ArtifactTypeId =
  | "pick"
  | "no-bet"
  | "autopsy"
  | "parlay-mri"
  | "market-mirage"
  | "roster-shock"
  | "coaching-edge"
  | "academy-badge"
  | "bettor-brain"
  | "discipline-recap"
  | "edge-lab";

export interface ArtifactType {
  readonly id: ArtifactTypeId;
  readonly label: string;
  readonly description: string;
  /** OG image dimensions */
  readonly width: 1200;
  readonly height: 630;
  /** Background gradient class for OG image */
  readonly bgGradient: string;
  /** Accent color (hex) for highlights */
  readonly accentHex: string;
  /** Surface this artifact originates from */
  readonly sourceSurface: string;
  /** Whether a compliance disclaimer is required in the OG image */
  readonly requiresDisclaimer: boolean;
  /** Whether the artifact must include evidence chain metadata */
  readonly requiresEvidenceChain: boolean;
}

export const ARTIFACT_TYPES: ReadonlyArray<ArtifactType> = [
  {
    id: "pick",
    label: "Signal",
    description: "Shareable card for a single published pick signal.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-blue-950",
    accentHex: "#3b82f6",
    sourceSurface: "/picks",
    requiresDisclaimer: true,
    requiresEvidenceChain: true,
  },
  {
    id: "no-bet",
    label: "No-Bet",
    description: "Shareable card celebrating a disciplined pass decision.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-emerald-950",
    accentHex: "#10b981",
    sourceSurface: "/no-bet",
    requiresDisclaimer: true,
    requiresEvidenceChain: false,
  },
  {
    id: "autopsy",
    label: "Autopsy",
    description: "Shareable post-bet decision grade — process score, not result.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-violet-950",
    accentHex: "#8b5cf6",
    sourceSurface: "/autopsy",
    requiresDisclaimer: false,
    requiresEvidenceChain: true,
  },
  {
    id: "parlay-mri",
    label: "Parlay MRI",
    description: "Structural scan result for a parlay — correlation and EV impact.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-rose-950",
    accentHex: "#f43f5e",
    sourceSurface: "/parlay-mri",
    requiresDisclaimer: true,
    requiresEvidenceChain: false,
  },
  {
    id: "market-mirage",
    label: "Market Mirage",
    description: "Public narrative vs. market signal divergence snapshot.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-amber-950",
    accentHex: "#f59e0b",
    sourceSurface: "/market-mirage",
    requiresDisclaimer: true,
    requiresEvidenceChain: true,
  },
  {
    id: "roster-shock",
    label: "Roster Shock",
    description: "Shareable impact snapshot from a breaking roster event.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-orange-950",
    accentHex: "#f97316",
    sourceSurface: "/roster-shock",
    requiresDisclaimer: true,
    requiresEvidenceChain: true,
  },
  {
    id: "coaching-edge",
    label: "Coaching Edge",
    description: "Tactical tendency snapshot — coach vs. matchup grading.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-cyan-950",
    accentHex: "#06b6d4",
    sourceSurface: "/coaching-edge",
    requiresDisclaimer: true,
    requiresEvidenceChain: true,
  },
  {
    id: "academy-badge",
    label: "Academy Badge",
    description: "Completion badge for finishing an Academy module or track.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-indigo-950",
    accentHex: "#6366f1",
    sourceSurface: "/academy",
    requiresDisclaimer: false,
    requiresEvidenceChain: false,
  },
  {
    id: "bettor-brain",
    label: "Bettor Brain",
    description: "Decision-quality maturity profile snapshot.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-purple-950",
    accentHex: "#a855f7",
    sourceSurface: "/profile",
    requiresDisclaimer: false,
    requiresEvidenceChain: false,
  },
  {
    id: "discipline-recap",
    label: "Weekly Discipline",
    description: "Weekly process discipline summary — process grades and pattern flags.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-teal-950",
    accentHex: "#14b8a6",
    sourceSurface: "/tracker",
    requiresDisclaimer: false,
    requiresEvidenceChain: false,
  },
  {
    id: "edge-lab",
    label: "Edge Lab",
    description: "Experimental signal result from the Edge Lab simulation.",
    width: 1200,
    height: 630,
    bgGradient: "from-slate-900 to-lime-950",
    accentHex: "#84cc16",
    sourceSurface: "/intelligence",
    requiresDisclaimer: true,
    requiresEvidenceChain: true,
  },
] as const;

export function getArtifactType(id: string): ArtifactType | undefined {
  return ARTIFACT_TYPES.find((a) => a.id === id);
}

export function isValidArtifactId(id: string): id is ArtifactTypeId {
  return ARTIFACT_TYPES.some((a) => a.id === id);
}
