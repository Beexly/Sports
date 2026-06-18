import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { db } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import { formatDate } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "From the desk — Sports market analysis from Galaxy Sports Edge",
  description:
    "Pre-game reads, line-movement breakdowns, and methodology notes from the Galaxy Sports Edge desk. Every post tied back to the live board.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 300;

const SPORT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  NFL:  { bg: "rgba(0,229,255,0.10)", text: "#00E5FF",  border: "rgba(0,229,255,0.25)" },
  NBA:  { bg: "rgba(122,92,255,0.10)", text: "#7A5CFF", border: "rgba(122,92,255,0.25)" },
  MLB:  { bg: "rgba(95,217,163,0.10)", text: "#5FD9A3", border: "rgba(95,217,163,0.25)" },
  NHL:  { bg: "rgba(255,45,214,0.10)", text: "#FF2DD6", border: "rgba(255,45,214,0.25)" },
  NCAAF:{ bg: "rgba(255,180,84,0.10)", text: "#FFB454", border: "rgba(255,180,84,0.25)" },
};

function sportStyle(sport: string | null) {
  if (!sport) return null;
  return SPORT_COLORS[sport.toUpperCase()] ?? { bg: "rgba(255,255,255,0.06)", text: "#A0A8B8", border: "rgba(255,255,255,0.12)" };
}

