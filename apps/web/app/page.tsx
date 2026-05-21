import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { MethodologySection } from "@/components/ui/methodology-section";
import type { PublicPick } from "@sports/types";
import { PICK_GRADE_LABELS } from "@sports/types";
import { isStubMode, isDemoPicksEnabled } from "@sports/db";
import { BRAND_NAME, HERO_SUBHEAD, CLOSING_LINE } from "@/lib/brand";

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
      <section className="hero">
        <div className="container">
          <span className="hero-eyebrow">
            <span className="dot" aria-hidden="true" />
            Sports intelligence platform · v5.0
          </span>

          <h1>
            Find the <em>signal</em><br />
            before the market moves.
          </h1>

          <p className="hero-tag">
            {HERO_SUBHEAD} <em>{CLOSING_LINE}</em>
          </p>

          <div className="hero-ctas">
            <Link href="/picks" className="btn btn-primary btn-lg">
              Today&apos;s Signal Feed <span className="arrow">→</span>
            </Link>
            <Link href="/methodology" className="btn btn-ghost btn-lg">
              Inside Galaxy IQ
            </Link>
          </div>

          {/* Atmospheric orbital — pulled from design-system/ui_kits/web/index.html */}
          <div className="hero-stage" aria-hidden="true">
            <HeroOrbital />
          </div>

          <div className="hero-foot">
            <div className="stat">
              <span className="v p">07</span>
              <span className="l">Sports covered</span>
            </div>
            <div className="stat">
              <span className="v c">30 min</span>
              <span className="l">Refresh cadence</span>
            </div>
            <div className="stat">
              <span className="v u">v5.0</span>
              <span className="l">Model version</span>
            </div>
            <div className="stat">
              <span className="v">Gated</span>
              <span className="l">Public stats · collecting</span>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────
       * SLATE BAR — live mission-control telemetry strip
       * ────────────────────────────────────────────────────── */}
      <div className="slate">
        <div className="container slate-inner">
          <span className="head">
            <span className="dot" aria-hidden="true" />
            Today&apos;s slate
          </span>
          <div className="slate-divide" />
          <span className="item">
            NBA <span className="v">—</span>
          </span>
          <span className="item">
            NFL <span className="v">—</span>
          </span>
          <span className="item">
            NHL <span className="v">—</span>
          </span>
          <span className="item">
            MLB <span className="v">—</span>
          </span>
          <div className="slate-divide" />
          <span className="item">
            Strong plays <span className="v p">—</span>
          </span>
          <span className="item">
            Elite <span className="v u">—</span>
          </span>
          <span className="item">
            Updated <span className="v">Collecting</span>
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
              <p className="section-eyebrow">▸ Today&apos;s signal</p>
              <h2>
                Today&apos;s <em>signal.</em>
              </h2>
            </div>
            <div className="meta">
              Live odds · published with reasoning
              <br />
              Public picks open when the readiness gate clears
            </div>
          </div>

          {hasFeaturedPicks ? (
            <div className="picks-grid">
              {featuredPicks.map((pick, i) => (
                <PickCard key={pick.id} pick={pick} variant={["featured", "elite", "solid"][i] ?? "solid"} />
              ))}
            </div>
          ) : (
            <EmptyPicksState />
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
                We show <em>our work.</em>
              </h2>
            </div>
            <div className="meta">
              No black boxes
              <br />
              No fabricated stats · No stale data
            </div>
          </div>

          <div className="how-grid">
            <div className="how">
              <span className="step">01</span>
              <div className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3>Live odds, every 30 minutes.</h3>
              <p>
                Our data pipeline pulls real lines from dozens of sportsbooks.
                Spreads, totals, moneylines — 7 sports, continuously refreshed.
              </p>
            </div>
            <div className="how">
              <span className="step">02</span>
              <div className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              <h3>The model scores every game.</h3>
              <p>
                We calculate implied probabilities, detect sharp line movement,
                and score each side for positive expected value. Confidence is
                0–100, calibrated against history.
              </p>
            </div>
            <div className="how">
              <span className="step">03</span>
              <div className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h3>You see the reasoning.</h3>
              <p>
                Every pick exposes its factor breakdown — consensus, market
                depth, line movement, intelligence layers. You make the call.
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
                Variance is real. We provide perspective on uncertainty — not
                certainty. Know your risk, set limits before emotion enters,
                and treat every signal as one input in a portfolio of decisions.{" "}
                <em
                  style={{
                    fontFamily: "var(--f-editorial)",
                    color: "var(--ultraviolet-glow)",
                    fontStyle: "italic",
                  }}
                >
                  You make the call.
                </em>
              </p>
              <RiskDisclosure variant="compact" className="mt-3" />
            </div>
          </div>
        </div>
      </section>

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

function HeroOrbital() {
  return (
    <svg viewBox="0 0 600 600" fill="none">
      <defs>
        <radialGradient id="pp-hg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF2D8A" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#4FA8FF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#04060A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="300" r="280" fill="url(#pp-hg)" />
      <g stroke="#3C4961" strokeWidth="0.8" fill="none">
        <ellipse cx="300" cy="300" rx="270" ry="120" transform="rotate(-12 300 300)" />
        <ellipse cx="300" cy="300" rx="220" ry="100" transform="rotate(10 300 300)" />
        <ellipse cx="300" cy="300" rx="170" ry="80" transform="rotate(-30 300 300)" />
      </g>
      <g stroke="#FF2D8A" strokeWidth="1.2" fill="none" opacity="0.55">
        <ellipse cx="300" cy="300" rx="250" ry="110" transform="rotate(-22 300 300)" />
      </g>
      <g stroke="#4FA8FF" strokeWidth="1.2" fill="none" opacity="0.55">
        <ellipse cx="300" cy="300" rx="195" ry="90" transform="rotate(8 300 300)" />
      </g>
      <g fill="#FF2D8A">
        <circle cx="540" cy="200" r="4" />
        <circle cx="120" cy="380" r="3" />
      </g>
      <g fill="#4FA8FF">
        <circle cx="450" cy="380" r="3" />
        <circle cx="180" cy="220" r="4" />
        <circle cx="320" cy="120" r="3" />
      </g>
      <g fill="#9B7BFA">
        <circle cx="280" cy="500" r="3" />
      </g>
      {/* Reticle target */}
      <g transform="translate(300 300)" stroke="#FF2D8A" strokeWidth="1.5" opacity="0.4" fill="none">
        <circle r="60" />
        <circle r="30" opacity="0.5" />
        <line x1="-80" y1="0" x2="-65" y2="0" />
        <line x1="65" y1="0" x2="80" y2="0" />
        <line x1="0" y1="-80" x2="0" y2="-65" />
        <line x1="0" y1="65" x2="0" y2="80" />
      </g>
    </svg>
  );
}

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
        <div className="l">Pick · {pick.pickType}</div>
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
        No picks published right now
      </h3>
      <p
        style={{
          maxWidth: "32rem",
          margin: "0 auto 20px",
          color: "var(--fg-meta)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Picks appear here once the public picks readiness gate is active and
        the engine has scored the current slate. Create a free account to be
        notified when picks go live.
      </p>
      <Link href="/auth/signin" className="btn btn-ghost">
        Create free account
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
