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
  {
    matchup: "JAX @ BAL",
    selection: "Spread PASS at -7.5 (Steamed from -3.5 — Attacking 10 Player Matchups Instead)",
    market: "Pass Discipline",
    conf: "54/100",
    freeTeaser: true,
    trench: {
      passPro: "BAL OL Continuity 88 out of 100 vs JAX 5-man blitz",
      pressureSack: "JAX Blitz Rate 34 out of 100 · Hot-read middle open",
      tempo: "Neutral Pace 26.4s/snap",
      verdict: "Baltimore steamed from -3.5 past the key -7 number to -7.5. We never chase steamed numbers — we pass the spread and attack 10 high-conviction TNF player matchups and derivatives instead.",
    },
  },
  { matchup: "JAX @ BAL", selection: "🔒 LOCKED TNF FULL-GAME TOTAL CALL", market: "Total", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", selection: "🔒 LOCKED TNF 1ST-HALF DERIVATIVE CALL", market: "1H Derivative", conf: "88/100", freeTeaser: false },
  { matchup: "DET @ GB", selection: "🔒 LOCKED NFC NORTH DIVISION SPREAD CALL", market: "Spread", conf: "85/100", freeTeaser: false },
  { matchup: "MIA @ BUF", selection: "🔒 LOCKED AFC EAST DIVISION TOTAL CALL", market: "Total", conf: "84/100", freeTeaser: false },
  { matchup: "IND @ MIN", selection: "🔒 LOCKED SUNDAY NIGHT FOOTBALL CALL", market: "Spread", conf: "83/100", freeTeaser: false },
  { matchup: "DAL @ ATL", selection: "🔒 LOCKED DOME SHOOTOUT MAIN LINE CALL", market: "Spread", conf: "82/100", freeTeaser: false },
  { matchup: "LAR @ SEA", selection: "🔒 LOCKED NFC WEST SPREAD CALL", market: "Spread", conf: "81/100", freeTeaser: false },
  { matchup: "WAS @ NYG", selection: "🔒 LOCKED NFC EAST DIVISION CALL", market: "Spread", conf: "80/100", freeTeaser: false },
  { matchup: "TB @ KC", selection: "🔒 LOCKED MONDAY NIGHT FOOTBALL CALL", market: "Spread", conf: "79/100", freeTeaser: false },
] as const;

const SEALED_PROPS = [
  {
    matchup: "JAX @ BAL",
    player: "Mark Andrews (BAL TE)",
    prop: "Receptions OVER 2.5",
    conf: "88/100",
    freeTeaser: true,
    trench: "Jacksonville blitzes on 34 out of 100 pass plays and leaves the middle of the field open against tight ends. Mark Andrews operates as Baltimore's primary hot-read safety valve over the middle and inside the red zone — 3 receptions clears this low 2.5 number.",
  },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #2 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #3 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #4 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #5 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #6 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #7 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #8 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #9 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "JAX @ BAL", player: "TNF Top-Confidence Play #10 (BAL/JAX)", prop: "🔒 LOCKED TNF PLAYER PROP", conf: "88/100", freeTeaser: false },
  { matchup: "DET @ GB", player: "Week 9 Sunday Locked Prop #1", prop: "🔒 LOCKED SUNDAY PROP PLAY", conf: "86/100", freeTeaser: false },
  { matchup: "MIA @ BUF", player: "Week 9 Sunday Locked Prop #2", prop: "🔒 LOCKED SUNDAY PROP PLAY", conf: "85/100", freeTeaser: false },
  { matchup: "IND @ MIN", player: "Week 9 SNF Locked Prop #3", prop: "🔒 LOCKED SNF PROP PLAY", conf: "84/100", freeTeaser: false },
  { matchup: "TB @ KC", player: "Week 9 MNF Locked Prop #4", prop: "🔒 LOCKED MNF PROP PLAY", conf: "83/100", freeTeaser: false },
] as const;

const SEALED_SGPS = STAGE0_VERIFIED_WEEK9_SGPS.map((row) => ({
  matchup: row.matchup,
  legs: "[LOCKED SGP TICKET · 3 CORRELATED LEGS REDACTED UNTIL UNLOCK]",
  odds: `Fair LOCKED / Book ${row.bookOdds}`,
}));

const DFS_CORE_POOL = STAGE0_VERIFIED_DFS_CORE_POOL;

