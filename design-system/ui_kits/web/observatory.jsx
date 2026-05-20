// PickPilot Observatory — navigable intelligence cosmos
// Three layers: Universe → Constellation → Solar System

const { useState, useEffect, useRef, useMemo } = React;

// ───────────────────────────────────────────────────────
// DATA
// ───────────────────────────────────────────────────────

const CONSTELLATIONS = [
  {
    id: 'nba', label: 'NBA', x: 22, y: 30, picks: 8, signals: 4, color: 'plasma',
    teaser: 'Heavy slate. Two elite plays surfaced — sharp money is split.',
    matchups: [
      { id: 'm1', away: 'Boston Celtics',  home: 'Los Angeles Lakers', sel: 'Celtics −4.5', edge: 72, conf: 87, risk: 'MOD', grade: 'elite',
        reason: 'Sharp money on Boston since open · 3-book consensus · Lakers without LeBron — pace slows 4.2 poss.', x: 30, y: 35 },
      { id: 'm2', away: 'Miami Heat',      home: 'Golden State Warriors', sel: 'Under 217.5', edge: 58, conf: 79, risk: 'LOW', grade: 'strong',
        reason: 'Both bottom-10 in pace · GSW shooting cold L5 · public 71% on the over.', x: 65, y: 28 },
      { id: 'm3', away: 'Milwaukee Bucks', home: 'Denver Nuggets', sel: 'Bucks ML +120', edge: 44, conf: 64, risk: 'HIGH', grade: 'solid',
        reason: 'Value on the road dog · model edge survives variance · injuries thin in DEN frontcourt.', x: 70, y: 65 },
      { id: 'm4', away: 'Phoenix Suns',    home: 'Brooklyn Nets', sel: 'Suns −7', edge: 38, conf: 58, risk: 'MOD', grade: 'lean',
        reason: 'Slight model lean · BKN on back-to-back · marginal.', x: 30, y: 70 },
    ]
  },
  {
    id: 'nfl', label: 'NFL', x: 62, y: 22, picks: 3, signals: 2, color: 'ion',
    teaser: 'Light slate. Weather plays the protagonist — wind under at Baltimore.',
    matchups: [
      { id: 'n1', away: 'Kansas City Chiefs', home: 'Baltimore Ravens', sel: 'Under 47.5', edge: 58, conf: 81, risk: 'LOW', grade: 'strong',
        reason: 'Weather model · 14 mph crosswind, 38°F · both QBs trending under season avg.', x: 30, y: 35 },
      { id: 'n2', away: 'Buffalo Bills', home: 'New England Patriots', sel: 'Bills −9.5', edge: 51, conf: 73, risk: 'MOD', grade: 'strong',
        reason: 'BUF revenge spot · NE on short week without starting QB.', x: 65, y: 50 },
      { id: 'n3', away: 'Dallas Cowboys', home: 'New York Giants', sel: 'Cowboys ML', edge: 32, conf: 61, risk: 'MOD', grade: 'lean',
        reason: 'Division dog catches a break — marginal model lean.', x: 35, y: 70 },
    ]
  },
  {
    id: 'nhl', label: 'NHL', x: 80, y: 50, picks: 5, signals: 1, color: 'uv',
    teaser: 'Five picks. Goaltending is the story tonight.',
    matchups: [
      { id: 'h1', away: 'Toronto Maple Leafs', home: 'New York Rangers', sel: 'Rangers ML −135', edge: 44, conf: 71, risk: 'MOD', grade: 'solid',
        reason: 'Shesterkin trending · TOR road struggles · model edge stable.', x: 35, y: 30 },
      { id: 'h2', away: 'Edmonton Oilers',    home: 'Vegas Golden Knights', sel: 'Over 6.5', edge: 38, conf: 65, risk: 'MOD', grade: 'solid',
        reason: 'Pace differential · both top-10 in xG · McDavid back from minor injury.', x: 62, y: 35 },
      { id: 'h3', away: 'Tampa Bay Lightning', home: 'Florida Panthers', sel: 'Panthers PL −1.5', edge: 41, conf: 67, risk: 'MOD', grade: 'solid',
        reason: 'Sharp action on the puck line · FLA at home plus rest edge.', x: 30, y: 65 },
    ]
  },
  {
    id: 'ncaaf', label: 'NCAAF', x: 50, y: 75, picks: 2, signals: 0, color: 'ion',
    teaser: 'Saturday slate brewing. Two early leans.',
    matchups: [
      { id: 'c1', away: 'Michigan',  home: 'Ohio State', sel: 'Under 54.5', edge: 36, conf: 64, risk: 'MOD', grade: 'lean',
        reason: 'Rivalry under spot · both top-15 defenses · weather mild.', x: 40, y: 40 },
      { id: 'c2', away: 'Alabama',   home: 'LSU',        sel: 'Alabama −3.5', edge: 32, conf: 58, risk: 'MOD', grade: 'lean',
        reason: 'Slight road model lean — line moved 1.5 from open.', x: 60, y: 55 },
    ]
  },
  {
    id: 'mlb', label: 'MLB', x: 14, y: 60, picks: 0, signals: 0, color: 'mineral',
    teaser: 'Offseason · no live signals.',
    matchups: []
  },
  {
    id: 'soccer', label: 'SOCCER', x: 86, y: 78, picks: 4, signals: 1, color: 'uv',
    teaser: 'EPL + UCL · model agreement strong on two derbies.',
    matchups: [
      { id: 's1', away: 'Manchester City', home: 'Arsenal', sel: 'Both Teams To Score', edge: 48, conf: 76, risk: 'LOW', grade: 'strong',
        reason: 'High xG matchup · both unbeaten at home in BTTS · sharp consensus.', x: 35, y: 35 },
      { id: 's2', away: 'Real Madrid',     home: 'Bayern Munich', sel: 'Over 2.5 goals', edge: 42, conf: 70, risk: 'MOD', grade: 'solid',
        reason: 'UCL knockout · model fav over in similar matchups (78%).', x: 62, y: 55 },
    ]
  },
];

