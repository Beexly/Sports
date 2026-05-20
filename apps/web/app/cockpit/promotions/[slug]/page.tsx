import { notFound } from "next/navigation";
import { db } from "@sports/db";
import {
  evaluatePromotionForPublish,
  parseStateList,
} from "@/lib/promotions/guards";

export const dynamic = "force-dynamic";

interface CockpitPromotionDetailProps {
  params: { slug: string };
}

export default async function CockpitPromotionDetail({
  params,
}: CockpitPromotionDetailProps) {
  const promo = await db.promotion
    .findUnique({ where: { slug: params.slug } })
    .catch(() => null);
  if (!promo) {
    notFound();
  }

  const verdict = evaluatePromotionForPublish(promo, { now: new Date() });
  const eligibleStates = parseStateList(promo.eligibleStates);
  const restrictedStates = parseStateList(promo.restrictedStates);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
          {promo.operatorName} · {promo.sportsbookKey}
        </p>
        <h1 className="text-2xl font-bold text-white">{promo.headline}</h1>
        <p className="mt-1 text-sm text-gray-400">{promo.offerSummary}</p>
      </header>

      <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Publish verdict
        </h2>
        <p className="text-sm">
          {verdict.publishable ? (
            <span className="text-green-400">PUBLISHABLE</span>
          ) : (
            <span className="text-yellow-400">NOT PUBLISHABLE</span>
          )}
        </p>
        {verdict.blockers.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-gray-400">
            {verdict.blockers.map((b) => (
              <li key={b.code}>
                <span className="font-semibold text-yellow-400">{b.code}</span>{" "}
                — {b.message}{" "}
                <span className="text-gray-600">
                  ({b.reviewable ? "reviewable" : "hard block"})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" value={promo.status} />
        <Field label="Compliance" value={promo.complianceStatus} />
        <Field label="Offer category" value={promo.offerCategory} />
        <Field label="Affiliate type" value={promo.affiliateType} />
        <Field label="Promo code" value={promo.promoCode ?? "—"} />
        <Field label="Minimum age" value={`${promo.minimumAge}+`} />
        <Field
          label="Terms URL"
          value={promo.termsUrl ?? "MISSING"}
        />
        <Field
          label="Affiliate URL"
          value={promo.affiliateUrl ?? "—"}
        />
        <Field
          label="Eligible states"
          value={eligibleStates.length === 0 ? "(none)" : eligibleStates.join(", ")}
        />
        <Field
          label="Restricted states"
          value={
            restrictedStates.length === 0 ? "(none)" : restrictedStates.join(", ")
          }
        />
        <Field
          label="Expires at"
          value={promo.expiresAt ? promo.expiresAt.toISOString() : "—"}
        />
        <Field
          label="Last reviewed"
          value={
            promo.lastReviewedAt ? promo.lastReviewedAt.toISOString() : "—"
          }
        />
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Disclosure copy
        </h2>
        <p className="text-sm text-gray-300">
          {promo.disclosureText ?? "(missing)"}
        </p>
        <h2 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Responsible gaming copy
        </h2>
        <p className="text-sm text-gray-300">
          {promo.responsibleGamingText ?? "(missing)"}
        </p>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
