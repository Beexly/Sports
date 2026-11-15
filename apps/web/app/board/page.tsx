import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadDoctrineBoard } from "@/lib/board/doctrine-loader";
import { DoctrineBoardView } from "@/components/board/doctrine-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "The Board: Plays and Passes | Galaxy Sports Edge" },
  description:
    "Every game is either a PLAY with its confidence out of 100, or a transparent PASS with the reason. No error states, no hidden slate. The two doctrines share one board.",
  alternates: { canonical: "/board" },
};

export default async function BoardPage(): Promise<JSX.Element> {
  let viewerEntitlements: Awaited<ReturnType<typeof getUserEntitlements>> | undefined;
  try {
    const session = await auth();
    if (session?.user?.id) {
      viewerEntitlements = await getUserEntitlements(session.user.id);
    }
  } catch {
    viewerEntitlements = undefined; // anonymous doctrine, never an outage
  }

  const board = await loadDoctrineBoard(viewerEntitlements);

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <p className="eyebrow">Two doctrines · one board</p>
        <h1 className="mt-4 font-display text-5xl uppercase tracking-tight sm:text-6xl">
          The Board
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ion-1">
          A play earns its place by clearing every publish gate before kickoff. A pass earns its
          place by telling you exactly why nothing was published. Both are decisions, both are
          shown, and neither is ever replaced by an error message.
        </p>

        <div className="mt-10">
          <DoctrineBoardView board={board} />
        </div>

        <section className="mt-10 flex flex-wrap gap-3">
          <Link href="/picks" className="btn btn-primary">
            Official picks
          </Link>
          <Link href="/record" className="btn btn-ghost">
            The sealed record
          </Link>
          <Link href="/packages" className="btn btn-ghost">
            Plans and packs
          </Link>
          <Link href="/board/gate" className="btn btn-ghost">
            How the gate decides
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}