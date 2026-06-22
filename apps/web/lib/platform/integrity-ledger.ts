/**
 * Integrity Ledger — the single command-truth of what is actually real.
 *
 * Agent-built platforms fail from "fake DONE": a surface sounds finished when it is
 * only built, or built-and-wired but never proven against live data. This ledger
 * forces the distinction in code, per system:
 *   BUILT       — the code exists and typechecks.
 *   WIRED       — it is connected to the runtime path that will use it.
 *   PROVEN      — a test / fixture / live probe / stored evidence shows it works.
 *   PUBLIC_SAFE — legal/source-rights, claim-safety, sample gates, and owner gates hold.
 *
 * Hard rule (enforced + tested): a system may be PUBLIC_SAFE only if it is PROVEN, OR
 * an explicit ownerGate explains a staged/manual posture that makes no public claim.
 * Nothing renders green by simulation; missing evidence renders as "not proven."
 *
 * Pure data + pure auditors. Keep this honest — it is the antidote to drift.
 */

export type Category =
  | "web"
  | "database"
  | "workers"
  | "cache"
  | "storage"
  | "data-sources"
  | "model"
  | "claims"
  | "observability"
  | "agents"
  | "cost"
  | "legal"
  | "community"
  | "revenue";

export type StageStatus = "NO" | "PARTIAL" | "YES";

export interface SystemEntry {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly builtStatus: StageStatus;
  readonly wiredStatus: StageStatus;
  readonly provenStatus: StageStatus;
  readonly publicSafeStatus: StageStatus;
  /** Null = no owner gate. Non-null = the staged/manual reason that permits a non-proven public-safe posture. */
  readonly ownerGate: string | null;
  readonly evidenceRefs: readonly string[];
  /** ISO date of last verification, or null when not yet verified. */
  readonly lastVerifiedAt: string | null;
  readonly failureMode: string;
  readonly nextAction: string;
}

const V = "2026-06-22";

