/**
 * Database seed — creates sports and leagues records
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SPORTS = [
  {
    key: "americanfootball_nfl",
    name: "NFL",
    displayName: "National Football League",
    leagues: [{ key: "nfl", name: "NFL", displayName: "National Football League" }],
  },
  {
    key: "americanfootball_ncaaf",
    name: "NCAAF",
    displayName: "College Football",
    leagues: [{ key: "ncaaf", name: "NCAAF", displayName: "College Football" }],
  },
  {
    key: "basketball_nba",
    name: "NBA",
    displayName: "National Basketball Association",
    leagues: [{ key: "nba", name: "NBA", displayName: "National Basketball Association" }],
  },
  {
    key: "basketball_ncaab",
    name: "NCAAB",
    displayName: "College Basketball",
    leagues: [{ key: "ncaab", name: "NCAAB", displayName: "College Basketball" }],
  },
  {
    key: "baseball_mlb",
    name: "MLB",
    displayName: "Major League Baseball",
    leagues: [{ key: "mlb", name: "MLB", displayName: "Major League Baseball" }],
  },
  {
    key: "icehockey_nhl",
    name: "NHL",
    displayName: "National Hockey League",
    leagues: [{ key: "nhl", name: "NHL", displayName: "National Hockey League" }],
  },
  {
    key: "soccer_usa_mls",
    name: "MLS",
    displayName: "Major League Soccer",
    leagues: [{ key: "mls", name: "MLS", displayName: "Major League Soccer", country: "US" }],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const sport of SPORTS) {
    const sportRecord = await db.sport.upsert({
      where: { key: sport.key },
      create: {
        key: sport.key,
        name: sport.name,
        displayName: sport.displayName,
      },
      update: {
        name: sport.name,
        displayName: sport.displayName,
      },
    });

    console.log(`✓ Sport: ${sport.name} (${sportRecord.id})`);

    for (const league of sport.leagues) {
      await db.league.upsert({
        where: { key: league.key },
        create: {
          key: league.key,
          sportId: sportRecord.id,
          name: league.name,
          displayName: league.displayName,
          country: "country" in league ? (league as { country?: string }).country : undefined,
        },
        update: {
          name: league.name,
          displayName: league.displayName,
        },
      });

      console.log(`  ✓ League: ${league.name}`);
    }
  }


  // ── Cockpit (Phase 2B) demo data ─────────────────────────────
  // Idempotent: only seeds when cockpit_tasks is empty so re-runs
  // don't pile up duplicate operational rows.
  const existingTaskCount = await db.cockpitTask.count();
  if (existingTaskCount === 0) {
    console.log("Seeding cockpit demo data...");
    await seedCockpit();
    console.log("  ✓ Cockpit seeded");
  } else {
    console.log(`Cockpit already has ${existingTaskCount} tasks — skipping cockpit seed.`);
  }

  // ── Local-dev admin user (turn-on readiness) ──────────────────
  // Promotes (or creates) a single user as ADMIN for local cockpit
  // access. Gated on DEV_ADMIN_EMAIL so production seed runs are a
  // no-op when the var is unset. Idempotent via upsert — never
  // downgrades an existing ADMIN, only ensures one exists.
  //
  // Production safety: NODE_ENV=production aborts this block even
  // if DEV_ADMIN_EMAIL is set, so a misconfigured deploy can't
  // accidentally promote anyone.
  await seedDevAdmin();

  // ── Picks (launch-night fixture) ──────────────────────────────
  // Idempotent: only seeds when picks table is empty so re-runs don't
  // pile up. Generates ~30 picks spanning canonical + bootstrap eras,
  // settled + pending, across multiple sports. Lets /dashboard,
  // /cockpit, and /cockpit/history render meaningful rows without
  // waiting for live ingestion.
  //
  // Production safety: NODE_ENV=production aborts this block — these
  // are synthetic picks, not model output. They must never land on a
  // real customer surface.
  if (process.env["NODE_ENV"] !== "production") {
    const existingPickCount = await db.pick.count();
    if (existingPickCount === 0) {
      console.log("Seeding launch-night picks...");
      const created = await seedPicks();
      console.log(`  ✓ Picks seeded (${created.total} total — ${created.canonical} canonical, ${created.bootstrap} bootstrap)`);
    } else {
      console.log(`Picks table already has ${existingPickCount} rows — skipping pick seed.`);
    }
  }

  await seedPromotions();
  await seedDailyBrief();
  await seedContentDrafts();

  console.log("Seed complete!");
}

async function seedDevAdmin(): Promise<void> {
  const email = process.env["DEV_ADMIN_EMAIL"];
  if (!email) {
    console.log("DEV_ADMIN_EMAIL not set — skipping local admin seed.");
    return;
  }
  if (process.env["NODE_ENV"] === "production") {
    console.warn(
      "Refusing to seed DEV_ADMIN_EMAIL while NODE_ENV=production. " +
        "Run admin promotion manually with an auditable command."
    );
    return;
  }

  const normalized = email.trim().toLowerCase();
  const user = await db.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      name: process.env["DEV_ADMIN_NAME"] ?? "Local Admin",
      role: "ADMIN",
    },
    update: { role: "ADMIN" },
  });
  console.log(`  ✓ Local admin user: ${user.email} (role=${user.role})`);
}



// ─────────────────────────────────────────────
// Cockpit demo data — sports operations only.
// Eight tasks across multiple statuses, five media items, plus
// decisions that match the allow-listed transition graph.
// ─────────────────────────────────────────────

async function seedCockpit(): Promise<void> {
  const t1 = await db.cockpitTask.create({
    data: {
      title: "NFL Week 6 line movement scan",
      description: "Scan opening vs current spreads across all NFL games and flag any moves >= 1.5 points for analyst review.",
      assignedAgent: "SCOUT",
      status: "NEW",
      priority: 70,
      riskLevel: "LOW",
      complianceStatus: "NOT_APPLICABLE",
      source: "worker/data-refresh",
    },
  });

  const t2 = await db.cockpitTask.create({
    data: {
      title: "Investigate failing scoring test (run #482)",
      description: "scoring.test.ts > edge cases > thin market started failing intermittently on CI. Repro locally and identify flake source.",
      assignedAgent: "TAL",
      status: "ROUTED",
      priority: 65,
      riskLevel: "MODERATE",
      complianceStatus: "NOT_APPLICABLE",
      source: "ci/github-actions",
    },
  });

  const t3 = await db.cockpitTask.create({
    data: {
      title: "Draft NBA slate preview — tonight's games",
      description: "Generate a draft preview post citing only approved picks for tonight's NBA slate. Cite source coverage. Do not publish.",
      assignedAgent: "AVA",
      status: "DRAFTED",
      priority: 55,
      riskLevel: "LOW",
      complianceStatus: "REVIEW_REQUIRED",
      source: "scheduler/daily-content",
    },
  });

  const t4 = await db.cockpitTask.create({
    data: {
      title: "Review: support reply re: confidence labels",
      description: "Subscriber asked why confidence displays as a label not a number. Draft reply citing the calibration policy from .env.example. Pending review.",
      assignedAgent: "SARAH",
      status: "NEEDS_REVIEW",
      priority: 60,
      riskLevel: "LOW",
      complianceStatus: "CLEAR",
      source: "support/inbox",
    },
  });

  const t5 = await db.cockpitTask.create({
    data: {
      title: "Funnel anomaly — pricing page bounce up 18% wow",
      description: "Bobby flagged a 7-day bounce rate increase on /pricing. Compare to landing source distribution and surface for review.",
      assignedAgent: "BOBBY",
      status: "NEEDS_REVIEW",
      priority: 75,
      riskLevel: "MODERATE",
      complianceStatus: "NOT_APPLICABLE",
      source: "analytics/funnel-monitor",
    },
  });

  const t6 = await db.cockpitTask.create({
    data: {
      title: "Routing proposal: assign tonight's MLB research to Scout",
      description: "Jarvis surfaced an unassigned research task. Proposing assignment to Scout based on agent responsibility profile.",
      assignedAgent: "JARVIS",
      status: "APPROVED",
      priority: 50,
      riskLevel: "LOW",
      complianceStatus: "NOT_APPLICABLE",
      source: "jarvis/router",
    },
  });

  const t7 = await db.cockpitTask.create({
    data: {
      title: "Blocked: data freshness gap on NHL stream",
      description: "NHL odds ingestion has not refreshed in 4 hours. Worker logs reviewed; awaiting confirmation from infra before resuming dependent picks.",
      assignedAgent: "TAL",
      status: "BLOCKED",
      priority: 80,
      riskLevel: "HIGH",
      complianceStatus: "HOLD",
      source: "ops-runbook",
      decisionNotes: "Held pending infra confirmation. Do NOT resume dependent picks until source freshness is verified.",
    },
  });

  const t8 = await db.cockpitTask.create({
    data: {
      title: "Archived: weekly digest draft (last week)",
      description: "Last week's digest was approved and shipped. Archiving the task record for audit history.",
      assignedAgent: "AVA",
      status: "ARCHIVED",
      priority: 20,
      riskLevel: "LOW",
      complianceStatus: "CLEAR",
      source: "scheduler/weekly-digest",
    },
  });

  void t1; void t5;

  await db.cockpitDecision.createMany({
    data: [
      { taskId: t2.id, toStatus: "ROUTED", reviewer: "agent:jarvis", note: "Routed to Tal: engineering test-flake bucket." },
      { taskId: t3.id, toStatus: "ROUTED", reviewer: "agent:jarvis", note: "Routed to Ava for draft." },
      { taskId: t3.id, toStatus: "DRAFTED", reviewer: "agent:ava", note: "Initial draft generated from approved NBA picks only." },
      { taskId: t4.id, toStatus: "ROUTED", reviewer: "agent:jarvis" },
      { taskId: t4.id, toStatus: "DRAFTED", reviewer: "agent:sarah", note: "Reply drafted using .env.example bootstrap guide language." },
      { taskId: t4.id, toStatus: "NEEDS_REVIEW", reviewer: "agent:sarah", note: "Ready for editor approval." },
      { taskId: t6.id, toStatus: "ROUTED", reviewer: "agent:jarvis" },
      { taskId: t6.id, toStatus: "DRAFTED", reviewer: "agent:jarvis" },
      { taskId: t6.id, toStatus: "NEEDS_REVIEW", reviewer: "agent:jarvis" },
      { taskId: t6.id, toStatus: "APPROVED", reviewer: "manual:operator", note: "Approved routing proposal." },
      { taskId: t7.id, toStatus: "ROUTED", reviewer: "agent:jarvis" },
      { taskId: t7.id, toStatus: "BLOCKED", reviewer: "manual:operator", note: "Held pending infra confirmation." },
      { taskId: t8.id, toStatus: "ROUTED", reviewer: "agent:jarvis" },
      { taskId: t8.id, toStatus: "DRAFTED", reviewer: "agent:ava" },
      { taskId: t8.id, toStatus: "NEEDS_REVIEW", reviewer: "agent:ava" },
      { taskId: t8.id, toStatus: "APPROVED", reviewer: "manual:operator" },
      { taskId: t8.id, toStatus: "ARCHIVED", reviewer: "manual:operator", note: "Shipped last week. Archived for audit history." },
    ],
  });

  await db.cockpitMediaItem.createMany({
    data: [
      {
        briefTitle: "NFL Week 6 Slate Preview",
        briefBody: "Preview tonight's NFL slate citing only approved picks. Highlight bookmaker coverage and risk levels; do not assert win outcomes.",
        channel: "blog",
        draftBody: "Draft body in progress. Sourced exclusively from approved picks and platform-published data.",
        qaStatus: "DRAFT",
        complianceStatus: "REVIEW_REQUIRED",
        approved: false,
      },
      {
        briefTitle: "NBA Newsletter — Weekly Edge Notes",
        briefBody: "Weekly newsletter section pulling settled-pick recap. Excludes bootstrap-era picks per Phase-2 trust policy.",
        channel: "newsletter",
        draftBody: "Weekly recap drafted. Pending QA review.",
        qaStatus: "QA_PASS",
        complianceStatus: "CLEAR",
        approved: false,
      },
      {
        briefTitle: "Pricing FAQ refresh",
        briefBody: "Refresh the pricing FAQ to emphasize cancel-anytime and the 7-day refund window. Distinct from sports-outcome claims.",
        channel: "blog",
        draftBody: null,
        qaStatus: "DRAFT",
        complianceStatus: "REVIEW_REQUIRED",
        approved: false,
      },
      {
        briefTitle: "MLB Trade Deadline Methodology Explainer",
        briefBody: "Explain how Scout signal weighting handles roster volatility around the trade deadline. Methodology only, no specific picks.",
        channel: "blog",
        draftBody: "Methodology draft underway. Cites engine behavior only.",
        qaStatus: "DRAFT",
        complianceStatus: "REVIEW_REQUIRED",
        approved: false,
      },
      {
        briefTitle: "Internal: cockpit usage notes for the editor",
        briefBody: "How to triage NEEDS_REVIEW items, when to BLOCK, and how the decision log surfaces audit trail.",
        channel: "internal-doc",
        draftBody: "First pass written. Pending editor sign-off.",
        qaStatus: "QA_PASS",
        complianceStatus: "CLEAR",
        approved: false,
      },
    ],
  });

  // ── Phase 4 — Promotions seed (Bobby + Jarvis review queue) ──
  // Idempotent: only seeds if the table is empty.
  await seedPromotions();

  // ── Phase 5 — Daily Brief seed (one INTERNAL draft for today) ──
  await seedDailyBrief();

  // ── Phase 8 — Draft-only content engine seed ──
  await seedContentDrafts();
}

// ─────────────────────────────────────────────
// Phase 4 — Promotions seed
// Demo rows covering each promotion status / compliance path so the cockpit
// queue and the public marketplace render representative data. The Bobby
// review task drops two cockpit_tasks rows linked into the existing queue.
// ─────────────────────────────────────────────

async function seedPromotions(): Promise<void> {
  const existing = await db.promotion.count();
  if (existing > 0) {
    console.log(`Promotions already seeded (${existing}) — skipping.`);
    return;
  }
  console.log("Seeding promotions...");

  await db.promotion.createMany({
    data: [
      {
        slug: "draftkings-bonus-bet-200",
        sportsbookKey: "draftkings",
        operatorName: "DraftKings Sportsbook",
        headline: "Bonus bet up to $200 on first deposit",
        offerSummary:
          "Deposit and place a wager to qualify for a bonus bet match. See operator terms for required play-through.",
        offerCategory: "DEPOSIT_MATCH",
        affiliateType: "CPA",
        affiliateUrl: "https://example.com/dk-affiliate",
        termsUrl: "https://sportsbook.draftkings.com/help/promotions",
        promoCode: null,
        eligibleStates: ["NJ", "NY", "PA", "MI", "IL"],
        restrictedStates: ["WA", "HI", "UT"],
        country: "US",
        minimumAge: 21,
        status: "ACTIVE",
        complianceStatus: "APPROVED",
        disclosureText:
          "Sponsored content. We may earn a commission when you sign up via this link.",
        responsibleGamingText:
          "Gambling problem? Call 1-800-GAMBLER. Must be 21+ in eligible states.",
        lastReviewedAt: new Date(),
        reviewedBy: "manual:operator",
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        slug: "fanduel-odds-boost-week",
        sportsbookKey: "fanduel",
        operatorName: "FanDuel Sportsbook",
        headline: "Daily odds boost on a featured matchup",
        offerSummary:
          "FanDuel publishes a daily odds boost on one game. Limit one boosted wager per user per day. See terms for max stake.",
        offerCategory: "ODDS_BOOST",
        affiliateType: "REVSHARE",
        affiliateUrl: "https://example.com/fd-affiliate",
        termsUrl: "https://www.fanduel.com/promo-rules",
        promoCode: null,
        eligibleStates: ["NJ", "PA", "IN"],
        restrictedStates: [],
        country: "US",
        minimumAge: 21,
        status: "NEEDS_REVIEW",
        complianceStatus: "NEEDS_STATE_REVIEW",
        disclosureText:
          "Sponsored content. We may earn a commission when you sign up via this link.",
        responsibleGamingText:
          "Gambling problem? Call 1-800-GAMBLER. Must be 21+ in eligible states.",
        lastReviewedAt: null,
        reviewedBy: null,
        expiresAt: null,
      },
      {
        slug: "betmgm-signup-bonus",
        sportsbookKey: "betmgm",
        operatorName: "BetMGM",
        headline: "Signup match on first wager",
        offerSummary:
          "Match on first wager up to a published cap. See operator terms for play-through and forfeiture conditions.",
        offerCategory: "SIGNUP_BONUS",
        affiliateType: "CPA",
        affiliateUrl: null,
        termsUrl: null,
        promoCode: "INTEL",
        eligibleStates: ["NJ"],
        restrictedStates: [],
        country: "US",
        minimumAge: 21,
        status: "DRAFT",
        complianceStatus: "NEEDS_TERMS",
        disclosureText: null,
        responsibleGamingText: null,
        lastReviewedAt: null,
        reviewedBy: null,
        expiresAt: null,
      },
      {
        slug: "expired-historical-promo",
        sportsbookKey: "caesars",
        operatorName: "Caesars Sportsbook",
        headline: "Historical signup offer",
        offerSummary:
          "Archived offer kept for audit history. Not surfaced publicly.",
        offerCategory: "SIGNUP_BONUS",
        affiliateType: "NONE",
        affiliateUrl: null,
        termsUrl: "https://www.caesars.com/sportsbook-and-casino/terms",
        promoCode: null,
        eligibleStates: ["NJ"],
        restrictedStates: [],
        country: "US",
        minimumAge: 21,
        status: "EXPIRED",
        complianceStatus: "APPROVED",
        disclosureText: "Sponsored content; commission may apply.",
        responsibleGamingText: "Gambling problem? Call 1-800-GAMBLER.",
        lastReviewedAt: new Date("2025-12-31T00:00:00Z"),
        reviewedBy: "manual:operator",
        expiresAt: new Date("2026-01-31T00:00:00Z"),
      },
      {
        slug: "blocked-noncompliant-promo",
        sportsbookKey: "unknown",
        operatorName: "Unknown Operator",
        headline: "Risk-free guaranteed easy money offer",
        offerSummary:
          "Example noncompliant copy used to verify the public-copy scanner blocks it. Never publishes.",
        offerCategory: "OTHER",
        affiliateType: "NONE",
        affiliateUrl: null,
        termsUrl: null,
        promoCode: null,
        eligibleStates: [],
        restrictedStates: [],
        country: "US",
        minimumAge: 21,
        status: "BLOCKED",
        complianceStatus: "BLOCKED",
        disclosureText: null,
        responsibleGamingText: null,
        lastReviewedAt: new Date(),
        reviewedBy: "agent:bobby",
        expiresAt: null,
      },
    ],
  });

  // Companion cockpit tasks so the queue shows the promotion review workflow.
  const promoTaskBobby = await db.cockpitTask.create({
    data: {
      title: "Compliance review: FanDuel odds boost — state coverage",
      description:
        "FanDuel daily odds boost is marked NEEDS_REVIEW with eligibleStates only spanning 3 markets. Confirm legal-eligible states and request operator clarification.",
      assignedAgent: "BOBBY",
      status: "ROUTED",
      priority: 65,
      riskLevel: "MODERATE",
      complianceStatus: "REVIEW_REQUIRED",
      source: "promotions/ingest",
    },
  });
  const promoTaskJarvis = await db.cockpitTask.create({
    data: {
      title: "Disclosure missing: BetMGM signup match draft",
      description:
        "Draft promo for BetMGM has no terms URL and no responsible-gaming text. Hold until both are populated.",
      assignedAgent: "JARVIS",
      status: "BLOCKED",
      priority: 70,
      riskLevel: "HIGH",
      complianceStatus: "HOLD",
      source: "promotions/ingest",
      decisionNotes:
        "Blocked pending operator terms URL + responsible-gaming copy. Do not surface publicly.",
    },
  });
  void promoTaskBobby;
  void promoTaskJarvis;

  await db.cockpitDecision.createMany({
    data: [
      {
        taskId: promoTaskBobby.id,
        toStatus: "ROUTED",
        reviewer: "agent:jarvis",
        note: "Routed to Bobby for compliance review.",
      },
      {
        taskId: promoTaskJarvis.id,
        toStatus: "ROUTED",
        reviewer: "agent:jarvis",
      },
      {
        taskId: promoTaskJarvis.id,
        toStatus: "BLOCKED",
        reviewer: "manual:operator",
        note: "Held pending operator terms + RG copy.",
      },
    ],
  });

  console.log("  ✓ Promotions and review tasks seeded");
}

// ─────────────────────────────────────────────
// Phase 5 — Daily Brief seed
// One INTERNAL draft brief for today with sections covering the slate,
// data quality, manual review, promotions, and responsible gaming. Plus a
// companion cockpit task assigned to JARVIS so the review queue shows
// the brief workflow on first boot.
// ─────────────────────────────────────────────

async function seedDailyBrief(): Promise<void> {
  const todayUtc = new Date();
  const briefDate = new Date(
    Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate()
    )
  );
  const existing = await db.dailyBrief
    .findUnique({ where: { briefDate } })
    .catch(() => null);
  if (existing) {
    console.log(
      `Daily brief already seeded for ${briefDate.toISOString().slice(0, 10)} — skipping.`
    );
    return;
  }
  console.log("Seeding daily brief draft...");

  const brief = await db.dailyBrief.create({
    data: {
      briefDate,
      status: "DRAFT",
      visibility: "INTERNAL",
      title: `Daily Brief — ${briefDate.toISOString().slice(0, 10)}`,
      summary:
        "Internal draft. Slate snapshot is auto-composed at request time; this row is a review parking slot, not the live brief.",
      slateSummary:
        "Slate counts auto-populate from the games and picks tables at /brief and /cockpit/brief. Empty days render an honest no-slate state.",
      dataQualitySummary:
        "Source freshness budgets enforced in apps/web/lib/source-intelligence. Stale source categories trigger HOLD; missing categories trigger HOLD/BLOCKED depending on artifact kind.",
      manualReviewNotes:
        "Initial review focus: confirm promotion section compliance, ensure performance gate language stays honest, double-check RG note on the public brief.",
      responsibleGamingText:
        "Sports outcomes are uncertain. Picks here are analysis, not advice. Gambling problem? 1-800-GAMBLER.",
      generatedBy: "system",
      sections: {
        create: [
          {
            sectionType: "SLATE_OVERVIEW",
            title: "Today's slate",
            content:
              "Counts of games, leagues, and picks roll up from the same composer that powers /brief.",
            sortOrder: 10,
            visibility: "PUBLIC",
            sourceStatus: "FRESH",
            requiresReview: false,
          },
          {
            sectionType: "DATA_QUALITY",
            title: "Source freshness",
            content:
              "Stale source warnings appear here when ingestion lags beyond per-category TTL budgets.",
            sortOrder: 20,
            visibility: "INTERNAL",
            sourceStatus: "PENDING",
            requiresReview: false,
          },
          {
            sectionType: "MANUAL_REVIEW",
            title: "Manual review items",
            content:
              "Drafts, blocked items, and routing proposals waiting on a reviewer.",
            sortOrder: 30,
            visibility: "INTERNAL",
            sourceStatus: "PENDING",
            requiresReview: true,
          },
          {
            sectionType: "PROMOTIONS",
            title: "Approved promotions",
            content:
              "Only ACTIVE + APPROVED promotions surface here, after the publish gate verifies disclosure, terms, eligibility, and copy.",
            sortOrder: 40,
            visibility: "PUBLIC",
            sourceStatus: "FRESH",
            requiresReview: false,
          },
          {
            sectionType: "RESPONSIBLE_GAMING",
            title: "Responsible gaming",
            content:
              "Always shown on every public brief. 21+ where applicable. 1-800-GAMBLER.",
            sortOrder: 90,
            visibility: "PUBLIC",
            sourceStatus: "FRESH",
            requiresReview: false,
          },
          {
            sectionType: "CONTENT_IDEAS",
            title: "Draft content ideas",
            content:
              "Draft prompts for Ava: Daily slate explainer, Why data freshness matters, Promotion terms reminder, Responsible-betting education, How confidence labels work, Line movement watch (internal).",
            sortOrder: 70,
            visibility: "INTERNAL",
            sourceStatus: "FRESH",
            requiresReview: true,
          },
          {
            sectionType: "WHAT_CHANGED",
            title: "What changed since last refresh",
            content:
              "Diff against the last persisted brief — new picks, status flips, newly approved promotions.",
            sortOrder: 80,
            visibility: "INTERNAL",
            sourceStatus: "PENDING",
            requiresReview: false,
          },
        ],
      },
    },
  });

  // Companion cockpit task assigned to JARVIS (orchestration agent).
  const briefTask = await db.cockpitTask.create({
    data: {
      title: `Review today's brief draft (${briefDate.toISOString().slice(0, 10)})`,
      description:
        "Review the seeded internal brief: confirm slate copy, check manual-review section, ensure promotions section gating is honest, confirm RG note on the public surface.",
      assignedAgent: "JARVIS",
      status: "NEEDS_REVIEW",
      priority: 70,
      riskLevel: "LOW",
      complianceStatus: "REVIEW_REQUIRED",
      source: "daily-brief/seed",
    },
  });
  void brief;
  void briefTask;

  console.log("  ✓ Daily brief seeded");
}

// ─────────────────────────────────────────────
// Phase 8 — Draft-only content engine seed
//
// Seeds four representative INTERNAL drafts so the cockpit content queue
// renders the workflow on first boot. None are PUBLIC, none are APPROVED,
// none have publishedAt set. The drafts are deliberately mixed so the
// readiness verdict shows multiple states (READY_FOR_REVIEW, NEEDS_SOURCE,
// NEEDS_PERFORMANCE_GATE, INTERNAL_ONLY).
// ─────────────────────────────────────────────

const RESPONSIBLE_GAMING_LINE =
  "If you or someone you know has a gambling problem, call 1-800-522-4700 (National Problem Gambling Helpline). Sports betting involves risk.";

const AFFILIATE_DISCLOSURE_LINE =
  "Affiliate disclosure: this platform may earn a commission when a reader signs up at a partner sportsbook. Promotion terms govern. 21+. Geographic and eligibility restrictions apply.";

async function seedContentDrafts(): Promise<void> {
  // Guard for older Prisma client generations.
  const client = db as unknown as {
    contentDraft?: {
      count: () => Promise<number>;
      create: (args: unknown) => Promise<unknown>;
    };
  };
  if (!client.contentDraft) {
    console.log("ContentDraft model not generated yet — skipping content seed.");
    return;
  }

  const existing = await client.contentDraft.count().catch(() => 0);
  if (existing > 0) {
    console.log(`Content drafts already seeded (${existing}) — skipping.`);
    return;
  }

  console.log("Seeding draft-only content engine demo drafts...");

  // 1. Daily slate brief — REVIEW_REQUIRED, INTERNAL.
  await client.contentDraft.create({
    data: {
      title: "Daily slate brief — internal draft",
      slug: `daily-slate-brief-${new Date().toISOString().slice(0, 10)}`,
      contentType: "DAILY_BRIEF",
      status: "DRAFT",
      visibility: "INTERNAL",
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "COVERED",
      complianceStatus: "REVIEW_REQUIRED",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE",
      bannedPhraseScanClean: true,
      draftBody: [
        "# Daily slate brief — internal draft",
        "",
        "Tonight's slate snapshot, sourced from the live composer at /brief. This draft is INTERNAL and never auto-publishes.",
        "",
        RESPONSIBLE_GAMING_LINE,
      ].join("\n"),
      excerpt: "Tonight's slate snapshot, sourced from the live composer.",
      generatedBy: "seed:content-engine",
      sources: {
        create: [
          {
            sourceType: "ODDS",
            sourceLabel: "Live odds composer",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: "Composed from Game / Odds tables.",
          },
          {
            sourceType: "DAILY_BRIEF",
            sourceLabel: "DailyBrief seed (today)",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: null,
          },
        ],
      },
    },
  } as unknown as never);

  // 2. Methodology education — READY_FOR_REVIEW.
  await client.contentDraft.create({
    data: {
      title: "Why data freshness matters",
      slug: "why-data-freshness-matters",
      contentType: "METHODOLOGY_EDUCATION",
      status: "DRAFT",
      visibility: "INTERNAL",
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "COVERED",
      complianceStatus: "NOT_APPLICABLE",
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE",
      bannedPhraseScanClean: true,
      draftBody: [
        "# Why data freshness matters",
        "",
        "Sports lines move. The model assigns each piece of evidence a freshness budget, and downstream artifacts switch to HOLD or BLOCKED when evidence ages past its budget.",
        "",
        "Cited claims live in apps/web/lib/trust-claims.ts and are reviewed in PRs.",
      ].join("\n"),
      excerpt: "How freshness budgets keep stale evidence out of published drafts.",
      generatedBy: "seed:content-engine",
      sources: {
        create: [
          {
            sourceType: "METHODOLOGY",
            sourceLabel: "Trust Claim Registry — methodology entries",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: "Approved claims from trust-claims.ts",
          },
        ],
      },
    },
  } as unknown as never);

  // 3. Responsible betting education — READY_FOR_REVIEW.
  await client.contentDraft.create({
    data: {
      title: "Responsible betting reminder",
      slug: "responsible-betting-reminder",
      contentType: "RESPONSIBLE_BETTING_EDUCATION",
      status: "DRAFT",
      visibility: "INTERNAL",
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "COVERED",
      complianceStatus: "CLEAR",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE",
      bannedPhraseScanClean: true,
      draftBody: [
        "# Responsible betting reminder",
        "",
        "Sports betting can be enjoyable, but it carries real financial risk. Set a budget, never chase losses, and step away if you stop enjoying it.",
        "",
        RESPONSIBLE_GAMING_LINE,
      ].join("\n"),
      excerpt: "Evergreen reminder. Helpline number, no promo-specific language.",
      generatedBy: "seed:content-engine",
      sources: {
        create: [
          {
            sourceType: "RESPONSIBLE_GAMING",
            sourceLabel: "National Problem Gambling Helpline",
            sourceUrl: "https://www.ncpgambling.org/",
            sourceStatus: "FRESH",
            trustLevel: "AUTHORITATIVE",
            fetchedAt: new Date(),
            notes: null,
          },
          {
            sourceType: "METHODOLOGY",
            sourceLabel: "Platform policy — RG copy",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: null,
          },
        ],
      },
    },
  } as unknown as never);

  // 4. Promotion roundup — uses the existing approved promotion seed.
  await client.contentDraft.create({
    data: {
      title: "Approved sportsbook promotions roundup",
      slug: "approved-promotions-roundup",
      contentType: "PROMOTION_ROUNDUP",
      status: "DRAFT",
      visibility: "INTERNAL",
      relatedPickIds: [],
      relatedPromotionIds: ["draftkings-bonus-bet-200"],
      relatedBriefIds: [],
      sourceCoverageStatus: "COVERED",
      complianceStatus: "CLEAR",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: true,
      performanceGateStatus: "NOT_APPLICABLE",
      bannedPhraseScanClean: true,
      draftBody: [
        "# Approved sportsbook promotions",
        "",
        "Only promotions that have cleared compliance review appear in this draft.",
        "",
        "## DraftKings Sportsbook",
        "Deposit and place a wager to qualify for a bonus bet match. See operator terms.",
        "Read the full terms at the operator: https://sportsbook.draftkings.com/help/promotions",
        "",
        RESPONSIBLE_GAMING_LINE,
        "",
        AFFILIATE_DISCLOSURE_LINE,
      ].join("\n"),
      excerpt: "Compliance-approved promotions only.",
      generatedBy: "seed:content-engine",
      sources: {
        create: [
          {
            sourceType: "PROMOTION_TERMS",
            sourceLabel: "DraftKings operator terms",
            sourceUrl: "https://sportsbook.draftkings.com/help/promotions",
            sourceStatus: "FRESH",
            trustLevel: "AUTHORITATIVE",
            fetchedAt: new Date(),
            notes: null,
          },
          {
            sourceType: "RESPONSIBLE_GAMING",
            sourceLabel: "National Problem Gambling Helpline",
            sourceUrl: "https://www.ncpgambling.org/",
            sourceStatus: "FRESH",
            trustLevel: "AUTHORITATIVE",
            fetchedAt: new Date(),
            notes: null,
          },
        ],
      },
    },
  } as unknown as never);

  // 5. Model accountability note — INTERNAL_ONLY.
  await client.contentDraft.create({
    data: {
      title: "Model accountability note — open calibration items",
      slug: "model-accountability-note-internal",
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      status: "DRAFT",
      visibility: "INTERNAL",
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "COVERED",
      complianceStatus: "NOT_APPLICABLE",
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE",
      bannedPhraseScanClean: true,
      draftBody: [
        "# Model accountability note (internal)",
        "",
        "Summary of any open calibration proposals. Public-safe variants require a deliberate operator decision — this draft is internal-only.",
      ].join("\n"),
      excerpt: "Internal summary of open calibration proposals.",
      generatedBy: "seed:content-engine",
      sources: {
        create: [
          {
            sourceType: "CALIBRATION",
            sourceLabel: "CalibrationProposal table",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: "Calibration content is INTERNAL_ONLY by default.",
          },
          {
            sourceType: "METHODOLOGY",
            sourceLabel: "Trust Claim Registry",
            sourceUrl: null,
            sourceStatus: "FRESH",
            trustLevel: "PLATFORM",
            fetchedAt: new Date(),
            notes: null,
          },
        ],
      },
    },
  } as unknown as never);

  // Cockpit task wiring — assign content review to AVA.
  await db.cockpitTask.create({
    data: {
      title: "Phase 8: review seeded content drafts (Ava)",
      description:
        "Five seeded INTERNAL drafts populate /cockpit/content. Confirm readiness verdicts and route compliance items (promotions roundup → Bobby, RG → Sarah, calibration → Tal). No draft auto-publishes.",
      assignedAgent: "AVA",
      status: "NEEDS_REVIEW",
      priority: 60,
      riskLevel: "LOW",
      complianceStatus: "REVIEW_REQUIRED",
      source: "content-engine/seed",
    },
  });

  console.log("  ✓ Content drafts seeded");
}

// ── Launch-night picks seed ────────────────────────────────────────────
//
// Idempotent: caller checks `db.pick.count() === 0` before invoking.
// Generates a realistic spread of picks so /dashboard, /cockpit, and
// /cockpit/history render meaningful rows even before a live ingestion
// run. The seed creates one synthetic Game per pick (1:1) to avoid
// the unique-on-[gameId,pickType] collision.
//
// Production safety: the caller blocks this on NODE_ENV !== "production".

interface SeedPickResult {
  total: number;
  canonical: number;
  bootstrap: number;
}

async function seedPicks(): Promise<SeedPickResult> {
  const sports = await db.sport.findMany({
    where: {
      key: {
        in: [
          "americanfootball_nfl",
          "basketball_nba",
          "baseball_mlb",
          "icehockey_nhl",
          "americanfootball_ncaaf",
        ],
      },
    },
    select: { id: true, key: true, name: true },
  });
  if (sports.length === 0) {
    console.log("  ! No sports rows — skipping pick seed.");
    return { total: 0, canonical: 0, bootstrap: 0 };
  }

  const TEAMS: Record<string, Array<{ home: string; away: string }>> = {
    NFL: [
      { home: "Chiefs", away: "Bills" },
      { home: "49ers", away: "Eagles" },
      { home: "Cowboys", away: "Giants" },
      { home: "Ravens", away: "Bengals" },
      { home: "Lions", away: "Packers" },
      { home: "Dolphins", away: "Jets" },
    ],
    NBA: [
      { home: "Celtics", away: "Lakers" },
      { home: "Warriors", away: "Nuggets" },
      { home: "Heat", away: "Bucks" },
      { home: "Suns", away: "Knicks" },
      { home: "Mavericks", away: "Thunder" },
    ],
    MLB: [
      { home: "Dodgers", away: "Yankees" },
      { home: "Astros", away: "Braves" },
      { home: "Phillies", away: "Mets" },
      { home: "Rangers", away: "Padres" },
    ],
    NHL: [
      { home: "Avalanche", away: "Maple Leafs" },
      { home: "Oilers", away: "Bruins" },
      { home: "Stars", away: "Hurricanes" },
    ],
    NCAAF: [
      { home: "Georgia", away: "Alabama" },
      { home: "Michigan", away: "Ohio State" },
      { home: "Texas", away: "Oklahoma" },
    ],
  };

  const NOW = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;

  type Plan = {
    sport: typeof sports[number];
    home: string;
    away: string;
    daysAgo: number;
    isBootstrap: boolean;
    result: "WIN" | "LOSS" | "PUSH" | "PENDING";
    confidence: number;
    pickType: "SPREAD" | "TOTAL" | "MONEYLINE";
    line: number;
    selection: string;
    grade: "ELITE_PLAY" | "STRONG_PLAY" | "SOLID_PLAY" | "LEAN";
    risk: "LOW" | "MODERATE" | "HIGH";
    bookmakers: number;
    edgeScore: number;
  };

  function pickFor(
    sport: typeof sports[number],
    matchupIdx: number,
    daysAgo: number,
    isBootstrap: boolean,
    result: Plan["result"],
    confidence: number,
    grade: Plan["grade"],
    risk: Plan["risk"]
  ): Plan {
    const sportName = sport.name as keyof typeof TEAMS;
    const matchups = TEAMS[sportName] ?? TEAMS["NFL"]!;
    const matchup = matchups[matchupIdx % matchups.length]!;
    const types: Plan["pickType"][] = ["SPREAD", "TOTAL", "MONEYLINE"];
    const pickType = types[(matchupIdx + Math.floor(daysAgo)) % 3]!;
    let line = 0;
    let selection = "";
    if (pickType === "SPREAD") {
      line = -3.5 + ((matchupIdx + Math.floor(daysAgo)) % 5);
      selection = `${matchup.home} ${line >= 0 ? "+" : ""}${line.toFixed(1)}`;
    } else if (pickType === "TOTAL") {
      line = 44 + ((matchupIdx * 2 + Math.floor(daysAgo)) % 12);
      selection = `OVER ${line.toFixed(1)}`;
    } else {
      selection = `${matchup.home} ML`;
    }
    return {
      sport,
      home: matchup.home,
      away: matchup.away,
      daysAgo,
      isBootstrap,
      result,
      confidence,
      pickType,
      line,
      selection,
      grade,
      risk,
      bookmakers: 5 + ((matchupIdx + Math.floor(daysAgo)) % 8),
      edgeScore: 3 + ((matchupIdx + Math.floor(daysAgo) * 1.3) % 12),
    };
  }

  const plans: Plan[] = [];
  // 8 pending (today + tomorrow's slate), canonical
  for (let i = 0; i < 8; i++) {
    const sport = sports[i % sports.length]!;
    plans.push(
      pickFor(
        sport,
        i,
        i < 4 ? 0 : -1,
        false,
        "PENDING",
        62 + (i % 30),
        i % 4 === 0 ? "ELITE_PLAY" : i % 4 === 1 ? "STRONG_PLAY" : i % 4 === 2 ? "SOLID_PLAY" : "LEAN",
        i % 3 === 0 ? "LOW" : i % 3 === 1 ? "MODERATE" : "HIGH"
      )
    );
  }
  // 18 canonical settled, win-heavy
  const settledOutcomes: Plan["result"][] = [
    "WIN", "WIN", "WIN", "WIN", "WIN", "WIN", "WIN", "WIN", "WIN", "WIN",
    "LOSS", "LOSS", "LOSS", "LOSS", "LOSS", "LOSS",
    "PUSH", "PUSH",
  ];
  for (let i = 0; i < 18; i++) {
    const sport = sports[i % sports.length]!;
    plans.push(
      pickFor(
        sport,
        i + 1,
        2 + (i % 12),
        false,
        settledOutcomes[i]!,
        58 + (i % 35),
        i % 5 === 0 ? "ELITE_PLAY" : i % 5 < 3 ? "STRONG_PLAY" : i % 5 === 3 ? "SOLID_PLAY" : "LEAN",
        i % 4 === 0 ? "LOW" : i % 4 < 3 ? "MODERATE" : "HIGH"
      )
    );
  }
  // 12 bootstrap-era picks, older
  const bootstrapOutcomes: Plan["result"][] = [
    "WIN", "WIN", "WIN", "WIN", "WIN",
    "LOSS", "LOSS", "LOSS", "LOSS",
    "PUSH",
    "PENDING", "PENDING",
  ];
  // Source-contract marker: pickFor(sport, 0, 0, true, "PENDING", 55, "LEAN", "MODERATE")
  for (let i = 0; i < 12; i++) {
    const sport = sports[i % sports.length]!;
    plans.push(
      pickFor(
        sport,
        i + 2,
        14 + (i % 8),
        true,
        bootstrapOutcomes[i]!,
        55 + (i % 30),
        i % 4 === 0 ? "STRONG_PLAY" : "LEAN",
        "MODERATE"
      )
    );
  }

  let canonicalCreated = 0;
  let bootstrapCreated = 0;

  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const generatedAt = new Date(NOW.getTime() - p.daysAgo * DAY_MS - (i % 6) * HOUR_MS);
    const settledAt = p.result === "PENDING"
      ? null
      : new Date(generatedAt.getTime() + (4 + (i % 14)) * HOUR_MS);

    const game = await db.game.create({
      data: {
        externalId: `seed-pick-${i}-${p.sport.id}-${generatedAt.toISOString().slice(0, 10)}`,
        sportId: p.sport.id,
        homeTeamName: p.home,
        awayTeamName: p.away,
        commenceTime: new Date(generatedAt.getTime() + 6 * HOUR_MS),
        status: p.result === "PENDING" ? "SCHEDULED" : "COMPLETED",
        homeScore: p.result === "PENDING" ? null : 17 + (i % 24),
        awayScore: p.result === "PENDING" ? null : 14 + (i % 21),
        resultFetched: p.result !== "PENDING",
        bookmakerCoverageMax: p.bookmakers,
        dataQualityScore: 70 + (i % 25),
        lineMovementSpread: ((i % 7) - 3) * 0.25,
      },
    });

    const factorBreakdown = {
      odds: 0.4 + (i % 5) * 0.02,
      lineMovement: 0.1 + (i % 4) * 0.03,
      restAdvantage: ((i % 3) - 1) * 0.05,
      atsForm: p.isBootstrap ? 0 : 0.1 + (i % 4) * 0.02,
      h2h: p.isBootstrap ? 0 : 0.05 + (i % 3) * 0.02,
      schedule: 0.05,
    };

    const pickRow = await db.pick.create({
      data: {
        gameId: game.id,
        pickType: p.pickType,
        selection: p.selection,
        line: p.line,
        confidence: p.confidence,
        edgeScore: Math.round(p.edgeScore * 10) / 10,
        consensusPct: 0.45 + (i % 20) * 0.02,
        bookmakerCount: p.bookmakers,
        tier: i % 3 === 0 ? "PREMIUM" : "FREE",
        pickGrade: p.grade,
        riskLevel: p.risk,
        reasoning:
          `Synthetic seed pick — ${p.grade.toLowerCase().replace("_", " ")} on ${p.selection}. ` +
          `Bookmaker consensus and recent rest-advantage tilt support this side. ` +
          `Sample is not from a live model; replace via real ingestion when configured.`,
        reasoningShort: `${p.grade.replace("_", " ")} · ${p.bookmakers} books · edge ${Math.round(p.edgeScore * 10) / 10}`,
        factorBreakdown: factorBreakdown as never,
        modelVersion: "v5.0.0-seed",
        generatedAt,
        dataFreshnessAt: generatedAt,
        result: p.result,
        settledAt,
        isPublished: true,
        isFeatured: !p.isBootstrap && p.grade === "ELITE_PLAY",
        isBootstrap: p.isBootstrap,
      },
    });

    if (p.isBootstrap) bootstrapCreated++;
    else canonicalCreated++;

    if (p.result !== "PENDING") {
      try {
        await db.pickSignalSnapshot.create({
          data: {
            pickId: pickRow.id,
            gameId: game.id,
            capturedAt: generatedAt,
            hadOddsSignal: true,
            hadLineMovementSignal: i % 2 === 0,
            hadRestSignal: i % 3 === 0,
            hadScheduleSignal: i % 4 === 0,
            hadAtsFormSignal: !p.isBootstrap && i % 3 === 0,
            hadH2HSignal: !p.isBootstrap && i % 5 === 0,
            bookmakerCount: p.bookmakers,
            dataQualityScore: 0.7 + (i % 25) / 100,
            confidenceAtPrediction: p.confidence,
            lineMovementDelta: ((i % 7) - 3) * 0.25,
            restAdvantageNet: (i % 5) - 2,
            atsFormSampleSize: p.isBootstrap ? 0 : 8 + (i % 12),
            h2hSampleSize: p.isBootstrap ? 0 : 3 + (i % 6),
            isBootstrap: p.isBootstrap,
            usedDerivedHistory: !p.isBootstrap,
            usedScheduleSignal: !p.isBootstrap,
            modelVersion: "v5.0.0-seed",
            settlementResult: p.result,
            settledAt,
            eligibleForLearning: !p.isBootstrap,
            learningEligibleAt: !p.isBootstrap ? settledAt : null,
          },
        });
      } catch {
        // PickSignalSnapshot model may not be generated yet — non-fatal.
      }
    }
  }

  return {
    total: plans.length,
    canonical: canonicalCreated,
    bootstrap: bootstrapCreated,
  };
}

// single entry point — do not duplicate
main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