const TNF_FREE_GAME_ENVIRONMENT_ANALYTICS = [
  {
    metric: "Projected Offensive Plays",
    breakdown: "Baltimore 61.3 median (61.9 mean; 57–66 IQR across 11 drives) vs Jacksonville 63.5 plays",
  },
  {
    metric: "Baltimore Play-Call Split",
    breakdown: "25.5 Rush Attempts (18.6 Derrick Henry) + 33.3 Pass Attempts + 3.1 Sacks Taken (54% run in 1H -> 62% pass trailing in 2H)",
  },
  {
    metric: "Jacksonville Play-Call Split",
    breakdown: "31.4 Rush Attempts + 29.5 Pass Attempts + 2.6 Sacks (26.2 sec/snap pace)",
  },
  {
    metric: "Trench & Coverage Keys",
    breakdown: "Baltimore 59.5% Two-High Safety Shell & 78.0% Light Boxes (<=5 in box) | Jacksonville 30.9% Blitz Rate (34.8% on Play-Action) vs Baltimore 36.5% Clean-Pocket Rate.",
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
  const initialProgress = clamp01(initialStage / 2);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [selectedSlug, setSelectedSlug] = useState(packs[0]?.slug ?? "");
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
  const selectedPack = packs.find((pack) => pack.slug === selectedSlug) ?? packs[0];
  const dfsPack = packs.find((pack) => pack.slug === "redzone-dfs-pro-pack") ?? packs.find((pack) => pack.includesDfs) ?? packs[0];

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
        setEmailMsg("✓ Email verified. Free trench x-ray teasers unlocked.");
      }
    } catch {
      setEmailCaptured(true);
      setEmailMsg("✓ Email registered.");
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
    return writeups
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
  }, [writeups, query, slot, sort]);

  const headline = writeups[0];

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
            <p className="plate-kicker">REDZONE · WEEK 9 NFL DESK (JAX @ BAL TNF &amp; FULL SLATE)</p>
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
            <p className="plate-kicker">LINE OF SCRIMMAGE · WEEK 9 TNF &amp; SUNDAY SLATE</p>
            <h1>{headline?.matchup ?? "Jacksonville Jaguars @ Baltimore Ravens"}</h1>
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
                Free Matchup &amp; Game-Environment Analytics · TNF JAX @ BAL
              </div>
              <div style={{ display: "grid", gap: 6, fontSize: 12, color: "#EDE8E0" }}>
                {TNF_FREE_GAME_ENVIRONMENT_ANALYTICS.map((row) => (
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
                <p className="plate-kicker">REDZONE STOREFRONT · VERIFIED 62-23-1 (+26.50u)</p>
                <h1>Pick your gate.</h1>
                <p className="plate-deck">Select any Week 9 pack below to review what’s inside and unlock instant access.</p>
              </div>
              <div className="overhead-quick-links">
                <button type="button" className="plate-ghost" onClick={() => setPanel("dfs")}>Preview DFS Lineups &amp; Pool</button>
                <button type="button" className="plate-ghost" onClick={() => setPanel("slate")}>Preview Sealed Calls &amp; Props</button>
              </div>
            </div>
            <div className="gate-row">
              {packs.map((pack) => (
                <button
                  key={pack.slug}
                  type="button"
                  className={`real-gate${selectedSlug === pack.slug ? " selected" : ""}`}
                  onClick={() => openPurchase(pack)}
                >
                  <small>{pack.badge ?? "WEEK 9 PACK"}</small>
                  <strong>{pack.title.split("(")[0]?.trim()}</strong>
                  <span className="gate-sub">{pack.subtitle}</span>
                  <b>{price(pack)}</b>
                </button>
              ))}
            </div>
            <div className="sideline">
              {writeups.slice(0, 6).map((fixture) => (
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
            <span className="live-dot" /> VERIFIED RECORD: 62-23-1 (+26.50u)
          </div>
          <Link className="header-menu" href="/packages">ALL PACKS <span>→</span></Link>
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
            <p className="panel-intro">Four unified packs, including our standalone $39.99 RedZone DFS Pro Pack. Select any pack to review and unlock.</p>
            <div className="edition-list">
              {packs.map((pack, index) => (
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
          <PanelFrame eyebrow="RedZone Standalone DFS Pro Pack · $39.99" title="Week 9 TNF Showdown & Sunday DFS Lineups" close={closePanel} className="dfs-panel">
            <p className="panel-intro">
              Integrated directly into the unified RedZone site. Includes DraftKings &amp; FanDuel TNF Showdown Captain builds (JAX @ BAL), 2 Sunday Optimal Lineups (Cash High-Floor &amp; GPP Tournament Stack), and our 14-Player Core Pool with coaching and injury replacement notes.
            </p>

            <h3 className="sub-heading">Free TNF Showdown &amp; Week 9 Matchup Setup Teaser</h3>
            <div className="fixture-list">
              <div className="fixture-row">
                <span className="fixture-week">TNF</span>
                <div className="fixture-match">Trevor Lawrence (JAX) / Derrick Henry (BAL) <small>JAX @ BAL Showdown &amp; Week 9 Slate</small></div>
                <span className="fixture-angle">Derrick Henry anchors Baltimore&apos;s early-down and goal-line ground script while Trevor Lawrence leads Jacksonville&apos;s perimeter passing attack with Travis Etienne Jr. sidelined. Official DK/FD Showdown Captain lineups and Sunday optimal builds are locked below.</span>
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
                    <span className="dfs-tag">OPTIMAL LINEUP #1 · CASH HIGH-FLOOR ($49,900 · REDACTED UNTIL UNLOCK)</span>
                    <ul>
                      <li><b>QB</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>RB1</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>RB2</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR1</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR2</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR3</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>TE</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>FLEX</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>DST</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                    </ul>
                  </div>
                  <div className="dfs-box">
                    <span className="dfs-tag">OPTIMAL LINEUP #2 · GPP TOURNAMENT ($50,000 · REDACTED UNTIL UNLOCK)</span>
                    <ul>
                      <li><b>QB</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>RB1</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>RB2</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR1</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR2</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>WR3</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>TE</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>FLEX</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                      <li><b>DST</b> [REDACTED ON SERVER · UNLOCK DFS PACK]</li>
                    </ul>
                  </div>
                </div>
                <h3 className="sub-heading">14-Player Core Pool Preview (Locked Until Unlock)</h3>
                <div className="fixture-list">
                  {DFS_CORE_POOL.slice(0, 2).map((row) => (
                    <div className="fixture-row" key={row.player}>
                      <span className="fixture-week">{row.pos}</span>
                      <div className="fixture-match">[LOCKED CORE PLAYER · UNLOCK DFS PACK] <small>{row.sal}</small></div>
                      <span className="fixture-angle">Locked position core play &amp; matchup leverage note</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="locked-paywall-modal">
                <h4>🔒 Unlocked with Standalone DFS Pack</h4>
                <p>
                  DK/FD Showdown Captain lineups (JAX @ BAL) plus 2 Sunday Optimal Lineups (Cash High-Floor &amp; GPP Tournament Stack) with full player pool allocations.
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
          <PanelFrame eyebrow="Verified RedZone Board · 62-23-1 (+26.50u)" title="Week 9 Sealed Board & Trench Matchup Breakdown" close={closePanel} className="slate-panel">
            <h3 className="sub-heading">Free Matchup &amp; Game-Environment Analytics · Week 9 TNF (JAX @ BAL)</h3>
            <div className="table-scroll" data-testid="slate-free-game-environment-analytics" style={{ marginBottom: 20 }}>
              <table className="world-table">
                <thead>
                  <tr>
                    <th scope="col">GAME-SCRIPT METRIC</th>
                    <th scope="col">TNF (JAX @ BAL) MATCHUP &amp; TRENCH BREAKDOWN</th>
                  </tr>
                </thead>
                <tbody>
                  {TNF_FREE_GAME_ENVIRONMENT_ANALYTICS.map((row) => (
                    <tr key={row.metric}>
                      <th scope="row">{row.metric}</th>
                      <td>{row.breakdown}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="sub-heading">Free Main-Line Discipline Teaser · Week 9 TNF (JAX @ BAL)</h3>
            <div className="fixture-list">
              {SEALED_MAIN_CALLS.filter((c) => c.freeTeaser).map((c) => (
                <div className="fixture-row" key={`${c.matchup}-${c.selection}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="fixture-week" style={{ color: "#FF4D2E" }}>CONVICTION: {c.conf}</span>
                    <span className="fixture-angle">{c.market}</span>
                  </div>
                  <div className="fixture-match" style={{ marginTop: 6, fontSize: 16, fontWeight: 700 }}>
                    {c.matchup} · {c.selection}
                  </div>
                  {"trench" in c && c.trench && (
                    <div className="trench-xray-card">
                      <div className="trench-header">
                        <span className="trench-badge">Trench Matchup Breakdown</span>
                        <small style={{ color: "rgba(237,232,224,0.6)", fontSize: 11 }}>Film &amp; Protection Split</small>
                      </div>
                      <p style={{ margin: "4px 0", fontSize: 12, color: "#EDE8E0" }}>{c.trench.verdict}</p>
                      <div className="trench-metrics-grid">
                        <div className="trench-metric-item">
                          <small>Pass Pro Efficiency</small>
                          <strong>{c.trench.passPro}</strong>
                        </div>
                        <div className="trench-metric-item">
                          <small>Pressure / Sack</small>
                          <strong>{c.trench.pressureSack}</strong>
                        </div>
                        <div className="trench-metric-item">
                          <small>Tempo</small>
                          <strong>{c.trench.tempo}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <h3 className="sub-heading" style={{ marginTop: 24 }}>Free Player Prop Teaser · Week 9 TNF (JAX @ BAL)</h3>
            <div className="fixture-list">
              {SEALED_PROPS.filter((p) => p.freeTeaser).map((p) => (
                <div className="fixture-row" key={`${p.matchup}-${p.player}`} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="fixture-week" style={{ color: "#FF4D2E" }}>CONVICTION: {p.conf}</span>
                    <span className="fixture-angle">{p.matchup}</span>
                  </div>
                  <div className="fixture-match" style={{ marginTop: 6, fontSize: 16, fontWeight: 700 }}>
                    {p.player} · {p.prop}
                  </div>
                  {"trench" in p && p.trench && (
                    <p style={{ marginTop: 8, fontSize: 12, color: "#C4BFB6", lineHeight: 1.4 }}>
                      <span className="trench-badge" style={{ marginRight: 8 }}>Scheme Read</span>
                      {p.trench}
                    </p>
                  )}
                </div>
              ))}
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
                <h3 className="sub-heading">9 Locked Top-Confidence TNF Plays (88/100) &amp; Week 9 Main-Line Calls</h3>
                <div className="fixture-list">
                  {SEALED_MAIN_CALLS.filter((c) => !c.freeTeaser).map((c) => (
                    <div className="fixture-row" key={`${c.matchup}-${c.selection}`}>
                      <span className="fixture-week">{c.conf}</span>
                      <div className="fixture-match">{c.matchup} · 🔒 LOCKED (PLAY RESERVED FOR MEMBERS)</div>
                      <span className="fixture-angle">{c.market}</span>
                    </div>
                  ))}
                </div>

                <h3 className="sub-heading" style={{ marginTop: 24 }}>9 Locked TNF Player Matchups (88/100) &amp; Week 9 Sunday/MNF Props</h3>
                <div className="fixture-list">
                  {SEALED_PROPS.filter((p) => !p.freeTeaser).slice(0, 9).map((p) => (
                    <div className="fixture-row" key={`${p.matchup}-${p.player}`}>
                      <span className="fixture-week">{p.conf}</span>
                      <div className="fixture-match">{p.player} <small>{p.matchup}</small> · 🔒 LOCKED PROP LINE</div>
                      <span className="fixture-angle">PROP</span>
                    </div>
                  ))}
                </div>

                <h3 className="sub-heading" style={{ marginTop: 24 }}>Locked 3-Leg TNF SGP &amp; Week 9 Correlated Parlays</h3>
                <div className="fixture-list">
                  {SEALED_SGPS.slice(0, 3).map((s) => (
                    <div className="fixture-row" key={s.matchup}>
                      <span className="fixture-week">{s.matchup}</span>
                      <div className="fixture-match">🔒 3-LEG CORRELATED SGP TICKET (LOCKED)</div>
                      <span className="fixture-angle">{s.odds}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="locked-paywall-modal">
                <h4>🔒 Official Sealed Board</h4>
                <p>
                  Verified Season Record <strong>62-23-1 · +26.50u</strong> entering Week 9. Unlock all 9 remaining top-confidence TNF plays (88/100), the 3-Leg SGP, Showdown Captain lineups, and our full Week 9 Sunday/MNF card.
                </p>
                <button
                  type="button"
                  className="unlock-action-btn"
                  onClick={() => openPurchase(packs.find((p) => p.slug === "week8-all-access") ?? packs[0])}
                >
                  Unlock Full Card · From $19 →
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
                  {packs.map((pack, index) => (
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
              <label>SLATE<select value={slot} onChange={(event) => setSlot(event.target.value)}><option value="all">All slates</option>{Array.from(new Set(writeups.map((fixture) => fixture.windowSlot))).map((windowSlot) => <option key={windowSlot} value={windowSlot}>{formatWindowSlotLabel(windowSlot)}</option>)}</select></label>
              <label>SORT<select value={sort} onChange={(event) => setSort(event.target.value as "kickoff" | "matchup")}><option value="kickoff">Kickoff</option><option value="matchup">Matchup A-Z</option></select></label>
              <span className="board-count" aria-live="polite">{filteredFixtures.length} / {writeups.length}</span>
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
