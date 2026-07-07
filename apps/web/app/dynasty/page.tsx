import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getViewerDynastyProfile } from "@/lib/dynasty/load-dynasty-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galaxy Dynasty: Your Record Becomes Your City",
  description:
    "The Galaxy Dynasty hub. Your real GSN track record — settled picks, calibration, closing-line value — becomes your rank, your Vault, and the districts you can walk.",
  alternates: { canonical: "/dynasty" },
};

export default async function DynastyPage() {
  const profile = await getViewerDynastyProfile();
  const progressPct = Math.round(profile.rank.progressToNext * 100);
  const winRateLabel =
    profile.vault.winRate !== null ? `${(profile.vault.winRate * 100).toFixed(1)}%` : "—";
  const clvLabel =
    profile.vault.clvBeatRate !== null ? `${(profile.vault.clvBeatRate * 100).toFixed(1)}%` : "—";

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow">Galaxy Dynasty</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              Your record becomes your city.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              {profile.summary} Standing here isn&apos;t invented — it&apos;s derived from the
              same proof that governs GSN&apos;s pricing and public claims: settled picks,
              published calibration, and beating the close.
            </p>

            {!profile.authenticated && (
              <div className="mt-8 surface-card flex flex-col gap-3 p-6">
                <p className="eyebrow">Claim your dynasty</p>
                <p className="text-sm leading-relaxed text-ink-300">
                  Sign in and your GSN account becomes your character. Your Vault fills with
                  your real, settled record as it grades.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href="/auth/signin" className="btn btn-primary">
                    Sign in
                  </Link>
                  <Link href="/pricing" className="btn btn-ghost">
                    See the tiers
                  </Link>
                </div>
              </div>
            )}

            {/* Rank on the named ladder */}
            <div className="mt-10 surface-card flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="eyebrow">Rank</p>
                  <p className="mt-1 font-display text-3xl text-white">{profile.rank.name}</p>
                </div>
                <p className="text-sm text-ink-400">Tier: {profile.tier}</p>
              </div>

              {profile.rank.next ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm text-ink-300">
                    <span>Progress to {profile.rank.next}</span>
                    <span className="tabular-nums">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-verify" style={{ width: `${progressPct}%` }} />
                  </div>
                  {profile.rank.requirementForNext && (
                    <p className="text-sm text-ink-400">{profile.rank.requirementForNext}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-verify">Top of the ladder — Authority reached.</p>
              )}
            </div>

            {/* Districts → real GSN surfaces */}
            <h2 className="mt-12 font-display text-2xl text-white">Districts</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-400">
              Each district is a real GSN surface. Locked ones open as your record and access grow.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.districts.map((d) => (
                <div key={d.id} className="surface-card flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: d.accent }}
                    />
                    <p className="font-display text-lg text-white">{d.name}</p>
                  </div>
                  <p className="flex-1 text-sm text-ink-300">{d.blurb}</p>
                  {d.unlocked ? (
                    <Link href={d.gsnRoute} className="btn btn-ghost btn-sm self-start">
                      Enter {d.name} →
                    </Link>
                  ) : (
                    <p className="text-sm text-alert">🔒 {d.lockReason}</p>
                  )}
                </div>
              ))}
            </div>

            {/* The Vault — the player's real record */}
            <h2 className="mt-12 font-display text-2xl text-white">The Vault</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-400">
              Your building. Its floors are earned by your real, settled record.
            </p>
            <div className="mt-5 surface-card flex flex-col gap-5 p-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="eyebrow">Record</p>
                  <p className="mt-1 font-display text-2xl text-white tabular-nums">{profile.vault.settledRecord}</p>
                </div>
                <div>
                  <p className="eyebrow">Win rate</p>
                  <p className="mt-1 font-display text-2xl text-white tabular-nums">{winRateLabel}</p>
                </div>
                <div>
                  <p className="eyebrow">Beat the close</p>
                  <p className="mt-1 font-display text-2xl text-white tabular-nums">{clvLabel}</p>
                </div>
              </div>

              <ul className="flex flex-col divide-y divide-white/5">
                {profile.vault.floors.map((f) => (
                  <li key={f.level} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <span className={f.earned ? "text-verify" : "text-ink-500"} aria-hidden="true">
                        {f.earned ? "✓" : "○"}
                      </span>
                      <span className={f.earned ? "text-white" : "text-ink-400"}>
                        Floor {f.level} · {f.label}
                      </span>
                    </span>
                    <span className="text-sm text-ink-400 tabular-nums">{f.metric}</span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-ink-500">
                {profile.vault.proofPublic
                  ? "This record meets GSN's public-performance sample gate."
                  : "Record shown to you; it becomes public once the canonical sample gate is met."}
              </p>
            </div>

            <p className="mt-10 text-xs text-ink-500">
              This is the live tie-in seam for Galaxy Dynasty. The 3D city renders this same
              profile — one direction, read-only, from Galaxy Sports Network.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
