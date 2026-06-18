import { rankPlayers } from "@/lib/statking/product";

const CX = 300;
const CY = 300;
const ORBIT_R = 200;

function nodePos(i: number, total: number): [number, number] {
  const angle = (270 + (i * 360) / total) * (Math.PI / 180);
  return [CX + ORBIT_R * Math.cos(angle), CY + ORBIT_R * Math.sin(angle)];
}

export function PlayerKnowledgeGraph() {
  const players = rankPlayers("galaxy_player_index").slice(0, 8);
  if (players.length === 0) return null;

  const maxGpi = players[0]?.galaxy_player_index ?? 1;

  const edges: Array<[number, number, string]> = [];
  players.forEach((pi, i) => {
    players.forEach((pj, j) => {
      if (j <= i) return;
      if (pi.team === pj.team) {
        edges.push([i, j, "team"]);
      } else if (pi.position === pj.position) {
        edges.push([i, j, "position"]);
      }
    });
  });

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400">
        Pre-indexed player intelligence graph · top {players.length} by GPI
      </p>
      <svg
        viewBox="0 0 600 600"
        className="mx-auto w-full max-w-[480px]"
        role="img"
        aria-labelledby="pkg-title pkg-desc"
      >
        <title id="pkg-title">NFL Player Intelligence Graph</title>
        <desc id="pkg-desc">
          {`Radial graph of the top ${players.length} NFL players by Galaxy Player Index: ` +
            players.map((p, i) => `#${i + 1} ${p.name} (${p.team} ${p.position}), GPI ${p.galaxy_player_index}`).join("; ") +
            ". Lines connect players who share a team or position. The full ranked list appears below."}
        </desc>
        <defs>
          <radialGradient id="pkg-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB454" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFB454" stopOpacity="0" />
          </radialGradient>
          <filter id="pkg-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer orbit ring */}
        <circle
          cx={CX} cy={CY} r={ORBIT_R}
          fill="none"
          stroke="rgba(255,180,84,0.08)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />

        {/* Spoke lines to nodes */}
        {players.map((_, i) => {
          const [x, y] = nodePos(i, players.length);
          return (
            <line
              key={`spoke-${i}`}
              x1={CX} y1={CY} x2={x} y2={y}
              stroke="rgba(255,180,84,0.10)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          );
        })}

        {/* Edge lines between related players */}
        {edges.map(([i, j, rel]) => {
          const [x1, y1] = nodePos(i, players.length);
          const [x2, y2] = nodePos(j, players.length);
          return (
            <line
              key={`edge-${i}-${j}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={rel === "team" ? "rgba(0,229,255,0.25)" : "rgba(122,92,255,0.18)"}
              strokeWidth={rel === "team" ? 1.5 : 1}
            />
          );
        })}

        {/* Center glow + label */}
        <circle cx={CX} cy={CY} r="68" fill="url(#pkg-center)" />
        <circle
          cx={CX} cy={CY} r="50"
          fill="rgba(255,180,84,0.08)"
          stroke="rgba(255,180,84,0.22)"
          strokeWidth="1"
        />
        <text
          x={CX} y={CY - 9}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="0.1em"
        >
          NFL PLAYER
        </text>
        <text
          x={CX} y={CY + 5}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="0.1em"
        >
          INTELLIGENCE
        </text>
        <text
          x={CX} y={CY + 20}
          textAnchor="middle"
          fill="rgba(255,180,84,0.55)"
          fontSize="7.5"
          fontFamily="monospace"
          letterSpacing="0.08em"
        >
          {players.length} indexed
        </text>

        {/* Player nodes */}
        {players.map((player, i) => {
          const [x, y] = nodePos(i, players.length);
          const fraction = maxGpi > 0 ? player.galaxy_player_index / maxGpi : 0;
          const r = 22 + fraction * 12;
          const lastName = player.name.split(" ").slice(-1)[0] ?? player.name;
          return (
            <g key={player.player_id} filter="url(#pkg-glow)">
              <circle cx={x} cy={y} r={r + 5} fill="rgba(255,180,84,0.05)" />
              <circle
                cx={x} cy={y} r={r}
                fill="rgba(18,12,38,0.85)"
                stroke="#FFB454"
                strokeWidth="1.5"
                strokeOpacity="0.55"
              />
              <text
                x={x} y={y - 5}
                textAnchor="middle"
                fill="rgba(255,180,84,0.65)"
                fontSize="7"
                fontFamily="monospace"
                letterSpacing="0.06em"
              >
                #{i + 1}
              </text>
              <text
                x={x} y={y + 5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.85)"
                fontSize={lastName.length > 8 ? "7" : "8"}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {lastName}
              </text>
              <text
                x={x} y={y + 16}
                textAnchor="middle"
                fill="#FFB454"
                fontSize="7"
                fontFamily="monospace"
              >
                {player.galaxy_player_index}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">
          <span className="inline-block h-px w-6 bg-orbital-cyan opacity-60" />
          Same team
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">
          <span className="inline-block h-px w-6 opacity-50" style={{ background: "#7A5CFF" }} />
          Same position
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-500">
          <span className="inline-block h-2 w-2 rounded-full border border-amber-400 opacity-60" />
          Node size ∝ GPI
        </span>
      </div>
    </div>
  );
}
