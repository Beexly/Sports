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
  { matchup: "LAC @ LAR", selection: "LA Rams ML (-270)", market: "Moneyline", conf: "84/100" },
  { matchup: "LAC @ LAR", selection: "LA Rams -6.5 (-110)", market: "Spread", conf: "84/100" },
  { matchup: "LAC @ LAR", selection: "LAC Team Total UNDER 18.5 (-114)", market: "Derivative", conf: "83/100" },
  { matchup: "CLE @ PIT", selection: "Pittsburgh Steelers ML (-192)", market: "Moneyline", conf: "82/100" },
  { matchup: "CLE @ PIT", selection: "Pittsburgh Steelers -3.5 (-110)", market: "Spread", conf: "82/100" },
  { matchup: "LV @ NYJ", selection: "New York Jets ML (-122)", market: "Moneyline", conf: "81/100" },
  { matchup: "LV @ NYJ", selection: "New York Jets -1.5 (-110)", market: "Spread", conf: "81/100" },
  { matchup: "KC @ DEN", selection: "Kansas City Chiefs ML (-118)", market: "Moneyline", conf: "79/100" },
  { matchup: "KC @ DEN", selection: "Kansas City Chiefs -1.5 (-110)", market: "Spread", conf: "79/100" },
  { matchup: "ARI @ DAL", selection: "Arizona Cardinals +7.0 (-110)", market: "Spread", conf: "76/100" },
  { matchup: "CHI @ SEA", selection: "Chicago Bears ML (+142)", market: "Moneyline", conf: "74/100" },
] as const;

const SEALED_PROPS = [
  { matchup: "BAL @ BUF", player: "Devontez Walker (BAL)", prop: "Receiving Yards OVER 0.5", conf: "95/100" },
  { matchup: "MIN @ DET", player: "Sione Vaki (DET)", prop: "Rushing Yards OVER 4.5", conf: "92/100" },
  { matchup: "BAL @ BUF", player: "Ray Davis (BUF)", prop: "Rushing Yards OVER 4.5", conf: "90/100" },
  { matchup: "PHI @ WAS", player: "Dyami Brown (WAS)", prop: "Receiving Yards OVER 12.5", conf: "85/100" },
  { matchup: "NE @ MIA", player: "Jaylen Wright (MIA)", prop: "Rushing Attempts OVER 4.5", conf: "84/100" },
  { matchup: "TEN @ CIN", player: "Dohnte Meyers (CIN)", prop: "Receiving Yards OVER 13.5", conf: "82/100" },
  { matchup: "TEN @ CIN", player: "Drew Sample (CIN)", prop: "Receiving Yards OVER 7.5", conf: "81/100" },
  { matchup: "MIN @ DET", player: "Isaac TeSlaa (DET)", prop: "Receiving Yards OVER 17.5", conf: "81/100" },
  { matchup: "NE @ MIA", player: "Efton Chism III (NE)", prop: "Receiving Yards OVER 15.5", conf: "80/100" },
  { matchup: "KC @ DEN", player: "J.K. Dobbins (DEN)", prop: "Rushing Yards OVER 21.5", conf: "80/100" },
  { matchup: "LV @ NYJ", player: "Michael Mayer (LV)", prop: "Receptions OVER 2.5", conf: "79/100" },
  { matchup: "PHI @ WAS", player: "Treylon Burks (WAS)", prop: "Receiving Yards OVER 21.5", conf: "78/100" },
  { matchup: "CHI @ SEA", player: "Kalif Raymond (CHI)", prop: "Receiving Yards OVER 21.5", conf: "78/100" },
  { matchup: "ARI @ DAL", player: "Tyler Goodson (DAL)", prop: "Rushing Yards OVER 21.5", conf: "77/100" },
  { matchup: "ATL @ TB", player: "Jahan Dotson (ATL)", prop: "Receiving Yards OVER 21.5", conf: "77/100" },
  { matchup: "ATL @ TB", player: "Chris Godwin Jr. (TB)", prop: "Receptions OVER 3.5", conf: "76/100" },
  { matchup: "ARI @ DAL", player: "Jake Ferguson (DAL)", prop: "Receiving Yards OVER 14.5", conf: "75/100" },
  { matchup: "CLE @ PIT", player: "Quinshon Judkins (CLE)", prop: "Receptions OVER 1.5", conf: "74/100" },
] as const;

