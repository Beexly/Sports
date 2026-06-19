/**
 * Universal Spend Governor (Workstream O).
 *
 * One place that answers, for EVERY paid-capable service in the platform:
 * "are we allowed to spend money here right now, and if not, what unlocks it?"
 *
 * The platform's standing posture is ZERO-SPEND by default. Every service that
 * *could* cost money is enumerated here with:
 *   - its cost class (is the default path free, quota-limited, or owner-paid?),
 *   - the env flag(s) that would authorize paid use (presence only — NEVER the value),
 *   - the resolved governance MODE given the current environment,
 *   - what enabling it unlocks, and what staying free blocks.
 *
 * This is a PURE module: no network, no spend, no secret values. It reads only the
 * PRESENCE of env vars (never their contents) so it can be rendered in the cockpit
 * and asserted in tests without leaking anything. It does not itself perform or
 * authorize spend — it reports the governed state so call sites and the owner can
 * see, in one glance, exactly where money could leak and what gates hold it back.
 *
 * Single source of truth for the launch-lock spend posture. The individual gates
 * it summarizes still live with their services (visual-production/spend-policy.ts,
 * data-sources/cost-policy.ts, claude-api/budget-store.ts) — this layer unifies
 * their status into one owner-facing view and one upgrade-decision contract.
 */

export type Env = Record<string, string | undefined>;

/**
 * Governance mode for a single service — what spend is authorized right now.
 *  FREE_ONLY                — runs only on its $0 path; any paid path is blocked.
 *  OWNER_APPROVAL_REQUIRED  — a paid/owner-provisioned path exists but is NOT yet
 *                             authorized; needs an owner env flag or account.
 *  PAID_ENABLED             — owner has explicitly authorized paid/keyed use.
 *  CAP_REACHED              — a spend or quota cap has been hit; further use blocked.
 *  DISABLED                 — service is entirely off (hard gate).
 */
export type SpendMode =
  | "FREE_ONLY"
  | "OWNER_APPROVAL_REQUIRED"
  | "PAID_ENABLED"
  | "CAP_REACHED"
  | "DISABLED";

/**
 * Cost class — the *nature* of the cost on the default path, independent of mode.
 *  free_keyless        — $0, no key, no quota (e.g. keyless LLM/image pool, browser TTS).
 *  free_quota          — $0 within a free quota/credit tier (free tier of a keyed service).
 *  owner_paid_flat     — owner-provisioned flat/▵-per-transaction cost (Stripe, email plan).
 *  owner_paid_metered  — owner-provisioned per-call metered cost (paid LLM, paid data, ads).
 */
export type CostClass =
  | "free_keyless"
  | "free_quota"
  | "owner_paid_flat"
  | "owner_paid_metered";

export type ServiceCategory =
  | "llm"
  | "image"
  | "voice"
  | "sports_data"
  | "email"
  | "analytics"
  | "payments"
  | "ads";

/** A static definition of one governed service. */
export interface GovernedService {
  readonly id: string;
  readonly name: string;
  readonly category: ServiceCategory;
  readonly costClass: CostClass;
  /** Env flags whose PRESENCE (never value) authorizes the paid/keyed path. */
  readonly enableEnv: readonly string[];
  /**
   * How the enable flags combine. "all" (default) requires every flag (e.g.
   * Higgsfield needs BOTH its gates); "any" requires just one (e.g. email is
   * authorized by whichever provider key the owner provisions).
   */
  readonly enableLogic?: "all" | "any";
  /** Optional env flag whose presence (="true") signals a cap has been reached. */
  readonly capEnv?: string;
  /** The mode this service sits in when nothing in the env authorizes paid use. */
  readonly defaultMode: SpendMode;
  /** Human summary of what authorizing paid use unlocks. */
  readonly unlocks: string;
  /** Human summary of what is blocked / how it degrades while on the free path. */
  readonly freePathBlocks: string;
  /** Pointer to the underlying gate module, for the owner who wants the detail. */
  readonly gateRef: string;
}

/**
 * The full registry of paid-capable services. EVERY service that could ever cost
 * money lives here. Default modes encode the zero-spend posture: free pools run
 * FREE_ONLY; owner-provisioned services sit OWNER_APPROVAL_REQUIRED; paid ads are
 * DISABLED until a proof signal + owner flag.
 */
