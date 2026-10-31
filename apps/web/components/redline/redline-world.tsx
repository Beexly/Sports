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

const STAGE_NAMES = ["TUNNEL", "LINE OF SCRIMMAGE", "OVERHEAD"] as const;

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
  const [stage, setStage] = useState<Stage>(initialStage);
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [selectedSlug, setSelectedSlug] = useState(packs[0]?.slug ?? "");
  const [selectedFixture, setSelectedFixture] = useState<CoachGameWriteup | null>(null);
  const [userStatic, setUserStatic] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [query, setQuery] = useState("");
  const [slot, setSlot] = useState("all");
  const [sort, setSort] = useState<"kickoff" | "matchup">("kickoff");
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const staticMode = userStatic || systemReduced;
  const selectedPack = packs.find((pack) => pack.slug === selectedSlug) ?? packs[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const goStage = useCallback((value: number) => {
    setStage(Math.max(0, Math.min(2, value)) as Stage);
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
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      goStage(stage + (event.deltaY > 0 ? 1 : -1));
    }
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isCameraTarget(event.target as HTMLElement)) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointer.current) return;
    const dy = pointer.current.y - event.clientY;
    if (Math.abs(dy) > 42) {
      goStage(stage + (dy > 0 ? 1 : -1));
      pointer.current = { x: event.clientX, y: event.clientY };
    }
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

  const cameraTransform = staticMode
    ? "translate3d(0px, 1800px, 900px) rotateX(90deg)"
    : [
        "translate3d(0px, 0px, 0px) rotateX(8deg)",
        "translate3d(0px, 32px, -330px) rotateX(9deg)",
        "translate3d(0px, 1800px, 900px) rotateX(90deg)",
      ][stage];

  return (
    <main
      id="main-content"
      data-testid="redline-world"
      className={`gse-world stage-active-${stage}${staticMode ? " is-static" : ""}`}
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
        aria-label="Interactive three-dimensional football stadium"
      >
        <div className="world-photograph" aria-hidden="true" />
        <section className={`stage-plate stage-plate-${stage}`} aria-label={STAGE_NAMES[stage]}>
          {stage === 0 && (
            <div className="plate-copy" data-no-camera>
              <p className="plate-kicker">Camera 01 · Tunnel</p>
              <h1>Leave the noise.<br /><em>Enter the field.</em></h1>
              <p>Plain-English NFL picks, props, and parlays. Three packs. One slate. The official calls stay locked until you buy.</p>
              <div className="plate-actions">
                <button type="button" className="plate-go" onClick={() => goStage(1)}>Walk to the line →</button>
                <button type="button" className="plate-ghost" onClick={() => { goStage(2); setPanel("packs"); }}>See the packs</button>
              </div>
            </div>
          )}
          {stage === 1 && (
            <div className="plate-copy" data-no-camera>
              <p className="plate-kicker">Camera 02 · Line of scrimmage</p>
              <h1>{writeups[0]?.matchup ?? "This week's slate"}</h1>
              <p>{writeups[0] ? sanitizePlainFootballText(writeups[0].schemeMatchup.coverageShell) : "Official spread, total, props, and parlays open inside the pack you buy."}</p>
              <div className="scrimmage-rule"><span>LINE OF SCRIMMAGE</span><b /></div>
              <div className="plate-actions">
                {writeups[0] && <button type="button" className="plate-ghost" onClick={() => openFixture(writeups[0])}>Read the matchup</button>}
                <button type="button" className="plate-go" onClick={() => goStage(2)}>Choose a gate →</button>
              </div>
            </div>
          )}
          {stage === 2 && (
            <div className="overhead-board" data-no-camera>
              <p className="plate-kicker">Camera 03 · Overhead</p>
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
          )}
        </section>
        <div className="world-camera" style={{ transform: cameraTransform }}>
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
          <Link className="header-menu" href="/fantasy/dfs">DFS OPTIMIZER <span>→</span></Link>
        </header>
        <div className="world-caption" aria-live="polite">
          <span className="caption-index">CAMERA / 0{stage + 1}</span>
          <strong>{STAGE_NAMES[stage]}</strong>
          <span>
            {stage === 0
              ? "Leave the noise in the tunnel."
              : stage === 1
                ? "See the field. Read the decision."
                : "Select a pack gate or a matchup."}
          </span>
        </div>
        <div className="world-controls" data-no-camera>
          <div className="stage-buttons" role="group" aria-label="Camera stages">
            {STAGE_NAMES.map((name, index) => (
              <button
                type="button"
                key={name}
                className={stage === index ? "active" : ""}
                aria-pressed={stage === index}
                onClick={() => goStage(index)}
              >
                <span>0{index + 1}</span>{name}
              </button>
            ))}
          </div>
          <label className="journey-slider">
            <span className="sr-only">Camera journey position</span>
            <input
              aria-label="Camera journey position"
              type="range"
              min="0"
              max="2"
              step="1"
              value={stage}
              onChange={(event) => goStage(Number(event.target.value))}
            />
          </label>
          <button type="button" className="reset-camera" onClick={() => goStage(0)}>
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
          {staticMode ? "STATIC FIELD · MOTION REDUCED" : "SCROLL / DRAG TO MOVE THROUGH THE FIELD"}
        </div>
        <div className="touch-controls" data-no-camera>
          <button type="button" aria-label="Move camera back" onClick={() => goStage(stage - 1)}>−</button>
          <span>CAMERA</span>
          <button type="button" aria-label="Move camera forward" onClick={() => goStage(stage + 1)}>+</button>
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
