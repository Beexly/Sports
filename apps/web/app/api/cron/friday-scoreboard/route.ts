import { NextResponse } from "next/server";
import { getCurrentWeek10Slate } from "@/lib/live-board/current-slate-loader";
import { B2B_GLASS_LEDGER_TIERS, LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function buildFridayScoreboardPayload(now: Date = new Date()) {
  const slate = getCurrentWeek10Slate();
  const s = slate.scopes;
  const openPacks = LIVE_PACKAGE_CATALOG.filter((p) => p.forSale).map((p) => ({
    slug: p.slug,
    title: p.title,
    priceDisplay: p.priceDisplay,
    windowSlot: p.windowSlot,
  }));

  const markdownDigest = [
    `# Friday Scoreboard — Week ${slate.activeWeek} (${now.toISOString()})`,
    `- **Zero-LLM Deterministic Execution:** \`llmTokensUsed = 0\``,
    `- **Weeks 8–9 Staked Main/Deriv:** \`${s.weeks8_9_cumulative_staked.record}\` (\`${s.weeks8_9_cumulative_staked.net_units_display}\`, \`n=${s.weeks8_9_cumulative_staked.n}\`)`,
    `- **Weeks 8–9 All-In Secondary:** \`${s.weeks8_9_cumulative_all_in.record}\` (\`${s.weeks8_9_cumulative_all_in.net_units_display}\`, \`n=${s.weeks8_9_cumulative_all_in.n}\`)`,
    `- **Week 8 Scopes (Reconciled):** Staked \`36-13-1 (+20.14u, n=50)\` · Base \`38-13-1 (+22.85u, n=52)\` · All-In \`47-19-1 (+24.92u, n=67)\``,
    `- **Week 10 Pre-Kickoff Merkle Root:** \`${slate.merkleRootSha256}\` (\`${slate.gamesCount}\` games)`,
    `- **Active Storefront Packs Open:** ${openPacks.length} (${openPacks.map((p) => `${p.slug} ${p.priceDisplay}`).join(", ")})`,
    `- **B2B Glass Ledger Offerings Active:** ${B2B_GLASS_LEDGER_TIERS.map((t) => `${t.slug} (${t.priceDisplay})`).join(", ")}`,
  ].join("\n");

  return {
    ok: true,
    routine: "friday-scoreboard",
    llmTokensUsed: 0,
    generatedAtUtc: now.toISOString(),
    activeWeek: slate.activeWeek,
    merkleRootSha256: slate.merkleRootSha256,
    reconciledScopes: s,
    openPacks,
    b2bTiers: B2B_GLASS_LEDGER_TIERS,
    markdownDigest,
  };
}

export async function GET(request?: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED_CRON" }, { status: 401 });
    }
  }
  return NextResponse.json(buildFridayScoreboardPayload(), { status: 200 });
}
