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

type Panel = "packs" | "compare" | "board" | "detail" | "purchase" | null;
type Stage = 0 | 1 | 2;

interface RedlineWorldProps {
  packs: PickPackageOffering[];
  writeups: CoachGameWriteup[];
  initialStage?: Stage;
  initialPanel?: Panel;
}

interface CameraKey {
  at: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  scale: number;
}

// One field camera, scrubbed along a 0..1 journey. Three stations: level
// field, the push to the line, and the overhead vista. Stations 0 and 1 keep
// the shipped camera vectors verbatim; station 2 replaces the retired
// wireframe overhead (translate 0/1800/900, rotateX 90) because a 90-degree
// tilt rotates the flat photograph edge-on and the field disappears.
const CAMERA_KEYS: CameraKey[] = [
  { at: 0, x: 0, y: 0, z: 0, rx: 8, scale: 1.03 },
  { at: 0.5, x: 0, y: 32, z: -330, rx: 9, scale: 1.12 },
  { at: 1, x: 0, y: 168, z: -420, rx: 16, scale: 1.28 },
];

const WHEEL_STEP = 0.0016; // progress gained per pixel of wheel deltaY
const DRAG_RANGE = 520; // pixels of drag for one full journey

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function stageFromProgress(progress: number): Stage {
  return Math.round(clamp01(progress) * 2) as Stage;
}

/** Interpolate the camera transform across CAMERA_KEYS for any 0..1 progress. */
function cameraTransformAt(progress: number): string {
  const p = clamp01(progress);
  let from: CameraKey = CAMERA_KEYS[0] ?? { at: 0, x: 0, y: 0, z: 0, rx: 8, scale: 1.03 };
  let to: CameraKey = CAMERA_KEYS[CAMERA_KEYS.length - 1] ?? from;
  for (let i = 0; i < CAMERA_KEYS.length - 1; i += 1) {
    const a = CAMERA_KEYS[i];
    const b = CAMERA_KEYS[i + 1];
    if (a && b && p >= a.at && p <= b.at) {
      from = a;
      to = b;
      break;
    }
  }
  const span = to.at - from.at || 1;
  const t = clamp01((p - from.at) / span);
  const mix = (a: number, b: number) => a + (b - a) * t;
  return [
    `translate3d(${mix(from.x, to.x).toFixed(2)}px, ${mix(from.y, to.y).toFixed(2)}px, ${mix(from.z, to.z).toFixed(2)}px)`,
    `rotateX(${mix(from.rx, to.rx).toFixed(2)}deg)`,
    `scale(${mix(from.scale, to.scale).toFixed(3)})`,
  ].join(" ");
}

