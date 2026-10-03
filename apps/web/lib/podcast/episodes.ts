/**
 * GSE Board Meeting — complete episode catalog.
 * Transcript-first episodes ship as finished product; audio attaches when produced.
 */

export type PodcastEpisode = {
  slug: string;
  number: number;
  title: string;
  publishedAt: string;
  durationMin: number;
  summary: string;
  segments: Array<{ title: string; body: string }>;
  takeaways: string[];
};

export const PODCAST_SHOW = {
  title: "GSE Board Meeting",
  description:
    "Operator-reviewed board meetings: what shipped, what broke, what the model learned, what GSE passed on, and which partners or tools deserve a closer look.",
  author: "Galaxy Sports Edge",
  language: "en-us",
  link: "https://www.galaxysportsedge.com/podcast",
} as const;

export const EPISODES: readonly PodcastEpisode[] = [
  {
    slug: "001-honesty-gates-and-no-bet",
    number: 1,
    title: "Honesty gates, No-Bet discipline, and why we ship dark",
    publishedAt: "2026-08-01T15:00:00.000Z",
    durationMin: 28,
    summary:
      "First board meeting: the honesty gate as a product feature, when the governor passes, and why unfinished surfaces stay dark instead of half-published.",
    segments: [
      {
        title: "What shipped",
        body: "Public honesty fences on performance language. Waitlist and contest storage with local durability. StatKing public gate default-off until readiness clears. Free paper Contest Bay as a completed skill product.",
      },
      {
        title: "What broke",
        body: "StatKing and Contest surfaces leaked into public nav before readiness. Fixture labels read as incomplete instead of complete sealed posture. Fixed by product gates and finished surfaces, not marketing.",
      },
      {
        title: "What the model learned",
        body: "Edge is e = p − q, never confidence. Selective coverage with conformal lower bounds beats chalk fire rates. Public numbers require realized, settled, out-of-sample results with Wilson bounds and CLV — or silence.",
      },
      {
        title: "What GSE passed on",
        body: "Affiliate CPA funnels. Real-money contest prize pools. Public win-rate claims without coverage denominators. Scraping paywalled proprietary feeds when nflverse / MLB Stats API already cover the free-legal spine.",
      },
      {
        title: "Partner / tool spotlight",
        body: "nflverse (CC-BY 4.0) as the NFL feature spine; The Odds API for opening/closing snapshots; OpenTimestamps-style pre-kickoff commit posture for the Glass Ledger.",
      },
    ],
    takeaways: [
      "Ship complete, waitlist, sealed, or dark — never half-built public product.",
      "No-Bet is a first-class decision, not a failure mode.",
      "CLV and calibration lead; hit-rate follows only after n clears honesty floors.",
    ],
  },
  {
    slug: "002-glass-ledger-and-clv",
    number: 2,
    title: "Glass Ledger: publish before kickoff, score on CLV",
    publishedAt: "2026-08-05T15:00:00.000Z",
    durationMin: 32,
    summary:
      "Why pre-kickoff hash-chained picks beat self-attested track records, how recompute makes 'audited' literal, and the honest ceiling on full-slate rates.",
    segments: [
      {
        title: "What shipped",
        body: "Proof and ledger surfaces that refuse fabricated ROI language. Calibration report gates. Public copy scanners for banned performance claims.",
      },
      {
        title: "What broke",
        body: "Industry habit of leading with win-rate without coverage. We refuse that UI. Variance-death marketing is not a product strategy.",
      },
      {
        title: "What the model learned",
        body: "Placebo time-shuffle must drive CLV to ~0 or the pipeline leaks. Market-blend test: if β on model logits includes 0, fire nothing.",
      },
      {
        title: "What GSE passed on",
        body: "Backfilled 'track records.' In-sample accuracy as marketing. Confidence-gated chalk at negative edge.",
      },
      {
        title: "Partner / tool spotlight",
        body: "Pinnacle close as internal CLV anchor via licensed odds snapshots; public recompute path as the moat competitors cannot fake.",
      },
    ],
    takeaways: [
      "Start the honest ledger clock early — duration is the uncopyable asset.",
      "Lead with calibration diagrams, not cherry-picked subsets.",
      "Props supply volume for selective ~high-accuracy subsets; full-slate 60% claims are fiction.",
    ],
  },
];

export function getEpisode(slug: string): PodcastEpisode | undefined {
  return EPISODES.find((e) => e.slug === slug);
}

export function listEpisodes(): PodcastEpisode[] {
  return [...EPISODES].sort((a, b) => b.number - a.number);
}