export default async function BlogPage() {
  const gates = getReadinessGates();
  let posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    sport: string | null;
    tags: string[];
    publishedAt: Date | null;
    isFeatured: boolean;
  }> = [];

  if (gates.canPublishContent) {
    try {
      posts = await db.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          sport: true,
          tags: true,
          publishedAt: true,
          isFeatured: true,
        },
      });
    } catch {
      // DB unavailable during build — renders empty state, revalidated at runtime
    }
  }

  const featured = posts.filter((p) => p.isFeatured);
  const rest = posts.filter((p) => !p.isFeatured);

  return (
    <>
      <Nav />
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
        <main id="main-content" className="flex-1">
          {/* Cinematic hero */}
          <section className="relative isolate overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]"
              style={{
                background: `radial-gradient(60% 80% at 50% -5%, ${BRAND_COLORS.orbitalCyan}14, transparent 65%), radial-gradient(40% 50% at 80% 20%, ${BRAND_COLORS.softUltraviolet}0d, transparent 60%)`,
              }}
            />
            <div className="mx-auto max-w-5xl">
              <Reveal>
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: BRAND_COLORS.orbitalCyan,
                    borderColor: `${BRAND_COLORS.orbitalCyan}33`,
                    backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full animate-live-pulse"
                    style={{ backgroundColor: BRAND_COLORS.orbitalCyan }}
                  />
                  From the desk
                </span>
              </Reveal>
              <Reveal delay={90}>
                <h1
                  className="mt-5 max-w-4xl font-display text-balance text-white"
                  style={{
                    fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
                    lineHeight: 1.0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Market notes &amp;{" "}
                  <span
                    style={{
                      background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    methodology reads.
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={170}>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                  Pre-game reads, line-movement breakdowns, and methodology notes —
                  every post tied back to the live board.
                </p>
              </Reveal>
            </div>
          </section>

          <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
            {posts.length === 0 ? (
              <Reveal>
                <div
                  className="flex flex-col items-center gap-5 rounded-2xl border py-20 text-center"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}1a`,
                    background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${BRAND_COLORS.orbitalCyan}08, transparent 70%)`,
                  }}
                >
                  <span
                    className="font-display text-5xl"
                    style={{ color: `${BRAND_COLORS.orbitalCyan}40` }}
                    aria-hidden="true"
                  >
                    ◆
                  </span>
                  <p className="max-w-sm text-base text-ink-300">
                    Posts arrive once the board opens. The first reads will cover
                    methodology — how a signal gets scored, gated, and shipped.
                  </p>
                  <Link href="/methodology" className="btn btn-ghost text-sm">
                    Read the methodology →
                  </Link>
                </div>
              </Reveal>
            ) : (
              <div className="space-y-10">
                {/* Featured posts */}
                {featured.length > 0 && (
                  <div>
                    <Reveal>
                      <p
                        className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: BRAND_COLORS.ionMagenta }}
                      >
                        Featured
                      </p>
                    </Reveal>
                    <Stagger className="grid gap-5 sm:grid-cols-2" step={80}>
                      {featured.map((post) => {
                        const ss = sportStyle(post.sport);
                        return (
                          <article
                            key={post.id}
                            className="group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5"
                            style={{
                              borderColor: `${BRAND_COLORS.ionMagenta}28`,
                              background: `linear-gradient(140deg, rgba(255,45,214,0.06) 0%, rgba(26,18,48,0.8) 60%)`,
                              boxShadow: `0 0 0 1px ${BRAND_COLORS.ionMagenta}0f`,
                            }}
                          >
                            <div
                              aria-hidden="true"
                              className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
                              style={{
                                background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta}, transparent 70%)`,
                              }}
                            />
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              {ss && (
                                <span
                                  className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
                                  style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}
                                >
                                  {post.sport}
                                </span>
                              )}
                              <span
                                className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{
                                  background: `${BRAND_COLORS.ionMagenta}14`,
                                  color: BRAND_COLORS.ionMagenta,
                                  borderColor: `${BRAND_COLORS.ionMagenta}30`,
                                }}
                              >
                                Featured
                              </span>
                            </div>
                            <Link href={`/blog/${post.slug}`} className="flex-1">
                              <h2 className="text-xl font-bold text-white transition-colors group-hover:text-orbital-cyan line-clamp-2">
                                {post.title}
                              </h2>
                            </Link>
                            <p className="mt-2 flex-1 text-sm leading-6 text-ink-300 line-clamp-3">
                              {post.excerpt}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                              {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded px-1.5 py-0.5 font-mono"
                                  style={{ background: "rgba(255,255,255,0.05)", color: "#9AA3B2" }}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </Stagger>
                  </div>
                )}

                {/* Regular posts */}
                {rest.length > 0 && (
                  <div>
                    {featured.length > 0 && (
                      <Reveal>
                        <p
                          className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em]"
                          style={{ color: BRAND_COLORS.orbitalCyan }}
                        >
                          Latest
                        </p>
                      </Reveal>
                    )}
                    <Stagger className="grid gap-4" step={60}>
                      {rest.map((post) => {
                        const ss = sportStyle(post.sport);
                        return (
                          <article
                            key={post.id}
                            className="group flex flex-col gap-1 rounded-xl border px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 sm:flex-row sm:items-start sm:gap-5"
                            style={{
                              borderColor: "rgba(255,255,255,0.07)",
                              background: "rgba(255,255,255,0.025)",
                            }}
                          >
                            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {ss && (
                                  <span
                                    className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]"
                                    style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}
                                  >
                                    {post.sport}
                                  </span>
                                )}
                              </div>
                              <Link href={`/blog/${post.slug}`}>
                                <h2 className="text-base font-semibold text-white transition-colors group-hover:text-orbital-cyan line-clamp-2">
                                  {post.title}
                                </h2>
                              </Link>
                              <p className="text-sm leading-5 text-ink-300 line-clamp-2">{post.excerpt}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                                {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                                {post.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded px-1.5 py-0.5 font-mono"
                                    style={{ background: "rgba(255,255,255,0.05)", color: "#9AA3B2" }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span
                              className="mt-1 shrink-0 font-mono text-sm font-semibold transition-colors group-hover:text-orbital-cyan"
                              style={{ color: `${BRAND_COLORS.orbitalCyan}66` }}
                              aria-hidden="true"
                            >
                              →
                            </span>
                          </article>
                        );
                      })}
                    </Stagger>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