export const INTEGRITY_LEDGER: readonly SystemEntry[] = [
  // ── web ──
  {
    id: "web-app-shell",
    name: "Next.js 14 app shell (public web + API routes)",
    category: "web",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["apps/web", "next build"],
    lastVerifiedAt: V,
    failureMode: "cold-build failure if the Prisma client isn't generated (postinstall).",
    nextAction: "Next 16 / cache-components migration on a dedicated upgrade branch — not main.",
  },

  // ── database ──
  {
    id: "db-neon-sor",
    name: "Postgres (Neon) — system of record",
    category: "database",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "PARTIAL", publicSafeStatus: "PARTIAL",
    ownerGate: "many DB-backed surfaces are REAL-CODE / UNKNOWN-DATA until proven against populated live data",
    evidenceRefs: ["packages/db/prisma/schema.prisma", "_logs/REALITY.md"],
    lastVerifiedAt: null,
    failureMode: "silent data corruption (settlement bug / stale odds / name mismatch) poisons calibration.",
    nextAction: "cross-source score reconciliation + stale-unsettled alerts + data-confidence before public display.",
  },

  // ── workers ──
  {
    id: "workers-ingestion",
    name: "Worker-driven ingestion + settlement (Oracle VPS)",
    category: "workers",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: "provision the Oracle Always-Free VPS (Redis/workers) and cut over from Vercel cron",
    evidenceRefs: ["docker/oracle-vps/compose.yml", "workers/data-refresh"],
    lastVerifiedAt: null,
    failureMode: "Vercel cron doing backend work → CPU/cost pressure; silent cron failure → stale data.",
    nextAction: "activate the worker path; reduce Vercel cron to health checks / manual triggers.",
  },
  {
    id: "workers-orchestration-policy",
    name: "Worker orchestration policy (idempotency, retry/backoff, dead-letter)",
    category: "workers",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/workers/orchestration-policy.ts", "apps/web/__tests__/orchestration-policy.test.ts"],
    lastVerifiedAt: V,
    failureMode: "a retried settlement double-settles without an idempotency key.",
    nextAction: "wire idempotencyKey + retryDecision + failure ledger into the BullMQ workers.",
  },

  // ── cache ──
  {
    id: "cache-read-model-policy",
    name: "Public read-model cache policy",
    category: "cache",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/cache/public-read-model-policy.ts", "apps/web/__tests__/public-read-model-policy.test.ts"],
    lastVerifiedAt: V,
    failureMode: "public pages hitting Neon per visitor → latency + transfer cost.",
    nextAction: "wire CDN cache headers per route after route-safety tests; no-store sensitive routes.",
  },

  // ── storage ──
  {
    id: "storage-source-payloads",
    name: "Source payload storage (forensic proof)",
    category: "storage",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["packages/db/prisma/schema.prisma (SourceSnapshot)", "apps/web/lib/proof/source-payload-policy.ts"],
    lastVerifiedAt: V,
    failureMode: "unbounded raw JSON in Postgres → storage growth / cost.",
    nextAction: "adopt hash-only default (source-payload-policy); move raw payloads to object storage.",
  },

  // ── data-sources ──
  {
    id: "src-odds-api",
    name: "The Odds API (odds / lines / CLV input)",
    category: "data-sources",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["packages/data-ingestion/src/odds-api-client.ts"],
    lastVerifiedAt: V,
    failureMode: "single paid dependency; quota/throttle → no fresh odds.",
    nextAction: "protect credits via free-first wiring; never scrape-fallback to evade limits.",
  },
  {
    id: "src-clearance",
    name: "Source Rights Registry + Clearance Engine",
    category: "data-sources",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/scraping/clearance-engine.ts", "apps/web/lib/scraping/source-rights-registry.ts"],
    lastVerifiedAt: V,
    failureMode: "an adapter that bypasses clearance ingests un-cleared data (legal risk).",
    nextAction: "wire checkClearance() into EVERY ingestion entrypoint as runtime law, not doctrine.",
  },
  {
    id: "src-free-first",
    name: "Free-first cleared sources (nflverse / ESPN / Open-Meteo)",
    category: "data-sources",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "PARTIAL", publicSafeStatus: "PARTIAL",
    ownerGate: null,
    evidenceRefs: ["docs/data/FREE_FIRST_SOURCING.md", "packages/data-ingestion/src"],
    lastVerifiedAt: null,
    failureMode: "paid odds credits spent on data a free cleared source already covers.",
    nextAction: "wire free adapters into persistence/settlement to protect paid credits.",
  },

  {
    id: "src-reliability-score",
    name: "Source Reliability Score (continuous, rights-gated source trust)",
    category: "data-sources",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/sources/source-reliability.ts", "apps/web/__tests__/source-reliability.test.ts"],
    lastVerifiedAt: V,
    failureMode: "weighting an unreliable / non-approved source into a public claim.",
    nextAction: "wire from source health metrics + the rights registry; gate public-usable sources.",
  },

  // ── model ──
  {
    id: "model-clv-grading",
    name: "CLV grading (lock → close → grade at settlement)",
    category: "model",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "PARTIAL",
    ownerGate: "public beat-close rate gated by PERFORMANCE_STATS_ENABLED + settled-sample floor",
    evidenceRefs: ["packages/prediction-engine/src/clv-capture.ts", "packages/prediction-engine/src/clv.ts"],
    lastVerifiedAt: V,
    failureMode: "grading vs our own consensus close (soft anchor) overstates edge.",
    nextAction: "persist Kalshi as a hard third-party anchor (clv-anchor.ts already built).",
  },
  {
    id: "model-clv-coverage",
    name: "CLV coverage invariant + settlement-health probe",
    category: "model",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/performance/clv-coverage.ts", "apps/web/lib/performance/settlement-health.ts"],
    lastVerifiedAt: V,
    failureMode: "beat-close rate over <100% coverage is survivorship-biased.",
    nextAction: "wire a nightly coverage/stale-unsettled alarm to a real sink.",
  },
  {
    id: "model-proof-receipt",
    name: "Pre-result tamper-evident proof receipt + mint",
    category: "model",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "PARTIAL", publicSafeStatus: "NO",
    ownerGate: "requires `prisma migrate deploy` in prod; mint only proven against fixtures, not live DB",
    evidenceRefs: ["packages/prediction-engine/src/pick-proof-receipt.ts", "packages/ingestion-pipeline/src/process-sport.ts"],
    lastVerifiedAt: V,
    failureMode: "a weak injected hash would void the tamper guarantee.",
    nextAction: "run the migration; verify receipts accrue + verify against a live DB.",
  },
  {
    id: "model-commit-reveal",
    name: "Commit-reveal slate (anti-cherry-pick Merkle commitment)",
    category: "model",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: "the scheduled freeze-before-kickoff job is not yet invoked",
    evidenceRefs: ["packages/prediction-engine/src/slate-commitment.ts"],
    lastVerifiedAt: V,
    failureMode: "re-rooting after a game starts would be a fake pre-registration.",
    nextAction: "wire planSlateCommitment into the cron, before first kickoff, freeze-once.",
  },
  {
    id: "model-calibration",
    name: "Calibration (Brier/Murphy, isotonic, reliability, Wilson)",
    category: "model",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "YES", publicSafeStatus: "PARTIAL",
    ownerGate: "calibration is display-only / gated; never auto-applied to the live model",
    evidenceRefs: ["packages/prediction-engine/src/probability-calibration.ts", "apps/web/components/performance/calibration-panel.tsx"],
    lastVerifiedAt: V,
    failureMode: "claiming calibration before the settled-sample floor.",
    nextAction: "accumulate ≥100 settled canonical picks before publishing the curve.",
  },
  {
    id: "model-promotion",
    name: "OOS split + champion/challenger model promoter",
    category: "model",
    builtStatus: "PARTIAL", wiredStatus: "NO", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: "lives on claude/laughing-wozniak-gyryjx — cherry-pick onto trunk per BRANCH_RECONCILIATION.md",
    evidenceRefs: ["docs/strategy/BRANCH_RECONCILIATION.md"],
    lastVerifiedAt: null,
    failureMode: "no calibrated model probability → receipt modelProb stays null.",
    nextAction: "cherry-pick the promoter; gate promotion on no-calibration-regression + sample floor.",
  },

  {
    id: "model-no-bet-adversary",
    name: "No-Bet Adversary Engine (case against every pick)",
    category: "model",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/picks/no-bet-adversary.ts", "apps/web/__tests__/no-bet-adversary.test.ts"],
    lastVerifiedAt: V,
    failureMode: "publishing a pick the adversary case should have downgraded to no-bet.",
    nextAction: "wire into pick publication so HIGH opposition forces no-bet, MEDIUM forces watchlist.",
  },
  {
    id: "model-signal-lineage",
    name: "Signal Lineage Engine (factor provenance audit)",
    category: "model",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/picks/signal-lineage.ts", "apps/web/__tests__/signal-lineage.test.ts"],
    lastVerifiedAt: V,
    failureMode: "an active factor below Tier 2 / rights-blocked silently backs a claim.",
    nextAction: "build lineage from PickSignalSnapshot + source rights; surface in the Proof Graph.",
  },
  {
    id: "model-market-memory",
    name: "Market Memory Engine (careful line-movement memory)",
    category: "model",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/market/market-memory.ts", "apps/web/__tests__/market-memory.test.ts"],
    lastVerifiedAt: V,
    failureMode: "attributing movement to 'sharp money' without a sourced split.",
    nextAction: "wire from the Odds time-series; never use sharp language unsourced.",
  },
  {
    id: "model-court",
    name: "Model Court (process gate for model changes)",
    category: "model",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/model/model-court.ts", "apps/web/__tests__/model-court.test.ts"],
    lastVerifiedAt: V,
    failureMode: "a model change ships without prosecution/defense/falsifier/evidence/rollback.",
    nextAction: "gate every MODEL_VERSION bump through tryModelChange() + the OOS promoter.",
  },

  // ── claims ──
  {
    id: "claims-public-clv",
    name: "Public CLV claim (Wilson-bounded, break-even gated)",
    category: "claims",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "PARTIAL",
    ownerGate: "renders only when canExposePerformanceStats AND graded-sample floor is met",
    evidenceRefs: ["apps/web/lib/performance/public-clv-policy.ts", "apps/web/app/clv/page.tsx"],
    lastVerifiedAt: V,
    failureMode: "claiming an edge off a point estimate before the lower bound clears break-even.",
    nextAction: "keep gated until the floor; surface CI inline (done).",
  },
  {
    id: "claims-banned-phrase",
    name: "Trust-claims banned-phrase scanner (CI gate)",
    category: "claims",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/trust-claims", "scripts/guardrails/trust-gate.mjs"],
    lastVerifiedAt: V,
    failureMode: "a public surface ships banned/overclaiming language.",
    nextAction: "keep scanForBannedPhrases the single source of truth — never re-implement.",
  },
  {
    id: "claims-compiler",
    name: "Public claim compiler (sample/coverage/calibration gate)",
    category: "claims",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/claims/public-claim-compiler.ts", "apps/web/__tests__/public-claim-compiler.test.ts"],
    lastVerifiedAt: V,
    failureMode: "a new public number renders without passing every gate.",
    nextAction: "wire compilePublicClaim() into every public performance-stat render path.",
  },
  {
    id: "claims-proof-graph",
    name: "Proof Graph (claim → pick → receipt → sources → settlement → CLV → autopsy)",
    category: "claims",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/proof/proof-graph.ts", "apps/web/__tests__/proof-graph.test.ts"],
    lastVerifiedAt: V,
    failureMode: "a public claim with no auditable chain behind it (proof theater).",
    nextAction: "build graphs from real picks + receipts + snapshots; expose the click-path publicly.",
  },

  // ── observability ──
  {
    id: "obs-tracing",
    name: "Observability spine (Sentry / OTel tracing)",
    category: "observability",
    builtStatus: "PARTIAL", wiredStatus: "NO", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: "@sentry/nextjs is a dependency but full instrumentation is not confirmed wired",
    evidenceRefs: ["apps/web/package.json"],
    lastVerifiedAt: null,
    failureMode: "silent failures across request → loader → DB → source → model → cache.",
    nextAction: "wire traces + cron/worker monitors + cost traces; no silent failures.",
  },
  {
    id: "obs-alerts",
    name: "Alert delivery (coverage / settlement / drift)",
    category: "observability",
    builtStatus: "PARTIAL", wiredStatus: "NO", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/performance/settlement-health.ts"],
    lastVerifiedAt: null,
    failureMode: "a silent settlement failure corrupts the public record before anyone notices.",
    nextAction: "wire a delivery sink + a stale-unsettled-picks alarm.",
  },

  // ── agents ──
  {
    id: "agents-jarvis",
    name: "Jarvis council (draft-only, externalActions NONE)",
    category: "agents",
    builtStatus: "YES", wiredStatus: "PARTIAL", provenStatus: "YES", publicSafeStatus: "YES",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/jarvis", "apps/web/__tests__/jarvis-purity.test.ts"],
    lastVerifiedAt: V,
    failureMode: "an agent taking an external action without owner approval.",
    nextAction: "keep zero autonomy; persist the agent-run contract for every run.",
  },
  {
    id: "agents-run-contract",
    name: "Agent run contract (draft-only, owner-gated externals)",
    category: "agents",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/agents/agent-run-contract.ts", "apps/web/__tests__/agent-run-contract.test.ts"],
    lastVerifiedAt: V,
    failureMode: "agent runs as un-reviewable chat vapor.",
    nextAction: "persist run records; surface them in an agent operations console.",
  },

  // ── cost ──
  {
    id: "cost-governor",
    name: "Cost Governor (paid-op justification gate)",
    category: "cost",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/cost/cost-governor.ts", "apps/web/__tests__/cost-governor.test.ts"],
    lastVerifiedAt: V,
    failureMode: "small recurring spend (cron/LLM/storage/previews) becomes the business model.",
    nextAction: "wire requirePaidOperation() into odds/LLM/storage call sites.",
  },

  // ── legal ──
  {
    id: "legal-rg",
    name: "Responsible gaming (age-gate, RG signposting, no-wager framing)",
    category: "legal",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "PARTIAL", publicSafeStatus: "PARTIAL",
    ownerGate: null,
    evidenceRefs: ["COMPLIANCE_AND_RESPONSIBLE_GAMING.md", "apps/web/lib/brand.ts"],
    lastVerifiedAt: null,
    failureMode: "wager-recommendation framing or missing helpline on a pick surface.",
    nextAction: "keep kellyStake/trueEV gated; verify age-gate + helpline on every pick surface.",
  },
  {
    id: "legal-privacy",
    name: "Privacy review (profiles / presence)",
    category: "legal",
    builtStatus: "NO", wiredStatus: "NO", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: "legal sign-off pending (all boxes unchecked) — blocks live community rooms",
    evidenceRefs: ["docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md"],
    lastVerifiedAt: null,
    failureMode: "launching rooms before privacy/GDPR posture is confirmed.",
    nextAction: "complete the privacy review before any community surface goes live.",
  },

  // ── community ──
  {
    id: "community-rooms",
    name: "Live rooms / moderation",
    category: "community",
    builtStatus: "PARTIAL", wiredStatus: "NO", provenStatus: "NO", publicSafeStatus: "NO",
    ownerGate: "staged behind privacy review + moderation coverage + responsible-play wiring + closed pilot",
    evidenceRefs: ["docs/legal/COMMUNITY_MODERATION_POLICY.md", "docs/ops/MODERATOR_COVERAGE_PLAN.md"],
    lastVerifiedAt: null,
    failureMode: "moderation/distress/gambling-harm/minor liability without guardrails.",
    nextAction: "keep staged; pilot-only after the gates above are proven.",
  },
  {
    id: "community-safety-engine",
    name: "Community Safety Engine (moderation policy as code)",
    category: "community",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/community/community-safety.ts", "apps/web/__tests__/community-safety.test.ts"],
    lastVerifiedAt: V,
    failureMode: "distress met with an upsell, or a minor/self-excluded user in a room.",
    nextAction: "wire into rooms when they pilot; distress → support, never sales.",
  },

  // ── revenue ──
  {
    id: "revenue-stripe",
    name: "Stripe subscriptions + proof-gated pricing ladder",
    category: "revenue",
    builtStatus: "YES", wiredStatus: "YES", provenStatus: "PARTIAL", publicSafeStatus: "PARTIAL",
    ownerGate: "Stripe LIVE prices not created; price advances are owner-gated (PRICING_PHASE)",
    evidenceRefs: ["apps/web/lib/pricing/pricing-phases.ts", "apps/web/lib/stripe.ts"],
    lastVerifiedAt: null,
    failureMode: "checkout not actually chargeable (no live prices) = no revenue.",
    nextAction: "owner creates Stripe live prices + webhook secret; verify a real checkout.",
  },
  {
    id: "revenue-b2b-governance",
    name: "B2B / API governance (key, domain, quota, claim-safe payload, revocation)",
    category: "revenue",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: "B2B is a future lane — needs signed pilots before any key is issued",
    evidenceRefs: ["apps/web/lib/b2b/api-governance.ts", "apps/web/__tests__/api-governance.test.ts"],
    lastVerifiedAt: V,
    failureMode: "an embedded widget overclaims on a partner site, or a revoked key still works.",
    nextAction: "wire as middleware when a B2B pilot is signed; deny non-claim-safe payloads.",
  },
  {
    id: "revenue-proof-cards",
    name: "Dynamic Proof Cards (proof → share → signup growth loop)",
    category: "revenue",
    builtStatus: "YES", wiredStatus: "NO", provenStatus: "YES", publicSafeStatus: "NO",
    ownerGate: null,
    evidenceRefs: ["apps/web/lib/proof/proof-card.ts", "apps/web/__tests__/proof-card.test.ts"],
    lastVerifiedAt: V,
    failureMode: "a shared card whose copy isn't claim-safe.",
    nextAction: "wire the per-route OG image render; the shared unit is a receipt, not a brag.",
  },
];

