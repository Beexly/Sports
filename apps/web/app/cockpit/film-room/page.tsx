import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { WORLD_SLATE } from "@/lib/visual-production/world-slates";
import {
  evaluateGeneration,
  isGenerationEnabled,
  isOwnerSpendApproved,
} from "@/lib/visual-production/spend-policy";
import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";

export const metadata = { title: "Film Room — Visual Production", robots: { index: false } };

/**
 * Film Room — the owner's decision surface for paid visual generation.
 * Shows the curated slate, each asset's worthiness band, and EXACTLY why each is
 * (or isn't) cleared to generate. Generation is blocked by default; this page
 * never spends — it only shows what a credit would buy and what's missing.
 */
export default async function FilmRoomPage() {
  await requireCockpitAdmin();
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const genEnabled = isGenerationEnabled();
  const spendApproved = isOwnerSpendApproved();
  const masterReady = genEnabled && spendApproved;

  return (
    <div className="min-h-screen bg-obsidian/60 px-4 py-10 sm:px-6 lg:px-8 text-ion-1">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Cockpit · Visual Production</p>
        <h1 className="mt-1.5 text-3xl font-bold text-ion-white">Film Room</h1>
        <p className="mt-2 max-w-2xl text-sm text-ion-2">
          Generate atmosphere. Render truth. Paid generation is blocked by default — every claim, stat, label, and
          disclosure is app-rendered on top of any generated media. Nothing here spends until both master switches are on
          and an asset passes its checklist.
        </p>

        {/* Master spend gate */}
        <div className={`mt-6 rounded-xl border p-4 text-sm ${masterReady ? "border-amber-700/50 bg-amber-950/20" : "border-titanium/40 bg-eclipse/40"}`}>
          <p className="font-semibold text-ion-white">Master spend gate</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>HIGGSFIELD_GENERATION_ENABLED: <span className={genEnabled ? "text-amber-300" : "text-verify"}>{genEnabled ? "ON" : "off (blocked)"}</span></li>
            <li>OWNER_VISUAL_SPEND_APPROVED: <span className={spendApproved ? "text-amber-300" : "text-verify"}>{spendApproved ? "ON" : "off (blocked)"}</span></li>
          </ul>
          <p className="mt-2 text-xs text-ion-2">
            {masterReady
              ? "Master gate OPEN — individual assets still need their own checklist + per-asset owner approval."
              : "Master gate CLOSED — no credit can be spent. Set both env flags to enable, then approve per asset."}
          </p>
        </div>

        {/* Slate */}
        <div className="mt-8 space-y-4">
          {WORLD_SLATE.map((a) => {
            const decision = evaluateGeneration(a);
            return (
              <div key={a.id} className="rounded-xl border border-titanium/40 bg-eclipse/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-ion-white">{a.title}</h2>
                    <p className="text-xs text-ion-3">{a.surface} · {a.provider} · {a.mediaKind}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-titanium/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-ion-1">
                      score {a.priorityScore} · {decision.band.replace(/_/g, " ")}
                    </span>
                    <p className={`mt-1 text-[11px] font-semibold ${decision.allowed ? "text-amber-300" : "text-verify"}`}>
                      {decision.allowed ? "CLEARED to generate" : "blocked"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-ion-1"><span className="text-ion-3">Truth: </span>{a.productTruth}</p>
                <p className="mt-1 text-sm text-ion-2"><span className="text-ion-3">Atmosphere: </span>{a.metaphor}</p>
                <p className="mt-1 text-xs text-ion-3"><span className="text-ion-3">Overlay (app-rendered): </span>{a.overlayPlan}</p>
                <p className="mt-1 text-xs text-ion-3"><span className="text-ion-3">Reduced-motion: </span>{a.reducedMotionFallback}</p>
                <p className="mt-1 text-xs text-ion-3"><span className="text-ion-3">Reuse: </span>{a.plannedReuseCount}× — {a.reusePlan}</p>
                {decision.blockers.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-ion-1">Why it's blocked ({decision.blockers.length})</summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ion-2">
                      {decision.blockers.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
