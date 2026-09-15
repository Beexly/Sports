import { NextRequest, NextResponse } from "next/server";
import { jsonNoStore } from "@/lib/api/no-store";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { db } from "@sports/db";
import { getReadinessGates, bootstrapGateResponse } from "@sports/prediction-engine";
import { getEntitlements, type PublicPick, type PickResult, type PickGrade, type RiskLevel, type FactorBreakdown } from "@sports/types";
import { freshPickWhere } from "@/lib/board/stale-pick-policy";
import { gameInSlateWindow, resolveSlateWindow } from "@/lib/picks/slate-window";
import { MIN_PUBLIC_PICK_DATA_QUALITY_SCORE } from "@/lib/public-picks-quality";
import {
  isPublicPicksSurfaceStale,
  staleDataGateResponse,
} from "@/lib/data-reliability/public-freshness-gate";
import { passesPublicSelectiveFilterAsync } from "@/lib/calibration/selective-publish-runtime";
import { parseFactorBreakdown } from "@/lib/picks/parse-factor-breakdown";
import { teaserForViewer } from "@/lib/picks/teaser-text";
import { gateConsensusClaim, gateConsensusClaimText } from "@/lib/claims/public-consensus-claim";
import { displaySelection } from "@/lib/picks/display-selection";
import { resolveMarketImplied, resolveWinProbability } from "@/lib/picks/market-implied-display";
import { publicEdgeScore } from "@/lib/picks/public-edge-score";
import { getPublicCalibrator, honestConfidence } from "@/lib/calibration/public-confidence";
import { comparePicksByRanking } from "@/lib/ranking/sort-key";
import { dropContradictedModelSignals } from "@/lib/picks/model-signal-coherence";
import { dropAdverseEdgePicks } from "@/lib/picks/adverse-edge-suppression";
import { clientIp } from "@/lib/api/rate-limit";
import { consumePublicFormRateLimit } from "@/lib/api/public-form-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Public, anonymous, DB-heavy route (findMany + count + per-pick selective
  // filter). DURABLE (Postgres) rate limit: the previous in-memory limiter was
  // per-process, so on serverless the real ceiling was 60/min × warm-instance
  // count — horizontal scale silently multiplied the quota. Same limiter the
  // B2B and public-form routes already run in production. Fail-closed 503 when
  // the store is unreachable is honest here: this route needs the same DB for
  // its content, so "limiter store down" already means "no picks to serve".
  const limit = await consumePublicFormRateLimit("public-picks", clientIp(req), 60, 60_000);
  if (!limit.ok) {
    return jsonNoStore(
      limit.status === 429
        ? { success: false, error: "Too many requests. Please wait and try again.", code: "rate_limited" }
        : { success: false, error: "Rate limit service unavailable. Please retry shortly.", code: "rate_limit_store_unavailable" },
      { status: limit.status, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) {
    return jsonNoStore(bootstrapGateResponse("Public picks"), { status: 503 });
  }

  // Stale-Data Kill Switch (default OFF via FORCE_NO_BET_IF_STALE). When ON and
  // the latest successful ingestion is "stale" per the shared Refresh SLA, go
  // dark with a DISTINCT 503 body so the surface never serves a stale slate
  // (CLAUDE.md rule #5) — and so operators/monitors can tell "awaiting fresh
  // data" apart from "env gate regressed" (2026-07-10 incident lesson). Fail
  // OPEN on a DB error — a transient blip must not black out a fresh surface.
  if (gates.forceNoBetIfStale) {
    const stale = await isPublicPicksSurfaceStale().catch(() => false);
    if (stale) {
      return jsonNoStore(staleDataGateResponse("Public picks"), { status: 503 });
    }
  }

  const session = await auth();

  // Anonymous viewers get the canonical FREE entitlements — the SAME single
  // source of truth (getEntitlements) that signed-in users resolve through.
  // A hand-rolled fallback here is exactly how the two FREE definitions drifted
  // apart (anon limited vs signed-in over-granted); never re-inline it.
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : getEntitlements("FREE");

  const { searchParams } = new URL(req.url);
  const sportFilter = searchParams.get("sport");
  const dateParam = searchParams.get("date");
  const gradeFilter = searchParams.get("grade") as PickGrade | null;
  // `?date=YYYY-MM-DD` names an Eastern calendar day; anything else resolves to
  // the Eastern day containing now, so a malformed value never reaches Prisma.
  const now = new Date();
  const slate = resolveSlateWindow(dateParam, now);

  // Production seed-row exclusion (defense-in-depth). The dev seed writes
  // synthetic rows tagged modelVersion="v5.0.0-seed"; in production there
  // should be zero of them, but this is the last unguarded public path.
  // Exclude them ONLY in production so a stray seed row can never surface on
  // the live picks endpoint. In dev/test this spread is empty, so demo mode —
  // which intentionally returns seed rows and flags meta.containsSeedData —
  // is preserved byte-for-byte.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};
  const gameFilter = {
    dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE },
    // Never serve a pick sitting on a game row that has been merged away
    // (C-117). `mergedIntoGameId` is the database's OWN canonicity marker, set
    // by the owner-run merge, so this needs no guess about which of two rows
    // is the real fixture. It is shared by the findMany and the
    // totalAvailableToday count below on purpose: filtering one and not the
    // other would make the free tier's "N published today" disagree with the
    // rows it is counting.
    //
    // This covers only duplicates already tombstoned. Two never-merged rows
    // for one contest are still two picks here, and that is F-17's to fix.
    mergedIntoGameId: null,
    ...(sportFilter
      ? {
          sport: {
            key: { contains: sportFilter, mode: "insensitive" as const },
          },
        }
      : {}),
  };

  // Fail OPEN on a DB error — a transient blip on the primary query must not
  // black out a fresh surface. The sibling count below already falls back, and
  // the stale-check fails open too; an unwrapped throw here would 500 the public
  // endpoint instead of honestly returning the bootstrap/collecting state. So on
  // a primary-query failure, collapse to the same dark/"collecting" 503 the
  // bootstrap gate returns rather than leaking a stack trace.
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false, // never expose bootstrap-era picks publicly
        ...excludeSeedInProd, // prod-only: drop dev seed rows (no-op in dev/test)
        // The slate is the set of picks on games that START inside the Eastern
        // day, restricted to rows the pipeline still refreshes. Selecting by
        // generatedAt hid every book-priced pick created before today
        // (lib/picks/slate-window.ts).
        ...freshPickWhere(now),
        // Server-side tier gate
        ...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" }),
        // Optional grade filter (only useful for PRO+ who can see premium)
        ...(gradeFilter && entitlements.canSeePremiumPicks ? { pickGrade: gradeFilter } : {}),
        game: { ...gameFilter, ...gameInSlateWindow(slate) },
      },
      include: {
        game: {
          include: {
            sport: { select: { name: true, key: true } },
          },
        },
        // The public proof-of-record pointer: a hash reveals nothing, and
        // publishing it pre-kickoff is exactly how a commitment works.
        // marketFairProb is the receipt's committed market-implied probability;
        // it is only serialised under the confidence entitlement (see below).
        proofReceipt: { select: { contentHash: true, marketFairProb: true } },
        // The mint-time book count. The snapshot is created once in the same
        // cycle as the receipt and never overwritten (update: {}), so it is the
        // "N books in the snapshot" the label states was fixed at publish time.
        // Pick.bookmakerCount is rewritten every refresh cycle and must not be
        // shown in that label.
        signalSnapshot: { select: { bookmakerCount: true } },
      },
      // NEVER order this pool by confidence. The app-level rank key is
      // rankingP (lib/ranking/sort-key.ts); confidence is a different number
      // and, measured 2026-09-13 over 2,385 settled rows, an ANTI-predictive
      // one at the top (conf 80+ claims 0.8663, realizes 0.5191). Ordering the
      // fetch by it and then re-ranking in app code does not undo the damage:
      // truncation happens in the database, so a high-rankingP row that sits
      // low on confidence is discarded before the re-rank can ever see it.
      // lib/board/state.ts already fetches on generatedAt for this exact
      // reason ("high-conf market-echo does not monopolize the take"); this is
      // the same fix on the picks API. isFeatured stays because
      // comparePicksByRanking pins featured first too, so it is the one key
      // the two orderings agree on.
      orderBy: [
        { isFeatured: "desc" },
        { generatedAt: "desc" },
      ],
      // Over-fetch a bounded pool: the selective-publish filter below can only
      // REMOVE rows, so taking exactly the limit meant a FREE user (limit 2)
      // could receive 0-1 picks whenever fetched rows failed the filter. The
      // real cap is applied AFTER filter + ranking (see limitedPicks).
      //
      // The pool is the SAME SIZE for every viewer. It used to be 48 for a
      // capped viewer and 200 otherwise, which made a FREE viewer's two picks
      // the best of a quarter of the slate while a PRO viewer ranked over all
      // of it — the viewer with the least to spend got the worst-informed
      // choice. One day's slate is bounded by gameInSlateWindow, so 200 is
      // expected to cover it whole and make the truncation a no-op.
      take: 200,
    })
    .catch(() => null);
  if (picks === null) {
    return jsonNoStore(bootstrapGateResponse("Public picks"), { status: 503 });
  }

  // Selective publish (default ON): prefer priced rankingP over confidence.
  const filteredPicks = (
    await Promise.all(
      picks.map(async (pick) => {
        let rankingP: number | null = null;
        let rankingScore: number | null = null;
        let marketImpliedProb: number | null = null;
        if (pick.factorBreakdown && typeof pick.factorBreakdown === "object") {
          const fb = pick.factorBreakdown as Record<string, unknown>;
          if (typeof fb["rankingP"] === "number" && Number.isFinite(fb["rankingP"])) {
            rankingP = fb["rankingP"] as number;
          }
          if (typeof fb["marketFairProb"] === "number" && Number.isFinite(fb["marketFairProb"])) {
            marketImpliedProb = fb["marketFairProb"] as number;
          }
          // rankingScore 0–100 mirror when rankingP present
          if (rankingP != null) rankingScore = Math.round(rankingP * 100);
        }
        const ok = await passesPublicSelectiveFilterAsync({
          confidence: pick.confidence,
          rankingP,
          rankingScore,
          edgeScore: pick.edgeScore,
          pickType: pick.pickType,
          sportKey: pick.game?.sport?.key ?? null,
          marketImpliedProb,
        });
        return ok ? pick : null;
      }),
    )
  ).filter((p): p is NonNullable<typeof p> => p != null);

  // One game, one story. A model-signal row claims "no book line" for its game;
  // that claim cannot stand beside a book-priced row for the SAME game, and on
  // 2026-09-13 two such pairs were live on opposite sides (see
  // lib/picks/model-signal-coherence.ts). Applied AFTER the selective filter
  // and BEFORE the tier cap, so a capped viewer spends their allowance on rows
  // that survive rather than on rows about to be dropped.
  const coherentPicks = dropContradictedModelSignals(filteredPicks);

  // Never sell a bet our own model prices worse than the book. scoring.ts has
  // withheld these at mint since the PASS-leak fix, but that gate is
  // forward-only: measured 2026-09-13, nine rows minted before it deployed were
  // still published, worst -0.1742. Display-side and withhold-only — it writes
  // nothing, so a suppressed row still settles into the public record.
  const soundPicks = dropAdverseEdgePicks(coherentPicks);

  // Display order must match generation ranking law (rankingP, not confidence).
  // DB orderBy confidence is a cheap pre-filter only — re-rank survivors here.
  const rankedPicks = [...soundPicks].sort(comparePicksByRanking);

  // Tier cap applied AFTER filter + rank so a limited viewer always gets their
  // full allowance (best-ranked survivors), never fewer because the filter ate
  // the pre-capped fetch.
  const limitedPicks =
    entitlements.dailyPickLimit != null
      ? rankedPicks.slice(0, entitlements.dailyPickLimit)
      : rankedPicks;

  // Thread 2: honest calibrated confidence. Built once (memoised) and only when
  // the audited calibrator is on; the calibrator is self-suppressing if the
  // sample is insufficient/non-improving, so this is null-safe by construction.
  const calibrator = gates.canApplyCalibrationAdjustments ? await getPublicCalibrator() : null;

  const publicPicks: PublicPick[] = limitedPicks.map((pick) => {
    // Parse + validate factorBreakdown from JSON storage. The Prisma column is
    // typed JsonValue; parseFactorBreakdown checks the shape and returns null
    // for a malformed/legacy blob (a handled "no factor trail" state) so a
    // consumer iterating `.factors` can never crash on bad data.
    let factorBreakdown: FactorBreakdown | null = null;
    if (entitlements.canSeeFactorBreakdown && pick.factorBreakdown) {
      factorBreakdown = parseFactorBreakdown(pick.factorBreakdown);
    }

    // Extract dataQualityScore — always public trust signal
    // Prefer from stored factorBreakdown JSON if available, else fall back to game.dataQualityScore
    let storedDqScore: number | null = null;
    if (pick.factorBreakdown) {
      try {
        const fb = pick.factorBreakdown as Record<string, unknown>;
        if (typeof fb["dataQualityScore"] === "number") {
          storedDqScore = fb["dataQualityScore"];
        }
      } catch { /* ignore */ }
    }
    const dataQualityScore = storedDqScore ?? Math.round(pick.game.dataQualityScore);

    // Confidence is a PAID metric (Thread 1 reversed): gated solely on the
    // viewer's entitlement — a teaser pick's tier no longer frees it. The free
    // trust signal on the teaser is the Edge Index, not the confidence number.
    const shownConfidence = entitlements.canSeeConfidence ? pick.confidence : null;

    // One book count for both the "No book price attached" pill and the
    // market-implied percentage: the immutable mint-time snapshot when the pick
    // has one, else the live Pick.bookmakerCount (rewritten every refresh
    // cycle). Reading the pill from the live column while the percentage read
    // the snapshot let a transient feed gap render the pill beside a percentage.
    const bookmakerCount = pick.signalSnapshot?.bookmakerCount ?? pick.bookmakerCount;

    // v5.2.8 Phase 2: the receipt's market-implied win probability on
    // book-priced two-way MONEYLINE picks with >= 2 books, for EVERY tier.
    // It is a de-vig of quoted prices a reader can recompute, not a model
    // output, and the public calibration claim is about this number — so the
    // free tier, which reads that claim, can see it. Confidence, the calibrated
    // confidence label and the factor trail stay paid below. (The Edge Index is
    // already a free trust signal by separate design — see publicEdgeScore.)
    //
    // N is the immutable mint-time snapshot count, not the live Pick column a
    // refresh cycle rewrites; a pick without a snapshot shows no percentage
    // rather than a drifting N. Null resolves to an omitted key.
    const marketImpliedInput = {
      pickType: pick.pickType,
      bookmakerCount: pick.signalSnapshot?.bookmakerCount ?? 0,
      receiptMarketFairProb: pick.proofReceipt?.marketFairProb,
    };
    const marketImplied = resolveMarketImplied(marketImpliedInput);
    const winProbability = resolveWinProbability(marketImpliedInput);

    // T-1 gate applied to whichever text this viewer will actually see, so
    // the evidence caption returned below always matches the visible claim
    // (see the reasoning/reasoningShort assignment for why this mirrors that
    // branch selection).
    const gatedDisplayedText = gateConsensusClaim(
      entitlements.canSeeFactorBreakdown
        ? pick.reasoning
        : pick.reasoningShort || pick.reasoning.split(".")[0] + ".",
      pick,
      now,
    );

    return {
      id: pick.id,
      game: {
        homeTeam: pick.game.homeTeamName,
        awayTeam: pick.game.awayTeamName,
        commenceTime: pick.game.commenceTime.toISOString(),
        sport: pick.game.sport.name,
      },
      pickType: pick.pickType as "SPREAD" | "MONEYLINE" | "TOTAL",
      // Display text: the signal slate's "(model signal)" marker is stripped
      // at render time (lib/picks/display-selection.ts); the DB string is kept.
      selection: displaySelection(pick.selection),
      line: pick.line,
      hasBookPrice: bookmakerCount > 0,
      // C-354: publish-time lock columns, exposed so the card can show the
      // locked price/line instead of any number embedded in `selection`.
      // Null for legacy rows that predate the columns; the surface falls back
      // to `line` and never invents or string-parses a price.
      clvLockPrice: pick.clvLockPrice ?? null,
      clvLockLine: pick.clvLockLine ?? null,
      ...(marketImplied ? { marketImplied } : {}),
      ...(winProbability ? { winProbability } : {}),
      // Opening -> current movement, the Pro-tier market read. Only SPREAD and
      // TOTAL carry a comparable opening line (enrichment captures it at first
      // ingestion); MONEYLINE and games without a captured open return null,
      // as does any viewer without the entitlement.
      lineMovement:
        entitlements.canSeeLineMovement
          ? (() => {
              const opening =
                pick.pickType === "SPREAD"
                  ? pick.game.openingSpread
                  : pick.pickType === "TOTAL"
                    ? pick.game.openingTotal
                    : null;
              return opening !== null && opening !== undefined
                ? { opening, current: pick.line }
                : null;
            })()
          : null,
      // Gated fields. Premium picks are never returned to FREE viewers (tier
      // filter above); confidence is entitlement-gated for every viewer.
      confidence: shownConfidence,
      // Honest calibrated display of the confidence shown, when the audited
      // calibrator is active (else null → surfaces show the raw heuristic %).
      confidenceCalibrated: calibrator ? honestConfidence(shownConfidence, calibrator, true) : null,
      // Withheld on book-less (signal-slate) rows for viewers who cannot see
      // confidence: there edgeScore = confidence - 50 exactly (lib/picks/public-edge-score.ts).
      edgeScore: publicEdgeScore(pick, entitlements),
      factorBreakdown,
      // Always visible — trust transparency
      dataQualityScore,
      tier: pick.tier as "FREE" | "PREMIUM",
      pickGrade: (pick.pickGrade ?? "LEAN") as PickGrade,
      riskLevel: (pick.riskLevel ?? "MODERATE") as RiskLevel,
      // Full reasoning / "the why" stays a paid feature (Pro+). Decoupled from
      // canSeeConfidence (now true for FREE) so freeing confidence does not also
      // free the premium reasoning trail. FREE gets the short teaser.
      // A viewer who cannot see confidence must not read it back as a percentage
      // inside the teaser (lib/picks/teaser-text.ts).
      //
      // T-1 tripwire (Devin, #819): a quantified "bookmaker consensus" claim
      // must carry its own evidence (book count >= 2, freshness stamp,
      // consensusPct in (0,1]) or it must not render at all — gated here,
      // server-side, against the SAME Prisma row's evidence columns, since
      // PublicPick does not carry consensusPct/bookmakerCount to gate on
      // client-side. reasoningShort is frozen write-once; this only decides
      // what the API echoes back, never what is stored.
      //
      // A bound claim must render its evidence CAPTION beside it too (Devin
      // Review, #819) — the pass/suppress decision alone is not the whole
      // contract; /preview already renders bound.claimText AND
      // consensusEvidenceCaption(bound) together. `gatedDisplayedText` is
      // gated against whichever of reasoning/reasoningShort this viewer
      // actually sees (the same branch selection below), so the one caption
      // field on the DTO always matches the text it is captioned for.
      reasoning: entitlements.canSeeFactorBreakdown
        ? gatedDisplayedText.text
        : teaserForViewer(gatedDisplayedText.text, entitlements.canSeeConfidence),
      reasoningShort: teaserForViewer(
        gateConsensusClaimText(pick.reasoningShort, pick, now),
        entitlements.canSeeConfidence,
      ),
      consensusEvidenceCaption: gatedDisplayedText.evidenceCaption,
      isFeatured: pick.isFeatured,
      isAuditAvailable:
        !pick.id.startsWith("sample-pick-") &&
        !(pick.modelVersion ?? "").startsWith("sample-"),
      generatedAt: pick.generatedAt.toISOString(),
      dataFreshnessAt: pick.dataFreshnessAt?.toISOString() ?? null,
      result: pick.result as PickResult,
      receiptHash: pick.proofReceipt?.contentHash ?? null,
    };
  });

  // Demo-mode detection: when any of the returned picks were created by
  // the dev seed (modelVersion === "v5.0.0-seed"), surface a flag so the
  // page can render a "demo mode" badge. Real model output never uses
  // this string — synthetic seed picks are the only producer.
  const containsSeedData = picks.some((p) => p.modelVersion === "v5.0.0-seed");

  // Daily-limit transparency for FREE viewers: count the full published
  // slate (no tier filter, no take) so the UI can say "N picks published
  // today — you're seeing 1" instead of silently truncating. The count is
  // already public on the board (openPicks), so no premium data leaks.
  let totalAvailableToday = publicPicks.length;
  if (!entitlements.canSeePremiumPicks) {
    totalAvailableToday = await db.pick
      .count({
        where: {
          isPublished: true,
          isBootstrap: false,
          ...excludeSeedInProd, // prod-only: keep the count consistent with the slate
          ...freshPickWhere(now),
          game: { ...gameFilter, ...gameInSlateWindow(slate) },
        },
      })
      .catch(() => publicPicks.length);
  }
  const hitDailyLimit = totalAvailableToday > publicPicks.length;

  return jsonNoStore({
    success: true,
    data: publicPicks,
    meta: {
      tier: entitlements.tier,
      total: publicPicks.length,
      totalAvailableToday,
      hitDailyLimit,
      date: slate.dayKey,
      canSeeConfidence: entitlements.canSeeConfidence,
      canSeeFactorBreakdown: entitlements.canSeeFactorBreakdown,
      containsSeedData,
    },
  });
}