const SPECIAL_NODES = [
  { id: 'pulse', label: 'MARKET PULSE', x: 50, y: 50, color: 'plasma',
    teaser: 'Live · 14 lines moved >1.5 pts in last 30 min.', stats: ['14 moves', '6 sharp', '24m ago'], live: true },
  { id: 'edge',  label: 'EDGE TRACKER', x: 88, y: 30, color: 'uv',
    teaser: 'Model vs market disagreement scanner.', stats: ['+11.4% ROI', 'L90', 'published'], live: false },
];

// ───────────────────────────────────────────────────────
// COMPONENTS
// ───────────────────────────────────────────────────────

function ReticleCursor() {
  const ref = useRef(null);
  const hoverRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    const onMove = (e) => {
      el.style.left = e.clientX + 'px';
      el.style.top  = e.clientY + 'px';
    };
    const onOver = (e) => {
      const isHover = e.target.closest('[data-hoverable]');
      if (isHover && !hoverRef.current) {
        hoverRef.current = true;
        el.classList.add('hover');
      } else if (!isHover && hoverRef.current) {
        hoverRef.current = false;
        el.classList.remove('hover');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);
  return (
    <div className="reticle" ref={ref}>
      <svg viewBox="0 0 32 32" fill="none" stroke="#FF2D8A" strokeWidth="1.2" strokeLinecap="round">
        <circle cx="16" cy="16" r="14"/>
        <circle cx="16" cy="16" r="6" opacity="0.5"/>
        <line x1="16" y1="0" x2="16" y2="6"/>
        <line x1="16" y1="26" x2="16" y2="32"/>
        <line x1="0" y1="16" x2="6" y2="16"/>
        <line x1="26" y1="16" x2="32" y2="16"/>
        <circle cx="16" cy="16" r="1.4" fill="#FF2D8A" stroke="none"/>
      </svg>
    </div>
  );
}

function Logo() {
  return (
    <span className="logo">
      PICKPIL<span className="ret"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="butt">
        <circle cx="24" cy="24" r="22"/>
        <circle cx="24" cy="24" r="12" opacity="0.5"/>
        <line x1="24" y1="-2" x2="24" y2="8"/>
        <line x1="24" y1="40" x2="24" y2="50"/>
        <line x1="-2" y1="24" x2="8" y2="24"/>
        <line x1="40" y1="24" x2="50" y2="24"/>
        <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>
      </svg></span>T
    </span>
  );
}

function HUD({ level, target, matchup, onBack, signalsCount, picksCount }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tstamp = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className="hud">
      <span className="bracket tl"/><span className="bracket tr"/>
      <span className="bracket bl"/><span className="bracket br"/>

      <div className="tl">
        <Logo />
        <span className="sep">/</span>
        <div className="crumb">
          <span className={"step " + (level === 'universe' ? 'active' : '')}>OBSERVATORY</span>
          {target && <span className="arrow">▸</span>}
          {target && <span className={"step " + (level === 'constellation' ? 'active' : '')}>{target.label}</span>}
          {matchup && <span className="arrow">▸</span>}
          {matchup && <span className="step active">{matchup.away.split(' ').pop()} · {matchup.home.split(' ').pop()}</span>}
        </div>
        {level !== 'universe' && (
          <button className="back" data-hoverable onClick={onBack}>◂ BACK</button>
        )}
      </div>

      <div className="tr">
        <span className="clock">{tstamp} ET</span>
        <span className="stamp">FRI · NOV 14 · 2026</span>
        <span className="live">LIVE · 30 MIN REFRESH</span>
      </div>

      <div className="bl">
        {level === 'universe' && <>
          <span className="lbl">NAVIGATE</span>
          <span className="hint">Click any constellation to enter. <em>Perspective, not picks.</em></span>
        </>}
        {level === 'constellation' && <>
          <span className="lbl">CONSTELLATION</span>
          <span className="hint">Each system is a matchup. Click to <em>open the solar system.</em></span>
        </>}
        {level === 'solar' && <>
          <span className="lbl">SOLAR SYSTEM</span>
          <span className="hint">Factors orbiting the pick. <em>You make the call.</em></span>
        </>}
      </div>

      <div className="br">
        <span className="stat">PICKS <span className="v p">{picksCount}</span></span>
        <span className="stat">SIGNALS <span className="v b">{signalsCount}</span></span>
        <span className="stat">L90 ROI <span className="v u">+11.4%</span></span>
      </div>
    </div>
  );
}