const SEALED_SGPS = [
  { matchup: "BAL @ BUF", legs: "Zay Flowers 70+ Rec Yds · James Cook III 75+ Rush+Rec Yds · Josh Allen Anytime Rush TD", odds: "Fair +252 / Book +340" },
  { matchup: "TEN @ CIN", legs: "CIN -11.5 · Tee Higgins 70+ Rec Yds · Samaje Perine Over 22.5 Rush Yds", odds: "Fair +214 / Book +290" },
  { matchup: "ARI @ DAL", legs: "ARI +7.0 · Jake Ferguson Over 14.5 Rec Yds · Kendrick Bourne (ARI) Over 3.5 Receptions", odds: "Fair +192 / Book +275" },
  { matchup: "MIN @ DET", legs: "Kyler Murray (MIN QB) Under 225.5 Pass Yds · Will Reichard Over 1.5 FGM · Isaac TeSlaa (DET) Over 17.5 Rec Yds", odds: "Fair +143 / Book +215" },
  { matchup: "LV @ NYJ", legs: "NYJ ML (-122) · Braelon Allen Anytime TD · Michael Mayer Over 2.5 Receptions", odds: "Fair +135 / Book +205" },
  { matchup: "CLE @ PIT", legs: "PIT -3.5 · Chris Boswell Over 1.5 FGM · Quinshon Judkins (CLE) Over 1.5 Receptions", odds: "Fair +175 / Book +245" },
  { matchup: "ATL @ TB", legs: "Chris Godwin Jr. Over 3.5 Receptions · Chris Godwin Jr. Over 30.5 Rec Yds · Jahan Dotson (ATL) Over 21.5 Rec Yds", odds: "Fair -120 / Book +120" },
  { matchup: "IND @ JAX", legs: "Trevor Lawrence Over 1.5 Pass TDs · Jakobi Meyers Over 35.5 Rec Yds · Chris Rodriguez Jr. Over 6.5 Rush Att", odds: "Fair +157 / Book +225" },
  { matchup: "LAC @ LAR", legs: "LA -6.5 · LAC Team Total Under 18.5 · Nate Landman Under 8.5 Tackles+Ast", odds: "Fair +114 / Book +175" },
  { matchup: "KC @ DEN", legs: "KC ML (-118) · Patrick Mahomes Over 225.5 Pass Yds · J.K. Dobbins (DEN) Over 21.5 Rush Yds", odds: "Fair +132 / Book +200" },
  { matchup: "NE @ MIA", legs: "Jaylen Wright Over 4.5 Rush Att · Jaylen Wright Over 14.5 Rush Yds · Efton Chism III (NE) Over 15.5 Rec Yds", odds: "Fair -159 / Book +100" },
  { matchup: "PHI @ WAS", legs: "Dyami Brown (WAS) Over 12.5 Rec Yds · Treylon Burks (WAS) Over 21.5 Rec Yds · Rachaad White (WAS) Anytime TD", odds: "Fair +107 / Book +160" },
  { matchup: "CHI @ SEA", legs: "CHI ML (+142) · Kalif Raymond (CHI) Over 21.5 Rec Yds · Rome Odunze (CHI) Over 2.5 Receptions", odds: "Fair +165 / Book +280" },
] as const;

