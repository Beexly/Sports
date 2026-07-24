import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { getEntitlements } from "@sports/types";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { FollowButton } from "@/components/watchlist/follow-button";
import { PushAlertOptIn } from "@/components/push/push-alert-opt-in";
import { listWatchlistEntries } from "@/lib/watchlist/db";
import { followLimitForTier, isOverFollowLimit } from "@/lib/watchlist/eligibility";
import type { WatchlistEntry } from "@/lib/watchlist/types";

export const metadata: Metadata = {
  title: "Watchlist: Follow Teams & Players",
  description:
    "Follow a team or player. Elite members get real-time alerts when a followed pick grades — never before, only on the settled result.",
  alternates: { canonical: "/watchlist" },
};

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-orbital-cyan">
              Follow what you care about
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ion-white sm:text-5xl">
              Watchlist
            </h1>
            <p className="mt-5 text-lg text-ion-1">
              Follow a team or player to track them in one place. Following is free on every
              plan.
            </p>
          </div>

          {!userId ? (
            <SignInRequired />
          ) : (
            <SignedInWatchlist userId={userId} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SignInRequired() {
  return (
    <section
      data-testid="watchlist-signin-required"
      className="rounded-2xl border border-mineral bg-eclipse/60 p-8 text-center"
    >
      <h2 className="text-lg font-semibold text-ion-white">Sign in to build your watchlist</h2>
      <p className="mt-2 text-sm leading-relaxed text-ion-1">
        Following is a free account feature — no subscription required.
      </p>
      <Link
        href="/auth/signin"
        className="mt-5 inline-flex items-center rounded-full bg-orbital-cyan px-5 py-2.5 text-sm font-semibold text-obsidian hover:bg-orbital-cyan-glow"
      >
        Sign in
      </Link>
    </section>
  );
}

async function SignedInWatchlist({ userId }: { userId: string }) {
  const entitlements = await getUserEntitlements(userId).catch(() => getEntitlements("FREE"));
  const result = await listWatchlistEntries(db, userId);

  const followLimit = followLimitForTier(entitlements.tier);
  const followedCount = result.ok ? result.data.length : 0;
  const atLimit = isOverFollowLimit(entitlements.tier, followedCount);
  const followedIds = result.ok ? new Set(result.data.map((e) => e.entityId)) : new Set<string>();

  // Real teams only (CLAUDE.md rule #1: no fake data) — a small slice for
  // "suggested" follows, excluding anything already followed.
  const teams = await db.team
    .findMany({ orderBy: { name: "asc" }, take: 12 })
    .catch(() => []);
  const suggestions = teams.filter((t) => !followedIds.has(t.id)).slice(0, 6);

  // Resolve real display names for the followed rows (never show a raw
  // entityId to a user) — batched lookups against the actual Team/Player
  // tables, split by entityType. A name that can't be resolved (e.g. the
  // team/player was later removed) falls back to the id rather than
  // fabricating a label.
  const nameById = await resolveEntityNames(result.ok ? result.data : []);

  return (
    <>
      <AlertsBanner canGetAlerts={entitlements.canGetAlerts} />

      <section className="mb-8 rounded-2xl border border-mineral bg-eclipse/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-2">
            Your watchlist
          </h2>
          {followLimit !== null && (
            <span className="font-mono text-[11px] tabular-nums text-ion-3">
              {followedCount} / {followLimit}
            </span>
          )}
        </div>

        {!result.ok ? (
          <DegradedState reason={result.reason} />
        ) : result.data.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-3" data-testid="watchlist-entries">
            {result.data.map((entry) => (
              <WatchlistRow
                key={entry.id}
                entry={entry}
                displayName={nameById.get(entry.entityId) ?? entry.entityId}
              />
            ))}
          </ul>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-mineral bg-eclipse/40 p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-ion-2">
            Suggested teams
          </h2>
          <ul className="flex flex-wrap gap-3" data-testid="watchlist-suggestions">
            {suggestions.map((team) => (
              <li key={team.id}>
                <FollowButton
                  entityType="TEAM"
                  entityId={team.id}
                  entityLabel={team.name}
                  initialFollowing={false}
                  atFollowLimit={atLimit}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function WatchlistRow({ entry, displayName }: { entry: WatchlistEntry; displayName: string }) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-titanium bg-carbon px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ion-white">{displayName}</p>
        <p className="text-[11px] uppercase tracking-wide text-ion-3">
          {entry.entityType === "TEAM" ? "Team" : "Player"}
        </p>
      </div>
      <FollowButton
        entityType={entry.entityType}
        entityId={entry.entityId}
        entityLabel={displayName}
        initialFollowing
      />
    </li>
  );
}

/** Batched name lookup for followed entries — real Team/Player rows only. */
async function resolveEntityNames(
  entries: readonly WatchlistEntry[],
): Promise<Map<string, string>> {
  const teamIds = entries.filter((e) => e.entityType === "TEAM").map((e) => e.entityId);
  const playerIds = entries.filter((e) => e.entityType === "PLAYER").map((e) => e.entityId);
  const map = new Map<string, string>();

  if (teamIds.length > 0) {
    const teams = await db.team
      .findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } })
      .catch(() => []);
    for (const t of teams) map.set(t.id, t.name);
  }
  if (playerIds.length > 0) {
    const players = await db.player
      .findMany({ where: { id: { in: playerIds } }, select: { id: true, fullName: true } })
      .catch(() => []);
    for (const p of players) map.set(p.id, p.fullName);
  }
  return map;
}

function AlertsBanner({ canGetAlerts }: { canGetAlerts: boolean }) {
  return (
    <section className="mb-8 rounded-2xl border border-ultraviolet/30 bg-ultraviolet/[0.06] p-6">
      <h2 className="text-sm font-semibold text-ion-white">Graded alerts</h2>
      {canGetAlerts ? (
        <>
          <p className="mt-1.5 text-sm text-ion-1">
            As an Elite member you&apos;ll get alerts for what you follow — but only once a pick is
            GRADED (win, loss, push, or void). We never alert on an ungraded tip.
          </p>
          <div className="mt-4">
            <PushAlertOptIn />
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-ion-1">
          Elite members get real-time email &amp; push alerts when a followed team&apos;s or
          player&apos;s pick grades — never before it&apos;s settled.{" "}
          <Link href="/pricing" className="text-ultraviolet-glow underline-offset-4 hover:underline">
            See Elite →
          </Link>
        </p>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <p data-testid="watchlist-empty" className="text-sm leading-relaxed text-ion-2">
      You&apos;re not following anything yet. Pick a suggested team below to get started.
    </p>
  );
}

function DegradedState({ reason }: { reason: string }) {
  const activating = reason === "table_missing";
  return (
    <p data-testid="watchlist-degraded" className="text-sm leading-relaxed text-caution">
      {activating
        ? "Watchlist is not activated yet."
        : "Watchlist is temporarily unavailable. This is a connection problem, not a lost list — refresh in a moment."}
    </p>
  );
}