// ─── UNIVERSE LAYER ─────────────────────────────────────
function Universe({ onEnter }) {
  const [hover, setHover] = useState(null);
  const allNodes = useMemo(() => [
    ...CONSTELLATIONS.map(c => ({ ...c, kind: 'constellation' })),
    ...SPECIAL_NODES.map(n => ({ ...n, kind: 'special' })),
  ], []);

  return (
    <div className="universe">
      {allNodes.map(node => (
        <ConstellationNode
          key={node.id}
          node={node}
          onEnter={onEnter}
          onHover={setHover}
        />
      ))}
      {hover && <FloatingPreview node={hover} />}
    </div>
  );
}

function ConstellationNode({ node, onEnter, onHover }) {
  const { x, y, label, picks, signals, color, kind } = node;
  const colorMap = { plasma: '#FF2D8A', ion: '#4FA8FF', uv: '#9B7BFA', mineral: '#5E6878' };
  const c = colorMap[color] || colorMap.plasma;
  const dim = kind === 'constellation' && picks === 0;

  return (
    <div
      className={`constellation-node color-${color} ${dim ? 'dim' : ''}`}
      style={{ left: x + '%', top: y + '%' }}
      data-hoverable
      onMouseEnter={() => onHover(node)}
      onMouseLeave={() => onHover(null)}
      onClick={() => !dim && onEnter(node)}
    >
      <div className="meta">
        {kind === 'special'
          ? <>{node.stats.map((s,i) => <span key={i}>{s}{i<node.stats.length-1 ? ' · ' : ''}</span>)}</>
          : <>{picks} PICKS · <span className="v">{signals}</span> SIGNAL{signals !== 1 ? 'S' : ''}</>
        }
      </div>
      <svg className="orbit-svg" viewBox="0 0 220 220" fill="none">
        <defs>
          <radialGradient id={`g-${node.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c} stopOpacity="0.4"/>
            <stop offset="60%" stopColor={c} stopOpacity="0.06"/>
            <stop offset="100%" stopColor={c} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="110" cy="110" r="108" fill={`url(#g-${node.id})`}/>

        <g className="spin-slow" style={{ transformOrigin: '110px 110px' }}>
          <ellipse cx="110" cy="110" rx="95" ry="44" stroke={c} strokeWidth="1" fill="none" opacity="0.7" transform="rotate(-22 110 110)"/>
          <circle cx="200" cy="100" r="2.4" fill={c}/>
        </g>
        <g className="spin-mid" style={{ transformOrigin: '110px 110px' }}>
          <ellipse cx="110" cy="110" rx="72" ry="34" stroke={c} strokeWidth="0.8" fill="none" opacity="0.5" transform="rotate(15 110 110)"/>
          <circle cx="38" cy="118" r="2" fill={c}/>
        </g>
        <g className="spin-fast spin-rev" style={{ transformOrigin: '110px 110px' }}>
          <ellipse cx="110" cy="110" rx="48" ry="22" stroke={c} strokeWidth="0.6" fill="none" opacity="0.4"/>
          <circle cx="158" cy="110" r="1.8" fill={c}/>
        </g>

        {/* reticle core */}
        <g transform="translate(110 110)" stroke={c} strokeWidth="1.2" fill="none" opacity={dim ? 0.3 : 0.85}>
          <circle r="14"/>
          <circle r="6" opacity="0.5"/>
          <line x1="-22" y1="0" x2="-18" y2="0"/>
          <line x1="18" y1="0" x2="22" y2="0"/>
          <line x1="0" y1="-22" x2="0" y2="-18"/>
          <line x1="0" y1="18" x2="0" y2="22"/>
          {!dim && <circle r="2.4" fill={c}/>}
        </g>
      </svg>
      <div className="label">{label}</div>
    </div>
  );
}

function FloatingPreview({ node }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX + 24, y: e.clientY - 20 });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return (
    <div className="preview open" style={{ left: pos.x, top: pos.y }}>
      <div className="head">
        <span>{node.kind === 'special' ? 'SYSTEM' : 'CONSTELLATION'}</span>
        {node.live && <span className="live">LIVE</span>}
      </div>
      <h4>{node.label}</h4>
      <p>{node.teaser}</p>
      {node.kind !== 'special' && node.picks > 0 && (
        <div className="grid">
          <div className="c"><span className="l">PICKS</span><span className="v">{node.picks}</span></div>
          <div className="c"><span className="l">SIGNAL</span><span className="v">{node.signals}</span></div>
          <div className="c"><span className="l">ENTER</span><span className="v" style={{color:'var(--plasma)'}}>▸</span></div>
        </div>
      )}
    </div>
  );
}

