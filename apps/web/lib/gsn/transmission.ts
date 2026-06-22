/**
 * GSN — Galaxy Sports Network. The public narrative skin of the intelligence OS.
 *
 * Not a blog: a daily mission-control TRANSMISSION that turns the whole slate
 * into a readable intelligence briefing. Each segment is an interactive
 * intelligence format (Galaxy Brief, Market Mirage, Roster Shock, Coaching Edge,
 * Line-Movement Autopsy) connected to the same reasoning the engine uses.
 *
 * DOCTRINE: this is an explicitly illustrative SAMPLE transmission — methodology
 * and scenario language, no real teams, no fabricated track-record numbers
 * presented as the platform's record. Live daily transmissions are generated
 * from the real slate once it's wired behind the readiness gate.
 */

export type SegmentTone = "ion" | "anomaly" | "deep";

export type TransmissionSegment = {
  readonly type: string;
  readonly tone: SegmentTone;
  readonly title: string;
  readonly dek: string;
  readonly points: readonly string[];
};

export type Transmission = {
  readonly illustrative: true;
  /** Date code, shown after "GSN TRANSMISSION //". */
  readonly code: string;
  readonly summary: ReadonlyArray<{ label: string; count: number; tone: SegmentTone }>;
  readonly segments: readonly TransmissionSegment[];
};

export const TONE_HEX: Record<SegmentTone, string> = {
  ion: "#00E5FF",
  anomaly: "#FF38C7",
  deep: "#7B61FF",
};

export const SAMPLE_TRANSMISSION: Transmission = {
  illustrative: true,
  code: "06 · 04 · 26",
  summary: [
    { label: "Market Mirages", count: 3, tone: "anomaly" },
    { label: "Roster Shocks", count: 2, tone: "anomaly" },
    { label: "Coaching Edges", count: 1, tone: "deep" },
    { label: "No-Bet Warnings", count: 4, tone: "ion" },
    { label: "Games Under Review", count: 17, tone: "ion" },
  ],
  segments: [
    {
      type: "Galaxy Brief",
      tone: "ion",
      title: "The whole board, read at a glance.",
      dek: "Seventeen games under review; the edge is concentrated in three, and the engine is telling four slates to wait.",
      points: [
        "Edge density is highest in the early window — clean divergence from the price, light public heat behind the number.",
        "Two totals are drifting on information, not noise — the kind of move worth reading.",
        "Four games tripped the No-Bet engine: stale lines, thin closing history, or a live injury question.",
      ],
    },
    {
      type: "Market Mirage",
      tone: "anomaly",
      title: "Where the crowd is being walked into a trap.",
      dek: "A primetime favourite looks obvious — and that's the tell. Tickets pile in while the price sits quietly on the other number.",
      points: [
        "Heavy ticket share on the favourite, yet the line hasn't moved with the crowd.",
        "When the price ignores a public surge, the money is disagreeing with the tickets.",
        "The mirage is the payout that feels safe. The engine flags it — it doesn't chase it.",
      ],
    },
    {
      type: "Roster Shock",
      tone: "anomaly",
      title: "One status change, the whole slate re-prices.",
      dek: "A projected starter is downgraded to questionable an hour before lock — and three correlated markets move with it.",
      points: [
        "The total, the spread, and a star prop all hinge on the same body.",
        "Treating them as independent overstates your odds — the Parlay MRI shows exactly why.",
        "The engine steps the read from Play to Watchlist until the status confirms.",
      ],
    },
    {
      type: "Coaching Edge",
      tone: "deep",
      title: "Tendencies the market underweights.",
      dek: "A coordinator's third-down and two-minute tendencies create a structural edge the closing line is slow to price.",
      points: [
        "Situational pace is a repeatable signal, not a narrative.",
        "It compounds with rest and travel in tonight's matchup.",
        "Modest on its own; meaningful when the independent estimators agree.",
      ],
    },
    {
      type: "Line-Movement Autopsy",
      tone: "ion",
      title: "Was the market right, late, or just noisy?",
      dek: "Last night's close beat the public — but for the wrong reason. The autopsy separates a sharp move from a lucky one.",
      points: [
        "Opening to close, the number drifted on real information, not a ticket surge.",
        "Good process, bad outcome: the read was correct, the bounce wasn't.",
        "We grade the thinking, not the scoreboard — and feed the verdict back into calibration.",
      ],
    },
  ],
};