const DFS_CORE_POOL = [
  { pos: "QB", player: "Josh Allen (BUF)", sal: "$7,700", proj: "30.06 pts", why: "#1 overall ceiling QB (45.76 p85) with goal-line rush TD equity in BAL@BUF." },
  { pos: "QB", player: "Dak Prescott (DAL)", sal: "$6,300", proj: "23.47 pts", why: "2A Cash Flagship QB1 in ARI@DAL dome shootout (Kyler Murray is on MIN; Jacoby Brissett starts for ARI)." },
  { pos: "RB", player: "James Cook III (BUF)", sal: "$7,900", proj: "26.04 pts", why: "44.61 p85 ceiling in BAL@BUF with high-leverage rush + checkdown usage." },
  { pos: "RB", player: "Bijan Robinson (ATL)", sal: "$8,000", proj: "25.80 pts", why: "+25.4 vacated yards via Sinkhorn reallocation with Brian Robinson Jr. OUT on ATL." },
  { pos: "RB", player: "Jaylen Warren (PIT)", sal: "$6,600", proj: "21.13 pts", why: "2A Cash RB1 vs CLE with 35.67 p85 ceiling and pass-game floor." },
  { pos: "RB", player: "Jonah Coleman (DEN)", sal: "$4,300", proj: "22.18 pts", why: "DEN Lead Active RB (Week 7 takeover + +32.8 yds Sinkhorn boost with RJ Harvey OUT)." },
  { pos: "WR", player: "Zay Flowers (BAL)", sal: "$7,200", proj: "27.98 pts", why: "#1 WR projection on the slate (43.45 p85) in BAL@BUF shootout." },
  { pos: "WR", player: "CeeDee Lamb (DAL)", sal: "$8,100", proj: "27.77 pts", why: "Alpha dome target share (43.82 p85) stacked with Dak Prescott vs ARI." },
  { pos: "WR", player: "Jaxon Smith-Njigba (SEA)", sal: "$9,100", proj: "25.36 pts", why: "2B GPP alpha bring-back (41.96 p85) in CHI@SEA stack." },
  { pos: "WR", player: "Tee Higgins (CIN)", sal: "$6,700", proj: "24.95 pts", why: "40.36 p85 ceiling + +4.1 rec yds Sinkhorn boost with Andrei Iosivas OUT." },
  { pos: "WR", player: "Wan'Dale Robinson (TEN)", sal: "$5,400", proj: "18.40 pts", why: "+19.5 vacated rec yds via Sinkhorn boost with Carnell Tate OUT on TEN." },
  { pos: "WR", player: "Chris Godwin Jr. (TB)", sal: "$6,100", proj: "17.90 pts", why: "+9.5 vacated rec yds via Sinkhorn boost with Emeka Egbuka OUT on TB." },
  { pos: "TE", player: "Dallas Goedert (PHI)", sal: "$4,700", proj: "25.29 pts", why: "Massive +50.0 rec yds Sinkhorn boost with DeVonta Smith & Dontayvion Wicks OUT (Jalen Hurts on IR; Tanner McKee active QB)." },
  { pos: "TE", player: "Greg Dulcich (MIA)", sal: "$3,200", proj: "10.15 pts", why: "2A Cash double-TE salary unlocker ($3,200) vs New England." },
  { pos: "DST", player: "Jets DST (NYJ)", sal: "$2,800", proj: "8.63 pts", why: "2A Cash DST ($2,800) with interior trench pressure vs Las Vegas." },
  { pos: "DST", player: "Falcons DST (ATL)", sal: "$2,500", proj: "6.23 pts", why: "2B GPP salary-Floor DST ($2,500) vs Tampa Bay (Emeka Egbuka OUT)." },
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
            <p className="plate-kicker">REDZONE · WEEK 8 NFL DESK</p>
            <h1>Leave the noise.<br /><em>Enter the field.</em></h1>
            <p>
              Plain-English NFL picks, player props, Same-Game Parlays, and Daily Fantasy lineups — all on one unified board.
            </p>
            <div className="plate-actions">
              <button type="button" className="plate-go" onClick={() => goProgress(0.5)}>Enter the field →</button>
              <button type="button" className="plate-ghost" onClick={() => goProgress(1)}>View packs</button>
            </div>
          </div>

          <div className="plate-copy plate-b" data-active={stage === 1} data-no-camera>
            <p className="plate-kicker">LINE OF SCRIMMAGE · WEEK 8</p>
            <h1>{headline?.matchup ?? "Week 8 NFL Slate"}</h1>
            <p>{headline ? sanitizePlainFootballText(headline.schemeMatchup.coverageShell) : "Official game calls, player props, Same-Game Parlays, and optimal DFS lineups."}</p>
            <div className="scrimmage-rule"><span>LINE OF SCRIMMAGE</span><b /></div>
            <div className="plate-actions">
              {headline && <button type="button" className="plate-ghost" onClick={() => openFixture(headline)}>Read matchup</button>}
              <button type="button" className="plate-ghost" onClick={() => setPanel("slate")}>View sealed board</button>
              <button type="button" className="plate-go" onClick={() => goProgress(1)}>Choose a pack →</button>
            </div>
          </div>

          <div className="overhead-board plate-c" data-active={stage === 2} data-no-camera>
            <div className="overhead-header">
              <div>
                <p className="plate-kicker">REDZONE STOREFRONT</p>
                <h1>Pick your gate.</h1>
                <p className="plate-deck">Select any pack below to review what’s inside and unlock instant access.</p>
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
                  <small>{pack.badge ?? "WEEK 8 PACK"}</small>
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
            <span className="live-dot" /> VERIFIED RECORD: 31-11 (+18.56u)
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
            <p className="panel-intro">Four unified packs — including our standalone $39.99 RedZone DFS Pro Pack. Select any pack to review and unlock.</p>
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
          <PanelFrame eyebrow="RedZone Standalone DFS Pro Pack · $39.99" title="Week 8 DFS Lineups & Pool" close={closePanel} className="dfs-panel">
            <p className="panel-intro">
              Integrated directly into the unified RedZone site. Includes 2 Optimal Lineups (Cash High-Floor &amp; GPP Tournament Stack), our 16-Player Core Pool with coaching/matchup writeups, and the full 588-Active-Player Pool (86 OUT/IR zeroed).
            </p>
            {dfsPack && (
              <div className="dfs-cta-bar">
                <div>
                  <strong>{dfsPack.title}</strong>
                  <span>Standalone One-Time Pass · Instant Unlock</span>
                </div>
                <button type="button" className="plate-go" onClick={() => openPurchase(dfsPack)}>
                  Unlock Standalone DFS — {price(dfsPack)} →
                </button>
              </div>
            )}
            <div className="dfs-lineup-grid">
              <div className="dfs-box">
                <span className="dfs-tag">OPTIMAL LINEUP #1 · 2A CASH FLAGSHIP ($49,900 · 191.55 MEAN PTS)</span>
                <ul>
                  <li><b>QB</b> Dak Prescott (DAL) — $6,300 (23.47 pts)</li>
                  <li><b>RB1</b> Jaylen Warren (PIT) — $6,600 (21.13 pts)</li>
                  <li><b>RB2</b> Jonah Coleman (DEN) — $4,300 (22.18 pts · RJ Harvey OUT boost)</li>
                  <li><b>WR1</b> CeeDee Lamb (DAL) — $8,100 (27.77 pts)</li>
                  <li><b>WR2</b> Zay Flowers (BAL) — $7,200 (27.98 pts)</li>
                  <li><b>WR3</b> Tee Higgins (CIN) — $6,700 (24.95 pts · Iosivas OUT boost)</li>
                  <li><b>TE</b> Dallas Goedert (PHI) — $4,700 (25.29 pts · Smith/Wicks OUT, Hurts IR)</li>
                  <li><b>FLEX</b> Greg Dulcich (MIA) — $3,200 (10.15 pts)</li>
                  <li><b>DST</b> Jets DST (NYJ) — $2,800 (8.63 pts)</li>
                </ul>
              </div>
              <div className="dfs-box">
                <span className="dfs-tag">OPTIMAL LINEUP #2 · 2B GPP TOURNAMENT ($50,000 · 286.54 P99 PTS)</span>
                <ul>
                  <li><b>QB</b> Caleb Williams (CHI) — $6,100 (18.12 pts)</li>
                  <li><b>RB1</b> James Cook III (BUF) — $7,900 (26.04 pts)</li>
                  <li><b>RB2</b> Jonah Coleman (DEN) — $4,300 (22.18 pts · RJ Harvey OUT boost)</li>
                  <li><b>WR1</b> Jaxon Smith-Njigba (SEA) — $9,100 (25.36 pts)</li>
                  <li><b>WR2</b> Zay Flowers (BAL) — $7,200 (27.98 pts)</li>
                  <li><b>WR3</b> Rome Odunze (CHI) — $4,600 (10.27 pts)</li>
                  <li><b>TE</b> Dallas Goedert (PHI) — $4,700 (25.29 pts · Smith/Wicks OUT, Hurts IR)</li>
                  <li><b>FLEX</b> Kalif Raymond (CHI) — $3,600 (7.88 pts)</li>
                  <li><b>DST</b> Falcons DST (ATL) — $2,500 (6.23 pts)</li>
                </ul>
              </div>
            </div>
            <h3 className="sub-heading">16-Player Core Pool (2 QB · 4 RB · 6 WR · 2 TE · 2 DST)</h3>
            <div className="fixture-list">
              {DFS_CORE_POOL.map((row) => (
                <div className="fixture-row" key={row.player}>
                  <span className="fixture-week">{row.pos}</span>
                  <div className="fixture-match">{row.player} <small>{row.sal} · {row.proj}</small></div>
                  <span className="fixture-angle">{row.why}</span>
                </div>
              ))}
            </div>
          </PanelFrame>
        )}

        {panel === "slate" && (
          <PanelFrame eyebrow="Week 8 Sealed RedZone Board · 31-11-0 (+18.56u)" title="11 Calls, 18 Props & 13 SGPs" close={closePanel} className="slate-panel">
            <h3 className="sub-heading">11 Official Main-Line &amp; Derivative Calls</h3>
            <div className="fixture-list">
              {SEALED_MAIN_CALLS.map((c) => (
                <div className="fixture-row" key={`${c.matchup}-${c.selection}`}>
                  <span className="fixture-week">{c.conf}</span>
                  <div className="fixture-match">{c.matchup} — {c.selection}</div>
                  <span className="fixture-angle">{c.market}</span>
                </div>
              ))}
            </div>
            <h3 className="sub-heading">18 Locked Player Props</h3>
            <div className="fixture-list">
              {SEALED_PROPS.map((p) => (
                <div className="fixture-row" key={`${p.matchup}-${p.player}`}>
                  <span className="fixture-week">{p.conf}</span>
                  <div className="fixture-match">{p.player} <small>{p.matchup}</small></div>
                  <span className="fixture-angle">{p.prop}</span>
                </div>
              ))}
            </div>
            <h3 className="sub-heading">13 Correlated Same-Game Parlays</h3>
            <div className="fixture-list">
              {SEALED_SGPS.map((s) => (
                <div className="fixture-row" key={s.matchup}>
                  <span className="fixture-week">{s.matchup}</span>
                  <div className="fixture-match">{s.legs}</div>
                  <span className="fixture-angle">{s.odds}</span>
                </div>
              ))}
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
            <div className="detail-focus">Coach&apos;s Mind Matchup Dossier</div>
            <p className="fixture-copy">{sanitizePlainFootballText(selectedFixture.schemeMatchup.coverageShell)}</p>
            <p className="fixture-copy mt-4">{sanitizePlainFootballText(selectedFixture.paceOfPlay.notes)}</p>
            <p className="panel-footnote">Official spread, total, props, and parlays unlock inside the RedZone packs.</p>
            <div className="detail-nav">
              <button type="button" className="subtle-action" onClick={() => setPanel("board")}>Back to all 13 matchups</button>
              <button type="button" className="plate-go" onClick={() => setPanel("packs")}>Unlock Pack →</button>
            </div>
          </PanelFrame>
        )}

        {panel === "board" && (
          <PanelFrame eyebrow="Week 8 · All 13 Matchup Dossiers" title="The field board" close={closePanel} className="board-panel">
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