// ─── CONSTELLATION LAYER ────────────────────────────────
function Constellation({ sport, onEnter }) {
  const colorMap = { plasma: '#FF2D8A', ion: '#4FA8FF', uv: '#9B7BFA', mineral: '#5E6878' };
  const c = colorMap[sport.color] || colorMap.plasma;

  return (
    <div className="constellation">
      {sport.matchups.length === 0 && (
        <div className="empty-state">
          <em>{sport.label}</em> is quiet right now.<br/>
          No picks generated for this sport today.
        </div>
      )}
      {sport.matchups.map(m => (
        <MatchupNode key={m.id} matchup={m} color={c} onEnter={onEnter} />
      ))}
    </div>
  );
}

function MatchupNode({ matchup, color, onEnter }) {
  const { x, y, away, home, grade, edge, conf } = matchup;
  return (
    <div
      className="matchup-node"
      style={{ left: x + '%', top: y + '%' }}
      data-hoverable
      onClick={() => onEnter(matchup)}
    >
      <span className={`m-tag ${grade}`}>★ {grade.toUpperCase()} · EDGE {edge} · {conf}%</span>
      <svg className="solar-svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <radialGradient id={`mg-${matchup.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.45"/>
            <stop offset="60%" stopColor={color} stopOpacity="0.08"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill={`url(#mg-${matchup.id})`}/>

        <g className="spin-slow" style={{ transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="86" ry="38" stroke={color} strokeWidth="0.8" fill="none" opacity="0.6" transform="rotate(-15 100 100)"/>
          <circle cx="180" cy="92" r="2.5" fill={color}/>
          <circle cx="22" cy="108" r="2" fill={color} opacity="0.7"/>
        </g>
        <g className="spin-mid spin-rev" style={{ transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="64" ry="30" stroke={color} strokeWidth="0.6" fill="none" opacity="0.45" transform="rotate(28 100 100)"/>
        </g>
        <g className="spin-fast" style={{ transformOrigin: '100px 100px' }}>
          <ellipse cx="100" cy="100" rx="40" ry="20" stroke={color} strokeWidth="0.5" fill="none" opacity="0.35"/>
        </g>

        <g transform="translate(100 100)" stroke={color} strokeWidth="1.3" fill="none">
          <circle r="14"/>
          <line x1="-22" y1="0" x2="-18" y2="0"/>
          <line x1="18" y1="0" x2="22" y2="0"/>
          <line x1="0" y1="-22" x2="0" y2="-18"/>
          <line x1="0" y1="18" x2="0" y2="22"/>
          <circle r="2" fill={color}/>
        </g>
      </svg>
      <div className="m-label">
        <span className="team">{away}</span>
        <span className="vs">AT</span>
        <span className="team">{home}</span>
      </div>
    </div>
  );
}

// ─── SOLAR SYSTEM LAYER ─────────────────────────────────
function SolarSystem({ matchup }) {
  // 6 factor planets orbiting the pick
  const factors = [
    { id: 'consensus', label: 'Market Consensus',  v: '+72',  pos: { x: 50, y: 12 }, kind: 'positive' },
    { id: 'sharp',     label: 'Sharp Money',       v: '+5.0 pts', pos: { x: 88, y: 32 }, kind: 'positive' },
    { id: 'pace',      label: 'Pace Differential', v: '−4.2 poss', pos: { x: 88, y: 68 }, kind: 'cool' },
    { id: 'model',     label: 'Model Agreement',   v: '93%',  pos: { x: 50, y: 88 }, kind: 'deep' },
    { id: 'public',    label: 'Public Sentiment',  v: '71% over', pos: { x: 12, y: 68 }, kind: 'alert' },
    { id: 'injury',    label: 'Injury Impact',     v: 'LeBron OUT', pos: { x: 12, y: 32 }, kind: 'cool' },
  ];

  return (
    <div className="solar">
      <div className="solar-stage">
        <svg viewBox="0 0 800 800" fill="none">
          <defs>
            <radialGradient id="sg" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#FF2D8A" stopOpacity="0.35"/>
              <stop offset="40%" stopColor="#9B7BFA" stopOpacity="0.12"/>
              <stop offset="100%" stopColor="#04060A" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="400" cy="400" r="380" fill="url(#sg)"/>
          <g className="spin-slow" style={{ transformOrigin: '400px 400px' }}>
            <circle cx="400" cy="400" r="340" stroke="#2E3849" strokeWidth="1" fill="none" strokeDasharray="3 6"/>
          </g>
          <g className="spin-mid spin-rev" style={{ transformOrigin: '400px 400px' }}>
            <circle cx="400" cy="400" r="260" stroke="#FF2D8A" strokeWidth="0.8" fill="none" opacity="0.5"/>
            <circle cx="660" cy="400" r="3" fill="#FF2D8A"/>
          </g>
          <g className="spin-fast" style={{ transformOrigin: '400px 400px' }}>
            <circle cx="400" cy="400" r="180" stroke="#4FA8FF" strokeWidth="0.6" fill="none" opacity="0.4"/>
          </g>
          <g className="spin-slow" style={{ transformOrigin: '400px 400px', animationDuration: '120s' }}>
            <circle cx="400" cy="400" r="105" stroke="#9B7BFA" strokeWidth="0.5" fill="none" opacity="0.35"/>
          </g>
          <g transform="translate(400 400)" stroke="#FF2D8A" strokeWidth="1.4" opacity="0.7" fill="none">
            <circle r="58"/>
            <line x1="-78" y1="0" x2="-62" y2="0"/>
            <line x1="62" y1="0" x2="78" y2="0"/>
            <line x1="0" y1="-78" x2="0" y2="-62"/>
            <line x1="0" y1="62" x2="0" y2="78"/>
          </g>
        </svg>
      </div>

      <div className="solar-center">
        <div className="pick-grade">★ ELITE PLAY · GRADE A</div>
        <h2 className="pick-sel">{matchup.sel.split(' ').slice(0,-1).join(' ')} <span className="line">{matchup.sel.split(' ').slice(-1)}</span></h2>
        <p className="pick-sub">{matchup.away} <em style={{color:'var(--ion-2)', fontStyle:'normal'}}>at</em> {matchup.home}</p>
        <div className="pick-conf">CONFIDENCE<span className="v">{matchup.conf}<span className="pct">%</span></span></div>
      </div>

      {factors.map(f => (
        <div key={f.id} className={`factor ${f.kind}`}
             style={{ left: f.pos.x + '%', top: f.pos.y + '%' }}
             data-hoverable>
          <div className="planet">{f.id === 'model' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/></svg> : null}</div>
          <div className="label">{f.label}</div>
          <div className="delta">{f.v}</div>
        </div>
      ))}

      <div className="solar-meta-l">
        <div>
          EDGE SCORE
          <div className="b p">{matchup.edge}</div>
        </div>
        <div>
          RISK
          <div className="b u">{matchup.risk}</div>
        </div>
        <div>
          DATA QUALITY
          <div className="b">HIGH</div>
        </div>
      </div>

      <div className="solar-meta-r">
        <div>
          GENERATED
          <div className="b">12 MIN AGO</div>
        </div>
        <div>
          NEXT REFRESH
          <div className="b i">14:42 ET</div>
        </div>
        <div>
          MODEL VERSION
          <div className="b">v4.2.1</div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ───────────────────────────────────────────────
function Observatory() {
  const [level, setLevel] = useState('universe');
  const [target, setTarget] = useState(null);   // selected constellation
  const [matchup, setMatchup] = useState(null); // selected matchup
  const [bgWord, setBgWord] = useState('SIGNAL');

  // pick a contextual background word per level
  useEffect(() => {
    if (level === 'universe') setBgWord('SIGNAL');
    else if (level === 'constellation') setBgWord(target ? target.label : 'SIGNAL');
    else if (level === 'solar') setBgWord('EDGE');
  }, [level, target]);

  const signalsCount = useMemo(() => CONSTELLATIONS.reduce((a,c) => a + c.signals, 0), []);
  const picksCount = useMemo(() => CONSTELLATIONS.reduce((a,c) => a + c.picks, 0), []);

  const onEnterConstellation = (c) => {
    if (c.kind === 'special') return; // future
    setTarget(c);
    setLevel('constellation');
  };
  const onEnterMatchup = (m) => {
    setMatchup(m);
    setLevel('solar');
  };
  const onBack = () => {
    if (level === 'solar') {
      setMatchup(null);
      setLevel('constellation');
    } else if (level === 'constellation') {
      setTarget(null);
      setLevel('universe');
    }
  };

  return (
    <div className={`cosmos lvl-${level}`}>
      <div className="bg-word">{bgWord}</div>
      <HUD
        level={level}
        target={target}
        matchup={matchup}
        onBack={onBack}
        signalsCount={signalsCount}
        picksCount={picksCount}
      />

      <div className={`stage entered`} key={level + (target?.id || '') + (matchup?.id || '')}>
        {level === 'universe' && <Universe onEnter={onEnterConstellation} />}
        {level === 'constellation' && target && <Constellation sport={target} onEnter={onEnterMatchup} />}
        {level === 'solar' && matchup && <SolarSystem matchup={matchup} />}
      </div>

      <ReticleCursor />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Observatory />);