function price(pack: PickPackageOffering): string {
  return `$${(pack.standardPriceCents / 100).toFixed(0)}`;
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
  const worldCameraRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const loopRef = useRef<(() => void) | null>(null);
  const progressRef = useRef(initialProgress); // target
  const renderedRef = useRef(initialProgress); // eased value that drives the DOM
  const stageRef = useRef<Stage>(initialStage);
  const staticMode = userStatic || systemReduced;
  const selectedPack = packs.find((pack) => pack.slug === selectedSlug) ?? packs[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The scrub loop. Ease the rendered value toward the target every frame and
  // write the interpolated camera transform (plus --scrub, which drives the
  // copy cross-fade) straight to the DOM, so the field glides continuously
  // instead of snapping between screens.
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const target = progressRef.current;
      const current = renderedRef.current;
      const next = current + (target - current) * 0.16;
      const settled = Math.abs(target - next) < 0.0004;
      renderedRef.current = settled ? target : next;
      const value = renderedRef.current;
      const transform = cameraTransformAt(value);
      if (rootRef.current) rootRef.current.style.setProperty("--scrub", value.toFixed(4));
      if (cameraRef.current) cameraRef.current.style.transform = transform;
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

  // Eased motion for wheel, drag, and the "scroll the field" affordance.
  const goProgress = useCallback((value: number) => {
    progressRef.current = clamp01(value);
    loopRef.current?.();
  }, []);

  // 1:1 motion for the scrubber so the thumb tracks the pointer exactly.
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
    if (Math.abs(event.deltaY) < 2 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    goProgress(progressRef.current + event.deltaY * WHEEL_STEP);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isCameraTarget(event.target as HTMLElement)) return;
    pointer.current = { x: event.clientX, y: event.clientY, start: progressRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    // Drag up advances the field, drag down rewinds it, mapped continuously
    // (one full journey per DRAG_RANGE pixels) instead of a step per gesture.
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
          <div className="plate-camera" ref={cameraRef} aria-hidden="true" />
          <div className="plate-copy plate-a" data-active={stage === 0} data-no-camera>
            <p className="plate-kicker">This week · NFL desk</p>
            <h1>Leave the noise.<br /><em>Enter the field.</em></h1>
            <p>Plain-English NFL picks, props, and parlays. Three packs. One slate. The official calls stay locked until you buy.</p>
            <div className="plate-actions">
              <button type="button" className="plate-go" onClick={() => goProgress(0.5)}>Scroll the field →</button>
              <Link className="plate-ghost" href="/packages">See the packs</Link>
            </div>
          </div>
          <div className="plate-copy plate-b" data-active={stage === 1} data-no-camera>
            <p className="plate-kicker">This week's slate</p>
            <h1>{headline?.matchup ?? "The slate is loading"}</h1>
            <p>{headline ? sanitizePlainFootballText(headline.schemeMatchup.coverageShell) : "Official spread, total, props, and parlays open inside the pack you buy."}</p>
            <div className="scrimmage-rule"><span>LINE OF SCRIMMAGE</span><b /></div>
            <div className="plate-actions">
              {headline && <button type="button" className="plate-ghost" onClick={() => openFixture(headline)}>Read the matchup</button>}
              <Link className="plate-go" href="/packages">Choose a pack →</Link>
            </div>
          </div>
          <div className="overhead-board plate-c" data-active={stage === 2} data-no-camera>
            <p className="plate-kicker">Pick your pack</p>
            <h1>Pick your gate.</h1>
            <p className="plate-deck">The field is the store. Tap a gate to review the pack and unlock it.</p>
            <div className="gate-row">
              {packs.map((pack, index) => (
                <button
                  key={pack.slug}
                  type="button"
                  className={`real-gate${selectedSlug === pack.slug ? " selected" : ""}`}
                  onClick={() => openPurchase(pack)}
                >
                  <small>0{index + 1}</small>
                  <strong>{pack.title.split("(")[0]?.trim()}</strong>
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
              <div className="tunnel-floor" />
              <div className="tunnel-ceiling" />
              <div className="tunnel-wall tunnel-wall-left" />
              <div className="tunnel-wall tunnel-wall-right" />
              <div className="tunnel-rib rib-a" />
              <div className="tunnel-rib rib-b" />
              <div className="tunnel-rib rib-c" />
              <div className="portal-field">
                <span className="portal-zone">THE FIELD</span>
                <i /><i /><i /><i /><b />
                <span className="portal-tag">YARD / 50</span>
              </div>
              <div className="tunnel-aperture">
                <span>THE FIELD</span><span>GSE / NFL</span>
              </div>
              <div className="tunnel-side-mark">
                GALAXY SPORTS EDGE <b>·</b> REDLINE LEDGER
              </div>
            </div>
            <div className="stadium-bowl" aria-hidden="true">
              <div className="bowl-ring ring-outer" />
              <div className="bowl-ring ring-middle" />
              <div className="bowl-ring ring-inner" />
              <div className="bowl-stand stand-far" />
              <div className="bowl-stand stand-near" />
              <div className="stadium-ribbon ribbon-far" />
              <div className="stadium-ribbon ribbon-near" />
            </div>
            <div className="field-plane" aria-label="Interactive football field">
              <div className="endzone endzone-far">REDLINE LEDGER</div>
              {Array.from({ length: 9 }, (_, index) => (
                <div
                  className="yard-line"
                  key={index}
                  style={{ "--yard": `${(index + 1) * 10}%` } as CSSProperties}
                >
                  <span>{index < 4 ? (index + 1) * 10 : 50 - (index - 4) * 10}</span>
                </div>
              ))}
              <div className="hash-row hash-left" />
              <div className="hash-row hash-right" />
              <div className="scrimmage-line"><span>LINE OF SCRIMMAGE</span></div>
              <div className="line-to-gain"><span>LINE TO GAIN</span></div>
              <div className="midfield-mark">GSE</div>
              <div className="endzone endzone-near">CHOOSE YOUR PACK</div>
              {packs.map((pack, index) => (
                <div
                  className={`field-gate-anchor field-gate-${index + 1}`}
                  key={pack.slug}
                  style={{ "--gate-y": `${-66 + index * 66}px` } as CSSProperties}
                >
                  <button
                    type="button"
                    className={`gate${selectedSlug === pack.slug ? " gate-selected" : ""}`}
                    onClick={() => openPurchase(pack)}
                    aria-label={`Select ${pack.title}, ${price(pack)}`}
                  >
                    <span className="gate-num">0{index + 1}</span>
                    <span className="gate-name">{pack.title}</span>
                    <strong>{price(pack)}</strong>
                    <small>{packScope(pack)}</small>
                  </button>
                </div>
              ))}
              <div className="fixture-marker-grid" aria-label="Matchup locations">
                {writeups.slice(0, 8).map((fixture, index) => (
                  <button
                    type="button"
                    key={fixture.id}
                    className="fixture-marker"
                    style={{
                      left: `${13 + (index % 4) * 24}%`,
                      top: `${24 + Math.floor(index / 4) * 44}%`,
                    }}
                    onClick={() => openFixture(fixture)}
                    aria-label={`Open ${fixture.matchup}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="portal-window" aria-hidden="true">
          <div className="portal-frame-top" />
          <div className="portal-frame-left" />
          <div className="portal-frame-right" />
          <div className="portal-ground">
            {Array.from({ length: 9 }, (_, index) => (
              <i key={index} style={{ "--line-pos": `${(index + 1) * 10}%` } as CSSProperties} />
            ))}
            <b className="portal-scrimmage" />
            <span className="portal-distance">50</span>
          </div>
          <div className="portal-window-label"><span>FIELD / NFL</span><span>GSE</span></div>
        </div>
        <div className="world-vignette" aria-hidden="true" />
        <header className="world-header">
          <Link className="brand-lockup" href="/" aria-label="Galaxy Sports Edge home">
            <span className="brand-mark">G<span>/</span></span>
            <span className="brand-name">GALAXY SPORTS EDGE<small>REDZONE · NFL DESK</small></span>
          </Link>
          <div className="header-state"><span className="live-dot" /> THIS WEEK <b>·</b> {packs.length} PACKS</div>
          <Link className="header-menu" href="/packages">ALL PACKS <span>→</span></Link>
        </header>
        <div className="world-controls" data-no-camera>
          <span className="scrub-label">FIELD</span>
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
        <div className="world-actions" data-no-camera>
          <button type="button" onClick={() => setPanel(panel === "packs" ? null : "packs")} className={panel === "packs" ? "chosen" : ""}>
            PACKS <span>{String(packs.length).padStart(2, "0")}</span>
          </button>
          <button type="button" onClick={() => setPanel("board")} className={panel === "board" || panel === "detail" ? "chosen" : ""}>
            MATCHUPS <span>{String(writeups.length).padStart(2, "0")}</span>
          </button>
          <button type="button" onClick={() => setPanel("compare")} className={panel === "compare" ? "chosen" : ""}>
            COMPARE <span>→</span>
          </button>
        </div>
        <div className="world-hint" aria-hidden="true">
          {staticMode ? "FIELD HELD STILL · MOTION REDUCED" : "SCROLL / DRAG TO MOVE THROUGH THE FIELD"}
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
          <PanelFrame eyebrow="Paid packs · one-time purchase" title="Choose your pack" close={closePanel} className="pack-panel">
            <p className="panel-intro">Select a field gate to review the pack and unlock its official picks.</p>
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
            <div className="detail-focus">Free matchup preview</div>
            <p className="fixture-copy">{sanitizePlainFootballText(selectedFixture.schemeMatchup.coverageShell)}</p>
            <p className="fixture-copy mt-4">{sanitizePlainFootballText(selectedFixture.paceOfPlay.notes)}</p>
            <p className="panel-footnote">Official spread, total, props, and parlays stay inside the packs.</p>
            <div className="detail-nav">
              <button type="button" className="subtle-action" onClick={() => setPanel("board")}>Back to matchups</button>
            </div>
          </PanelFrame>
        )}

        {panel === "board" && (
          <PanelFrame eyebrow="This week · free previews" title="The field board" close={closePanel} className="board-panel">
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
