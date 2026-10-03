import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { getIssue, listIssues } from "@/lib/newsletter/issues";

export function generateStaticParams() {
  return listIssues().map((i) => ({ slug: i.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const issue = getIssue(params.slug);
  if (!issue) return { title: "Issue" };
  return {
    title: `Issue ${issue.number}: ${issue.title} | GSE Newsletter`,
    description: issue.lede,
    alternates: { canonical: `/newsletter/${issue.slug}` },
  };
}

export default function NewsletterIssuePage({ params }: { params: { slug: string } }) {
  const issue = getIssue(params.slug);
  if (!issue) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <Link href="/newsletter" className="text-sm text-orbital-cyan hover:underline">
            ← Newsletter home
          </Link>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-ion-2">
            Issue {String(issue.number).padStart(3, "0")} ·{" "}
            {new Date(issue.publishedAt).toLocaleDateString()}
          </p>
          <h1 className="mt-3 font-display text-4xl text-ion-white">{issue.title}</h1>
          <p className="mt-4 text-lg text-ion-1">{issue.lede}</p>
          <div className="mt-12 space-y-10">
            {issue.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-2xl text-ion-white">{s.heading}</h2>
                <p className="mt-3 text-base leading-8 text-ion-1">{s.body}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
