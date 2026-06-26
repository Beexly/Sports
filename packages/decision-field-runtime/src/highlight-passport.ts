/**
 * HIGHLIGHT PASSPORT — a rights-aware object for video recaps/highlights surfaced by public discovery
 * systems (YouTube carousels, Google Sports video boxes).
 *
 * Highlight DISCOVERY is not video ownership. GSE may LINK or CITE a highlight only if policy allows, and
 * never embeds, downloads, or rehosts. An undiscovered-rights highlight is internal/link-review only. A
 * highlight surfaced from the web compiles to WEB_EVIDENCE / PUBLIC_OBSERVER, never production media.
 *
 * Pure + deterministic. Spec: docs/product/PUBLIC_OBSERVER_LEDGER.md.
 */

export type HighlightRightsStatus = "UNKNOWN" | "LINK_ALLOWED" | "EMBED_ALLOWED" | "LICENSED" | "BLOCKED";

export interface HighlightInput {
  readonly highlightId: string;
  readonly sourceUrl: string;
  readonly sourcePlatform: string; // e.g. "youtube", "google-sports"
  readonly title: string;
  readonly durationLabel?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly eventId?: string | null;
  readonly teams?: readonly string[];
  readonly athletes?: readonly string[];
  readonly capturedAtLabel: string;
  readonly rightsStatus: HighlightRightsStatus;
}

export interface HighlightPassport {
  readonly highlightId: string;
  readonly sourceUrl: string;
  readonly sourcePlatform: string;
  readonly title: string;
  readonly durationLabel: string | null;
  /** Thumbnail is a REFERENCE only — never a reusable asset unless licensed. */
  readonly thumbnailUrl: string | null;
  readonly thumbnailReusable: boolean;
  readonly eventId: string | null;
  readonly teams: readonly string[];
  readonly athletes: readonly string[];
  readonly capturedAtLabel: string;
  readonly sourceType: "PUBLIC_OBSERVER_HIGHLIGHT";
  readonly rightsStatus: HighlightRightsStatus;
  /** Display/embed/summary gates — closed by default; only a cleared status opens them. */
  readonly displayAllowed: boolean;
  readonly embedAllowed: boolean;
  readonly summaryAllowed: boolean;
  readonly attributionRequired: boolean;
  readonly publicSafe: boolean;
  readonly notes: string;
  readonly fixtureWatermarked: true;
}

/** Build a rights-gated highlight passport. Discovery is never ownership; gates are closed by default. */
export function buildHighlightPassport(i: HighlightInput): HighlightPassport {
  const licensed = i.rightsStatus === "LICENSED";
  const embedAllowed = i.rightsStatus === "EMBED_ALLOWED" || licensed;
  const displayAllowed = embedAllowed; // displaying the player is embedding
  const linkOrBetter = i.rightsStatus === "LINK_ALLOWED" || embedAllowed;
  return {
    highlightId: i.highlightId,
    sourceUrl: i.sourceUrl,
    sourcePlatform: i.sourcePlatform,
    title: i.title,
    durationLabel: i.durationLabel ?? null,
    thumbnailUrl: i.thumbnailUrl ?? null,
    thumbnailReusable: licensed, // thumbnails are not reusable unless licensed
    eventId: i.eventId ?? null,
    teams: i.teams ?? [],
    athletes: i.athletes ?? [],
    capturedAtLabel: i.capturedAtLabel,
    sourceType: "PUBLIC_OBSERVER_HIGHLIGHT",
    rightsStatus: i.rightsStatus,
    displayAllowed,
    embedAllowed,
    summaryAllowed: linkOrBetter, // our own paraphrase needs at least a link allowance
    attributionRequired: true,
    publicSafe: false, // a fixture/discovery highlight is never a public production asset
    notes:
      i.rightsStatus === "UNKNOWN"
        ? "rights unknown — link review only; do not display, embed, download, or rehost"
        : i.rightsStatus === "BLOCKED"
          ? "blocked — do not use"
          : "discovery reference; link/cite per policy only",
    fixtureWatermarked: true,
  };
}

// ───────────────────────── fixture ─────────────────────────
export const HIGHLIGHT_FIXTURES: readonly HighlightInput[] = [
  {
    highlightId: "hl-ecu-ger-plata",
    sourceUrl: "https://example.org/highlight/ecu-ger-plata",
    sourcePlatform: "google-sports",
    title: "Plata seals it for Ecuador (fixture)",
    durationLabel: "1:12",
    thumbnailUrl: "https://example.org/thumb/ecu-ger.jpg",
    eventId: "fixture-soccer-ecu-ger-2026",
    teams: ["Ecuador", "Germany"],
    capturedAtLabel: "fixture",
    rightsStatus: "UNKNOWN",
  },
];

export function buildAllHighlightPassports(): readonly HighlightPassport[] {
  return HIGHLIGHT_FIXTURES.map(buildHighlightPassport);
}