export const GOVERNED_SERVICES: readonly GovernedService[] = [
  // ── LLM ────────────────────────────────────────────────────────────────────
  {
    id: "llm_free_pool",
    name: "Free LLM pool (keyless Pollinations + keyed-free providers)",
    category: "llm",
    costClass: "free_keyless",
    enableEnv: [],
    defaultMode: "FREE_ONLY",
    unlocks: "Always on. Jarvis + content generation answer with $0 and no key.",
    freePathBlocks:
      "Nothing — the keyless provider is always available; added free keys only widen capacity/perspective.",
    gateRef: "lib/claude-api/provider-pool.ts",
  },
  {
    id: "llm_anthropic",
    name: "Anthropic Claude (paid fallback)",
    category: "llm",
    costClass: "owner_paid_metered",
    enableEnv: ["ANTHROPIC_API_KEY"],
    defaultMode: "OWNER_APPROVAL_REQUIRED",
    unlocks:
      "Paid fallback when the entire free pool is exhausted/unhealthy — highest-quality last resort.",
    freePathBlocks:
      "No paid Anthropic calls; if the free pool is fully down, surfaces honest-degrade instead of paying.",
    gateRef: "lib/claude-api/provider-pool.ts",
  },

  // ── Image ──────────────────────────────────────────────────────────────────
  {
    id: "image_free_pool",
    name: "Free image pool (keyless Pollinations / Picsum URL builders)",
    category: "image",
    costClass: "free_keyless",
    enableEnv: [],
    defaultMode: "FREE_ONLY",
    unlocks: "Always on. Brand/OG illustration with $0 and a branded CSS fallback.",
    freePathBlocks: "Nothing — keyless URL builders need no key.",
    gateRef: "lib/media/image-pool.ts",
  },
  {
    id: "image_higgsfield",
    name: "Higgsfield generation (paid credits)",
    category: "image",
    costClass: "owner_paid_metered",
    enableEnv: ["HIGGSFIELD_GENERATION_ENABLED", "OWNER_VISUAL_SPEND_APPROVED"],
    defaultMode: "OWNER_APPROVAL_REQUIRED",
    unlocks:
      "Premium motion/stills for top-priority assets — only when BOTH flags are true and the per-asset checklist passes.",
    freePathBlocks:
      "No credit spend; visuals stay code-native / free-pool. Reuse + worthiness gates still apply on top.",
    gateRef: "lib/visual-production/spend-policy.ts",
  },

  // ── Voice ──────────────────────────────────────────────────────────────────
  {
    id: "voice_browser",
    name: "Browser speech (Web Speech API STT + speechSynthesis TTS)",
    category: "voice",
    costClass: "free_keyless",
    enableEnv: [],
    defaultMode: "FREE_ONLY",
    unlocks: "Always on. Jarvis speaks + listens in-browser with $0.",
    freePathBlocks: "Nothing — browser-native, no key, no server cost.",
    gateRef: "components/cockpit/jarvis-chat.tsx",
  },

  // ── Sports data ──────────────────────────────────────────────────────────────
  {
    id: "sports_odds_api",
    name: "The Odds API (licensed, free 500-credit tier)",
    category: "sports_data",
    costClass: "free_quota",
    enableEnv: ["THE_ODDS_API_KEY"],
    capEnv: "ODDS_API_CAP_REACHED",
    defaultMode: "FREE_ONLY",
    unlocks:
      "Quota-governed evidence capture (one sport/region, h2h/spreads/totals) feeding CLV/replay/calibration — internal only.",
    freePathBlocks:
      "Capture stays OFF/HEALTH_ONLY; no broad fanout, no props, no historical — protects the free monthly credit cap.",
    gateRef: "lib/spend/odds-capture-governor.ts",
  },
  {
    id: "sports_data_paid",
    name: "Paid sports data (Sportradar / SportsDataIO / metered feeds)",
    category: "sports_data",
    costClass: "owner_paid_metered",
    enableEnv: ["PAID_SPORTS_DATA_ENABLED"],
    defaultMode: "DISABLED",
    unlocks:
      "Enterprise depth/coverage — only after the free-first ladder is proven insufficient AND owner approves.",
    freePathBlocks:
      "Free-first sources only (cost-policy.ts cheapest-first ordering); no metered/enterprise calls.",
    gateRef: "lib/data-sources/cost-policy.ts",
  },

  // ── Email ──────────────────────────────────────────────────────────────────
  {
    id: "email_provider",
    name: "Transactional/marketing email (owner-provisioned free tier)",
    category: "email",
    costClass: "free_quota",
    enableEnv: ["EMAIL_PROVIDER_API_KEY", "RESEND_API_KEY"],
    enableLogic: "any",
    defaultMode: "OWNER_APPROVAL_REQUIRED",
    unlocks:
      "Real email send (confirmations, Desk Note, alerts) on a free-tier provider the owner provisions.",
    freePathBlocks:
      "No outbound email; signups are captured/queued honestly and surfaced as pending until a provider is wired.",
    gateRef: "lib/revenue/distribution-sources.ts",
  },

  // ── Analytics ────────────────────────────────────────────────────────────────
  {
    id: "analytics_firstparty",
    name: "First-party analytics (DB/file-backed) + optional free GA4/PostHog",
    category: "analytics",
    costClass: "free_quota",
    enableEnv: ["NEXT_PUBLIC_ANALYTICS_ENABLED", "NEXT_PUBLIC_GA_MEASUREMENT_ID", "NEXT_PUBLIC_POSTHOG_KEY"],
    defaultMode: "FREE_ONLY",
    unlocks:
      "Optional free-tier GA4/PostHog/Cloudflare beacon alongside the always-on first-party event store.",
    freePathBlocks:
      "Nothing essential — first-party events are recorded DB/file-backed with no third party and no PII.",
    gateRef: "lib/analytics/events.ts",
  },

  // ── Payments ──────────────────────────────────────────────────────────────────
  {
    id: "payments_stripe",
    name: "Stripe (per-transaction fee, revenue-coupled)",
    category: "payments",
    costClass: "owner_paid_flat",
    enableEnv: ["STRIPE_SECRET_KEY"],
    defaultMode: "OWNER_APPROVAL_REQUIRED",
    unlocks:
      "Live checkout + subscriptions. Cost is a % of revenue collected — it only spends when it earns.",
    freePathBlocks:
      "No live checkout; pricing/offer pages render but the Subscribe path is inert until keys + price IDs are set.",
    gateRef: "lib/stripe.ts",
  },

  // ── Paid ads ──────────────────────────────────────────────────────────────────
  {
    id: "ads_paid",
    name: "Paid acquisition / ads",
    category: "ads",
    costClass: "owner_paid_metered",
    enableEnv: ["PAID_ADS_ENABLED"],
    defaultMode: "DISABLED",
    unlocks:
      "Paid traffic — HARD-BLOCKED until the funnel is live AND a proof signal clears the upgrade gate AND owner approves.",
    freePathBlocks:
      "All acquisition is organic/owned (content, SEO, channels). No ad spend under any circumstance by default.",
    gateRef: "lib/spend/spend-governor.ts",
  },
];

