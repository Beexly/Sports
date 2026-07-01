import Link from "next/link";
import { db } from "@sports/db";
import {
  evaluatePromotionForPublish,
  parseStateList,
} from "@/lib/promotions/guards";
import type { Promotion } from "@prisma/client";

/**
 * Cockpit · Promotions
 *
 * Internal-only view of every promotion row regardless of status. Surfaces
 * the exact reason a promotion is not publishable and links each blocker to
 * an open cockpit task assigned to BOBBY (when one exists).
 *
 * Admin gate is enforced by the parent `apps/web/app/cockpit/layout.tsx`.
 */

export const dynamic = "force-dynamic";

export default async function CockpitPromotionsPage() {
  const promos: Promotion[] = await db.promotion
    .findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 100 })
    .catch(() => [] as Promotion[]);

  const counts = {
    active: 0,
    needsReview: 0,
    draft: 0,
    blocked: 0,
    expired: 0,
  };
  const now = new Date();
  for (const p of promos) {
    if (p.status === "ACTIVE") counts.active++;
    else if (p.status === "NEEDS_REVIEW") counts.needsReview++;
    else if (p.status === "DRAFT") counts.draft++;
    else if (p.status === "BLOCKED") counts.blocked++;
    else if (p.status === "EXPIRED") counts.expired++;
    else if (p.expiresAt && p.expiresAt < now) counts.expired++;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
          Bobby · Promotions queue
        </p>
        <h1 className="text-2xl font-bold text-ion-white">Sportsbook promotions</h1>
        <p className="mt-1 text-sm text-ion-3">
          Every row is gated by compliance evidence. The publish gate refuses
          to surface a promotion missing disclosure, terms, eligibility, or
          compliance approval.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CountCard label="Active" value={counts.active} />
        <CountCard label="Needs review" value={counts.needsReview} />
        <CountCard label="Draft" value={counts.draft} />
        <CountCard label="Blocked" value={counts.blocked} />
        <CountCard label="Expired" value={counts.expired} />
      </section>

      {promos.length === 0 ? (
        <div className="rounded-xl border border-titanium/40 bg-eclipse/40 p-8 text-center">
          <h2 className="text-base font-semibold text-ion-white">
            No promotions yet
          </h2>
          <p className="mt-2 text-sm text-ion-3">
            Seed cockpit demo data or upsert promotions via the API to populate
            this queue.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="border-b border-titanium/40 text-[10px] uppercase tracking-widest text-ion-3">
            <tr>
              <th scope="col" className="py-2 pr-3">Operator</th>
              <th scope="col" className="py-2 pr-3">Headline</th>
              <th scope="col" className="py-2 pr-3">Status</th>
              <th scope="col" className="py-2 pr-3">Compliance</th>
              <th scope="col" className="py-2 pr-3">States</th>
              <th scope="col" className="py-2 pr-3">Publishable?</th>
              <th scope="col" className="py-2 pr-3">Blockers</th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => {
              const verdict = evaluatePromotionForPublish(p, { now });
              const states = parseStateList(p.eligibleStates);
              return (
                <tr
                  key={p.id}
                  data-testid="cockpit-promotion-row"
                  className="border-b border-titanium/40 align-top text-ion-1"
                >
                  <td className="py-2 pr-3">{p.operatorName}</td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/cockpit/promotions/${p.slug}`}
                      className="text-brand-400 hover:underline"
                    >
                      {p.headline}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{p.status}</td>
                  <td className="py-2 pr-3">{p.complianceStatus}</td>
                  <td className="py-2 pr-3">
                    {states.length === 0 ? "—" : states.join(",")}
                  </td>
                  <td className="py-2 pr-3">
                    {verdict.publishable ? (
                      <span className="text-green-400">YES</span>
                    ) : (
                      <span className="text-yellow-400">NO</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-ion-3">
                    {verdict.blockers.length === 0
                      ? "—"
                      : verdict.blockers.map((b) => b.code).join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-titanium/40 bg-eclipse/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-ion-3">
        {label}
      </p>
      <p className="text-xl font-bold text-ion-white">{value}</p>
    </div>
  );
}
