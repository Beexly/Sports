/**
 * Page-explainer registry. Nova walks you through each surface.
 *
 * Every primary public page gets a short, plain-English "how this works"
 * explainer fronted by Nova (the brand's synthetic field anchor). The walkthrough
 * is code-native by default. A captioned, step-through script the visitor
 * advances at their own pace. So it needs zero generation spend and works under
 * reduced motion. When a real Nova video is produced and approved, drop its asset
 * id on `videoAssetId` and the player will prefer it, with these beats as the
 * permanent fallback.
 *
 * Voice: Nova. Sharp, warm, specific. Tells you what the page decides and how to
 * work it, never sells certainty. Keyed by exact route (pathname).
 */

export type ExplainerBeat = {
  /** short label for the rundown, e.g. "Filter" */
  readonly tag: string;
  /** what to look at / do, in plain English */
  readonly body: string;
};

export type PageExplainer = {
  readonly route: string;
  /** launcher + modal title, e.g. "How the Board works" */
  readonly title: string;
  /** human duration label for the launcher, e.g. "0:45" */
  readonly durationLabel: string;
  /** Nova's one-line open */
  readonly intro: string;
  /** the step-through walkthrough (code-native fallback, always present) */
  readonly beats: readonly ExplainerBeat[];
  /** optional real video (Higgsfield, gated). Preferred when present + approved */
  readonly videoAssetId?: string;
};

export const PAGE_EXPLAINERS: readonly PageExplainer[] = [
  {
    route: "/",
    title: "Start here: what Galaxy is",
    durationLabel: "0:40",
    intro: "New here? Ninety seconds and you'll know exactly where to go.",
    beats: [
      { tag: "The idea", body: "The market is mostly noise. Galaxy turns real sportsbook data into picks you can check. And tells you when not to bet." },
      { tag: "Four doors", body: "Board is today's plays. Players is the lab. Intelligence is how we think. Fantasy & Daily is the toolkit. Pick the decision you came to make." },
      { tag: "The proof", body: "Every claim has a receipt. The Proof door shows calibration, closing line value, and the public ledger. Nothing is hidden." },
      { tag: "Your move", body: "Start at the Board if you want a play today, or open the Proof room first if you want to trust us before you do." },
    ],
  },
  {
    route: "/board",
    title: "How the Board works",
    durationLabel: "0:45",
    intro: "The Board is today's decision, scored and ranked. Here's how to read it.",
    beats: [
      { tag: "What it is", body: "Every game we have a real read on, ranked by edge. If a game isn't here, the data wasn't strong enough. That's the gate doing its job." },
      { tag: "No-Bet", body: "A pass is a first-class call. When we hold, we log why. Restraint is the edge, not a missing pick." },
      { tag: "Open a card", body: "Tap a game to see the signal breakdown. The factors, the line, the confidence, and what moved." },
      { tag: "Then what", body: "Want the why behind a number? Jump to Intelligence. Want to verify the record? The Proof room is one click away." },
    ],
  },
  {
    route: "/players",
    title: "How the Player Lab works",
    durationLabel: "0:50",
    intro: "One lab, every player, every signal. Here's how to make it yours.",
    beats: [
      { tag: "Filter", body: "Use the lenses to focus. Opportunity, snaps, Next Gen, DFS value. Same data, the angle you care about right now." },
      { tag: "Sort", body: "Tap any column to rank by it. Search by name, team, or position to cut straight to who you're weighing." },
      { tag: "Expand", body: "Click a row to open the read: the trend, the plain-English edge, and where the number came from." },
      { tag: "Edge Signals", body: "Want the distilled buy/sell? The Edge view turns the advanced stats into one tradeable read." },
    ],
  },
  {
    route: "/intelligence/engines",
    title: "How the engines work",
    durationLabel: "0:45",
    intro: "This is how Galaxy thinks. Every engine we run, in one place.",
    beats: [
      { tag: "Engines", body: "Each engine answers one question. Usage, scoring equity, market value, calibration. Together they form the read." },
      { tag: "Plain mode", body: "Every engine explains itself in plain terms first; the expert detail is one tap deeper when you want it." },
      { tag: "What changed", body: "When an engine's read moves, you can see what changed it. A new snap count, a line move, an injury." },
      { tag: "Proof", body: "Think we're guessing? The Proof room shows whether the reads actually predict. Numbers, not vibes." },
    ],
  },
  {
    route: "/calibration",
    title: "How to read the proof",
    durationLabel: "0:40",
    intro: "Trust is an architecture. Here's every receipt, and how to check it.",
    beats: [
      { tag: "Calibration", body: "Win rate across every settled pick, with the uncertainty band. And held back until the sample is honest." },
      { tag: "Beat the close", body: "Closing line value is whether our price beat where the market closed. It's the number tout services never show." },
      { tag: "The ledger", body: "Every settled pick carries a tamper-evident receipt. Change one after the fact and the proof breaks." },
      { tag: "Your bets", body: "Track your own bets against the same closing-line benchmark we hold ourselves to." },
    ],
  },
  {
    route: "/fantasy",
    title: "How the tools fit together",
    durationLabel: "0:50",
    intro: "Season-long and daily, one toolkit. Here's how the tools feed each other.",
    beats: [
      { tag: "Draft", body: "Start at the Draft Assistant for tiers and values; it sets the baseline every other tool reads from." },
      { tag: "Manage", body: "Start-Sit, Waivers, and Trade all share the same projections. So the advice never contradicts itself." },
      { tag: "Daily", body: "The Optimizer and DFS Suite turn those same reads into lineups for cash and tournaments." },
      { tag: "The why", body: "Every recommendation shows its confidence and its reason. And never pretends the outcome is already decided." },
    ],
  },
  {
    route: "/the-beat",
    title: "How The Beat works",
    durationLabel: "0:40",
    intro: "Sports media is a market too. Noisy, and now accountable. Here's the read.",
    beats: [
      { tag: "Broadcast", body: "Nova brings you the week's top signals on location. The headline and what it means for you." },
      { tag: "The Ledger", body: "Below, every breaking report is scored the instant it lands: source reliability, what it moves, by how much." },
      { tag: "Filter", body: "Sort by reliability tier or team to cut to the reports that touch your slate." },
      { tag: "The move", body: "Each item ends with the move to make. Before the market prices it in." },
    ],
  },
] as const;

export function getExplainer(route: string): PageExplainer | undefined {
  return PAGE_EXPLAINERS.find((e) => e.route === route);
}
