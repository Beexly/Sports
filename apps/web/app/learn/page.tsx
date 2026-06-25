import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";

export const metadata: Metadata = {
  title: "Learn — how we read it, the stories & the academy",
  description: "How the engine reads a game, what the numbers mean, the stories behind them, and how to train on the process.",
};

const HOW_WE_READ = [
  { label: "How we read it", href: "/intelligence", desc: "The glass box — why the engine reads a game the way it does" },
  { label: "Every engine", href: "/intelligence/engines", desc: "Every engine we run, in one place" },
  { label: "How we read metrics", href: "/intelligence/metrics", desc: "What the numbers mean, plainly" },
] as const;

const STORIES = [
  { label: "Stories: The Beat", href: "/the-beat", desc: "The cinematic broadcast, scored at the source" },
  { label: "The Studio", href: "/fantasy/studio", desc: "Inside the production desk" },
  { label: "The Academy", href: "/academy", desc: "Train on the process, step by step" },
] as const;

function Grid({ items }: { items: readonly { label: string; href: string; desc: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className="surface-card flex flex-col gap-1 p-4 transition-colors hover:border-mineral-hi">
          <span className="text-sm font-semibold text-ion-white">{t.label}</span>
          <span className="text-xs text-ion-2">{t.desc}</span>
        </Link>
      ))}
    </div>
  );
}

export default function LearnPage() {
  return (
    <>
      <Nav />
      <main className="container flex flex-col gap-14 py-12">
        <header className="max-w-2xl">
          <p className="eyebrow">Learn</p>
          <h1 className="mt-2 text-3xl font-semibold text-ion-white">Understand the read, not just the result.</h1>
          <p className="mt-3 text-ion-1">
            How the engine reads a game, what the numbers actually mean, the stories behind the week, and how to train
            your own process. No jargon for its own sake.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">How we read it</h2>
          <Grid items={HOW_WE_READ} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">Stories &amp; the academy</h2>
          <Grid items={STORIES} />
        </section>
      </main>
    </>
  );
}