// ───────────────────────── auditors ─────────────────────────

export interface LedgerViolation {
  readonly id: string;
  readonly rule: string;
}

/**
 * A system may declare PUBLIC_SAFE = YES only if it is PROVEN = YES, OR an explicit
 * ownerGate explains a staged/manual posture (which makes no unguarded public claim).
 * Any other PUBLIC_SAFE = YES is a violation — the rule that stops fake green.
 */
export function isPublicSafeAllowed(entry: SystemEntry): boolean {
  if (entry.publicSafeStatus !== "YES") return true;
  if (entry.provenStatus === "YES") return true;
  return entry.ownerGate != null && entry.ownerGate.trim() !== "";
}

export function auditLedger(entries: readonly SystemEntry[] = INTEGRITY_LEDGER): LedgerViolation[] {
  const violations: LedgerViolation[] = [];
  for (const e of entries) {
    if (!isPublicSafeAllowed(e)) {
      violations.push({
        id: e.id,
        rule: "PUBLIC_SAFE requires PROVEN=YES or an explaining ownerGate",
      });
    }
  }
  return violations;
}

export const CATEGORY_ORDER: readonly Category[] = [
  "web", "database", "workers", "cache", "storage", "data-sources",
  "model", "claims", "observability", "agents", "cost", "legal", "community", "revenue",
];

export function ledgerByCategory(
  entries: readonly SystemEntry[] = INTEGRITY_LEDGER
): Array<{ category: Category; systems: SystemEntry[] }> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    systems: entries.filter((e) => e.category === category),
  })).filter((g) => g.systems.length > 0);
}