/** True iff the env carries a non-empty value for `name` (presence only). */
export function isEnvPresent(name: string, env: Env = process.env): boolean {
  const v = env[name];
  return typeof v === "string" && v.trim() !== "";
}

/** True iff the env flag is explicitly the string "true". */
export function isEnvTrue(name: string, env: Env = process.env): boolean {
  return (env[name] ?? "").trim().toLowerCase() === "true";
}

export interface ServiceStatus {
  readonly id: string;
  readonly name: string;
  readonly category: ServiceCategory;
  readonly costClass: CostClass;
  readonly mode: SpendMode;
  /** True when the service is doing useful work right now (free or paid path). */
  readonly active: boolean;
  /** True when the resolved mode authorizes real money to be spent. */
  readonly spends: boolean;
  /** Which of the enable env flags are present (names only — never values). */
  readonly enabledFlagsPresent: readonly string[];
  readonly unlocks: string;
  readonly freePathBlocks: string;
  readonly gateRef: string;
}

/**
 * Resolve one service's governed mode from the environment. Pure: reads only the
 * presence of env vars, never their values. The resolution rules:
 *  - A capEnv flag set to "true" always wins → CAP_REACHED.
 *  - free_keyless services are always FREE_ONLY + active.
 *  - For owner-paid/quota services: if every enable flag is present → the paid/keyed
 *    path is authorized (PAID_ENABLED for owner-paid classes; FREE_ONLY for free_quota,
 *    which only ever uses a free tier); otherwise the service holds its defaultMode.
 */
