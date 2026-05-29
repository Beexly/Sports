/**
 * Anti-patterns — the named design failures the Taste Critic actively
 * looks for. Each anti-pattern carries a detection hint that a reviewer
 * (or scanner) can apply to a JSX file.
 */

export const ANTI_PATTERNS = [
  "rounded-2xl-everywhere",
  "shadow-on-everything",
  "rainbow-gradient",
  "casino-green-cta",
  "lock-of-the-day-banner",
  "stars-fire-emojis-as-state",
  "animated-background-on-data",
  "pie-chart-as-hero",
  "scarcity-timer",
  "social-bandwagon-proof",
  "ambiguous-cta",
  "stale-data-without-label",
  "evidence-card-without-source",
  "pick-without-failure-case",
  "publish-without-gate",
] as const;

export type AntiPattern = (typeof ANTI_PATTERNS)[number];

export interface AntiPatternDescriptor {
  readonly id: AntiPattern;
  readonly description: string;
  readonly detection: ReadonlyArray<RegExp | string>;
  readonly remedy: string;
}

export const ANTI_PATTERN_REGISTRY: ReadonlyArray<AntiPatternDescriptor> = [
  {
    id: "rounded-2xl-everywhere",
    description: "Soft rounded SaaS look applied to every card.",
    detection: [/rounded-2xl/g, /rounded-3xl/g],
    remedy: "Use rounded-xl or rounded-lg with 1px mineral border for the Galaxy card silhouette.",
  },
  {
    id: "shadow-on-everything",
    description: "Drop shadow applied uniformly across cards.",
    detection: [/shadow-(lg|xl|2xl|inner)/g],
    remedy: "Reserve shadows for floating panels (drawer, modal, hero card).",
  },
  {
    id: "rainbow-gradient",
    description: "Multi-color gradient backdrop on a content surface.",
    detection: [/from-(red|orange|yellow|green|blue|indigo|violet|pink).*via-.*to-/g],
    remedy: "Use single-direction gradient with two harmonized tokens (carbon → eclipse).",
  },
  {
    id: "casino-green-cta",
    description: "Saturated green CTA button (slot-machine aesthetic).",
    detection: [/bg-green-(400|500|600)\s/g],
    remedy: "Use neutral/cyan accent for primary CTA on public surfaces.",
  },
  {
    id: "lock-of-the-day-banner",
    description: "Hero banner promising a lock or guaranteed pick.",
    detection: [/lock of the day/i, /pick of the day/i, /hammer of the (week|day)/i],
    remedy: "Replace with measured signal language; lead with rationale.",
  },
  {
    id: "stars-fire-emojis-as-state",
    description: "Decorative emojis (🔥⭐🚀💰) used to encode state.",
    detection: [/[🔥⭐🚀💰💎🎰]/g],
    remedy: "Use semantic dot accent (lime/cyan/violet/amber) per kind.",
  },
  {
    id: "animated-background-on-data",
    description: "Looping animation on a telemetry / data surface.",
    detection: [/animate-(pulse|bounce|spin|ping)/g],
    remedy: "Allowed only for: small live-status dots, skeleton loaders, button spinners.",
  },
  {
    id: "pie-chart-as-hero",
    description: "Pie chart used to convey precise share data.",
    detection: [/PieChart/, /<Pie /],
    remedy: "Use a bar chart or numeric list. Pie charts are forbidden by the design rubric.",
  },
  {
    id: "scarcity-timer",
    description: "Countdown timer pressuring a betting action.",
    detection: [/countdown/i, /time(\s|-)?(remaining|left)/i, /expires\s+in/i],
    remedy: "Remove. Galaxy does not manufacture urgency around a bet.",
  },
  {
    id: "social-bandwagon-proof",
    description: "Implied consensus ('1,200 people are tailing') to drive action.",
    detection: [/people are (tailing|on this)/i, /\d+\s+bettors\s+(are|on)/i],
    remedy: "Remove. Social proof is forbidden as a betting nudge.",
  },
  {
    id: "ambiguous-cta",
    description: "CTA copy without a clear destination or outcome.",
    detection: [/>\s*Learn more\s*</g, />\s*Click here\s*</g, />\s*Continue\s*<(?!\/section)/g],
    remedy: "Name the destination explicitly ('Read methodology', 'Open Today\\'s Board').",
  },
  {
    id: "stale-data-without-label",
    description: "Time-sensitive data rendered without a freshness pill.",
    detection: [],
    remedy: "Add an EvidenceRow with FRESHNESS_LABELS.",
  },
  {
    id: "evidence-card-without-source",
    description: "A claim presented without source attribution.",
    detection: [],
    remedy: "Add a 'Galaxy model' / 'Provider' / 'Public record' source label.",
  },
  {
    id: "pick-without-failure-case",
    description: "A pick card that does not declare how the call can be wrong.",
    detection: [],
    remedy: "Compose <EvidenceCard kind=\"pick\" failureCase={...} />; TypeScript enforces.",
  },
  {
    id: "publish-without-gate",
    description: "A pick that bypassed the published-gate check.",
    detection: [],
    remedy: "Never bypass the publishedGate. Constitution #9.",
  },
];

export interface AntiPatternHit {
  readonly id: AntiPattern;
  readonly line?: number;
  readonly snippet?: string;
}

/**
 * Run regex-detectable anti-patterns against a source string.
 * The non-detectable anti-patterns require human review.
 */
export function scanForAntiPatterns(source: string): ReadonlyArray<AntiPatternHit> {
  const hits: AntiPatternHit[] = [];
  for (const desc of ANTI_PATTERN_REGISTRY) {
    for (const pattern of desc.detection) {
      const regex = typeof pattern === "string" ? new RegExp(escapeRegex(pattern), "g") : pattern;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(source)) !== null) {
        hits.push({ id: desc.id, snippet: match[0] });
        if (!regex.global) break;
      }
    }
  }
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
