import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getPackageBySlug } from "@/lib/packages/catalog";
import { getSingleSlateOffer, singleSlateCheckoutAvailability } from "@/lib/packages/two-door-offers";
import { getStage5GateStatus } from "@/lib/packages/stage5-gate";
import { scrubOfferingCopy } from "@/lib/packages/copy-fence";
import { getRedactedTeasersForWindowSlot } from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";
import type { CoachGameWriteup } from "@/lib/writeups/coach-writeup-engine";
import board from "@/lib/week8/sealed-board.json";
import { cardFreshness } from "@/lib/week8/card-freshness";
import type { SealedBoard } from "@/lib/week8/types";
import { SingleSlateCard } from "../_components/two-door-checkout";

const sealedCard = board as unknown as SealedBoard;

// Live Stage-5 state must never be cached into a stale checkout snapshot.
export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const rawPkg = getPackageBySlug(params.slug);
  if (!rawPkg) {
    return { title: "Package Not Found | Galaxy Sports Edge" };
  }
  const pkg = scrubOfferingCopy(rawPkg);
  return {
    title: `${pkg.title} | GSE Pick Packages`,
    description: pkg.description,
  };
}

const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.22em]";

export default async function PackageDetailPage({ params, searchParams }: PageProps) {
  const rawPkg = getPackageBySlug(params.slug);

  if (!rawPkg) {
    return (
      <div className="min-h-screen bg-obsidian text-ion-white">
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl">Package Not Found</h1>
          <p className="mt-4 text-ion-1">The package slug &quot;{params.slug}&quot; does not exist in our catalog.</p>
          <Link href="/packages" className="mt-6 inline-block text-plasma transition-colors hover:text-plasma-glow">
            ← Back to Pick Packages
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  // ── New two-door single-slate offers: Stage-5 gated, Whop checkout ──
  const singleSlateOffer = getSingleSlateOffer(rawPkg.slug);
  if (singleSlateOffer) {
    const gate = await getStage5GateStatus();
    const availability = singleSlateCheckoutAvailability().find(
      (a) => a.offerSlug === singleSlateOffer.slug,
    );
    return (
      <div className="min-h-screen bg-obsidian text-ion-white">
        <Nav />
        <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-12 sm:px-6">
          <Link href="/packages" className={`${eyebrow} text-plasma transition-colors hover:text-plasma-glow`}>
            ← All packs &amp; membership
          </Link>
          <header className="mt-6 border-b border-mineral pb-8">
            <p className={`${eyebrow} text-ion-2`}>Door 2 · Single-slate pack</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-ion-white sm:text-5xl">
              {singleSlateOffer.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
              {singleSlateOffer.description}
            </p>
          </header>

          <div className="mt-8">
            <SingleSlateCard
              offer={singleSlateOffer}
              gate={gate}
              standardConfigured={availability?.standardConfigured ?? false}
              creditBackConfigured={availability?.creditBackConfigured ?? false}
            />
          </div>

          <section className="mt-10 border border-mineral bg-eclipse p-6">
            <p className={`${eyebrow} text-ion-2`}>The verified record</p>
            <p className="mt-2 text-sm leading-6 text-ion-1">
              We don&apos;t quote win rates here. Every graded play and every pass is sealed
              in the public record - read it before you spend a dollar.
            </p>
            <Link
              href="/record"
              className="mt-4 inline-block border border-plasma px-5 py-3 font-numerals text-sm uppercase tracking-[0.18em] text-plasma transition-colors hover:bg-plasma hover:text-plasma-ink"
            >
              See the verified record →
            </Link>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Legacy catalog / specialty packs: existing Stripe unlock flow,
  //    with record banners scrubbed from every rendered surface. ──
  const pkg = scrubOfferingCopy(rawPkg);
  const sessionId = typeof searchParams.session_id === "string" ? searchParams.session_id : undefined;
  const whopToken = typeof searchParams.whop_token === "string" ? searchParams.whop_token : undefined;

  let initialUnlockedWriteups: CoachGameWriteup[] | null = null;
  let initialSessionId: string | undefined = undefined;

  if (sessionId || whopToken) {
    const verification = await verifyPackagePurchase({
      sessionId,
      whopToken,
      slug: pkg.slug,
    });

    if (verification.authorized) {
      initialSessionId = sessionId;
      const { LIVE_SLATE_COACH_WRITEUPS } = await import("@/lib/writeups/coach-writeup-engine");
      initialUnlockedWriteups = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
        if (pkg.windowSlot === "WEEKEND_PASS" || pkg.windowSlot === "WEEKLY_PASS") {
          return true;
        }
        if (pkg.windowSlot === "SUN_MAIN") {
          return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
        }
        return w.windowSlot === pkg.windowSlot;
      });
    }
  }

  const teasers = getRedactedTeasersForWindowSlot(pkg.windowSlot);
  const cardIsStale = cardFreshness(sealedCard.generated_at).stale;

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {cardIsStale ? (
          <div
            data-testid="packages-card-pending-notice"
            className="mb-6 border border-plasma/60 bg-eclipse p-5 text-sm leading-relaxed text-ion-1"
          >
            <strong className="text-plasma">Before you buy:</strong> the next card is not sealed
            yet, so no graded plays are published right now. Your purchase covers the next sealed card
            and every pack in the slate it names. If that is not what you want, do not buy today.
          </div>
        ) : null}
        <div className="mb-6">
          <Link href="/packages" className="text-sm font-semibold text-plasma transition-colors hover:text-plasma-glow">
            ← Back to all Pick Packages
          </Link>
        </div>

        <header className="border border-mineral bg-eclipse p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className={`${eyebrow} border border-plasma px-2.5 py-1 text-plasma`}>
                {pkg.badge ?? "GSE Pick Package"}
              </span>
              <h1 className="mt-3 font-display text-3xl text-ion-white sm:text-4xl">{pkg.title}</h1>
              <p className="mt-2 text-base text-ion-1">{pkg.subtitle}</p>
            </div>
            <div className="text-right">
              <div className={`${eyebrow} text-ion-2`}>One-Time Unlock</div>
              <div className="font-numerals text-3xl font-semibold tabular-nums text-ion-white">${pkg.standardPriceCents / 100}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ion-1">{pkg.description}</p>
          <p className="mt-3 text-xs leading-5 text-ion-2">
            Every graded play is sealed in the public record.{" "}
            <Link href="/record" className="text-plasma transition-colors hover:text-plasma-glow">
              See the verified record →
            </Link>
          </p>
        </header>

        <section className="mt-8">
          <PaywallRevealCard
            pkg={pkg}
            teasers={teasers}
            initialUnlockedWriteups={initialUnlockedWriteups}
            initialSessionId={initialSessionId}
          />
        </section>

        <section className="mt-10 border border-mineral bg-eclipse p-6 text-center">
          <h2 className="font-display text-xl text-ion-white">Need help with your purchase or receipt?</h2>
          <p className="mt-2 text-sm text-ion-1">
            Email us at <a href="mailto:support@galaxysportsedge.com" className="text-plasma underline">support@galaxysportsedge.com</a> with your Stripe session ID or Whop membership token.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}