export function resolveService(svc: GovernedService, env: Env = process.env): ServiceStatus {
  const enabledFlagsPresent = svc.enableEnv.filter((f) => isEnvPresent(f, env));
  const logic = svc.enableLogic ?? "all";
  const allEnableFlagsPresent =
    svc.enableEnv.length > 0 &&
    (logic === "any"
      ? enabledFlagsPresent.length > 0
      : svc.enableEnv.every((f) => isEnvPresent(f, env)));

  let mode: SpendMode;
  if (svc.capEnv && isEnvTrue(svc.capEnv, env)) {
    mode = "CAP_REACHED";
  } else if (svc.costClass === "free_keyless") {
    mode = "FREE_ONLY";
  } else if (svc.defaultMode === "DISABLED") {
    // Hard-gated services (paid data, ads) only leave DISABLED when explicitly flagged on.
    mode = allEnableFlagsPresent ? "PAID_ENABLED" : "DISABLED";
  } else if (allEnableFlagsPresent) {
    // free_quota services authorize only their free tier; owner-paid classes authorize spend.
    mode = svc.costClass === "free_quota" ? "FREE_ONLY" : "PAID_ENABLED";
  } else {
    mode = svc.defaultMode;
  }

  const spends = mode === "PAID_ENABLED";
  const active =
    mode === "FREE_ONLY" || mode === "PAID_ENABLED" || (mode === "CAP_REACHED" && false);

  return {
    id: svc.id,
    name: svc.name,
    category: svc.category,
    costClass: svc.costClass,
    mode,
    active,
    spends,
    enabledFlagsPresent: enabledFlagsPresent,
    unlocks: svc.unlocks,
    freePathBlocks: svc.freePathBlocks,
    gateRef: svc.gateRef,
  };
}

export interface SpendGovernorReport {
  /** Resolved status for every governed service. */
  readonly services: readonly ServiceStatus[];
  /** True when NO service is currently authorized to spend real money. */
  readonly zeroSpend: boolean;
  /** Count of services on a free path (FREE_ONLY and active). */
  readonly freeActiveCount: number;
  /** Services that WOULD spend money right now (mode PAID_ENABLED). */
  readonly spendingServices: readonly string[];
  /** Generated-at marker for the cockpit (ISO). */
  readonly generatedAt: string;
}

/** Resolve every governed service into a single owner-facing report. */
export function evaluateSpendGovernor(env: Env = process.env): SpendGovernorReport {
  const services = GOVERNED_SERVICES.map((s) => resolveService(s, env));
  const spendingServices = services.filter((s) => s.spends).map((s) => s.id);
  return {
    services,
    zeroSpend: spendingServices.length === 0,
    freeActiveCount: services.filter((s) => s.mode === "FREE_ONLY" && s.active).length,
    spendingServices,
    generatedAt: new Date().toISOString(),
  };
}

// ── Upgrade gates — proof-gated spend bands ───────────────────────────────────

/**
 * Spend bands. The platform earns the right to spend by proving traction, not by
 * assertion. A higher band unlocks only when a proof signal (or explicit owner
 * approval) clears it.
 */
export type SpendBand = "ZERO" | "ESSENTIAL_0_25" | "PROVEN_25_100" | "FUNDED_100_PLUS";

export interface SpendBandSpec {
  readonly band: SpendBand;
  readonly label: string;
  readonly monthlyCeilingUsd: number;
  readonly rule: string;
}

export const SPEND_BANDS: readonly SpendBandSpec[] = [
  {
    band: "ZERO",
    label: "$0 — default",
    monthlyCeilingUsd: 0,
    rule: "The standing posture. Everything runs on free pools and owner-provisioned free tiers.",
  },
  {
    band: "ESSENTIAL_0_25",
    label: "$0–25/mo — essential & approved",
    monthlyCeilingUsd: 25,
    rule: "A small, essential, owner-approved cost (e.g. a domain). Approval alone suffices in this band.",
  },
  {
    band: "PROVEN_25_100",
    label: "$25–100/mo — proof-gated",
    monthlyCeilingUsd: 100,
    rule: "Requires at least one verified proof signal (real traction) OR explicit owner approval.",
  },
  {
    band: "FUNDED_100_PLUS",
    label: "$100+/mo — funded only",
    monthlyCeilingUsd: Number.POSITIVE_INFINITY,
    rule: "Requires sustained revenue, a sponsor, or funding. Never reached on assertion.",
  },
];

