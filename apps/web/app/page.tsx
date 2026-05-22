import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import { InteractiveGalaxy } from "@/components/hero/interactive-galaxy";
import { SignalPreviewQueue } from "@/components/hero/signal-preview-queue";
import { ToutComparison } from "@/components/home/tout-comparison";
import { AnnotatedSampleSignal } from "@/components/home/annotated-sample-signal";
import { StartInSixty } from "@/components/home/start-in-sixty";
import { MissionControl } from "@/components/home/mission-control";
import type { PublicPick } from "@sports/types";
import { PICK_GRADE_LABELS } from "@sports/types";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";

/**
 * Homepage.
 *
 * Ports the canonical Galaxy Sports Edge Design System composed surface
 * (design-system/ui_kits/web/index.html) to the production Next.js app.
 * Uses the kit.css component classes — see apps/web/styles/pickpilot-kit.css.
 *
 * Trust invariants preserved:
 *   - MethodologySection (registry-driven) renders below the marketing methodology block.
 *   - RiskDisclosure appears in the responsible-play band.
 *   - EmptyPicksState renders when /api/picks returns nothing.
 *   - No banned phrases (the public-copy scanner test still applies).
 */

async function fetchHomepagePicks(): Promise<PublicPick[]> {
  try {
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/picks?limit=3`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { success: boolean; data: PublicPick[] };
    return (body.data ?? []).slice(0, 3);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredPicks = await fetchHomepagePicks();
  const hasFeaturedPicks = featuredPicks.length > 0;
  const demoActive = isStubMode() && isDemoPicksEnabled();

  return (
    <div className="app">
      <Nav />

      {demoActive && <SampleDataBanner />}

      {/* ──────────────────────────────────────────────────────
       * HERO — atmospheric orbital + editorial display headline
       * ────────────────────────────────────────────────────── */}
      <section className="hero hero-galaxy">
        <InteractiveGalaxy />
        <div className="hero-bg-word" aria-hidden="true">EDGE</div>
        <div className="hero-intro" aria-hidden="true">
          <div className="hero-intro-mark">GSE</div>
          <div className="hero-intro-line">Signal acquired</div>
          <div className="hero-intro-scan" />
        </div>
        <div className="container hero-copy">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden="true" />
            Live edge engine
          </span>

          <h1>Find the signal before the market moves.</h1>

          <p className="hero-tag">
            Most people react to the board. Galaxy Sports Edge watches price,
            timing, and volatility while the market is still forming.
          </p>

          <div className="hero-ctas">
            <Link href="/picks" className="btn btn-primary btn-lg">
              Open Signal Feed
            </Link>
            <Link href="/methodology" className="btn btn-ghost btn-lg">
              See Galaxy IQ
            </Link>
          </div>

          <p
            className="hero-byline"
            style={{
              marginTop: 22,
              fontFamily: "var(--f-mono)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--fg-muted)",
              position: "relative",
              zIndex: 2,
            }}
          >
            Because tout services don&apos;t show the losses.
          </p>

          <div className="hero-foot">
            <div className="stat">
              <span className="v p">Live</span>
              <span className="l">Market watch</span>
            </div>
            <div className="stat">
              <span className="v c">30 min</span>
              <span className="l">Refresh loop</span>
            </div>
            <div className="stat">
              <span className="v u">7</span>
              <span className="l">Sports tracked</span>
            </div>
            <div className="stat">
              <span className="v">Gated</span>
              <span className="l">Record integrity</span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
       * START IN 60 — three reassurance promises that reduce signup friction
       * (no card, refund window, founder-replies). Sits below hero, above slate.
       * ────────────────────────────────────────────────────── */}
      <StartInSixty />

      <MissionControl />

      {/* ──────────────────────────────────────────────────────
       * SLATE BAR — live mission-control telemetry strip
       * ────────────────────────────────────────────────────── */}
      <div className="slate">
        <div className="container slate-inner">
          <span className="head">
            <span className="dot" aria-hidden="true" />
            Board state
          </span>
          <div className="slate-divide" />
          <span className="item slate-chip">
            Odds <span className="v c">watching</span>
          </span>
          <span className="item slate-chip">
            Signals <span className="v p">gated</span>
          </span>
          <span className="item slate-chip">
            Record <span className="v u">collecting</span>
          </span>
          <div className="slate-divide" />
          <span className="item slate-chip">
            Rule <span className="v">show the work</span>
          </span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────
       * PICKS GRID — runway / today's signal
       * ────────────────────────────────────────────────────── */}
      <section className="section" id="picks">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="section-eyebrow">▸ Signal Feed</p>
              <h2>
                Publish less. <em>Mean more.</em>
              </h2>
            </div>
            <div className="meta">
              No filler cards
              <br />
              Every pick needs a reason
            </div>
          </div>

          {hasFeaturedPicks ? (
            <div className="picks-grid">
              {featuredPicks.map((pick, i) => (
                <PickCard key={pick.id} pick={pick} variant={["featured", "elite", "solid"][i] ?? "solid"} />
              ))}
            </div>
          ) : (
            <>
              <SignalPreviewQueue />
              <EmptyPicksState />
            </>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
       * METHODOLOGY — how the model thinks
       * ────────────────────────────────────────────────────── */}
      <section
        className="section"
        style={{
          background:
            "linear-gradient(180deg, transparent, var(--obsidian) 50%, transparent)",
        }}
      >
        <div className="container">
          <div className="section-head">
            <div>
              <p className="section-eyebrow">▸ Methodology</p>
              <h2>
                The stack <em>earns the signal.</em>
              </h2>
            </div>
            <div className="meta">
              No black box
              <br />
              No borrowed confidence
            </div>
          </div>

          <div className="how-grid">
            <div className="how">
              <span className="step">01</span>
              <div className="icon" aria-hidden="true">
                {/* Bespoke mark: orbital arc with a single price tick.
                    The board is what the model reads first. */}
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 19 A 13 9 0 0 0 29 19" strokeWidth="1.4" opacity="0.5" />
                  <path d="M3 19 A 13 9 0 0 0 29 19" strokeWidth="1.6" strokeDasharray="2 3" opacity="0.35" transform="translate(0 4)" />
                  <line x1="18" y1="11" x2="18" y2="19" strokeWidth="2.2" stroke="var(--ion-blue-glow)" />
                  <circle cx="18" cy="11" r="2.3" fill="var(--ion-blue-glow)" stroke="none" />
                </svg>
              </div>
              <h3>Board first.</h3>
              <p>
                Lines, totals, and moneylines move before most people notice.
                The board is the first signal.
              </p>
            </div>
            <div className="how">
              <span className="step">02</span>
              <div className="icon" aria-hidden="true">
                {/* Bespoke mark: pressure-gauge wedge filling left to right. */}
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 22 A 11 11 0 0 1 27 22" strokeWidth="1.4" opacity="0.45" />
                  <path d="M5 22 A 11 11 0 0 1 19 13.2" strokeWidth="2.4" stroke="var(--plasma)" />
                  <line x1="16" y1="22" x2="20.5" y2="14.6" strokeWidth="1.8" stroke="var(--ion-blue-glow)" />
                  <circle cx="16" cy="22" r="1.6" fill="var(--ion-blue-glow)" stroke="none" />
                </svg>
              </div>
              <h3>Pressure gets measured.</h3>
              <p>
                Galaxy IQ weighs price, depth, volatility, and timing before a
                signal is allowed onto the board.
              </p>
            </div>
            <div className="how">
              <span className="step">03</span>
              <div className="icon" aria-hidden="true">
                {/* Bespoke mark: audit trail — three dots connected by a line,
                    last one filled in plasma to mark the "publish" event. */}
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="16" x2="26" y2="16" strokeWidth="1.4" opacity="0.5" />
                  <circle cx="6" cy="16" r="2" fill="currentColor" stroke="none" opacity="0.55" />
                  <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" opacity="0.75" />
                  <circle cx="26" cy="16" r="3" fill="var(--plasma)" stroke="none" />
                  <circle cx="26" cy="16" r="6" stroke="var(--plasma)" strokeWidth="1" opacity="0.4" />
                </svg>
              </div>
              <h3>You see the trail.</h3>
              <p>
                A signal without a trail is noise. Every published pick carries
                the factors that put it there.
              </p>
            </div>
          </div>

          <div className="resp">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ultraviolet)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: "0 0 22px", marginTop: 2 }}
              aria-hidden="true"
            >
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6z" />
            </svg>
            <div>
              <div className="label">▸ Responsible intelligence</div>
              <p>
                Variance does not care how confident anyone sounds. Set limits
                first. Use the signal as input, not permission.{" "}
                <em
                  style={{
                    fontFamily: "var(--f-editorial)",
                    color: "var(--ultraviolet-glow)",
                    fontStyle: "italic",
                  }}
                >
                  You decide.
                </em>
              </p>
              <RiskDisclosure variant="compact" className="mt-3" />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
       * ANATOMY — what a published signal actually looks like
       * ────────────────────────────────────────────────────── */}
      <AnnotatedSampleSignal />

      {/* ──────────────────────────────────────────────────────
       * COMPARISON — vs typical tout services (category, not competitor)
       * ────────────────────────────────────────────────────── */}
      <ToutComparison />

      {/* The registry-driven methodology breakdown lives below the marketing
       * block. It pulls from the Trust Claim Registry so every assertion is
       * traceable to an APPROVED entry. */}
      <MethodologySection />

      <Footer />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Hero atmospheric orbital — pulled verbatim from the design system
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// PickCard — uses kit.css .pick, .pick-head, .chip, etc.
// ──────────────────────────────────────────────────────────────

function PickCard({
  pick,
  variant,
}: {
  pick: PublicPick;
  variant: string;
}) {
  const isPremium = pick.tier === "PREMIUM";
  const gradeInfo = PICK_GRADE_LABELS[pick.pickGrade];
  const gameTime = new Date(pick.game.commenceTime).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  // Map design-system pick grades to chip class
  const chipClass =
    pick.pickGrade === "ELITE_PLAY" ? "chip-grade-elite" :
    pick.pickGrade === "STRONG_PLAY" ? "chip-grade-strong" :
    "chip-grade-solid";

  return (
    <article className={`pick ${variant}`}>
      <div className="pick-head">
        <span className="chip chip-sport">{pick.game.sport}</span>
        {pick.pickGrade !== "LEAN" && (
          <span className={`chip ${chipClass}`}>{gradeInfo.label}</span>
        )}
        <span className="stamp">{gameTime}</span>
      </div>
      <div className="pick-match">
        <div className="away">{pick.game.awayTeam}</div>
        <div className="at">AT</div>
        <div className="home">{pick.game.homeTeam}</div>
      </div>
      <div className="pick-sel">
        <div className="l">Pick / {pick.pickType}</div>
        {isPremium ? (
          <div
            className="v"
            style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)" }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" />
            </svg>
            Pro &amp; Elite
          </div>
        ) : (
          <div className="v">
            {pick.selection}
            {pick.line !== 0 && (
              <span className="line">
                {pick.line > 0 ? "+" : ""}{pick.line}
              </span>
            )}
          </div>
        )}
      </div>
      <p className="pick-reason">{pick.reasoningShort}</p>
      <div className="pick-foot">
        <span>{isPremium ? "Premium" : "Free"}</span>
        <span className="live">
          <span className="dot" />
          Live
        </span>
      </div>
    </article>
  );
}

// ──────────────────────────────────────────────────────────────
// Honest empty state — required by homepage-content.test.ts
// ──────────────────────────────────────────────────────────────

function EmptyPicksState() {
  return (
    <div
      data-testid="homepage-empty-picks-state"
      className="pick"
      style={{
        gridColumn: "1 / -1",
        textAlign: "center",
        padding: "56px 32px",
      }}
    >
      <h3
        style={{
          font: "700 24px/1.1 var(--f-display)",
          color: "var(--ion-white)",
          letterSpacing: "-0.02em",
          marginBottom: 12,
        }}
      >
        The board is being scored. Get the open alert.
      </h3>
      <p
        style={{
          maxWidth: "36rem",
          margin: "0 auto 20px",
          color: "var(--fg-meta)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Signals only ship once Galaxy IQ&apos;s readiness gate clears the slate.
        Create a free account to get notified the moment the board opens.
      </p>
      <Link href="/auth/signin" className="btn btn-ghost">
        Get launch alerts
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sample-data banner — only shown while stub Prisma + demo picks active
// ──────────────────────────────────────────────────────────────

function SampleDataBanner() {
  return (
    <div
      data-testid="sample-data-banner-home"
      role="status"
      aria-live="polite"
      style={{
        maxWidth: 1240,
        margin: "16px auto 0",
        padding: "10px 16px",
        border: "1px solid color-mix(in srgb, var(--ultraviolet) 35%, transparent)",
        background: "color-mix(in srgb, var(--ultraviolet) 8%, transparent)",
        color: "var(--ultraviolet-glow)",
        fontFamily: "var(--f-mono)",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        display: "flex",
        gap: 12,
        alignItems: "start",
        borderRadius: 8,
      }}
    >
      <span style={{ flexShrink: 0, fontWeight: 600 }}>Sample data</span>
      <span style={{ letterSpacing: "0.04em", textTransform: "none" }}>
        The picks below are deterministic samples used to demo the product
        while live data ingestion is being wired up. They never settle and
        never produce a verified win-rate claim.
      </span>
    </div>
  );
}
