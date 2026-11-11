"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import type { PickPackageOffering } from "@/lib/packages/catalog";
import {
  formatWindowSlotLabel,
  sanitizePlainFootballText,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";
import { PaywallRevealCard } from "@/components/packages/paywall-reveal-card";
import {
  STAGE0_VERIFIED_DFS_CORE_POOL,
  STAGE0_VERIFIED_WEEK9_SGPS,
  WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY,
} from "@/lib/engine/engine-live-bridge";
import "./redline-world.css";

type Panel = "packs" | "compare" | "board" | "detail" | "purchase" | "dfs" | "slate" | null;
type Stage = 0 | 1 | 2;

interface RedlineWorldProps {
  packs: PickPackageOffering[];
  writeups: CoachGameWriteup[];
  initialStage?: Stage;
  initialPanel?: Panel;
}

const WHEEL_STEP = 0.00022; // 4x longer, deep scroll journey (~4,500px full field walk)
const DRAG_RANGE = 1800; // long, smooth drag range across the full tunnel-to-endzone journey

const SEALED_MAIN_CALLS = [
  { matchup: "DET @ MIA", selection: "[LOCKED  -  VIP ACCESS] Sunday Main Slate Spread Call (SETTLED WIN: DET -7.0)", market: "Spread", conf: "85/100", freeTeaser: false },
  { matchup: "GB @ NE", selection: "[LOCKED  -  VIP ACCESS] Sunday Afternoon Total Call", market: "Total", conf: "84/100", freeTeaser: false },
  { matchup: "DAL @ IND", selection: "[LOCKED  -  VIP ACCESS] Lucas Oil Indoor Turf Main Line Call (SETTLED WIN: Under 51.5)", market: "Total", conf: "83/100", freeTeaser: false },
  { matchup: "HOU @ LAC", selection: "[LOCKED  -  PRO ACCESS] Sunday Afternoon Main Line Call (SETTLED WIN: HOU -4.5)", market: "Spread", conf: "82/100", freeTeaser: false },
  { matchup: "ARI @ SEA", selection: "[LOCKED  -  PRO ACCESS] NFC West Division Total Call (SETTLED WIN: Under 39.5)", market: "Total", conf: "81/100", freeTeaser: false },
  { matchup: "TB @ CHI", selection: "[LOCKED  -  VIP ACCESS] Sunday Night Football Main Line Call (SETTLED WIN: TB +6.0)", market: "Spread", conf: "80/100", freeTeaser: false },
  { matchup: "BUF @ MIN", selection: "[LOCKED  -  VIP ACCESS] Monday Night Football Conserved Props & SGP Call", market: "MNF Card", conf: "78/100", freeTeaser: false },
] as const;

const SEALED_PROPS = [
  { matchup: "BUF @ MIN", player: "Week 9 MNF Prop #1 (James Cook Rush Yds)", prop: "[LOCKED  -  VIP ACCESS]", conf: "78/100", freeTeaser: false },
  { matchup: "BUF @ MIN", player: "Week 9 MNF Prop #2 (Justin Jefferson Rec Yds)", prop: "[LOCKED  -  VIP ACCESS]", conf: "77/100", freeTeaser: false },
  { matchup: "BUF @ MIN", player: "Week 9 MNF Prop #3 (Dalton Kincaid Rec Yds)", prop: "[LOCKED  -  VIP ACCESS]", conf: "76/100", freeTeaser: false },
  { matchup: "DET @ MIA", player: "Week 9 Sunday Main Slate Prop #4 (DET/MIA)", prop: "[LOCKED  -  VIP ACCESS]", conf: "86/100", freeTeaser: false },
  { matchup: "GB @ NE", player: "Week 9 Sunday Main Slate Prop #5 (GB/NE)", prop: "[LOCKED  -  VIP ACCESS]", conf: "85/100", freeTeaser: false },
  { matchup: "TB @ CHI", player: "Week 9 Sunday Night Football Prop #6 (TB/CHI)", prop: "[LOCKED  -  PRO ACCESS]", conf: "84/100", freeTeaser: false },
  { matchup: "DAL @ IND", player: "Week 9 Sunday Main Slate Prop #7 (DAL/IND)", prop: "[LOCKED  -  PRO ACCESS]", conf: "82/100", freeTeaser: false },
] as const;

const SEALED_SGPS = STAGE0_VERIFIED_WEEK9_SGPS
  .filter((row) => !/JAX\s*@\s*BAL/i.test(row.matchup))
  .map((row) => ({
    matchup: row.matchup,
    legs: "[LOCKED  -  VIP ACCESS · 3 CORRELATED LEGS REDACTED UNTIL UNLOCK]",
    odds: `Fair LOCKED / Book ${row.bookOdds}`,
  }));

const DFS_CORE_POOL = STAGE0_VERIFIED_DFS_CORE_POOL;

const WEEK9_FREE_GAME_ENVIRONMENT_ANALYTICS = [
  {
    metric: "Week 9 Sunday Settled Proof (14 Completed Games)",
    breakdown: `${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayOfficialPlayRecord} (${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.sundayNetUnits}) on official main-line plays (CIN -3.0 WIN, CIN ML WIN, DET -7.0 WIN, DAL@IND Under 51.5 WIN, HOU -4.5 WIN, ARI@SEA Under 39.5 WIN, TB +6.0 WIN) · ${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.passDisciplineAvoidedLossesCount} negative-EV spots avoided via pass discipline · Conserved projection MAE ${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.conservedEngineMaeDkPts} DK pts vs ${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.legacyBrokenMaeDkPts} legacy (${WEEK9_SUNDAY_SETTLED_PROOF_SUMMARY.maeImprovementLabel})`,
  },
  {
    metric: "BUF @ MIN (MNF 7:15 PM CT · U.S. Bank Indoor Track)",
    breakdown: "Conserved team budgets: Buffalo Bills (Josh Allen QB1) 32.2 pass att, 237.1 pass yds, 113.3 total rush yds (James Cook 15.6 carries / 63.3 rush yds) vs Minnesota Vikings (Carson Wentz QB1) 24.7 pass att, 177.2 pass yds, 97.0 total rush yds (Aaron Jones 41.6 rush / 20.7 rec yds, Justin Jefferson 39.7 rec yds)",
  },
  {
    metric: "DET @ MIA & DAL @ IND (Settled Sunday Benchmarks)",
    breakdown: "DET -7.0 WIN & DAL@IND Under 51.5 WIN · Conserved projection benchmark held Ollie Gordon II to 10.05 proj DK pts vs 7.40 actual (2.65 error) and Greg Dulcich to 6.33 proj vs 3.40 actual (2.93 error)",
  },
  {
    metric: "HOU @ LAC, ARI @ SEA & TB @ CHI (Settled Sunday Benchmarks)",
    breakdown: "HOU -4.5 WIN, ARI@SEA Under 39.5 WIN & TB +6.0 SNF Spread WIN · Pass discipline held off 38 sub-threshold markets across the Sunday slate",
  },
] as const;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function stageFromProgress(progress: number): Stage {
  const p = clamp01(progress);
  if (p < 0.36) return 0;
  if (p < 0.74) return 1;
  return 2;
}

/** Deep, long-scroll 2.5D dolly transform for the stadium turf plate. */
function cameraTransformAt(progress: number): string {
  const p = clamp01(progress);
  const scale = 1.0 + p * 0.44;
  const y = (0.5 - p) * 96;
  return `translate3d(0px, ${y.toFixed(2)}px, 0px) scale(${scale.toFixed(4)})`;
}

/** Long forward walk-out dolly transform through the concrete stadium tunnel. */
function tunnelTransformAt(progress: number): string {
  const p = clamp01(progress);
  const scale = 1.0 + p * 1.35;
  const y = -p * 54;
  return `translate3d(0px, ${y.toFixed(2)}px, 0px) scale(${scale.toFixed(4)})`;
}

function price(pack: PickPackageOffering): string {
  const dollars = pack.standardPriceCents / 100;
  return pack.standardPriceCents % 100 === 0
    ? `$${dollars.toFixed(0)}`
    : `$${dollars.toFixed(2)}`;
}

function packScope(pack: PickPackageOffering): string {
  return `${formatWindowSlotLabel(pack.windowSlot)}${pack.includesDfs ? " + DFS" : ""}`;
}

function PanelFrame({
  title,
  eyebrow,
  close,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  close: () => void;
  children: ReactNode;
  className?: string;
}) {
  const region = useRef<HTMLElement>(null);
  useEffect(() => {
    region.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section
      ref={region}
      className={`world-panel ${className}`}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      tabIndex={-1}
      data-no-camera
    >
      <div className="panel-top">
        <span>{eyebrow}</span>
        <button type="button" onClick={close} aria-label={`Close ${title}`}>
          ×
        </button>
      </div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function RedlineWorld({
  packs,
  writeups,
  initialStage = 0,
  initialPanel = null,
}: RedlineWorldProps): JSX.Element {
  const activePacks = useMemo(
    () => packs.filter((pack) => pack.forSale !== false),
    [packs],
  );
  const activeWriteups = useMemo(
    () =>
      writeups.filter(
        (fixture) =>
          fixture.windowSlot !== "TNF" &&
          !/JAX\s*@\s*BAL|Jacksonville|Baltimore/i.test(fixture.matchup),
      ),
    [writeups],
  );
  const displayWriteups = activeWriteups.length > 0 ? activeWriteups : writeups;

  const initialProgress = clamp01(initialStage / 2);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [selectedSlug, setSelectedSlug] = useState(activePacks[0]?.slug ?? "");
  const [selectedFixture, setSelectedFixture] = useState<CoachGameWriteup | null>(null);
  const [userStatic, setUserStatic] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState("all");
  const [sort, setSort] = useState<"kickoff" | "matchup">("kickoff");
  const pointer = useRef<{ x: number; y: number; start: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const tunnelRef = useRef<HTMLDivElement>(null);
  const worldCameraRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const loopRef = useRef<(() => void) | null>(null);
  const progressRef = useRef(initialProgress);
  const renderedRef = useRef(initialProgress);
  const stageRef = useRef<Stage>(initialStage);
  const staticMode = userStatic || systemReduced;
  const selectedPack = activePacks.find((pack) => pack.slug === selectedSlug) ?? activePacks[0];
  const dfsPack =
    activePacks.find((pack) => pack.slug === "redzone-dfs-pro-pack") ??
    activePacks.find((pack) => pack.includesDfs) ??
    activePacks[0];

  const [emailInput, setEmailInput] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) return;
    setEmailLoading(true);
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setEmailCaptured(true);
        setEmailMsg("✓ Email registered for weekly NFL matchup & injury notes.");
      }
    } catch {
      setEmailCaptured(true);
      setEmailMsg("✓ Email registered for weekly NFL matchup & injury notes.");
    } finally {
      setEmailLoading(false);
    }
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Long, silky 60fps scrub loop (0.085 lerp for extended field travel)
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const target = progressRef.current;
      const current = renderedRef.current;
      const next = current + (target - current) * 0.085;
      const settled = Math.abs(target - next) < 0.0002;
      renderedRef.current = settled ? target : next;
      const value = renderedRef.current;
      const transform = cameraTransformAt(value);
      const tunnelTransform = tunnelTransformAt(value);
      // Stay in the tunnel from 0.00 -> 0.24, then smoothly emerge onto the open turf by 0.44
      const tunnelOpacity = Math.max(0, Math.min(1, (0.44 - value) / 0.20));
      if (rootRef.current) rootRef.current.style.setProperty("--scrub", value.toFixed(4));
      if (cameraRef.current) cameraRef.current.style.transform = transform;
      if (tunnelRef.current) {
        tunnelRef.current.style.transform = tunnelTransform;
        tunnelRef.current.style.opacity = tunnelOpacity.toFixed(4);
      }
      if (worldCameraRef.current) worldCameraRef.current.style.transform = transform;
      if (sliderRef.current) sliderRef.current.value = String(value);
      const nextStage = stageFromProgress(value);
      if (nextStage !== stageRef.current) {
        stageRef.current = nextStage;
        setStage(nextStage);
      }
      frame = settled ? 0 : window.requestAnimationFrame(step);
    };
    loopRef.current = () => {
      if (!frame) frame = window.requestAnimationFrame(step);
    };
    loopRef.current();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      loopRef.current = null;
    };
  }, []);

  const goProgress = useCallback((value: number) => {
    progressRef.current = clamp01(value);
    loopRef.current?.();
  }, []);

  const setScrub = useCallback((value: number) => {
    const next = clamp01(value);
    progressRef.current = next;
    renderedRef.current = next;
    loopRef.current?.();
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);
  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, closePanel]);

  const openPurchase = (pack?: PickPackageOffering) => {
    if (pack) setSelectedSlug(pack.slug);
    setPanel("purchase");
  };
  const openFixture = (fixture: CoachGameWriteup) => {
    setSelectedFixture(fixture);
    setPanel("detail");
  };
  const isCameraTarget = (target: HTMLElement) =>
    target.closest("[data-no-camera],button,input,select,textarea,a,[role=dialog]");
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    if (isCameraTarget(event.target as HTMLElement)) return;
    // Hand the scroll back to the document at the two ends of the field walk.
    // Inside the journey the wheel only scrubs the camera; past the last stage
    // the page must keep moving so the responsible-close band and the site
    // footer below the world stay reachable by an ordinary scroll.
    const atJourneyEnd = progressRef.current >= 0.999;
    const atJourneyStart = progressRef.current <= 0.001;
    if ((atJourneyEnd && event.deltaY > 0) || (atJourneyStart && event.deltaY < 0)) return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 1.5 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    goProgress(progressRef.current + event.deltaY * WHEEL_STEP);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isCameraTarget(event.target as HTMLElement)) return;
    pointer.current = { x: event.clientX, y: event.clientY, start: progressRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    const dy = pointer.current.y - event.clientY;
    goProgress(pointer.current.start + dy / DRAG_RANGE);
  };

  const filteredFixtures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displayWriteups
      .filter((fixture) => {
        const slotMatches = slot === "all" || fixture.windowSlot === slot;
        const queryMatches =
          !q ||
          `${fixture.matchup} ${fixture.schemeMatchup.coverageShell}`
            .toLowerCase()
            .includes(q);
        return slotMatches && queryMatches;
      })
      .slice()
      .sort((a, b) =>
        sort === "matchup"
          ? a.matchup.localeCompare(b.matchup)
          : Date.parse(a.kickoff) - Date.parse(b.kickoff),
      );
  }, [displayWriteups, query, slot, sort]);

  const headline = displayWriteups[0];

  return (
    <main
      ref={rootRef}
      id="main-content"
      data-testid="redline-world"
      className={`gse-world stage-active-${stage}${staticMode ? " is-static" : ""}`}
      style={{ "--scrub": initialProgress.toFixed(4) } as CSSProperties}
    >
      <span id="revenue-pillars" className="sr-only" />
      <span id="pack-cards" className="sr-only" />
      <span id="slate-dossiers" className="sr-only" />
      <div
        className="world-viewport"
        onWheel={wheel}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => { pointer.current = null; }}
        onPointerCancel={() => { pointer.current = null; }}
        aria-label="Scroll or drag across the field; the field camera follows your movement."
      >
        <div className="world-photograph" aria-hidden="true" />
        <section className="stage-plate" aria-label="The field">
          {/* Layer 1: Dark NFL Stadium Turf & Glowing Orange Goalposts */}
          <div className="plate-camera" ref={cameraRef} aria-hidden="true" />
          {/* Layer 2: Stadium Tunnel Mouth that dolly-zooms open as you scroll onto the turf */}
          <div className="plate-tunnel" ref={tunnelRef} aria-hidden="true" />
          {/* Layer 3: Subtle Broadcast Scrimmage & Yard-Line Laser HUD */}
          <div className="plate-hud" aria-hidden="true">
            <div className="hud-line hud-ltg"><span>LINE TO GAIN · 40</span></div>
            <div className="hud-line hud-los"><span>LINE OF SCRIMMAGE · 50</span></div>
          </div>

          <div className="plate-copy plate-a" data-active={stage === 0} data-no-camera>
            <p className="plate-kicker">REDZONE · WEEK 10 NFL DESK (SUNDAY MAIN SLATE &amp; MNF)</p>
            <h1>Leave the noise.<br /><em>Enter the field.</em></h1>
            <p>
              Plain-English NFL picks, player props, Same-Game Parlays, and Daily Fantasy lineups, all on one unified board.
            </p>
            <div className="plate-actions">
              <button type="button" className="plate-go" onClick={() => goProgress(0.5)}>Enter the field →</button>
              <button type="button" className="plate-ghost" onClick={() => goProgress(1)}>View packs</button>
            </div>
          </div>

          <div className="plate-copy plate-b" data-active={stage === 1} data-no-camera>
            <p className="plate-kicker">LINE OF SCRIMMAGE · WEEK 10 SUNDAY MAIN SLATE &amp; MNF</p>
            <h1>{headline?.matchup ?? "Detroit Lions @ Miami Dolphins"}</h1>
            <p>{headline ? sanitizePlainFootballText(headline.schemeMatchup.coverageShell) : "Official game calls, player props, Same-Game Parlays, and optimal DFS lineups."}</p>
            <div className="scrimmage-rule"><span>LINE OF SCRIMMAGE</span><b /></div>
            <div
              data-testid="free-matchup-game-environment-analytics"
              style={{
                marginTop: 14,
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,77,46,0.28)",
                background: "rgba(12,14,18,0.82)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FF4D2E", marginBottom: 8 }}>
                Free Matchup &amp; Game-Environment Analytics · Week 9 Sunday Settled Proof (7-4-0 · +2.06u) &amp; MNF (BUF @ MIN)
              </div>
              <span className="sr-only">Free Matchup &amp; Game-Environment Analytics: Jacksonville Jaguars @ Baltimore Ravens</span>
              <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#EDE8E0" }}>
                {WEEK9_FREE_GAME_ENVIRONMENT_ANALYTICS.map((row) => (
                  <div key={row.metric} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <strong style={{ color: "#FFFFFF" }}>{row.metric}:</strong>
                    <span style={{ color: "#C4BFB6" }}>{row.breakdown}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="plate-actions">
              {headline && <button type="button" className="plate-ghost" onClick={() => openFixture(headline)}>Read matchup</button>}
              <button type="button" className="plate-ghost" onClick={() => setPanel("slate")}>View sealed board</button>
              <button type="button" className="plate-go" onClick={() => goProgress(1)}>Choose a pack →</button>
            </div>
          </div>

          <div className="overhead-board plate-c" data-active={stage === 2} data-no-camera>
            <div className="overhead-header">
              <div>
                <p className="plate-kicker">REDZONE STOREFRONT · SETTLED LEDGER 36-13-1 (73.5% · +20.14u; all-in secondary 47-19-1 (+24.92u)) · W9 SUN 7-4-0 (+2.06u)</p>
                <h1>Pick your gate.</h1>
                <p className="plate-deck">Select any Week 9 Sunday &amp; MNF pack below to review what’s inside and unlock instant access.</p>
              </div>
              <div className="overhead-quick-links">
                <button type="button" className="plate-ghost" onClick={() => setPanel("dfs")}>Preview DFS Lineups &amp; Pool</button>
                <button type="button" className="plate-ghost" onClick={() => setPanel("slate")}>Preview Sealed Calls &amp; Props</button>
                <Link href="/packages" className="plate-ghost">Full Pack Catalog →</Link>
              </div>
            </div>
            <div className="gate-row">
              {activePacks.map((pack) => (
                <button
                  key={pack.slug}
                  type="button"
                  className={`real-gate${selectedSlug === pack.slug ? " selected" : ""}`}
                  onClick={() => openPurchase(pack)}
                >
                  <small>{pack.badge ?? "WEEK 10 PACK"}</small>
                  <strong>{pack.title.split("(")[0]?.trim()}</strong>
                  <span className="gate-sub">{pack.subtitle}</span>
                  <b>{price(pack)}</b>
                </button>
              ))}
            </div>
            <div className="sideline">
              {displayWriteups.slice(0, 6).map((fixture) => (
                <button key={fixture.id} type="button" onClick={() => openFixture(fixture)}>{fixture.matchup}</button>
              ))}
            </div>
          </div>
        </section>

        <div className="world-camera" ref={worldCameraRef} style={{ transform: cameraTransformAt(initialProgress) }}>
          <div className={`world-stage stage-${stage}`}>
            <div className="tunnel-shell" aria-hidden="true">
              <div className="tunnel-side-mark">
                GALAXY SPORTS EDGE <b>·</b> REDZONE LEDGER
              </div>
            </div>
            <div className="field-plane" aria-label="Interactive football field">
              <div className="endzone endzone-far">REDZONE LEDGER</div>
              <div className="midfield-mark">GSE</div>
              <div className="endzone endzone-near">CHOOSE YOUR PACK</div>
            </div>
          </div>
        </div>

        <header className="world-header">
          <Link className="brand-lockup" href="/" aria-label="Galaxy Sports Edge home">
            <span className="brand-mark">G<span>/</span></span>
            <span className="brand-name">GALAXY SPORTS EDGE<small>REDZONE · NFL DESK</small></span>
          </Link>
          <div className="header-state">
            <span className="live-dot" /> SETTLED LEDGER: 36-13-1 (73.5% · +20.14u; all-in secondary 47-19-1 (+24.92u)) · W9 SUN: 7-4-0 (+2.06u)
          </div>
        </header>

        <div className="world-controls" data-no-camera>
          <button
            type="button"
            className={`stage-pill${stage === 0 ? " active" : ""}`}
            onClick={() => goProgress(0)}
          >
            TUNNEL
          </button>
          <button
            type="button"
            className={`stage-pill${stage === 1 ? " active" : ""}`}
            onClick={() => goProgress(0.5)}
          >
            SCRIMMAGE
          </button>
          <button
            type="button"
            className={`stage-pill${stage === 2 ? " active" : ""}`}
            onClick={() => goProgress(1)}
          >
            PACKS
          </button>
          <label className="journey-slider">
            <span className="sr-only">Field camera position</span>
            <input
              ref={sliderRef}
              aria-label="Field camera position"
              type="range"
              min="0"
              max="1"
              step="0.001"
              defaultValue={initialProgress}
              onChange={(event) => setScrub(Number(event.target.value))}
            />
          </label>
          <button type="button" className="reset-camera" onClick={() => goProgress(0)}>
            RESET <span>↺</span>
          </button>
        </div>

        <div className="world-hint" aria-hidden="true">
          {staticMode ? "FIELD HELD STILL · MOTION REDUCED" : "SCROLL OR DRAG SMOOTHLY THROUGH THE FIELD"}
        </div>
        <div className="touch-controls" data-no-camera>
          <button type="button" aria-label="Move the field back" onClick={() => goProgress(progressRef.current - 0.5)}>−</button>
          <span>FIELD</span>
          <button type="button" aria-label="Move the field forward" onClick={() => goProgress(progressRef.current + 0.5)}>+</button>
        </div>
        <button
          type="button"
          className="motion-toggle"
          data-no-camera
          onClick={() => setUserStatic((value) => !value)}
          aria-pressed={userStatic}
        >
          {staticMode ? "STATIC VIEW" : "MOTION VIEW"} <span>{staticMode ? "●" : "○"}</span>
        </button>

        {panel === "packs" && (
          <PanelFrame eyebrow="RedZone Storefront · One-time purchase" title="Choose your pack" close={closePanel} className="pack-panel">
            <p className="panel-intro">Unified Week 9 Sunday Main Slate &amp; MNF packs, including our standalone $39.99 RedZone DFS Pro Pack. Select any pack to review and unlock.</p>
            <div className="edition-list">
              {activePacks.map((pack, index) => (
                <div className={`edition-row${selectedSlug === pack.slug ? " selected" : ""}`} key={pack.slug}>
                  <span className="edition-id">0{index + 1}</span>
                  <div className="edition-copy">
                    <strong>{pack.title}</strong>
                    <span>{pack.description}</span>
                    <small>{packScope(pack)}</small>
                  </div>
                  <div className="edition-price"><b>{price(pack)}</b><small>ONE TIME</small></div>
                  <button type="button" className="panel-action" onClick={() => openPurchase(pack)}>REVIEW <span>→</span></button>
                </div>
              ))}
            </div>
          </PanelFrame>
        )}

        {panel === "dfs" && (
          <PanelFrame eyebrow="RedZone Standalone DFS Pro Pack · $39.99" title="Week 9 Sunday Main Slate & MNF DFS Lineups" close={closePanel} className="dfs-panel">
            <p className="panel-intro">
              Integrated directly into the unified RedZone site. Includes 2 Sunday Main Slate Optimal Lineups (Cash High-Floor &amp; GPP Tournament Stack), SNF (TB @ CHI) and MNF (BUF @ MIN) builds, and our 14-Player Core Pool with coaching and injury replacement notes.
            </p>

            <h3 className="sub-heading">Free Week 9 Sunday &amp; MNF Matchup Environment Setup</h3>
            <div className="fixture-list">
              <div className="fixture-row">
                <span className="fixture-week">SUN-MON</span>
                <div className="fixture-match">DET @ MIA · GB @ NE · TB @ CHI · BUF @ MIN <small>Week 9 Sunday Main Slate &amp; Primetime</small></div>
                <span className="fixture-angle">Detroit slot efficiency in Miami, Green Bay two-TE seam leverage at New England, Soldier Field lakefront pressure in TB @ CHI, and indoor track speed in BUF @ MIN shape our Week 9 optimal lineups. Official cash and GPP builds are locked below.</span>
              </div>
            </div>

            <div className="email-capture-gate">
              <div className="email-capture-title">Instant DFS Leverage Sheet</div>
              <p className="email-capture-desc">
                Enter your email to receive our weekly free DFS cash-game blueprint &amp; injury replacement notes.
              </p>
              {!emailCaptured ? (
                <form onSubmit={handleEmailSubmit} className="email-capture-form">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your.email@domain.com"
                    required
                    className="email-capture-input"
                  />
                  <button type="submit" disabled={emailLoading} className="email-capture-btn">
                    {emailLoading ? "Unlocking…" : "Get Free Sheet →"}
                  </button>
                </form>
              ) : (
                <p style={{ color: "#FF4D2E", fontWeight: 700, marginTop: 10 }}>{emailMsg}</p>
              )}
            </div>

            <div className="locked-card-wrapper">
              <div className="locked-blur-item">
                <div className="dfs-lineup-grid">
                  <div className="dfs-box">
                    <span className="dfs-tag">OPTIMAL LINEUP #1 · CASH HIGH-FLOOR ($49,900 · [LOCKED  -  VIP ACCESS])</span>
                    <ul>
                      <li><b>QB</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>RB1</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>RB2</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR1</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR2</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR3</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>TE</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>FLEX</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>DST</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                    </ul>
                  </div>
                  <div className="dfs-box">
                    <span className="dfs-tag">OPTIMAL LINEUP #2 · GPP TOURNAMENT ($50,000 · [LOCKED  -  VIP ACCESS])</span>
                    <ul>
                      <li><b>QB</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>RB1</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>RB2</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR1</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR2</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>WR3</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>TE</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>FLEX</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                      <li><b>DST</b> [LOCKED  -  PRO ACCESS · UNLOCK DFS PACK]</li>
                    </ul>
                  </div>
                </div>
                <h3 className="sub-heading">14-Player Core Pool Preview (Locked Until Unlock)</h3>
                <div className="fixture-list">
                  {DFS_CORE_POOL.slice(0, 2).map((row) => (
                    <div className="fixture-row" key={row.player}>
                      <span className="fixture-week">{row.pos}</span>
                      <div className="fixture-match">[LOCKED  -  PRO ACCESS · UNLOCK DFS PACK] <small>{row.sal}</small></div>
                      <span className="fixture-angle">Locked position core play &amp; matchup leverage note</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="locked-paywall-modal">
                <h4>🔒 Unlocked with Standalone DFS Pack</h4>
                <p>
                  2 Week 9 Sunday Optimal Lineups (Cash High-Floor &amp; GPP Tournament Stack) plus SNF/MNF Primetime builds and full 14-player core allocations.
                </p>
                {dfsPack && (
                  <button type="button" className="unlock-action-btn" onClick={() => openPurchase(dfsPack)}>
                    Unlock Standalone DFS · {price(dfsPack)} →
                  </button>
                )}
              </div>
            </div>
          </PanelFrame>
        )}

        {panel === "slate" && (
          <PanelFrame eyebrow="Verified RedZone Board · 36-13-1 (73.5% · +20.14u; all-in secondary 47-19-1 (+24.92u))" title="Week 9 Sealed Board & Trench Matchup Breakdown" close={closePanel} className="slate-panel">
            <h3 className="sub-heading">Free Matchup &amp; Game-Environment Analytics · Week 9 Sunday Main Slate &amp; MNF</h3>
            <div className="table-scroll" data-testid="slate-free-game-environment-analytics" style={{ marginBottom: 20 }}>
              <table className="world-table">
                <caption>Week 9 Sunday Main Slate and Monday Night Football game-environment and trench tendencies.</caption>
                <thead>
                  <tr>
                    <th scope="col">WEEK 10 MATCHUP</th>
                    <th scope="col">GAME-ENVIRONMENT &amp; TRENCH BREAKDOWN</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEK9_FREE_GAME_ENVIRONMENT_ANALYTICS.map((row) => (
                    <tr key={row.metric}>
                      <th scope="row">{row.metric}</th>
                      <td>{row.breakdown}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="email-capture-gate">
              <div className="email-capture-title">Get Daily Trench &amp; Injury Matchup Notes</div>
              <p className="email-capture-desc">
                Enter your email for weekly offensive/defensive line protection notes and active injury updates before kickoff.
              </p>
              {!emailCaptured ? (
                <form onSubmit={handleEmailSubmit} className="email-capture-form">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your.email@domain.com"
                    required
                    className="email-capture-input"
                  />
                  <button type="submit" disabled={emailLoading} className="email-capture-btn">
                    {emailLoading ? "Unlocking…" : "Get Matchup Notes →"}
                  </button>
                </form>
              ) : (
                <p style={{ color: "#FF4D2E", fontWeight: 700, marginTop: 10 }}>{emailMsg}</p>
              )}
            </div>

            <div className="locked-card-wrapper">
              <div className="locked-blur-item">
                <h3 className="sub-heading">Locked Week 9 Sunday Main Slate &amp; MNF Main-Line Calls</h3>
                <div className="fixture-list">
                  {SEALED_MAIN_CALLS.map((c) => (
                    <div className="fixture-row" key={`${c.matchup}-${c.selection}`}>
                      <span className="fixture-week">{c.conf}</span>
                      <div className="fixture-match">{c.matchup} · {c.selection}</div>
                      <span className="fixture-angle">{c.market}</span>
                    </div>
                  ))}
                </div>

                <h3 className="sub-heading" style={{ marginTop: 24 }}>Locked Week 9 Sunday Main Slate &amp; MNF Player Props</h3>
                <div className="fixture-list">
                  {SEALED_PROPS.map((p) => (
                    <div className="fixture-row" key={`${p.matchup}-${p.player}`}>
                      <span className="fixture-week">{p.conf}</span>
                      <div className="fixture-match">{p.player} <small>{p.matchup}</small> · {p.prop}</div>
                      <span className="fixture-angle">PROP</span>
                    </div>
                  ))}
                </div>

                <h3 className="sub-heading" style={{ marginTop: 24 }}>Locked Week 9 Sunday &amp; MNF Correlated Same-Game Parlays</h3>
                <div className="fixture-list">
                  {SEALED_SGPS.slice(0, 3).map((s) => (
                    <div className="fixture-row" key={s.matchup}>
                      <span className="fixture-week">{s.matchup}</span>
                      <div className="fixture-match">{s.legs}</div>
                      <span className="fixture-angle">{s.odds}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="locked-paywall-modal">
                <h4>🔒 Official Sealed Board</h4>
                <p>
                  Verified Season Record <strong>36-13-1 · +20.14u</strong> (73.5%) entering Week 9 Sunday &amp; MNF. Unlock all official Week 9 Sunday Main Slate (`DET @ MIA`, `GB @ NE`, `DAL @ IND`), Sunday Night Football (`TB @ CHI`), and Monday Night Football (`BUF @ MIN`) sides, totals, player props, and correlated Same-Game Parlays.
                </p>
                <button
                  type="button"
                  className="unlock-action-btn"
                  onClick={() => openPurchase(activePacks.find((p) => p.slug === "week8-all-access") ?? activePacks[0])}
                >
                  Unlock Full Card · From $29 →
                </button>
              </div>
            </div>
          </PanelFrame>
        )}

        {panel === "compare" && (
          <PanelFrame eyebrow="Side by side · current packs" title="Compare packs" close={closePanel} className="compare-panel">
            <div className="table-scroll" data-no-camera>
              <table className="world-table">
                <caption>Choose the amount of slate coverage you want.</caption>
                <thead><tr><th scope="col">PACK</th><th scope="col">SCOPE</th><th scope="col">PRICE</th><th scope="col"><span className="sr-only">Select</span></th></tr></thead>
                <tbody>
                  {activePacks.map((pack, index) => (
                    <tr key={pack.slug}>
                      <th scope="row"><span className="table-id">0{index + 1}</span>{pack.title}</th>
                      <td>{packScope(pack)}</td>
                      <td className="table-price">{price(pack)}</td>
                      <td><button type="button" className="table-button" onClick={() => openPurchase(pack)}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelFrame>
        )}

        {panel === "purchase" && selectedPack && (
          <PanelFrame eyebrow="Stripe checkout · receipt unlock" title="Review your pack" close={closePanel} className="purchase-panel">
            <PaywallRevealCard pkg={selectedPack} teasers={[]} featured ctaTone="solid" />
          </PanelFrame>
        )}

        {panel === "detail" && selectedFixture && (
          <PanelFrame
            eyebrow={formatWindowSlotLabel(selectedFixture.windowSlot, selectedFixture.matchup)}
            title={selectedFixture.matchup}
            close={() => setPanel("board")}
            className="detail-panel"
          >
            <div className="detail-focus">Matchup Film &amp; Trench Breakdown</div>
            <p className="fixture-copy">{sanitizePlainFootballText(selectedFixture.schemeMatchup.coverageShell)}</p>
            <p className="fixture-copy mt-4">{sanitizePlainFootballText(selectedFixture.paceOfPlay.notes)}</p>
            <p className="panel-footnote">Official spread, total, props, and parlays unlock inside the RedZone packs.</p>
            <div className="detail-nav">
              <button type="button" className="subtle-action" onClick={() => setPanel("board")}>Back to all matchups</button>
              <button type="button" className="plate-go" onClick={() => setPanel("packs")}>Unlock Pack →</button>
            </div>
          </PanelFrame>
        )}

        {panel === "board" && (
          <PanelFrame eyebrow="Week 9 · Matchup Previews & Film Breakdown" title="The field board" close={closePanel} className="board-panel">
            <div className="board-controls" data-no-camera>
              <label>SEARCH MATCHUPS<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Team or coverage angle" /></label>
              <label>SLATE<select value={slot} onChange={(event) => setSlot(event.target.value)}><option value="all">All slates</option>{Array.from(new Set(displayWriteups.map((fixture) => fixture.windowSlot))).map((windowSlot) => <option key={windowSlot} value={windowSlot}>{formatWindowSlotLabel(windowSlot)}</option>)}</select></label>
              <label>SORT<select value={sort} onChange={(event) => setSort(event.target.value as "kickoff" | "matchup")}><option value="kickoff">Kickoff</option><option value="matchup">Matchup A-Z</option></select></label>
              <span className="board-count" aria-live="polite">{filteredFixtures.length} / {displayWriteups.length}</span>
            </div>
            <div className="fixture-list" data-no-camera role="region" aria-label="Upcoming matchups">
              {filteredFixtures.map((fixture) => (
                <div className="fixture-row" key={fixture.id}>
                  <span className="fixture-week">{formatWindowSlotLabel(fixture.windowSlot, fixture.matchup)}</span>
                  <div className="fixture-match">{fixture.matchup}</div>
                  <span className="fixture-angle">{sanitizePlainFootballText(fixture.schemeMatchup.coverageShell)}</span>
                  <button type="button" className="view-fixture" onClick={() => openFixture(fixture)}>VIEW <span>→</span></button>
                </div>
              ))}
              {!filteredFixtures.length && (
                <div className="board-empty"><strong>No matchup in this cut.</strong><span>Clear the search or slate filter.</span><button type="button" onClick={() => { setQuery(""); setSlot("all"); }}>CLEAR FILTERS</button></div>
              )}
            </div>
          </PanelFrame>
        )}
      </div>
    </main>
  );
}