/**
 * Proof signals — the verifiable milestones that earn a spend upgrade. Each is a
 * REAL, countable fact (never fabricated). `met` is supplied by the caller from
 * real data (Stripe rows, email store, Ask Galaxy submissions, revenue).
 */
export type ProofSignalId =
  | "paid_members_10"
  | "emails_100"
  | "ask_galaxy_25"
  | "revenue_100"
  | "sponsor_signed"
  | "owner_approval";

export interface ProofSignalSpec {
  readonly id: ProofSignalId;
  readonly label: string;
  readonly threshold: number;
  readonly unit: string;
}

export const PROOF_SIGNALS: readonly ProofSignalSpec[] = [
  { id: "paid_members_10", label: "10 paid members", threshold: 10, unit: "members" },
  { id: "emails_100", label: "100 email subscribers", threshold: 100, unit: "emails" },
  { id: "ask_galaxy_25", label: "25 Ask Galaxy submissions", threshold: 25, unit: "submissions" },
  { id: "revenue_100", label: "$100 total revenue", threshold: 100, unit: "usd" },
  { id: "sponsor_signed", label: "A signed sponsor", threshold: 1, unit: "sponsor" },
  { id: "owner_approval", label: "Explicit owner approval", threshold: 1, unit: "approval" },
];

/** Real, measured counts for each proof signal (supplied from real data; default 0). */
export type ProofSignalCounts = Partial<Record<ProofSignalId, number>>;

/** Which proof signals are currently met given real counts. */
export function metProofSignals(counts: ProofSignalCounts): ProofSignalId[] {
  return PROOF_SIGNALS.filter((s) => (counts[s.id] ?? 0) >= s.threshold).map((s) => s.id);
}

export interface UpgradeDecision {
  readonly band: SpendBand;
  readonly allowed: boolean;
  readonly metSignals: readonly ProofSignalId[];
  readonly reason: string;
}

/**
 * May we operate in the requested spend band given the real proof signals?
 *  - ZERO is always allowed.
 *  - ESSENTIAL_0_25 needs owner_approval.
 *  - PROVEN_25_100 needs ANY proof signal (incl. owner_approval).
 *  - FUNDED_100_PLUS needs revenue, a sponsor, or owner approval (sustained).
 * Pure + data-driven — never authorizes spend on assertion.
 */
export function evaluateUpgrade(band: SpendBand, counts: ProofSignalCounts): UpgradeDecision {
  const met = metProofSignals(counts);
  const has = (id: ProofSignalId) => met.includes(id);

  switch (band) {
    case "ZERO":
      return { band, allowed: true, metSignals: met, reason: "Zero-spend is always allowed." };
    case "ESSENTIAL_0_25":
      return {
        band,
        allowed: has("owner_approval"),
        metSignals: met,
        reason: has("owner_approval")
          ? "Owner approved an essential sub-$25 cost."
          : "Needs explicit owner approval for an essential sub-$25 cost.",
      };
    case "PROVEN_25_100":
      return {
        band,
        allowed: met.length > 0,
        metSignals: met,
        reason:
          met.length > 0
            ? `Unlocked by proof signal(s): ${met.join(", ")}.`
            : "Needs at least one verified proof signal (paid members / emails / Ask Galaxy / revenue / sponsor / owner approval).",
      };
    case "FUNDED_100_PLUS": {
      const funded = has("revenue_100") || has("sponsor_signed") || has("owner_approval");
      return {
        band,
        allowed: funded,
        metSignals: met,
        reason: funded
          ? "Funded by sustained revenue, a sponsor, or owner approval."
          : "Needs sustained revenue, a signed sponsor, or explicit owner approval.",
      };
    }
    default:
      return { band: "ZERO", allowed: true, metSignals: met, reason: "Defaulted to zero-spend." };
  }
}
